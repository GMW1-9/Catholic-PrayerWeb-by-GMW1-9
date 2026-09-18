// Firebase Cloud Messaging background notifications.
// This service worker displays notifications sent through Firebase Cloud Messaging
// or through a standards-compliant Web Push server.

importScripts("https://www.gstatic.com/firebasejs/12.17.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.17.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDwnxuI_EbCB2vTT2CzOhOwumuoqdZ5huM",
  authDomain: "gmw-1-9.firebaseapp.com",
  projectId: "gmw-1-9",
  storageBucket: "gmw-1-9.firebasestorage.app",
  messagingSenderId: "994319050351",
  appId: "1:994319050351:web:fc8b07dcd89bdc8b034f9a"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notification = payload.notification || {};
  const title = notification.title || "Catholic PrayerWeb";
  const options = {
    body: notification.body || "There is a new update on Catholic PrayerWeb.",
    icon: "/Catholic-PrayerWeb-by-GMW1-9/cpw.png",
    badge: "/Catholic-PrayerWeb-by-GMW1-9/cpw.png",
    data: {
      url: payload.data?.url || "/Catholic-PrayerWeb-by-GMW1-9/"
    }
  };

  return self.registration.showNotification(title, options);
});

// Also support ordinary Web Push payloads, if a backend sends them.
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { body: event.data.text() };
  }

  const title = data.title || data.notification?.title || "Catholic PrayerWeb";
  const options = {
    body: data.body || data.notification?.body || "There is a new update on Catholic PrayerWeb.",
    icon: "/Catholic-PrayerWeb-by-GMW1-9/cpw.png",
    badge: "/Catholic-PrayerWeb-by-GMW1-9/cpw.png",
    data: { url: data.url || "/Catholic-PrayerWeb-by-GMW1-9/" }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(
    event.notification.data?.url || "/Catholic-PrayerWeb-by-GMW1-9/",
    self.location.origin
  ).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
