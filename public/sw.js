const CACHE_NAME = 'cibarius-v1';
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/favicon.ico',
];

// Install: pre-cache static shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for navigations, cache-first for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET and chrome-extension requests
  if (request.method !== 'GET' || !request.url.startsWith('http')) return;

  // Navigation requests: network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // Static assets: cache-first
  if (request.url.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff2?)$/)) {
    event.respondWith(
      caches.match(request).then((cached) =>
        cached ||
        fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
      )
    );
    return;
  }
});

// Push notification handler
self.addEventListener('push', (event) => {
  let data = { title: 'Cibarius', body: 'Hai un promemoria', url: '/meals' };
  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch {}

  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag || 'meal-reminder',
    data: { url: data.url, mealType: data.mealType },
  };

  // Add action buttons for follow-up notifications
  if (data.isFollowUp && data.mealType) {
    options.actions = [
      { action: 'photo', title: '📷 Scatta foto' },
      { action: 'add', title: '➕ Aggiungi pasto' },
      { action: 'skip', title: 'Salta' },
    ];
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handler — deep link to the meal page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const mealType = event.notification.data?.mealType;
  const action = event.action;

  let url = event.notification.data?.url || '/meals';

  if (action === 'photo' && mealType) {
    url = `/meal-photo?meal=${mealType}`;
  } else if (action === 'add' && mealType) {
    url = `/meals?add=${mealType}`;
  } else if (action === 'skip') {
    // Just close, don't navigate
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
