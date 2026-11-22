"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlertTriangle, Loader2, X } from "lucide-react";

type Props = {
  appointmentId: string;
};

export default function CancelAppointmentButton({ appointmentId }: Props) {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();

  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const keepButtonRef = useRef<HTMLButtonElement | null>(null);

  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!showConfirm) return;
    const focusTimer = setTimeout(() => {
      keepButtonRef.current?.focus();
    }, 30);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        event.preventDefault();
        setShowConfirm(false);
        requestAnimationFrame(() => triggerRef.current?.focus());
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [showConfirm, isSubmitting]);

  function handleDismiss() {
    if (isSubmitting) return;
    setShowConfirm(false);
    setErrorMessage(null);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  async function handleConfirmCancel() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/appointments/${encodeURIComponent(appointmentId)}/cancel`, {
        method: "POST",
      });

      if (response.status === 401) {
        setShowConfirm(false);
        router.push("/login");
        return;
      }

      const data = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        message?: string;
      } | null;

      if (!response.ok || !data?.ok) {
        setErrorMessage(data?.message || "Could not cancel this appointment. Please try again.");
        return;
      }

      setShowConfirm(false);
      router.replace(`/appointments/${encodeURIComponent(appointmentId)}?cancelled=1`);
      router.refresh();
    } catch {
      setErrorMessage("Connection problem. Please check your internet and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setErrorMessage(null);
          setShowConfirm(true);
        }}
        className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-2"
      >
        Cancel appointment
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
                    Cancel this appointment?
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleDismiss}
                  disabled={isSubmitting}
                  aria-label="Close confirmation dialog"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/25 bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div className="px-5 py-5 sm:px-6">
                <p id={descId} className="text-sm leading-relaxed text-slate-700">
                  Your time slot and token number will be released so another patient can book this time.
                </p>
                {errorMessage && (
                  <p
                    role="alert"
                    className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-800"
                  >
                    {errorMessage}
                  </p>
                )}
              </div>

              <div className="flex flex-col-reverse gap-2.5 border-t border-slate-100 bg-slate-50/80 px-5 py-3.5 sm:flex-row sm:justify-end sm:px-6">
                <button
                  ref={keepButtonRef}
                  type="button"
                  onClick={handleDismiss}
                  disabled={isSubmitting}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-teal-600 hover:bg-teal-50 hover:text-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 disabled:opacity-50"
                >
                  Keep appointment
                </button>
                <button
                  type="button"
                  onClick={() => void handleConfirmCancel()}
                  disabled={isSubmitting}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  <span>{isSubmitting ? "Cancelling..." : "Yes, cancel appointment"}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
