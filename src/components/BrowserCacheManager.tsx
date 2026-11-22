"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  DOCTORS_CATALOG_CACHE_KEY,
  readBrowserCache,
  refreshDoctorsCatalogCache,
} from "@/lib/browser-cache";

const CORE_PREFETCH_ROUTES = ["/", "/doctors", "/join-clinic", "/login", "/register"];
const DEV_WARM_KEY = "dakterly_dev_routes_warmed_v1";
const SW_UPGRADE_RELOAD_KEY = "dakterly_sw_reloaded_v3";

export default function BrowserCacheManager() {
  const router = useRouter();
  const pathname = usePathname();

  // 1. Register browser Service Worker for persistent Cache Storage of static assets & public API
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const hadController = Boolean(navigator.serviceWorker.controller);
    const onControllerChange = () => {
      if (!hadController) return;
      try {
        if (!window.sessionStorage.getItem(SW_UPGRADE_RELOAD_KEY)) {
          window.sessionStorage.setItem(SW_UPGRADE_RELOAD_KEY, "1");
          window.location.reload();
        }
      } catch {
        // Ignore sessionStorage restrictions
      }
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => registration.update().catch(() => {}))
      .catch(() => {
        // Service worker registration is best-effort
      });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  // 2. Prefetch core routes, warm dev-mode route compilation once per session, and warm localStorage catalog
  useEffect(() => {
    if (typeof window === "undefined") return;

    const warmCaches = () => {
      for (const route of CORE_PREFETCH_ROUTES) {
        if (route !== pathname) {
          router.prefetch(route);
        }
      }

      // In development mode, Next.js disables <Link>/router.prefetch() for uncompiled routes.
      // Warm core routes once per tab session in the background so first clicks are instant.
      if (process.env.NODE_ENV === "development") {
        try {
          if (!window.sessionStorage.getItem(DEV_WARM_KEY)) {
            window.sessionStorage.setItem(DEV_WARM_KEY, "1");
            for (const route of CORE_PREFETCH_ROUTES) {
              if (route !== pathname) {
                void fetch(route, { credentials: "same-origin" }).catch(() => {});
              }
            }
          }
        } catch {
          // Ignore sessionStorage restrictions
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
      const id = win.requestIdleCallback(warmCaches, { timeout: 800 });
      return () => win.cancelIdleCallback?.(id);
    }

    const timer = setTimeout(warmCaches, 120);
    return () => clearTimeout(timer);
  }, [pathname, router]);

  return null;
}
