const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();
const db = getFirestore();
const messaging = getMessaging();
const siteUrl = "https://gmw1-9.github.io/Catholic-PrayerWeb-by-GMW1-9/";
const FCM_BATCH_SIZE = 500;

function validEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function uniqueTokens(values) {
  return [...new Set(values.flatMap((value) => {
    if (Array.isArray(value)) return value;
    return typeof value === "string" ? [value] : [];
  }).filter(Boolean))];
}

async function sendEmail(to, subject, body) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) throw new Error("Missing RESEND_API_KEY or EMAIL_FROM configuration.");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text: `${body}\n\nVisit Catholic PrayerWeb: ${siteUrl}\n\nTo stop these emails, use the unsubscribe option on the website.`
    })
  });
  if (!response.ok) throw new Error(`Email provider returned ${response.status}: ${await response.text()}`);
}

async function emailSubscribers(type, subject, body) {
  const snapshot = await db.collection("emailSubscribers")
    .where("active", "==", true)
    .where(type, "==", true)
    .limit(1000)
    .get();

  await Promise.all(snapshot.docs.map(async (subscriber) => {
    const email = subscriber.data().email;
    if (!validEmail(email)) return;
    try {
      await sendEmail(email, subject, body);
    } catch (error) {
      console.error(`Could not send ${type} email to ${email}:`, error);
    }
  }));
}

async function pushSubscribers(type, title, body) {
  const snapshot = await db.collection("emailSubscribers")
    .where("active", "==", true)
    .where(type, "==", true)
    .where("deviceNotifications", "==", true)
    .limit(1000)
    .get();

  const subscribers = snapshot.docs.map((subscriber) => ({
    ref: subscriber.ref,
    tokens: uniqueTokens([subscriber.data().fcmTokens, subscriber.data().fcmToken])
  })).filter((subscriber) => subscriber.tokens.length > 0);

  const tokenOwners = new Map();
  const allTokens = [];
  for (const subscriber of subscribers) {
    for (const token of subscriber.tokens) {
      allTokens.push(token);
      tokenOwners.set(token, subscriber);
    }
  }

  for (let start = 0; start < allTokens.length; start += FCM_BATCH_SIZE) {
    const tokens = allTokens.slice(start, start + FCM_BATCH_SIZE);
    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: { url: siteUrl },
      webpush: {
        fcmOptions: { link: siteUrl },
        notification: { icon: `${siteUrl}cpw.png`, tag: "cpw-alert" }
      }
    });

    const invalidTokensBySubscriber = new Map();
    response.responses.forEach((result, index) => {
      if (result.success) return;
      const code = result.error?.code || "unknown";
      console.error(`FCM delivery failed for token ${index}: ${code}`, result.error?.message || "");
      if (["messaging/registration-token-not-registered", "messaging/invalid-registration-token"].includes(code)) {
        const subscriber = tokenOwners.get(tokens[index]);
        if (!subscriber) return;
        if (!invalidTokensBySubscriber.has(subscriber.ref.path)) invalidTokensBySubscriber.set(subscriber.ref.path, { subscriber, tokens: [] });
        invalidTokensBySubscriber.get(subscriber.ref.path).tokens.push(tokens[index]);
      }
    });

    await Promise.all([...invalidTokensBySubscriber.values()].map(async ({ subscriber, tokens: invalidTokens }) => {
      const current = subscriber.tokens.filter((token) => !invalidTokens.includes(token));
      await subscriber.ref.set({
        fcmTokens: current,
        fcmToken: current[0] || FieldValue.delete(),
        deviceNotifications: current.length > 0,
        updatedAt: new Date()
      }, { merge: true });
    }));
  }
}

async function notifySubscribers(type, title, body) {
  await Promise.all([
    emailSubscribers(type, title, body),
    pushSubscribers(type, title, body)
  ]);
}

exports.notifyNewPrayer = onDocumentCreated("prayers/{prayerId}", async (event) => {
  const data = event.data?.data() || {};
  await notifySubscribers(
    "prayerAlerts",
    "New Prayer Request - Catholic PrayerWeb",
    `${data.name || "Someone"} shared a new prayer request or encouragement.`
  );
});

exports.notifyWebsiteUpdate = onDocumentCreated("websiteUpdates/{updateId}", async (event) => {
  const data = event.data?.data() || {};
  await notifySubscribers(
    "websiteUpdates",
    "Catholic PrayerWeb Update",
    data.message || data.title || "Catholic PrayerWeb has a new update."
  );
});
