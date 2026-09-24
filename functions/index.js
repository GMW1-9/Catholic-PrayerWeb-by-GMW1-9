const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const crypto = require("node:crypto");

initializeApp();
const db = getFirestore();
const siteUrl = "https://gmw1-9.github.io/Catholic-PrayerWeb-by-GMW1-9/";

function emailIsValid(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function sendEmail(to, subject, body) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.error("Email notifications are not configured. Set RESEND_API_KEY and EMAIL_FROM.");
    return false;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text: `${body}\n\nVisit Catholic PrayerWeb: ${siteUrl}`
    })
  });

  if (!response.ok) {
    console.error("Email provider rejected a notification:", response.status, await response.text());
    return false;
  }
  return true;
}

async function sendToEmailSubscribers(subject, body) {
  const snapshot = await db.collection("emailSubscribers").where("active", "==", true).limit(1000).get();
  const deliveries = snapshot.docs.map(async (entry) => {
    const email = entry.data().email;
    if (!emailIsValid(email)) return;
    try {
      await sendEmail(email, subject, body);
    } catch (error) {
      console.error(`Could not email ${email}:`, error);
    }
  });
  await Promise.all(deliveries);
}

exports.notifyNewPrayer = onDocumentCreated("prayers/{prayerId}", async (event) => {
  const data = event.data?.data() || {};
  await sendToEmailSubscribers(
    "New Prayer Request - Catholic PrayerWeb",
    `${data.name || "Someone"} shared a new prayer request or encouragement.`
  );
});

exports.notifyWebsiteUpdate = onDocumentCreated("websiteUpdates/{updateId}", async (event) => {
  const data = event.data?.data() || {};
  await sendToEmailSubscribers(
    "Catholic PrayerWeb Update",
    data.message || data.title || "Catholic PrayerWeb has a new update."
  );
});
