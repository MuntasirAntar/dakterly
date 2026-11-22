"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  DOCTORS_CATALOG_CACHE_KEY,
  readBrowserCache,
  refreshDoctorsCatalogCache,
} from "@/lib/browser-cache";

const CORE_PREFETCH_ROUTES = ["/", "/doctors", "/join-clinic"];

export default function BrowserCacheManager() {
  const router = useRouter();
  const pathname = usePathname();

  // 1. Register browser Service Worker for persistent Cache Storage of static assets & public API
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // Service worker registration is best-effort (may be unavailable in restricted contexts)
      });
    }
  }, []);

  // 2. Warm Next.js Client Router Cache and localStorage doctor catalog during browser idle time
  useEffect(() => {
    if (typeof window === "undefined") return;

    const warmCaches = () => {
      for (const route of CORE_PREFETCH_ROUTES) {
        if (route !== pathname) {
          router.prefetch(route);
        }
      }

      const cached = readBrowserCache(DOCTORS_CATALOG_CACHE_KEY);
      if (!cached || cached.isStale) {
        void refreshDoctorsCatalogCache();
      }
    };

    const win = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (typeof win.requestIdleCallback === "function") {
      const id = win.requestIdleCallback(warmCaches, { timeout: 1500 });
      return () => win.cancelIdleCallback?.(id);
    }

    const timer = setTimeout(warmCaches, 250);
    return () => clearTimeout(timer);
  }, [pathname, router]);

  return null;
}
