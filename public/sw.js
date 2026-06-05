// MoneyFitness Service Worker — handles Web Push notifications

self.addEventListener('push', function(event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; } catch(e) { data = { title: 'MoneyFitness', body: event.data ? event.data.text() : 'New notification' }; }

  var title = data.title || 'MoneyFitness';
  var options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || 'https://moneyfitness.app' },
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  var url = event.notification.data && event.notification.data.url ? event.notification.data.url : 'https://moneyfitness.app';
  event.waitUntil(clients.openWindow(url));
});

self.addEventListener('install', function() { self.skipWaiting(); });
self.addEventListener('activate', function(event) { event.waitUntil(clients.claim()); });
