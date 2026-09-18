/*
 * Foreground notification helper for Catholic PrayerWeb.
 *
 * Add this immediately before </body> in index.html:
 * <script type="module" src="notifications.js"></script>
 *
 * This notifies visitors whose page is open. Notifications while the page is
 * closed require Firebase Cloud Messaging plus a server/Cloud Function that
 * sends messages to saved FCM tokens.
 */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import {
  getFirestore,
  collection,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

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
const siteUrl = "https://gmw1-9.github.io/Catholic-PrayerWeb-by-GMW1-9/";
const seen = new Set();
let ready = false;

function notify(title, body) {
  if (Notification.permission !== "granted") return;

  const registration = navigator.serviceWorker?.controller
    ? navigator.serviceWorker.ready
    : null;

  if (registration) {
    registration.then((reg) => reg.showNotification(title, {
      body,
      icon: "cpw.png",
      data: { url: siteUrl }
    }));
  } else {
    const notification = new Notification(title, { body, icon: "cpw.png" });
    notification.onclick = () => window.open(siteUrl, "_blank");
  }
}

function watchCollection(collectionName, title, getBody) {
  onSnapshot(collection(db, collectionName), (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type !== "added") return;
      if (seen.has(`${collectionName}:${change.doc.id}`)) return;
      seen.add(`${collectionName}:${change.doc.id}`);
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

// Ignore existing records loaded when the listener first starts.
setTimeout(() => { ready = true; }, 1500);

// Shows the number of news items added since this visitor last opened What's New.
(function setupNewsBadge() {
  const NEWS_READ_KEY = "catholicPrayerWebNewsReadCount";
  const NEWS_BUTTON_TEXT = "WHAT'S NEW";

  function getNewsButton() {
    return [...document.querySelectorAll("button")].find((button) =>
      button.textContent.trim().toUpperCase() === NEWS_BUTTON_TEXT
    );
  }

  function updateNewsBadge() {
    const button = getNewsButton();
    const newsItems = document.querySelectorAll("#newsModal .news-item");
    if (!button || !newsItems.length) return;

    let readCount = Number.parseInt(localStorage.getItem(NEWS_READ_KEY) || "0", 10);
    if (!Number.isFinite(readCount) || readCount > newsItems.length) readCount = 0;

    let badge = button.querySelector(".news-update-badge");
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "news-update-badge";
      badge.setAttribute("aria-label", "unread updates");
      button.appendChild(badge);
    }

    const unreadCount = Math.max(newsItems.length - readCount, 0);
    badge.textContent = unreadCount > 99 ? "99+" : String(unreadCount);
    badge.hidden = unreadCount === 0;
  }

  function markNewsAsRead() {
    const newsItems = document.querySelectorAll("#newsModal .news-item");
    localStorage.setItem(NEWS_READ_KEY, String(newsItems.length));
    updateNewsBadge();
  }

  function initialize() {
    const button = getNewsButton();
    if (!button) return;

    const style = document.createElement("style");
    style.textContent = `
      .news-update-badge {
        position: absolute;
        top: -10px;
        right: -10px;
        min-width: 24px;
        height: 24px;
        padding: 0 6px;
        border-radius: 999px;
        background: #dc2626;
        color: #fff;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font: 700 0.75rem Arial, sans-serif;
        line-height: 1;
        box-shadow: 0 0 0 2px #111827;
        pointer-events: none;
      }
      .news-update-badge[hidden] { display: none; }
      .hero-content .outline-btn { position: relative; }
    `;
    document.head.appendChild(style);

    button.addEventListener("click", markNewsAsRead);
    updateNewsBadge();

    const newsModal = document.getElementById("newsModal");
    if (newsModal) {
      new MutationObserver(updateNewsBadge).observe(newsModal, {
        childList: true,
        subtree: true
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
