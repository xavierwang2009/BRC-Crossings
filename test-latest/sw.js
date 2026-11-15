/* BRC Crossings: makes the installed app open without a connection.
   The page itself is fetched fresh whenever the phone is online, so testers always get the newest build;
   the saved copy is only the fallback. Fonts and the 3D library are kept after their first load. */
const CACHE = "brc-crossings-v1";
const SHELL = ["./", "manifest.webmanifest", "assets/icon-192.png", "assets/icon-512.png", "assets/apple-touch-icon.png"];
const CDN = ["cdn.jsdelivr.net", "fonts.googleapis.com", "fonts.gstatic.com", "images.unsplash.com"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url), same = url.origin === self.location.origin;
  if (!same && !CDN.includes(url.hostname)) return;
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(cache => cache.put("./", copy)); }
      return res;
    }).catch(() => caches.match("./")));
    return;
  }
  event.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(CACHE).then(cache => cache.put(req, copy)); }
    return res;
  })));
});
