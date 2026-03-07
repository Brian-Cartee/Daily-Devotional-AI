const CACHE = "shepherd-path-v1";

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(clients.claim());
});

self.addEventListener("push", (e) => {
  const data = e.data?.json() ?? {
    title: "Shepherd Path",
    body: "Your daily devotional is ready. Walk the path.",
  };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/favicon.png",
      badge: "/favicon.png",
      tag: "daily-devotional",
      requireInteraction: false,
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes("/devotional") && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow("/devotional");
      }
    })
  );
});
