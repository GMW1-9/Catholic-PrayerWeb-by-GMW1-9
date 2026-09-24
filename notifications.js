/* Email subscriptions and browser/device push notifications. */
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getFirestore, doc, setDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-messaging.js";

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
let signedInUser = null;

// Firebase Console > Project settings > Cloud Messaging > Web Push certificates.
const vapidKey = "BO5EvAR2FQyd6HTMYooZgOJC0J3HzdcNLTlSTfxXPxJqLcWsFiT-GDBA4veSCEXjJdl16aQt0Cul_JD1HixM7gM";
const siteUrl = "https://gmw1-9.github.io/Catholic-PrayerWeb-by-GMW1-9/";

function subscriberId(email) {
  return btoa(unescape(encodeURIComponent(email))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function serviceWorkerPath() {
  return new URL("firebase-messaging-sw.js", document.baseURI).pathname;
}

async function requestDeviceToken() {
  if (!window.isSecureContext || !("Notification" in window) || !("serviceWorker" in navigator)) {
    throw new Error("Push notifications require HTTPS or localhost and a supported browser.");
  }

  const permission = Notification.permission === "granted"
    ? "granted"
    : await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notification permission was not granted.");

  const registration = await navigator.serviceWorker.register(serviceWorkerPath(), { scope: new URL(".", document.baseURI).pathname });
  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration
  });
  if (!token) throw new Error("Firebase did not return a device token.");
  return token;
}

function renderSubscriptions() {
  const oldButton = document.getElementById("notifyBtn");
  if (!oldButton || document.getElementById("emailNotificationSubscription")) return;
  const panel = document.createElement("section");
  panel.id = "emailNotificationSubscription";
  panel.setAttribute("aria-label", "Email and device notifications");
  panel.style.cssText = "display:flex;flex-direction:column;gap:10px;margin:16px 0;padding:16px;background:#111827;color:white;border-radius:12px;max-width:620px;";
  panel.innerHTML = `
    <strong>Email & device alerts</strong>
    <span style="color:#cbd5e1;font-size:.9rem">Receive updates on your computer and phone.</span>
    <input id="notificationEmail" type="email" autocomplete="email" placeholder="you@example.com" required style="padding:10px;border-radius:8px;border:1px solid #374151;">
    <label><input id="prayerAlerts" type="checkbox" checked> New prayer-request alerts</label>
    <label><input id="websiteUpdates" type="checkbox" checked> Website updates</label>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button id="subscribeEmailBtn" type="button" style="padding:10px 14px;border:0;border-radius:8px;background:#00e5ff;color:#111827;font-weight:bold;cursor:pointer">Subscribe</button>
      <button id="allowDeviceBtn" type="button" style="padding:10px 14px;border:1px solid #00e5ff;border-radius:8px;background:transparent;color:#fff;cursor:pointer">Allow Computer & Phone Alerts</button>
      <button id="unsubscribeEmailBtn" type="button" style="padding:10px 14px;border:1px solid #ef4444;border-radius:8px;background:transparent;color:#fff;cursor:pointer">Unsubscribe</button>
    </div>
    <span id="emailSubscriptionStatus" role="status" style="color:#cbd5e1"></span>`;
  oldButton.replaceWith(panel);

  const email = () => panel.querySelector("#notificationEmail").value.trim().toLowerCase();
  const status = panel.querySelector("#emailSubscriptionStatus");
  const preferences = () => ({
    email: email(),
    uid: signedInUser?.uid || null,
    active: true,
    prayerAlerts: panel.querySelector("#prayerAlerts").checked,
    websiteUpdates: panel.querySelector("#websiteUpdates").checked,
    updatedAt: serverTimestamp()
  });

  panel.querySelector("#allowDeviceBtn").addEventListener("click", async () => {
    if (!panel.querySelector("#notificationEmail").checkValidity()) { status.textContent = "Please enter a valid email address."; return; }
    status.textContent = "Requesting permission…";
    try {
      const token = await requestDeviceToken();
      await setDoc(doc(db, "emailSubscribers", subscriberId(email())), { ...preferences(), deviceNotifications: true, fcmTokens: [token], fcmToken: token }, { merge: true });
      status.textContent = "Computer and phone notifications enabled.";
    } catch (error) {
      console.error(error);
      status.textContent = error.message || "Could not enable device notifications.";
    }
  });

  panel.querySelector("#subscribeEmailBtn").addEventListener("click", async () => {
    if (!panel.querySelector("#notificationEmail").checkValidity()) { status.textContent = "Please enter a valid email address."; return; }
    status.textContent = "Saving…";
    try {
      await setDoc(doc(db, "emailSubscribers", subscriberId(email())), preferences(), { merge: true });
      status.textContent = "Subscribed. Check your email for updates.";
    } catch (error) { console.error(error); status.textContent = "Could not subscribe. Check Firebase permissions."; }
  });

  panel.querySelector("#unsubscribeEmailBtn").addEventListener("click", async () => {
    if (!panel.querySelector("#notificationEmail").checkValidity()) { status.textContent = "Please enter a valid email address."; return; }
    try {
      await deleteDoc(doc(db, "emailSubscribers", subscriberId(email())));
      status.textContent = "You have been unsubscribed.";
    } catch (error) { console.error(error); status.textContent = "Could not unsubscribe. Please try again."; }
  });
}

onMessage(messaging, (payload) => {
  if (Notification.permission === "granted" && document.visibilityState === "visible") {
    new Notification(payload?.notification?.title || "Catholic PrayerWeb", { body: payload?.notification?.body || "You have a new update.", icon: "cpw.png" });
  }
});

(function initialize() {
  onAuthStateChanged(auth, (user) => { signedInUser = user; });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", renderSubscriptions); else renderSubscriptions();
})();
