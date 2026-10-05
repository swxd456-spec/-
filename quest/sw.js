/* Offline support for 행운의 궁전. Own files are network-first so config.txt and code updates arrive right away;
   the cache is only used when the device is offline. Fonts are cache-first. */
const VERSION = 'quest-v2';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'config.txt', 'css/slot.css', 'css/quest.css',
  'js/util.js', 'js/config.js', 'js/engine.js', 'js/machines.js', 'js/calibration.js', 'js/audio.js', 'js/art.js',
  'js/bg.js', 'js/fx.js', 'js/render.js', 'js/game.js', 'js/shisen.js', 'js/spotdiff.js', 'js/story.js', 'js/shop.js', 'js/main.js',
  'js/chara.js', 'js/cinema.js', 'js/map.js', 'js/league.js', 'js/challenge.js',
  'js/games/common.js', 'js/games/legacy.js', 'js/games/match3.js', 'js/games/bubble.js', 'js/games/brick.js', 'js/games/block.js', 'js/games/sling.js', 'js/games/stack.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png',
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('quest-') && k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const font = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (url.origin !== location.origin && !font) return;
  if (!font) {
    // config.txt?t=123 is stored under one key so the cache does not grow
    const key = url.origin + url.pathname;
    e.respondWith(fetch(req, { cache: 'no-store' }).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(key, copy)); }
      return res;
    }).catch(() => caches.match(key).then((r) => r || caches.match('index.html'))));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    const copy = res.clone();
    caches.open(VERSION).then((c) => c.put(req, copy));
    return res;
  })));
});
