const CACHE_NAME = 'gastro-caja-offline-v8';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './charts.js',
  './manifest.json',
  './icon.svg',
  './src/main.js',
  './src/domain/formatters.js',
  './src/domain/costing.js',
  './src/domain/classifier.js',
  './src/domain/ledger.js',
  './src/data/seed.js',
  './src/data/store.js',
  './src/data/cloudSync.js',
  './src/data/geminiClient.js',
  './src/ui/toast.js',
  './src/ui/headerKpisView.js',
  './src/ui/overviewView.js',
  './src/ui/expensesView.js',
  './src/ui/costsView.js',
  './src/ui/notesView.js',
  './src/ui/advisorView.js',
  './src/ui/syncModalView.js',
  './src/ui/navigation.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Network-first with offline cache fallback so updates load immediately when online
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
