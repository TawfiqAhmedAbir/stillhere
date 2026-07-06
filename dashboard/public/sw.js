self.addEventListener("push", (event) => {
  if (!event.data) return;
  const payload = event.data.json();
  event.waitUntil(
    self.registration.showNotification(payload.title || "StillHere", {
      body: payload.body || "",
      data: payload.data,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const base = "/stillhere";
  const personId = event.notification.data?.personId;
  const url = personId
    ? `${base}/person/?id=${personId}`
    : `${base}/dashboard/`;
  event.waitUntil(clients.openWindow(url));
});
