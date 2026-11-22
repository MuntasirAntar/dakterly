import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { findDoctorsForChat } from "@/lib/chat/doctor-ranking";
import { detectEmergencyRedFlags, getFixedEmergencyMessage } from "@/lib/chat/emergency";
import { MissingGeminiKeyError, resolveGeminiApiKey, runSymptomChat } from "@/lib/chat/gemini";
import { checkChatRateLimit } from "@/lib/chat/rate-limit";
import { chatRequestSchema } from "@/lib/chat/schema";
import { buildSymptomSystemPrompt } from "@/lib/chat/system-prompt";
import type { ChatApiResponse, ChatLanguage } from "@/lib/chat/types";
import { CHAT_UI_TEXT } from "@/lib/chat/ui-text";

export const runtime = "nodejs";
export const maxDuration = 30;

function extractClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function resolveLanguageHint(raw: unknown): ChatLanguage {
  if (raw && typeof raw === "object" && "language" in raw) {
    const lang = (raw as { language?: unknown }).language;
    if (lang === "bn" || lang === "en") return lang;
  }
  return "en";
}

function isUpstreamRateLimitError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const status = "status" in err ? (err as { status?: unknown }).status : undefined;
  const message = "message" in err ? String((err as { message?: unknown }).message) : "";
  return status === 429 || /RESOURCE_EXHAUSTED|429/i.test(message);
}

function isInvalidApiKeyError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const status = "status" in err ? (err as { status?: unknown }).status : undefined;
  const message = "message" in err ? String((err as { message?: unknown }).message) : "";
  return (
    status === 401 ||
    status === 403 ||
    /API_KEY_INVALID|API key not valid|PERMISSION_DENIED/i.test(message)
  );
}

export async function POST(request: NextRequest) {
  let rawBody: unknown = null;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json<ChatApiResponse>(
      {
        reply: "",
        doctors: [],
        error: CHAT_UI_TEXT.en.errors.invalidRequest,
      },
      { status: 400 },
    );
  }

  const fallbackLang = resolveLanguageHint(rawBody);
  const ip = extractClientIp(request);
  const rateCheck = checkChatRateLimit(ip);
  if (!rateCheck.allowed) {
    return NextResponse.json<ChatApiResponse>(
      {
        reply: "",
        doctors: [],
        error: CHAT_UI_TEXT[fallbackLang].errors.rateLimited,
      },
      {
        status: 429,
        headers: { "Retry-After": String(rateCheck.retryAfterSeconds) },
      },
    );
  }

  const parsed = chatRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json<ChatApiResponse>(
      {
        reply: "",
        doctors: [],
        error: CHAT_UI_TEXT[fallbackLang].errors.invalidRequest,
      },
      { status: 400 },
    );
  }

  const { language, messages } = parsed.data;
  const latestUserMessage = messages[messages.length - 1];

  // Safety guardrail: run deterministic emergency check BEFORE calling Gemini
  if (latestUserMessage && detectEmergencyRedFlags(latestUserMessage.content)) {
    return NextResponse.json<ChatApiResponse>({
      reply: getFixedEmergencyMessage(language),
      doctors: [],
      emergency: true,
    });
  }

  if (!resolveGeminiApiKey()) {
    console.warn("[/api/chat] GEMINI_API_KEY is missing in environment variables.");
    return NextResponse.json<ChatApiResponse>(
      {
        reply: "",
        doctors: [],
        error: CHAT_UI_TEXT[language].errors.missingConfig,
      },
      { status: 503 },
    );
  }

  try {
    const specialtyRows = await db.specialty.findMany({
      where: { doctors: { some: { isActive: true, clinic: { isActive: true } } } },
      orderBy: { name: "asc" },
      select: { name: true },
    });
    const specialties = specialtyRows.map((s) => s.name);

    const systemInstruction = buildSymptomSystemPrompt({ language, specialties });
    const result = await runSymptomChat({
      systemInstruction,
      messages,
      onFindDoctors: findDoctorsForChat,
    });

    const replyText =
      result.reply ||
      (result.doctors.length > 0
        ? language === "bn"
          ? "আপনার সমস্যার ধরন অনুযায়ী নিচের ডাক্তারদের সাথে পরামর্শ করতে পারেন।"
          : "Based on your symptoms, you can review the matching specialists below."
        : CHAT_UI_TEXT[language].errors.unavailable);

    return NextResponse.json<ChatApiResponse>({
      reply: replyText,
      doctors: result.doctors,
      fallbackFromOtherCities: result.fallbackFromOtherCities,
      requestedCity: result.requestedCity,
    });
  } catch (err) {
    if (err instanceof MissingGeminiKeyError || isInvalidApiKeyError(err)) {
      console.warn("[/api/chat] Gemini API key is missing or invalid. Check GEMINI_API_KEY in Settings > Secrets.");
      return NextResponse.json<ChatApiResponse>(
        {
          reply: "",
          doctors: [],
          error: CHAT_UI_TEXT[language].errors.missingConfig,
        },
        { status: 503 },
      );
    }

    if (isUpstreamRateLimitError(err)) {
      console.warn("[/api/chat] Gemini API rate limit / quota exceeded (429).");
      return NextResponse.json<ChatApiResponse>(
        {
          reply: "",
          doctors: [],
          error: CHAT_UI_TEXT[language].errors.rateLimited,
        },
        { status: 429 },
      );
    }

    const status = err && typeof err === "object" && "status" in err ? (err as { status?: unknown }).status : undefined;
    const msg = err instanceof Error ? err.message : String(err);

    if (status === 503 || /UNAVAILABLE|high demand/i.test(msg)) {
      console.warn("[/api/chat] Upstream Gemini models temporarily unavailable (503).");
      return NextResponse.json<ChatApiResponse>(
        {
          reply: "",
          doctors: [],
          error: CHAT_UI_TEXT[language].errors.unavailable,
        },
        { status: 503 },
      );
    }

    console.error(`[/api/chat] Gemini request failed [status=${String(status ?? "unknown")}]: ${msg}`);

    return NextResponse.json<ChatApiResponse>(
      {
        reply: "",
        doctors: [],
        error: CHAT_UI_TEXT[language].errors.unavailable,
      },
      { status: 502 },
    );
  }
}
