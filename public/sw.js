const CACHE_VERSION = "dakterly-browser-cache-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DATA_CACHE = `${CACHE_VERSION}-data`;

const STATIC_EXTENSIONS = /\.(?:js|css|woff2?|ttf|eot|png|jpe?g|webp|avif|svg|ico)$/i;

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

function isCacheableStaticAsset(url) {
  if (url.pathname.startsWith("/_next/webpack-hmr")) return false;
  if (url.pathname.startsWith("/_next/static/")) return true;
  if (url.pathname.startsWith("/_next/image")) return true;
  if (url.pathname.startsWith("/assets/")) return true;
  return STATIC_EXTENSIONS.test(url.pathname);
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

  // 1. Static bundles, images, and fonts -> Cache-First in browser Cache Storage
  if (isCacheableStaticAsset(url)) {
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
