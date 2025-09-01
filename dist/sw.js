const CACHE = 'sh4d-seq-v1';
const ASSETS = [ '/', '/index.html', '/styles.css', '/manifest.webmanifest' ];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))); });
self.addEventListener('fetch', e => {
e.respondWith(caches.match(e.request).then(r=> r || fetch(e.request)));
});