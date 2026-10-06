// Firebase Cloud Messaging Service Worker for background push notifications

importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Default config fallback
firebase.initializeApp({
  apiKey: 'demo-api-key',
  authDomain: 'rto-van-manager.firebaseapp.com',
  projectId: 'rto-van-manager',
  storageBucket: 'rto-van-manager.appspot.com',
  messagingSenderId: '123456789012',
  appId: '1:123456789012:web:abcdef123456',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message: ', payload);

  const notificationTitle = payload.notification?.title || 'RTO Van Manager Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'New update available',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    data: payload.data || {},
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const reportId = event.notification.data?.reportId;
  const targetUrl = reportId ? `/admin/reports/${reportId}` : '/admin/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
