const CACHE = "field-force-v1";
self.addEventListener("install", e => { self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(clients.claim()); });
self.addEventListener("fetch", e => {
  if (new URL(e.request.url).pathname.startsWith("/api/")) {
    e.respondWith(fetch(e.request).catch(() =>
      new Response(JSON.stringify({ message: "offline" }), { headers: { "Content-Type": "application/json" } })
    ));
    return;
  }
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
self.addEventListener("sync", e => {
  if (e.tag === "sync-pending")
    e.waitUntil(clients.matchAll().then(cls => cls.forEach(c => c.postMessage({ type: "SYNC_NOW" }))));
});
