"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Re-reads the page data every few seconds (only while the tab is visible),
// so the receptionist sees changes made by other staff without pressing F5.
export default function AutoRefresh({ seconds = 15 }: { seconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(timer);
  }, [router, seconds]);

  return null;
}
