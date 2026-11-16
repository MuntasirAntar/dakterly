"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Loader2 } from "lucide-react";

export default function PageTransitionLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const prefersReducedMotion = useReducedMotion();

  const routeKey = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  const currentRouteRef = useRef(routeKey);

  const [status, setStatus] = useState<"idle" | "loading" | "completing">("idle");
  const [showOverlayPill, setShowOverlayPill] = useState(false);

  const pillTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimers() {
    if (pillTimerRef.current) clearTimeout(pillTimerRef.current);
    if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
    pillTimerRef.current = null;
    safetyTimerRef.current = null;
    finishTimerRef.current = null;
  }

  function startNavigation() {
    clearTimers();
    setStatus("loading");
    setShowOverlayPill(false);

    pillTimerRef.current = setTimeout(() => {
      setShowOverlayPill(true);
    }, 150);

    safetyTimerRef.current = setTimeout(() => {
      setStatus("idle");
      setShowOverlayPill(false);
    }, 10000);
  }

  // Detect clicks on internal <Link> / <a> elements and GET <form> submissions
  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      let nextUrl: URL;
      try {
        nextUrl = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }

      if (nextUrl.origin !== window.location.origin) return;
      const nextKey = `${nextUrl.pathname}${nextUrl.search}`;
      if (nextKey === currentRouteRef.current) return;

      startNavigation();
    }

    function onDocumentSubmit(event: SubmitEvent) {
      if (event.defaultPrevented) return;
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if ((form.method || "get").toLowerCase() !== "get") return;

      let actionUrl: URL;
      try {
        actionUrl = new URL(form.action || window.location.href, window.location.href);
      } catch {
        return;
      }
      if (actionUrl.origin !== window.location.origin) return;

      const formData = new FormData(form);
      const params = new URLSearchParams();
      for (const [k, v] of formData.entries()) {
        if (typeof v === "string" && v !== "") params.append(k, v);
      }
      const nextSearch = params.toString();
      const nextKey = `${actionUrl.pathname}${nextSearch ? `?${nextSearch}` : ""}`;
      if (nextKey === currentRouteRef.current) return;

      startNavigation();
    }

    document.addEventListener("click", onDocumentClick, true);
    document.addEventListener("submit", onDocumentSubmit, true);
    return () => {
      document.removeEventListener("click", onDocumentClick, true);
      document.removeEventListener("submit", onDocumentSubmit, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Complete the loading animation once the new route commits
  useEffect(() => {
    if (routeKey === currentRouteRef.current) return;
    currentRouteRef.current = routeKey;

    clearTimers();
    const startFinish = setTimeout(() => {
      setShowOverlayPill(false);
      setStatus((prev) => (prev === "idle" ? "idle" : "completing"));
      finishTimerRef.current = setTimeout(() => {
        setStatus("idle");
      }, 240);
    }, 0);

    return () => {
      clearTimeout(startFinish);
    };
  }, [routeKey]);

  useEffect(() => {
    return () => clearTimers();
  }, []);

  const isVisible = status !== "idle";

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Top progress bar */}
          <motion.div
            key="route-progress-track"
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-none fixed inset-x-0 top-0 z-50 h-1 overflow-hidden bg-teal-950/10 print:hidden"
          >
            <motion.div
              className="h-full origin-left bg-gradient-to-r from-teal-700 via-emerald-400 to-teal-500 shadow-[0_0_12px_rgba(16,185,129,0.65)]"
              initial={{ scaleX: 0.08 }}
              animate={{
                scaleX: status === "completing" ? 1 : 0.84,
              }}
              transition={
                prefersReducedMotion
                  ? { duration: 0.1 }
                  : status === "completing"
                    ? { duration: 0.2, ease: "easeOut" }
                    : { duration: 3.5, ease: [0.16, 1, 0.3, 1] }
              }
            />
          </motion.div>

          {/* Subtle floating indicator if transition takes > 150ms */}
          {showOverlayPill && status === "loading" && (
            <motion.div
              key="route-loading-pill"
              role="status"
              aria-live="polite"
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ duration: prefersReducedMotion ? 0.08 : 0.18 }}
              className="pointer-events-none fixed left-1/2 top-4 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-teal-200/80 bg-white/95 px-4 py-1.5 text-xs font-semibold text-teal-800 shadow-lg backdrop-blur-md print:hidden"
            >
              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" aria-hidden="true" />
              <span>Loading page...</span>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
