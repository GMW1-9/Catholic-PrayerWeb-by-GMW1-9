const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();
const db = getFirestore();

async function sendToSubscribers(title, body) {
  const snapshot = await db.collection("notificationTokens").limit(500).get();
  const tokens = snapshot.docs.map((entry) => entry.data().token).filter(Boolean);
  if (!tokens.length) return;

  const response = await getMessaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
    data: { url: "https://gmw1-9.github.io/Catholic-PrayerWeb-by-GMW1-9/" },
    webpush: {
      fcmOptions: { link: "https://gmw1-9.github.io/Catholic-PrayerWeb-by-GMW1-9/" }
    }
  });

  const removals = [];
  response.responses.forEach((result, index) => {
    if (!result.success && ["messaging/registration-token-not-registered", "messaging/invalid-registration-token"].includes(result.error?.code)) {
      removals.push(snapshot.docs[index].ref.delete());
    }
  });
  await Promise.all(removals);
}

exports.notifyNewPrayer = onDocumentCreated("prayers/{prayerId}", async (event) => {
  const data = event.data?.data() || {};
  await sendToSubscribers("New Prayer Request", `${data.name || "Someone"} shared a new prayer request or encouragement.`);
});

exports.notifyWebsiteUpdate = onDocumentCreated("websiteUpdates/{updateId}", async (event) => {
  const data = event.data?.data() || {};
  await sendToSubscribers("Catholic PrayerWeb Update", data.message || data.title || "Catholic PrayerWeb has a new update.");
});
