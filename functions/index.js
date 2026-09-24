const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();
const siteUrl = "https://gmw1-9.github.io/Catholic-PrayerWeb-by-GMW1-9/";

function validEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

exports.notifyNewPrayer = onDocumentCreated("prayers/{prayerId}", async (event) => {
  const data = event.data?.data() || {};
  await emailSubscribers(
    "prayerAlerts",
    "New Prayer Request - Catholic PrayerWeb",
    `${data.name || "Someone"} shared a new prayer request or encouragement.`
  );
});

exports.notifyWebsiteUpdate = onDocumentCreated("websiteUpdates/{updateId}", async (event) => {
  const data = event.data?.data() || {};
  await emailSubscribers(
    "websiteUpdates",
    "Catholic PrayerWeb Update",
    data.message || data.title || "Catholic PrayerWeb has a new update."
  );
});
