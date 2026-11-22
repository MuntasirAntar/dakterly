import {
  FunctionDeclaration,
  GoogleGenAI,
  ThinkingLevel,
  Type,
  type Content,
  type GenerateContentConfig,
} from "@google/genai";
import type { ChatDoctorResult, ChatMessageInput } from "./types";

const DEFAULT_MODEL = "gemini-4-hydrogen";
const FALLBACK_MODELS = ["gemini-3.8-flash", "gemini-3.1-flash-lite"] as const;
const MAX_OUTPUT_TOKENS = 1024;
const MAX_TOOL_ROUNDS = 4;
const MODEL_COOLDOWN_MS_TRANSIENT = 5 * 60 * 1000;
const MODEL_COOLDOWN_MS_NOT_FOUND = 30 * 60 * 1000;

const modelCooldownUntil = new Map<string, number>();

function cooldownKey(apiKey: string, model: string): string {
  const fingerprint = `${apiKey.length}:${apiKey.slice(-6)}`;
  return `${fingerprint}|${model}`;
}

export function clearModelCooldownsForTest(): void {
  modelCooldownUntil.clear();
}

export function markModelUnavailable(model: string, reason: "not_found" | "transient", apiKey = resolveGeminiApiKey()): void {
  if (!apiKey) return;
  const ttl = reason === "not_found" ? MODEL_COOLDOWN_MS_NOT_FOUND : MODEL_COOLDOWN_MS_TRANSIENT;
  modelCooldownUntil.set(cooldownKey(apiKey, model), Date.now() + ttl);
}

function isModelCoolingDown(model: string, apiKey: string, now = Date.now()): boolean {
  if (!apiKey) return false;
  const key = cooldownKey(apiKey, model);
  const until = modelCooldownUntil.get(key);
  if (!until) return false;
  if (now >= until) {
    modelCooldownUntil.delete(key);
    return false;
  }
  return true;
}

const findDoctorsDeclaration: FunctionDeclaration = {
  name: "find_doctors",
  description:
    "Search active doctors at active Dakterly clinics by database specialty name and optional city/area, ranked closest first.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      specialty: {
        type: Type.STRING,
        description:
          "Exact English specialty name from the database list (for example: General Physician, Pediatrician, Dermatologist). Use General Physician if unsure.",
      },
      city: {
        type: Type.STRING,
        description: "City name in Bangladesh if provided by the patient, such as Dhaka or Chattogram.",
      },
      area: {
        type: Type.STRING,
        description: "Neighborhood or area words if provided by the patient, such as Uttara, Dhanmondi, or GEC Circle.",
      },
    },
    required: ["specialty"],
  },
};

export interface FindDoctorsToolOutcome {
  specialtyUsed: string;
  doctors: ChatDoctorResult[];
  fallbackFromOtherCities: boolean;
  requestedCity: string | null;
}

export interface RunSymptomChatParams {
  systemInstruction: string;
  messages: ChatMessageInput[];
  onFindDoctors: (args: {
    specialty?: string;
    city?: string;
    area?: string;
  }) => Promise<FindDoctorsToolOutcome>;
}

export interface RunSymptomChatResult {
  reply: string;
  doctors: ChatDoctorResult[];
  fallbackFromOtherCities: boolean;
  requestedCity: string | null;
}

export class MissingGeminiKeyError extends Error {
  constructor() {
    super("GEMINI_API_KEY is not configured");
    this.name = "MissingGeminiKeyError";
  }
}

export function sanitizeGeminiApiKey(raw?: string): string {
  if (!raw) return "";
  return raw
    .trim()
    .replace(/^(?:GOOGLE_)?GEMINI_API_KEY\s*=\s*/i, "")
    .replace(/^["']+|["']+$/g, "")
    .trim();
}

export function resolveGeminiApiKey(): string {
  return (
    sanitizeGeminiApiKey(process.env.GOOGLE_GEMINI_API_KEY) ||
    sanitizeGeminiApiKey(process.env.GEMINI_API_KEY)
  );
}

const REQUEST_TIMEOUT_MS = 10_000;

function getGeminiClient(): GoogleGenAI {
  const apiKey = resolveGeminiApiKey();
  if (!apiKey) {
    throw new MissingGeminiKeyError();
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: REQUEST_TIMEOUT_MS,
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function isRetiredModel(model: string): boolean {
  return /^(?:gemini-1\.|gemini-2\.|gemini-pro$)/i.test(model);
}

export function getCandidateModels(
  configuredOverride = process.env.GEMINI_MODEL,
  apiKey = resolveGeminiApiKey(),
): string[] {
  const configured = configuredOverride?.trim().replace(/^models\//i, "");
  const isValidCustom =
    Boolean(configured) &&
    !/^AIza/i.test(configured!) &&
    /^gemini-[a-z0-9._-]+$/i.test(configured!) &&
    !isRetiredModel(configured!);

  const ordered = isValidCustom
    ? [configured!, DEFAULT_MODEL, ...FALLBACK_MODELS]
    : [DEFAULT_MODEL, ...FALLBACK_MODELS];

  const unique = Array.from(new Set(ordered));
  if (!apiKey) return unique;

  const now = Date.now();
  const healthy: string[] = [];
  const coolingDown: string[] = [];
  for (const model of unique) {
    if (isModelCoolingDown(model, apiKey, now)) {
      coolingDown.push(model);
    } else {
      healthy.push(model);
    }
  }
  return [...healthy, ...coolingDown];
}

function supportsThinkingLevel(model: string): boolean {
  return /^gemini-4(?:[.-]|$)/i.test(model);
}

function isModelNotFoundError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const status = "status" in err ? (err as { status?: unknown }).status : undefined;
  const message = "message" in err ? String((err as { message?: unknown }).message) : "";
  return status === 404 || /NOT_FOUND|not found for API version|is not supported for generateContent|no longer available/i.test(message);
}

function isTransientError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const status = "status" in err ? (err as { status?: unknown }).status : undefined;
  const message = "message" in err ? String((err as { message?: unknown }).message) : "";
  return (
    status === 500 ||
    status === 503 ||
    status === 504 ||
    /ECONNRESET|ETIMEDOUT|UNAVAILABLE|timeout|aborted|fetch failed|high demand/i.test(message)
  );
}

function isRateLimitError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const status = "status" in err ? (err as { status?: unknown }).status : undefined;
  const message = "message" in err ? String((err as { message?: unknown }).message) : "";
  return status === 429 || /RESOURCE_EXHAUSTED|429/i.test(message);
}

async function generateWithRetry(
  ai: GoogleGenAI,
  model: string,
  contents: Content[],
  config: GenerateContentConfig,
  maxAttempts: number,
) {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await ai.models.generateContent({ model, contents, config });
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts - 1 && isTransientError(err)) {
        await new Promise((resolve) => setTimeout(resolve, 350));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

async function executeChatWithModel(
  ai: GoogleGenAI,
  model: string,
  params: RunSymptomChatParams,
  allowFirstRoundRetry: boolean,
): Promise<RunSymptomChatResult> {
  const contents: Content[] = params.messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  let doctors: ChatDoctorResult[] = [];
  let fallbackFromOtherCities = false;
  let requestedCity: string | null = null;
  const useThinking = supportsThinkingLevel(model);

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const allowTools = round < MAX_TOOL_ROUNDS - 1;
    const config: GenerateContentConfig = {
      systemInstruction: params.systemInstruction,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      ...(useThinking ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
      ...(allowTools ? { tools: [{ functionDeclarations: [findDoctorsDeclaration] }] } : {}),
    };

    const maxAttempts = round === 0 && !allowFirstRoundRetry ? 1 : 2;
    const response = await generateWithRetry(ai, model, contents, config, maxAttempts);
    const functionCalls = response.functionCalls;
    const modelContent = response.candidates?.[0]?.content;

    if (!allowTools || !functionCalls || functionCalls.length === 0 || !modelContent) {
      return {
        reply: (response.text ?? "").trim(),
        doctors,
        fallbackFromOtherCities,
        requestedCity,
      };
    }

    contents.push(modelContent);

    const functionResponseParts = [];
    for (const call of functionCalls) {
      if (call.name === "find_doctors") {
        const rawArgs = (call.args ?? {}) as Record<string, unknown>;
        const outcome = await params.onFindDoctors({
          specialty: typeof rawArgs.specialty === "string" ? rawArgs.specialty : undefined,
          city: typeof rawArgs.city === "string" ? rawArgs.city : undefined,
          area: typeof rawArgs.area === "string" ? rawArgs.area : undefined,
        });

        doctors = outcome.doctors;
        fallbackFromOtherCities = outcome.fallbackFromOtherCities;
        requestedCity = outcome.requestedCity;

        functionResponseParts.push({
          functionResponse: {
            ...(call.id ? { id: call.id } : {}),
            name: "find_doctors",
            response: {
              specialtyUsed: outcome.specialtyUsed,
              requestedCity: outcome.requestedCity,
              fallbackFromOtherCities: outcome.fallbackFromOtherCities,
              count: outcome.doctors.length,
              doctors: outcome.doctors.map((d) => ({
                id: d.id,
                name: d.name,
                specialty: d.specialty,
                clinicName: d.clinicName,
                city: d.city,
                address: d.address,
                feeBdt: d.fee,
                nextAvailable: d.nextAvailable,
              })),
            },
          },
        });
      }
    }

    if (functionResponseParts.length === 0) {
      return {
        reply: (response.text ?? "").trim(),
        doctors,
        fallbackFromOtherCities,
        requestedCity,
      };
    }

    contents.push({
      role: "user",
      parts: functionResponseParts,
    });
  }

  return {
    reply: "",
    doctors,
    fallbackFromOtherCities,
    requestedCity,
  };
}

export async function runSymptomChat(params: RunSymptomChatParams): Promise<RunSymptomChatResult> {
  const apiKey = resolveGeminiApiKey();
  const ai = getGeminiClient();
  const candidates = getCandidateModels(process.env.GEMINI_MODEL, apiKey);

  let lastError: unknown;
  for (let i = 0; i < candidates.length; i++) {
    const model = candidates[i];
    const hasMoreCandidates = i < candidates.length - 1;
    try {
      const result = await executeChatWithModel(ai, model, params, !hasMoreCandidates);
      if (apiKey) {
        modelCooldownUntil.delete(cooldownKey(apiKey, model));
      }
      return result;
    } catch (err) {
      lastError = err;
      const notFound = isModelNotFoundError(err);
      const transient = isTransientError(err);
      const rateLimited = isRateLimitError(err);
      if (notFound || transient || rateLimited) {
        markModelUnavailable(model, notFound ? "not_found" : "transient", apiKey);
      }
      if (hasMoreCandidates && (notFound || transient || rateLimited)) {
        console.warn(
          `[/api/chat] Model "${model}" ${rateLimited ? "rate-limited (429)" : "unavailable"}, trying "${candidates[i + 1]}".`,
        );
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}
