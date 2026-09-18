/*
 * Foreground notifications and per-account What's New badge.
 *
 * Load this file immediately before </body> in index.html:
 * <script type="module" src="notifications.js"></script>
 *
 * The badge is tied to the signed-in Firebase account, not just the browser.
 * The first time an account visits, current news is treated as already read.
 * Later additions to #newsModal .news-item appear as unread for that account
 * until that account opens What's New.
 */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import {
  getFirestore,
  collection,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

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
const siteUrl = "https://gmw1-9.github.io/Catholic-PrayerWeb-by-GMW1-9/";
const seen = new Set();
let ready = false;

function notify(title, body) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const show = (registration) => registration.showNotification(title, {
    body,
    icon: "cpw.png",
    data: { url: siteUrl }
  });

  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.ready.then(show);
  } else {
    const notification = new Notification(title, { body, icon: "cpw.png" });
    notification.onclick = () => window.open(siteUrl, "_blank");
  }
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
  let signedInUser = null;
  let initializedForUser = false;

  function getNewsButton() {
    return [...document.querySelectorAll("button")].find((button) =>
      button.textContent.trim().toUpperCase() === NEWS_BUTTON_TEXT
    );
  }

  function getNewsCount() {
    return document.querySelectorAll("#newsModal .news-item").length;
  }

  function getStorageKey() {
    return signedInUser ? `${STORAGE_PREFIX}${signedInUser.uid}` : null;
  }

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

    // The badge is deliberately hidden for visitors who are not signed in.
    if (!signedInUser || !initializedForUser) {
      badge.hidden = true;
      return;
    }

    const newsCount = getNewsCount();
    const readCount = Number.parseInt(localStorage.getItem(getStorageKey()) || "0", 10);
    const unreadCount = Math.max(newsCount - (Number.isFinite(readCount) ? readCount : newsCount), 0);

    badge.textContent = unreadCount > 99 ? "99+" : String(unreadCount);
    badge.hidden = unreadCount === 0;
  }

  function initializeAccountState() {
    if (!signedInUser) {
      initializedForUser = false;
      updateNewsBadge();
      return;
    }

    const key = getStorageKey();
    const newsCount = getNewsCount();

    // Do not show all old news as new for a first-time account.
    if (localStorage.getItem(key) === null) {
      localStorage.setItem(key, String(newsCount));
    }

    initializedForUser = true;
    updateNewsBadge();
  }

  function markNewsAsRead() {
    if (!signedInUser) return;
    localStorage.setItem(getStorageKey(), String(getNewsCount()));
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

    const newsModal = document.getElementById("newsModal");
    if (newsModal) {
      new MutationObserver(updateNewsBadge).observe(newsModal, {
        childList: true,
        subtree: true
      });
    }

    onAuthStateChanged(auth, (user) => {
      signedInUser = user;
      initializeAccountState();
    });

    updateNewsBadge();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
