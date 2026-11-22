"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BotMessageSquare } from "lucide-react";
import SymptomChatPanel from "@/components/SymptomChatPanel";
import { CHAT_UI_TEXT } from "@/lib/chat/ui-text";

const HIDDEN_ROUTE_PREFIXES = ["/admin", "/superadmin", "/login", "/register", "/agent"];

function shouldHideWidget(pathname: string | null): boolean {
  if (!pathname) return false;
  return HIDDEN_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export default function ChatWidget() {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const launcherRef = useRef<HTMLButtonElement | null>(null);

  const hidden = shouldHideWidget(pathname);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
        requestAnimationFrame(() => launcherRef.current?.focus());
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  if (hidden) {
    return null;
  }

  function handleClose() {
    setIsOpen(false);
    requestAnimationFrame(() => launcherRef.current?.focus());
  }

  const fontStyleClass =
    "font-[family-name:var(--font-noto-bengali),var(--font-plus-jakarta),ui-sans-serif,sans-serif]";

  return (
    <div className={`print:hidden ${fontStyleClass}`}>
      {!isOpen && (
        <button
          ref={launcherRef}
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label={CHAT_UI_TEXT.en.launcherLabel}
          aria-expanded={false}
          aria-controls="dakterly-chat-panel"
          className="fixed bottom-4 right-4 z-40 inline-flex h-12 items-center gap-2.5 rounded-full bg-gradient-to-br from-teal-700 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-900/25 transition-all duration-200 hover:-translate-y-0.5 hover:from-teal-600 hover:to-emerald-500 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 whitespace-nowrap shrink-0 sm:bottom-5 sm:right-5"
        >
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
            <BotMessageSquare className="h-4 w-4" aria-hidden="true" />
          </span>
          <span>Agent Help</span>
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.section
            id="dakterly-chat-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dakterly-chat-title"
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: prefersReducedMotion ? 0.08 : 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-white sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[560px] sm:max-h-[calc(100dvh-2.5rem)] sm:w-[380px] sm:max-w-[calc(100vw-2rem)] sm:rounded-2xl sm:border sm:border-emerald-900/15 sm:shadow-2xl"
          >
            <SymptomChatPanel
              mode="floating"
              onClose={handleClose}
              onNavigate={() => setIsOpen(false)}
              titleId="dakterly-chat-title"
            />
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
