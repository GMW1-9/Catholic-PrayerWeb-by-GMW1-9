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
  const title = payload?.notification?.title || "Catholic PrayerWeb";
  const body = payload?.notification?.body || "You have a new update.";
  const url = payload?.data?.url || "https://gmw1-9.github.io/Catholic-PrayerWeb-by-GMW1-9/";

  self.registration.showNotification(title, {
    body,
    icon: "/Catholic-PrayerWeb-by-GMW1-9/cpw.png",
    tag: "cpw-alert",
    data: { url }
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || "https://gmw1-9.github.io/Catholic-PrayerWeb-by-GMW1-9/"));
});
