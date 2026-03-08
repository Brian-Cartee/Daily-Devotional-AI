const CACHE = "shepherd-path-v1";

self.addEventListener("install", () => { self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil(clients.claim()); });

self.addEventListener("push", (e) => {
  const data = e.data?.json() ?? {
    title: "Shepherd's Path",
    body: "Your devotional is waiting. Walk the path.",
    tag: "devotional",
    url: "/devotional",
  };

  const options = {
    body: data.body,
    icon: "/favicon.png",
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
