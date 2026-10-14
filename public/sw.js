self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let data = {};
      try {
        if (event.data) data = event.data.json();
      } catch {
        data = {};
      }

      await self.registration.showNotification(data.title || "Prismático", {
        body: data.body || "Hora de marcar a refeição.",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: data.tag || "prismatico",
        renotify: true,
        data: { url: data.url || "/hoje" },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/hoje";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
