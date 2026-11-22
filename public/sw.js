const CACHE_VERSION = "dakterly-browser-cache-v4";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DATA_CACHE = `${CACHE_VERSION}-data`;

const MEDIA_EXTENSIONS = /\.(?:woff2?|ttf|eot|png|jpe?g|webp|avif|svg|ico)$/i;
const BUNDLE_EXTENSIONS = /\.(?:js|css)$/i;
const IS_DEV_HOST =
  self.location.hostname === "localhost" ||
  self.location.hostname === "127.0.0.1" ||
  self.location.hostname.startsWith("ais-dev-");

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DATA_CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CLEAR_DATA_CACHE") {
    event.waitUntil(caches.delete(DATA_CACHE));
  }
});

function isCacheableMediaAsset(url) {
  if (url.pathname.startsWith("/_next/static/media/")) return true;
  if (url.pathname.startsWith("/_next/image")) return true;
  if (url.pathname.startsWith("/assets/")) return true;
  return MEDIA_EXTENSIONS.test(url.pathname);
}

function isStaticBundleAsset(url) {
  if (url.pathname.startsWith("/_next/webpack-hmr")) return false;
  if (url.pathname.startsWith("/_next/static/chunks/")) return true;
  if (url.pathname.startsWith("/_next/static/css/")) return true;
  return BUNDLE_EXTENSIONS.test(url.pathname);
}

function isCacheablePublicApi(url) {
  return url.pathname === "/api/doctors";
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (request.headers.has("Next-Action")) return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === "/sw.js") return;

  // Never cache authenticated, live-queue, or admin API endpoints.
  if (
    url.pathname.startsWith("/api/auth") ||
    url.pathname.startsWith("/api/queue") ||
    url.pathname.startsWith("/api/superadmin") ||
    url.pathname.startsWith("/api/clinic-inquiries")
  ) {
    return;
  }

  // 1. Images, fonts, and static media -> Cache-First in browser Cache Storage
  if (isCacheableMediaAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;

        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.ok) {
          cache.put(request, networkResponse.clone()).catch(() => {});
        }
        return networkResponse;
      })(),
    );
    return;
  }

  // 2. JS/CSS bundles:
  //    - Production: Cache-First (content-hashed immutable chunks -> 0ms repeat loads)
  //    - Dev preview: Network-First with HTTP cache revalidation ("no-cache") to avoid hydration mismatch
  if (isStaticBundleAsset(url)) {
    if (!IS_DEV_HOST) {
      event.respondWith(
        (async () => {
          const cache = await caches.open(STATIC_CACHE);
          const cached = await cache.match(request);
          if (cached) return cached;

          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.ok) {
            cache.put(request, networkResponse.clone()).catch(() => {});
          }
          return networkResponse;
        })(),
      );
      return;
    }

    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        try {
          const networkResponse = await fetch(request, { cache: "no-cache" });
          if (networkResponse && networkResponse.ok) {
            cache.put(request, networkResponse.clone()).catch(() => {});
          }
          return networkResponse;
        } catch {
          const cached = await cache.match(request);
          if (cached) return cached;
          throw new Error("Bundle unavailable offline");
        }
      })(),
    );
    return;
  }

  // 2. Public doctor catalog API -> Stale-While-Revalidate in browser Cache Storage
  if (isCacheablePublicApi(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(DATA_CACHE);
        const cached = await cache.match(request);

        const networkPromise = fetch(request)
          .then((response) => {
            if (response && response.ok) {
              cache.put(request, response.clone()).catch(() => {});
            }
            return response;
          })
          .catch(() => null);

        if (cached) {
          event.waitUntil(networkPromise);
          return cached;
        }

        const networkResponse = await networkPromise;
        return networkResponse || new Response(JSON.stringify({ error: "Offline" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      })(),
    );
  }
});
