/* Email subscriptions and the per-account What's New badge.
 * Notifications are sent by the Firebase backend through the configured email
 * provider. This file intentionally does not request browser notification
 * permission, create desktop notifications, or register FCM tokens.
 */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp
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
let signedInUser = null;

function emailDocumentId(email) {
  return btoa(unescape(encodeURIComponent(email))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function replaceNotificationButton() {
  const oldButton = document.getElementById("notifyBtn");
  if (!oldButton || oldButton.dataset.emailSubscriptionReady) return;

  // Replace the old browser-notification button so its inline desktop
  // Notification handler cannot be triggered anymore.
  const container = document.createElement("div");
  container.id = "emailNotificationSubscription";
  container.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:16px 0;";
  container.innerHTML = `
    <label for="notificationEmail" style="color:white;">Email updates:</label>
    <input id="notificationEmail" type="email" autocomplete="email" placeholder="you@example.com" aria-label="Email address for updates" required
      style="padding:10px;border-radius:8px;border:1px solid #374151;min-width:220px;">
    <button id="subscribeEmailBtn" type="button" style="padding:10px 14px;border:0;border-radius:8px;background:#00e5ff;color:#111827;font-weight:bold;cursor:pointer;">Subscribe</button>
    <span id="emailSubscriptionStatus" role="status" style="color:#cbd5e1;"></span>`;
  oldButton.replaceWith(container);

  container.querySelector("#subscribeEmailBtn").addEventListener("click", async () => {
    const input = container.querySelector("#notificationEmail");
    const status = container.querySelector("#emailSubscriptionStatus");
    const email = input.value.trim().toLowerCase();
    if (!input.checkValidity() || !email) {
      status.textContent = "Please enter a valid email address.";
      return;
    }
    status.textContent = "Saving…";
    try {
      await setDoc(doc(db, "emailSubscribers", emailDocumentId(email)), {
        email,
        uid: signedInUser?.uid || null,
        active: true,
        updatedAt: serverTimestamp()
      }, { merge: true });
      status.textContent = "Subscribed! Updates will be emailed to you.";
      input.value = "";
    } catch (error) {
      console.error("Email subscription failed:", error);
      status.textContent = "Could not subscribe. Please try again.";
    }
  });
}

(function setupNewsBadge() {
  const STORAGE_PREFIX = "catholicPrayerWebNewsReadCount:";
  const NEWS_BUTTON_TEXT = "WHAT'S NEW";
  let initializedForUser = false;

  function getNewsButton() {
    return [...document.querySelectorAll("button")].find((button) => button.textContent.trim().toUpperCase() === NEWS_BUTTON_TEXT);
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
  function initialize() {
    replaceNotificationButton();
    const button = getNewsButton();
    if (!button) return;
    const style = document.createElement("style");
    style.textContent = `.news-update-badge{position:absolute;top:-10px;right:-10px;min-width:24px;height:24px;padding:0 6px;border-radius:999px;background:#dc2626;color:#fff;display:inline-flex;align-items:center;justify-content:center;font:700 .75rem Arial;box-shadow:0 0 0 2px #111827;pointer-events:none}.news-update-badge[hidden]{display:none}.hero-content .outline-btn{position:relative}`;
    document.head.appendChild(style);
    button.addEventListener("click", () => {
      if (signedInUser) localStorage.setItem(getStorageKey(), String(getNewsCount()));
      updateNewsBadge();
    });
    onAuthStateChanged(auth, (user) => {
      signedInUser = user;
      initializedForUser = Boolean(user);
      updateNewsBadge();
    });
    updateNewsBadge();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize);
  else initialize();
})();
