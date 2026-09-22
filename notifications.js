/*
 * Foreground notifications, FCM token registration, and per-account What's New badge.
 *
 * The FCM token is saved to Firestore so the Firebase backend can send notifications
 * even when this page is closed. A service worker cannot keep a Firestore listener
 * alive by itself; the backend trigger in functions/index.js sends the push message.
 */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import {
  getMessaging,
  getToken
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-messaging.js";

const firebaseConfig = {
  apiKey: "AIzaSyDwnxuI_EbCB2vTT2CzOhOwumuoqdZ5huM",
  authDomain: "gmw-1-9.firebaseapp.com",
  projectId: "gmw-1-9",
  storageBucket: "gmw-1-9.firebasestorage.app",
  messagingSenderId: "994319050351",
  appId: "1:994319050351:web:fc8b07dcd89bdc8b034f9a"
};

const app = getApps()[0] || initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const messaging = getMessaging(app);
const siteUrl = "https://gmw1-9.github.io/Catholic-PrayerWeb-by-GMW1-9/";
const seen = new Set();
let ready = false;
let signedInUser = null;

function tokenDocumentId(token) {
  return btoa(token).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

// Called by the notification button. FCM delivers messages through sw.js when
// the tab is closed, minimized, or the installed PWA is not running.
async function enableBackgroundNotifications() {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    throw new Error("This browser does not support background notifications.");
  }

  const permission = Notification.permission === "granted"
    ? "granted"
    : await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notification permission was not granted.");

  const registration = await navigator.serviceWorker.ready;
  const token = await getToken(messaging, { serviceWorkerRegistration: registration });
  if (!token) throw new Error("Firebase did not return a messaging token.");

  await setDoc(doc(db, "notificationTokens", tokenDocumentId(token)), {
    token,
    uid: signedInUser?.uid || null,
    platform: navigator.userAgent,
    updatedAt: serverTimestamp()
  }, { merge: true });

  return token;
}

window.enableBackgroundNotifications = enableBackgroundNotifications;

function notify(title, body) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  navigator.serviceWorker.ready.then((registration) => registration.showNotification(title, {
    body,
    icon: "cpw.png",
    data: { url: siteUrl }
  })).catch(() => {
    const notification = new Notification(title, { body, icon: "cpw.png" });
    notification.onclick = () => window.open(siteUrl, "_blank");
  });
}

function watchCollection(collectionName, title, getBody) {
  onSnapshot(collection(db, collectionName), (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type !== "added") return;
      const key = `${collectionName}:${change.doc.id}`;
      if (seen.has(key)) return;
      seen.add(key);
      if (ready) notify(title, getBody(change.doc.data()));
    });
  }, (error) => console.error(`Notification listener error (${collectionName}):`, error));
}

watchCollection("prayers", "New Prayer Request", (data) =>
  `${data.name || "Someone"} shared a new prayer request or encouragement.`
);
watchCollection("websiteUpdates", "Catholic PrayerWeb Update", (data) =>
  data.message || data.title || "Catholic PrayerWeb has a new update."
);

setTimeout(() => { ready = true; }, 1500);

(function setupNewsBadge() {
  const STORAGE_PREFIX = "catholicPrayerWebNewsReadCount:";
  const NEWS_BUTTON_TEXT = "WHAT'S NEW";
  let initializedForUser = false;

  function getNewsButton() {
    return [...document.querySelectorAll("button")].find((button) =>
      button.textContent.trim().toUpperCase() === NEWS_BUTTON_TEXT
    );
  }
  function getNewsCount() { return document.querySelectorAll("#newsModal .news-item").length; }
  function getStorageKey() { return signedInUser ? `${STORAGE_PREFIX}${signedInUser.uid}` : null; }
  function updateNewsBadge() {
    const button = getNewsButton();
    if (!button) return;
    let badge = button.querySelector(".news-update-badge");
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "news-update-badge";
      badge.setAttribute("aria-label", "unread updates");
      button.appendChild(badge);
    }
    if (!signedInUser || !initializedForUser) { badge.hidden = true; return; }
    const readCount = Number.parseInt(localStorage.getItem(getStorageKey()) || "0", 10);
    const unreadCount = Math.max(getNewsCount() - (Number.isFinite(readCount) ? readCount : getNewsCount()), 0);
    badge.textContent = unreadCount > 99 ? "99+" : String(unreadCount);
    badge.hidden = unreadCount === 0;
  }
  function initializeAccountState() {
    if (!signedInUser) { initializedForUser = false; updateNewsBadge(); return; }
    const key = getStorageKey();
    if (localStorage.getItem(key) === null) localStorage.setItem(key, String(getNewsCount()));
    initializedForUser = true;
    updateNewsBadge();
  }
  function initialize() {
    const button = getNewsButton();
    if (!button) return;
    const style = document.createElement("style");
    style.textContent = `.news-update-badge{position:absolute;top:-10px;right:-10px;min-width:24px;height:24px;padding:0 6px;border-radius:999px;background:#dc2626;color:#fff;display:inline-flex;align-items:center;justify-content:center;font:700 .75rem Arial;box-shadow:0 0 0 2px #111827;pointer-events:none}.news-update-badge[hidden]{display:none}.hero-content .outline-btn{position:relative}`;
    document.head.appendChild(style);
    button.addEventListener("click", () => {
      if (signedInUser) localStorage.setItem(getStorageKey(), String(getNewsCount()));
      updateNewsBadge();
    });
    const newsModal = document.getElementById("newsModal");
    if (newsModal) new MutationObserver(updateNewsBadge).observe(newsModal, { childList: true, subtree: true });
    onAuthStateChanged(auth, (user) => { signedInUser = user; initializeAccountState(); });
    updateNewsBadge();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize);
  else initialize();
})();

// Also wire the existing button directly, without requiring a page refresh.
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("notifyBtn")?.addEventListener("click", () => {
    enableBackgroundNotifications().catch((error) => console.error("Background notifications could not be enabled:", error));
  });
});
