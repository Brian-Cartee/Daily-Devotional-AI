const CACHE = "shepherd-path-v5";
const STATIC_CACHE = "shepherd-path-static-v5";

const APP_SHELL = [
  "/",
  "/manifest.json",
  "/favicon.png",
  "/app-icon.png",
  "/logo-mark-white.png",
  "/hero-landing.png",
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE && k !== STATIC_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Skip non-GET requests and cross-origin
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Skip API requests — always go to network
  if (url.pathname.startsWith("/api/")) return;

  // Navigation requests — network first, fall back to cached index
  if (request.mode === "navigate") {
    e.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(request, clone));
          return res;
        })
        .catch(() => caches.match("/") || caches.match(request))
    );
    return;
  }

  // Static assets — cache first
  e.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(request, clone));
        }
        return res;
      });
    })
  );
});

self.addEventListener("push", (e) => {
  const data = e.data?.json() ?? {
    title: "Shepherd's Path",
    body: "Your devotional is waiting. Walk the path.",
    tag: "devotional",
    url: "/devotional",
  };

  const options = {
    body: data.body,
    icon: "/app-icon.png",
    badge: "/favicon.png",
    tag: data.tag || "devotional",
    requireInteraction: false,
    silent: false,
    data: { url: data.url || "/devotional" },
    actions: [
      { action: "open", title: "Open Devotional" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  e.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  if (e.action === "dismiss") return;
  const url = e.notification.data?.url || "/devotional";
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.includes(url) && "focus" in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
