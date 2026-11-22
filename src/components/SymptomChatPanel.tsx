"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import {
  AlertTriangle,
  BotMessageSquare,
  LocateFixed,
  PhoneCall,
  RotateCcw,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import ChatDoctorCard from "@/components/ChatDoctorCard";
import { MAX_CHAT_MESSAGE_LENGTH, MAX_CHAT_MESSAGES } from "@/lib/chat/schema";
import type { ChatApiResponse, ChatDoctorResult, ChatLanguage, ChatMessageInput } from "@/lib/chat/types";
import { CHAT_UI_TEXT, LANGUAGE_PROMPT_TITLE } from "@/lib/chat/ui-text";

interface UiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  doctors?: ChatDoctorResult[];
  emergency?: boolean;
  fallbackFromOtherCities?: boolean;
  isError?: boolean;
}

const KNOWN_BD_ZONES: Array<{
  city: string;
  area: string;
  latMin: number;
  latMax: number;
  lngMin: number;
  lngMax: number;
}> = [
  { city: "Dhaka", area: "Uttara", latMin: 23.845, latMax: 23.905, lngMin: 90.37, lngMax: 90.425 },
  { city: "Dhaka", area: "Dhanmondi", latMin: 23.732, latMax: 23.762, lngMin: 90.362, lngMax: 90.392 },
  { city: "Dhaka", area: "Mirpur", latMin: 23.78, latMax: 23.845, lngMin: 90.335, lngMax: 90.385 },
  { city: "Dhaka", area: "Gulshan", latMin: 23.775, latMax: 23.815, lngMin: 90.402, lngMax: 90.435 },
  { city: "Dhaka", area: "Banani", latMin: 23.785, latMax: 23.805, lngMin: 90.395, lngMax: 90.415 },
  { city: "Dhaka", area: "Mohammadpur", latMin: 23.748, latMax: 23.78, lngMin: 90.34, lngMax: 90.375 },
  { city: "Dhaka", area: "Motijheel", latMin: 23.715, latMax: 23.742, lngMin: 90.405, lngMax: 90.435 },
  { city: "Dhaka", area: "Dhaka", latMin: 23.68, latMax: 23.92, lngMin: 90.32, lngMax: 90.51 },
  { city: "Chattogram", area: "GEC Circle", latMin: 22.345, latMax: 22.375, lngMin: 91.81, lngMax: 91.84 },
  { city: "Chattogram", area: "Chattogram", latMin: 22.28, latMax: 22.43, lngMin: 91.74, lngMax: 91.9 },
];

function matchLocalBdZone(lat: number, lng: number): { city: string; area: string } | null {
  for (const zone of KNOWN_BD_ZONES) {
    if (lat >= zone.latMin && lat <= zone.latMax && lng >= zone.lngMin && lng <= zone.lngMax) {
      return { city: zone.city, area: zone.area };
    }
  }
  return null;
}

async function resolveCoordsToCityArea(lat: number, lng: number): Promise<{ city: string; area: string } | null> {
  const localMatch = matchLocalBdZone(lat, lng);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}&accept-language=en`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const data = (await res.json()) as {
        address?: {
          suburb?: string;
          neighbourhood?: string;
          quarter?: string;
          road?: string;
          city?: string;
          town?: string;
          state_district?: string;
        };
      };
      const addr = data.address;
      if (addr) {
        const rawCity = addr.city || addr.town || addr.state_district || localMatch?.city || "";
        const normalizedCity = /chittagong/i.test(rawCity) ? "Chattogram" : rawCity.replace(/\s*District$/i, "").trim();
        const area = addr.suburb || addr.neighbourhood || addr.quarter || addr.road || localMatch?.area || normalizedCity;
        if (normalizedCity) {
          return { city: normalizedCity, area };
        }
      }
    }
  } catch {
    // Fall back to bounding-box match if offline or blocked
  }
  return localMatch;
}

export interface SymptomChatPanelProps {
  mode: "floating" | "page";
  onClose?: () => void;
  onNavigate?: () => void;
  titleId?: string;
}

export default function SymptomChatPanel({
  mode,
  onClose,
  onNavigate,
  titleId = "dakterly-chat-title",
}: SymptomChatPanelProps) {
  const prefersReducedMotion = useReducedMotion();

  const [language, setLanguage] = useState<ChatLanguage | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);

  const banglaChoiceRef = useRef<HTMLButtonElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const idCounterRef = useRef(0);

  const nextId = (prefix: string) => {
    idCounterRef.current += 1;
    return `${prefix}_${idCounterRef.current}`;
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (language === null) {
        banglaChoiceRef.current?.focus();
      } else {
        textareaRef.current?.focus();
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [language]);

  useEffect(() => {
    if (messages.length === 0 && !isLoading) return;
    messagesEndRef.current?.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
  }, [messages, isLoading, prefersReducedMotion]);

  const ui = language ? CHAT_UI_TEXT[language] : CHAT_UI_TEXT.en;
  const isInputDisabled = language === null || isLoading;

  function handleNewChat() {
    setLanguage(null);
    setMessages([]);
    setInput("");
    setIsLoading(false);
    setLocationNotice(null);
  }

  function handleSelectLanguage(chosen: ChatLanguage) {
    setLanguage(chosen);
    setLocationNotice(null);
  }

  async function sendMessage(rawText: string) {
    if (!language || isLoading) return;
    const trimmed = rawText.trim().slice(0, MAX_CHAT_MESSAGE_LENGTH);
    if (!trimmed) return;

    const userMsg: UiMessage = {
      id: nextId("user"),
      role: "user",
      content: trimmed,
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLocationNotice(null);
    setIsLoading(true);

    const apiMessages: ChatMessageInput[] = nextMessages
      .filter((m) => !m.isError)
      .slice(-MAX_CHAT_MESSAGES)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          messages: apiMessages,
        }),
      });

      const data = (await response.json().catch(() => null)) as ChatApiResponse | null;
      if (!response.ok || !data) {
        const errorText = data?.error || CHAT_UI_TEXT[language].errors.unavailable;
        setMessages((prev) => [
          ...prev,
          {
            id: nextId("err"),
            role: "assistant",
            content: errorText,
            isError: true,
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: nextId("bot"),
          role: "assistant",
          content: data.reply,
          doctors: data.doctors ?? [],
          emergency: Boolean(data.emergency),
          fallbackFromOtherCities: Boolean(data.fallbackFromOtherCities),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: nextId("err"),
          role: "assistant",
          content: CHAT_UI_TEXT[language].errors.network,
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleUseLocation() {
    if (!language || isLocating || isLoading) return;
    setLocationNotice(null);

    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setLocationNotice(CHAT_UI_TEXT[language].locationUnsupported);
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const resolved = await resolveCoordsToCityArea(
            position.coords.latitude,
            position.coords.longitude,
          );
          if (!resolved) {
            setLocationNotice(CHAT_UI_TEXT[language].locationNotFound);
            return;
          }
          const locationSnippet =
            resolved.area.toLowerCase() === resolved.city.toLowerCase()
              ? resolved.city
              : `${resolved.area}, ${resolved.city}`;
          const prefix = CHAT_UI_TEXT[language].locationDetectedPrefix;
          setInput((prev) => {
            const cleaned = prev.trim();
            const combined = cleaned ? `${cleaned} (${locationSnippet})` : `${prefix}: ${locationSnippet}`;
            return combined.slice(0, MAX_CHAT_MESSAGE_LENGTH);
          });
          textareaRef.current?.focus();
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
        setLocationNotice(CHAT_UI_TEXT[language].locationDenied);
      },
      { enableHighAccuracy: false, timeout: 7000, maximumAge: 0 },
    );
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void sendMessage(input);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      {/* Header */}
      <header className="shrink-0 bg-gradient-to-r from-teal-900 via-teal-800 to-emerald-700 px-4 py-3 text-white">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/25">
              <BotMessageSquare className="h-4 w-4 text-white" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 id={titleId} className="truncate text-sm font-bold leading-snug">
                {language ? ui.headerTitle : "Dakterly Care Guide · ডাক্তারলি"}
              </h2>
              {language && (
                <p className="mt-0.5 text-[11px] leading-snug text-teal-100/95">
                  {ui.disclaimer}
                </p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={handleNewChat}
              aria-label={ui.newChat}
              className="inline-flex items-center gap-1 rounded-lg border border-white/25 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white whitespace-nowrap shrink-0"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              <span>{ui.newChat}</span>
            </button>
            {mode === "floating" && onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label={ui.close}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/25 bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {language !== null && (
          <div className="mt-2 flex items-center justify-between gap-2 border-t border-white/15 pt-2">
            <div
              role="group"
              aria-label="Language"
              className="inline-flex items-center rounded-lg bg-teal-950/40 p-0.5 text-[11px] font-semibold"
            >
              <button
                type="button"
                onClick={() => handleSelectLanguage("bn")}
                aria-pressed={language === "bn"}
                className={`rounded-md px-2.5 py-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                  language === "bn"
                    ? "bg-white text-teal-900 shadow-xs"
                    : "text-teal-100 hover:text-white"
                }`}
              >
                বাংলা
              </button>
              <span className="px-1 text-white/40" aria-hidden="true">
                |
              </span>
              <button
                type="button"
                onClick={() => handleSelectLanguage("en")}
                aria-pressed={language === "en"}
                className={`rounded-md px-2.5 py-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                  language === "en"
                    ? "bg-white text-teal-900 shadow-xs"
                    : "text-teal-100 hover:text-white"
                }`}
              >
                English
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50/70 px-3.5 py-3.5 sm:px-4">
        {language === null ? (
          <div className="flex h-full flex-col justify-center">
            <div className="mx-auto w-full max-w-md rounded-2xl border border-teal-200/80 bg-white p-4 shadow-xs sm:p-5">
              <p className="text-sm font-semibold leading-relaxed text-slate-900">
                {LANGUAGE_PROMPT_TITLE}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <button
                  ref={banglaChoiceRef}
                  type="button"
                  onClick={() => handleSelectLanguage("bn")}
                  className="rounded-xl border-2 border-teal-700 bg-teal-700 px-4 py-3 text-base font-bold text-white shadow-xs transition-all hover:border-emerald-600 hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
                >
                  বাংলা
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectLanguage("en")}
                  className="rounded-xl border-2 border-teal-700 bg-white px-4 py-3 text-base font-bold text-teal-800 shadow-xs transition-all hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
                >
                  English
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="flex items-start gap-1.5 rounded-xl border border-teal-200/70 bg-teal-50/70 px-3 py-2 text-[11px] leading-relaxed text-teal-900">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-700" aria-hidden="true" />
              <span>{ui.privacyNote}</span>
            </p>

            <div className="max-w-[90%] rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-slate-800 shadow-xs">
              {ui.welcomeMessage}
            </div>

            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2 pt-0.5">
                {ui.quickChips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => void sendMessage(chip)}
                    disabled={isLoading}
                    className="rounded-xl border border-teal-300 bg-white px-3 py-1.5 text-xs font-medium text-teal-800 transition-colors hover:border-teal-600 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 disabled:opacity-50"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}

            {messages.map((msg) => {
              if (msg.role === "user") {
                return (
                  <div key={msg.id} className="flex justify-end">
                    <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-tr-sm bg-teal-700 px-3.5 py-2.5 text-sm leading-relaxed text-white shadow-xs">
                      {msg.content}
                    </div>
                  </div>
                );
              }

              if (msg.emergency) {
                return (
                  <div
                    key={msg.id}
                    role="alert"
                    className="rounded-2xl border-2 border-rose-400 bg-rose-50 p-3.5 text-rose-950 shadow-xs"
                  >
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-rose-800">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
                      <span>{ui.emergencyBadge}</span>
                    </div>
                    <p className="mt-1.5 text-sm font-medium leading-relaxed">{ui.emergencyText}</p>
                    <a
                      href="tel:999"
                      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
                    >
                      <PhoneCall className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{ui.emergencyCallCta}</span>
                    </a>
                  </div>
                );
              }

              return (
                <div key={msg.id} className="space-y-2">
                  <div
                    className={`max-w-[92%] whitespace-pre-wrap break-words rounded-2xl rounded-tl-sm border px-3.5 py-2.5 text-sm leading-relaxed shadow-xs ${
                      msg.isError
                        ? "border-amber-300 bg-amber-50 text-amber-950"
                        : "border-slate-200 bg-white text-slate-800"
                    }`}
                  >
                    {msg.content}
                  </div>

                  {msg.doctors && msg.doctors.length > 0 && (
                    <div className="space-y-2 pt-0.5">
                      {msg.fallbackFromOtherCities && (
                        <p className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-900">
                          {ui.otherCitiesBadge}
                        </p>
                      )}
                      {msg.doctors.map((doc) => (
                        <ChatDoctorCard
                          key={`${msg.id}_${doc.id}`}
                          doctor={doc}
                          language={language}
                          onNavigate={onNavigate}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div
                role="status"
                aria-live="polite"
                className="inline-flex items-center gap-2 rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-600 shadow-xs"
              >
                <span className="flex items-center gap-1" aria-hidden="true">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-600 [animation-delay:-0.2s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-600 [animation-delay:-0.1s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-600" />
                </span>
                <span>{ui.typingLabel}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Composer */}
      <footer className="shrink-0 border-t border-slate-200 bg-white px-3 py-2.5 sm:px-4">
        {language !== null && (
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleUseLocation}
              disabled={isLocating || isLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 transition-colors hover:border-teal-500 hover:bg-teal-50 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 disabled:opacity-50"
            >
              <LocateFixed className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
              <span>{isLocating ? ui.locating : ui.useLocation}</span>
            </button>
            <span className="text-[10px] text-slate-400 tabular-nums">
              {input.length}/{MAX_CHAT_MESSAGE_LENGTH}
            </span>
          </div>
        )}

        {locationNotice && (
          <p className="mb-1.5 text-[11px] leading-snug text-amber-700" role="status">
            {locationNotice}
          </p>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendMessage(input);
          }}
          className="flex items-end gap-2"
        >
          <textarea
            ref={textareaRef}
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isInputDisabled}
            maxLength={MAX_CHAT_MESSAGE_LENGTH}
            placeholder={language === null ? ui.inputDisabledPlaceholder : ui.inputPlaceholder}
            aria-label={language === null ? ui.inputDisabledPlaceholder : ui.inputPlaceholder}
            className="min-w-0 flex-1 resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm leading-snug text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          />
          <button
            type="submit"
            disabled={isInputDisabled || !input.trim()}
            aria-label={ui.sendLabel}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-white transition-colors hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      </footer>
    </div>
  );
}
