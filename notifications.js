/* Email subscriptions only. No browser notification permission, FCM, or push messages. */
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getFirestore, doc, setDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

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

function subscriberId(email) {
  return btoa(unescape(encodeURIComponent(email))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function renderEmailSubscriptions() {
  const oldButton = document.getElementById("notifyBtn");
  if (!oldButton || document.getElementById("emailNotificationSubscription")) return;
  const panel = document.createElement("section");
  panel.id = "emailNotificationSubscription";
  panel.setAttribute("aria-label", "Email update subscriptions");
  panel.style.cssText = "display:flex;flex-direction:column;gap:10px;margin:16px 0;padding:16px;background:#111827;color:white;border-radius:12px;max-width:620px;";
  panel.innerHTML = `
    <strong>Email updates</strong>
    <span style="color:#cbd5e1;font-size:.9rem">Receive updates by email even when this website is closed. No browser notifications are used.</span>
    <input id="notificationEmail" type="email" autocomplete="email" placeholder="you@example.com" aria-label="Email address" required style="padding:10px;border-radius:8px;border:1px solid #374151;">
    <label><input id="prayerAlerts" type="checkbox" checked> New prayer-request alerts</label>
    <label><input id="websiteUpdates" type="checkbox" checked> Website updates</label>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button id="subscribeEmailBtn" type="button" style="padding:10px 14px;border:0;border-radius:8px;background:#00e5ff;color:#111827;font-weight:bold;cursor:pointer">Subscribe</button>
      <button id="unsubscribeEmailBtn" type="button" style="padding:10px 14px;border:1px solid #ef4444;border-radius:8px;background:transparent;color:#fff;cursor:pointer">Unsubscribe</button>
    </div>
    <span id="emailSubscriptionStatus" role="status" style="color:#cbd5e1"></span>`;
  oldButton.replaceWith(panel);

  const emailInput = panel.querySelector("#notificationEmail");
  const status = panel.querySelector("#emailSubscriptionStatus");
  const getEmail = () => emailInput.value.trim().toLowerCase();
  const showError = () => { status.textContent = "Please enter a valid email address."; };

  panel.querySelector("#subscribeEmailBtn").addEventListener("click", async () => {
    const email = getEmail();
    if (!emailInput.checkValidity() || !email) return showError();
    status.textContent = "Saving…";
    try {
      await setDoc(doc(db, "emailSubscribers", subscriberId(email)), {
        email,
        uid: signedInUser?.uid || null,
        active: true,
        prayerAlerts: panel.querySelector("#prayerAlerts").checked,
        websiteUpdates: panel.querySelector("#websiteUpdates").checked,
        updatedAt: serverTimestamp()
      }, { merge: true });
      status.textContent = "Subscribed. Check your email for updates.";
    } catch (error) {
      console.error(error);
      status.textContent = "Could not subscribe. Check your Firebase permissions and try again.";
    }
  });

  panel.querySelector("#unsubscribeEmailBtn").addEventListener("click", async () => {
    const email = getEmail();
    if (!emailInput.checkValidity() || !email) return showError();
    status.textContent = "Removing subscription…";
    try {
      await deleteDoc(doc(db, "emailSubscribers", subscriberId(email)));
      status.textContent = "You have been unsubscribed.";
    } catch (error) {
      console.error(error);
      status.textContent = "Could not unsubscribe. Please try again.";
    }
  });
}

(function setupNewsBadge() {
  const prefix = "catholicPrayerWebNewsReadCount:";
  let initialized = false;
  const getButton = () => [...document.querySelectorAll("button")].find((b) => b.textContent.trim().toUpperCase() === "WHAT'S NEW");
  const count = () => document.querySelectorAll("#newsModal .news-item").length;
  const key = () => signedInUser ? `${prefix}${signedInUser.uid}` : null;
  function update() {
    const button = getButton(); if (!button) return;
    let badge = button.querySelector(".news-update-badge");
    if (!badge) { badge = document.createElement("span"); badge.className = "news-update-badge"; badge.setAttribute("aria-label", "unread updates"); button.appendChild(badge); }
    if (!signedInUser || !initialized) { badge.hidden = true; return; }
    const read = Number.parseInt(localStorage.getItem(key()) || "0", 10);
    const unread = Math.max(count() - (Number.isFinite(read) ? read : count()), 0);
    badge.textContent = unread > 99 ? "99+" : String(unread); badge.hidden = unread === 0;
  }
  function initialize() {
    renderEmailSubscriptions();
    const button = getButton(); if (!button) return;
    onAuthStateChanged(auth, (user) => { signedInUser = user; initialized = Boolean(user); update(); });
    button.addEventListener("click", () => { if (signedInUser) localStorage.setItem(key(), String(count())); update(); });
    update();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize); else initialize();
})();
