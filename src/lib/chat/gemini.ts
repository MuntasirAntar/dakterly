import {
  FunctionDeclaration,
  GoogleGenAI,
  ThinkingLevel,
  Type,
  type Content,
} from "@google/genai";
import type { ChatDoctorResult, ChatMessageInput } from "./types";

const DEFAULT_MODEL = "gemini-4-hydrogen";
const MAX_OUTPUT_TOKENS = 2048;

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

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new MissingGeminiKeyError();
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function getModelName(): string {
  const configured = process.env.GEMINI_MODEL?.trim();
  if (
    !configured ||
    /^AIza/i.test(configured) ||
    !/^(?:models\/)?gemini-[a-z0-9._-]+$/i.test(configured)
  ) {
    return DEFAULT_MODEL;
  }
  return configured.replace(/^models\//i, "");
}

export async function runSymptomChat(params: RunSymptomChatParams): Promise<RunSymptomChatResult> {
  const ai = getGeminiClient();
  const model = getModelName();

  const contents: Content[] = params.messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  let doctors: ChatDoctorResult[] = [];
  let fallbackFromOtherCities = false;
  let requestedCity: string | null = null;

  for (let round = 0; round < 3; round++) {
    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: params.systemInstruction,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        tools: [{ functionDeclarations: [findDoctorsDeclaration] }],
      },
    });

    const functionCalls = response.functionCalls;
    const modelContent = response.candidates?.[0]?.content;

    if (!functionCalls || functionCalls.length === 0 || !modelContent) {
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
            id: call.id,
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
