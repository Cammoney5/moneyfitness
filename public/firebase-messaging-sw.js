importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBZgSYx18WH3CIGN8FsNL-WBbVHlPy9emg",
  authDomain: "moneyfitness-4c7df.firebaseapp.com",
  projectId: "moneyfitness-4c7df",
  storageBucket: "moneyfitness-4c7df.firebasestorage.app",
  messagingSenderId: "195195441193",
  appId: "1:195195441193:web:347d2810422043d565cc38"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  const title = payload.notification?.title || payload.data?.title || 'MoneyFitness';
  const body = payload.notification?.body || payload.data?.body || '';
  const url = payload.data?.url || 'https://moneyfitness.app';
  self.registration.showNotification(title, {
    body,
    icon: '/mf-logo.png',
    data: { url },
    vibrate: [100, 50, 100],
  });
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = event.notification.data?.url || 'https://moneyfitness.app';
  event.waitUntil(clients.openWindow(url));
});
