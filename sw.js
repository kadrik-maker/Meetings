/* Работа без интернета: сначала отдаём сохранённую копию, в фоне обновляем её. */
var CACHE = 'journal-vstrech-v1';
var CORE = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  var allowed = url.origin === self.location.origin || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!allowed) return;

  var opened = caches.open(CACHE);
  var network = fetch(req).then(function (res) {
    if (res && (res.ok || res.type === 'opaque')) {
      var copy = res.clone();
      opened.then(function (c) { c.put(req, copy); });
    }
    return res;
  }).catch(function () { return null; });
  e.waitUntil(network);

  e.respondWith(
    opened.then(function (c) {
      return c.match(req, { ignoreSearch: req.mode === 'navigate' }).then(function (hit) {
        if (hit) return hit;
        return network.then(function (res) {
          if (res) return res;
          if (req.mode === 'navigate') return c.match('index.html').then(function (p) { return p || Response.error(); });
          return Response.error();
        });
      });
    })
  );
});
