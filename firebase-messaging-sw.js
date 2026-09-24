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

  self.registration.showNotification(title, {
    body,
    icon: "/cpw.png",
    tag: "cpw-alert"
  });
});

importScripts("https://www.gstatic.com/firebasejs/12.17.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.17.1/firebase-messaging-compat.js");

f// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDwnxuI_EbCB2vTT2CzOhOwumuoqdZ5huM",
  authDomain: "gmw-1-9.firebaseapp.com",
  databaseURL: "https://gmw-1-9-default-rtdb.firebaseio.com",
  projectId: "gmw-1-9",
  storageBucket: "gmw-1-9.firebasestorage.app",
  messagingSenderId: "994319050351",
  appId: "1:994319050351:web:fc8b07dcd89bdc8b034f9a",
  measurementId: "G-ZJFD1GVXS6"
};

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload?.notification?.title || "Catholic PrayerWeb";
  const body = payload?.notification?.body || "You have a new update.";

  self.registration.showNotification(title, {
    body,
    icon: "/Catholic-PrayerWeb-by-GMW1-9/cpw.png",
    tag: "cpw-alert"
  });
});
