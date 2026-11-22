"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlertTriangle, X } from "lucide-react";

type Props = {
  children: React.ReactNode;
  pendingLabel?: string;
  confirmTitle?: string;
  confirmMessage?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  className?: string;
};

// A submit button that disables itself while the form is being sent (so a
// double click cannot book twice) and opens a themed confirmation modal when needed.
export default function SubmitButton({
  children,
  pendingLabel = "Please wait...",
  confirmTitle = "Please confirm",
  confirmMessage,
  confirmLabel = "Confirm",
  cancelLabel = "Keep it",
  className = "",
}: Props) {
  const { pending } = useFormStatus();
  const prefersReducedMotion = useReducedMotion();
  const [showConfirm, setShowConfirm] = useState(false);

  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const bypassConfirmRef = useRef(false);

  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!showConfirm) return;
    const focusTimer = setTimeout(() => {
      cancelButtonRef.current?.focus();
    }, 30);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setShowConfirm(false);
        requestAnimationFrame(() => buttonRef.current?.focus());
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [showConfirm]);

  function handleDismiss() {
    setShowConfirm(false);
    requestAnimationFrame(() => buttonRef.current?.focus());
  }

  function handleConfirmSubmit() {
    setShowConfirm(false);
    buttonRef.current?.form?.requestSubmit();
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="submit"
        disabled={pending}
        onClick={(event) => {
          if (confirmMessage && !bypassConfirmRef.current) {
            event.preventDefault();
            setShowConfirm(true);
            return;
          }
          bypassConfirmRef.current = false;
        }}
        className={`rounded-lg px-5 py-2.5 font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      >
        {pending ? pendingLabel : children}
      </button>

      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0.08 : 0.16 }}
            onClick={handleDismiss}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-describedby={descId}
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: prefersReducedMotion ? 0.08 : 0.18, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md overflow-hidden rounded-2xl border border-teal-200/80 bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-teal-900 via-teal-800 to-emerald-700 px-5 py-4 text-white">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
                    <AlertTriangle className="h-4 w-4 text-amber-200" aria-hidden="true" />
                  </span>
                  <h2 id={titleId} className="truncate text-base font-bold leading-snug">
                    {confirmTitle}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleDismiss}
                  aria-label="Close confirmation dialog"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/25 bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div className="px-5 py-5 sm:px-6">
                <p id={descId} className="text-sm leading-relaxed text-slate-700">
                  {confirmMessage}
                </p>
              </div>

              <div className="flex flex-col-reverse gap-2.5 border-t border-slate-100 bg-slate-50/80 px-5 py-3.5 sm:flex-row sm:justify-end sm:px-6">
                <button
                  ref={cancelButtonRef}
                  type="button"
                  onClick={handleDismiss}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-teal-600 hover:bg-teal-50 hover:text-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                >
                  {cancelLabel}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSubmit}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-1"
                >
                  {confirmLabel}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
