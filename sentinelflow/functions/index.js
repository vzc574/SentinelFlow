/**
 * SentinelFlow SOAR — Cloud Functions
 * ---------------------------------------------------------------------
 * This is the server-side half of the payment flow. The browser can
 * complete a PayPal checkout and get an order ID back, but a browser
 * can never be trusted to decide "and therefore this account is paid"
 * — anyone could fake that call from devtools. So the client sends us
 * the order ID, and THIS code re-checks it directly with PayPal using
 * your secret key before writing anything to the database.
 *
 * DEPLOY:
 *   cd functions
 *   npm install
 *   firebase functions:config:set paypal.client_id="YOUR_PAYPAL_CLIENT_ID" \
 *                                  paypal.secret="YOUR_PAYPAL_SECRET" \
 *                                  paypal.env="sandbox"   # or "live"
 *   firebase deploy --only functions
 *
 * Get your PayPal client ID/secret from
 * https://developer.paypal.com -> Apps & Credentials. Use the Sandbox
 * credentials while testing, Live credentials when you go live (and
 * update paypal.env + the client-id in payment.html to match).
 * ---------------------------------------------------------------------
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

// Expected USD amount per plan — must match the amounts shown on the
// site (index.html / download.html / payment.html). Checked server-side
// so a tampered client-side amount can never be accepted.
const PLAN_AMOUNTS = {
  weekly: "7.00",
  monthly: "19.00",
  yearly: "185.00"
};

function paypalBaseUrl() {
  const env = (functions.config().paypal && functions.config().paypal.env) || "sandbox";
  return env === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

async function getPaypalAccessToken() {
  const clientId = functions.config().paypal.client_id;
  const secret = functions.config().paypal.secret;
  const basic = Buffer.from(`${clientId}:${secret}`).toString("base64");

  const res = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });
  if (!res.ok) throw new Error("Failed to authenticate with PayPal");
  const data = await res.json();
  return data.access_token;
}

exports.verifyPaypalPayment = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Sign in before paying.");
  }
  const { orderID, plan } = data;
  const expectedAmount = PLAN_AMOUNTS[plan];
  if (!orderID || !expectedAmount) {
    throw new functions.https.HttpsError("invalid-argument", "Unknown plan or missing order ID.");
  }

  const accessToken = await getPaypalAccessToken();

  // Capture the order server-side (idempotent if the client's SDK already
  // captured it — PayPal returns the existing capture in that case).
  const captureRes = await fetch(`${paypalBaseUrl()}/v2/checkout/orders/${orderID}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    }
  });
  const order = await captureRes.json();

  const status = order.status;
  const capture = order.purchase_units &&
    order.purchase_units[0] &&
    order.purchase_units[0].payments &&
    order.purchase_units[0].payments.captures &&
    order.purchase_units[0].payments.captures[0];

  const amountOk = capture && capture.amount &&
    capture.amount.value === expectedAmount && capture.amount.currency_code === "USD";
  const statusOk = status === "COMPLETED" || (capture && capture.status === "COMPLETED");

  if (!statusOk || !amountOk) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "PayPal did not confirm a completed payment for the expected amount."
    );
  }

  await admin.firestore().collection("users").doc(context.auth.uid).set(
    {
      plan,
      paid: true,
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      lastPayment: { method: "paypal", orderID, amount: expectedAmount }
    },
    { merge: true }
  );

  return { ok: true };
});

/**
 * One-time-use helper for granting the FIRST admin. After that, do this
 * from the Firebase console or CLI instead (see /README-BACKEND-SETUP.md)
 * rather than leaving a callable function any signed-in user could try
 * to invoke. This function intentionally checks a one-time setup code
 * from functions config rather than trusting the caller at all.
 *
 * Usage (once): firebase functions:config:set admin.setup_code="some-long-random-string"
 * then call this once from the browser console while signed in as the
 * account you want to make admin, passing that same code. Afterwards,
 * run `firebase functions:config:unset admin.setup_code` and redeploy
 * to close this off permanently.
 */
exports.bootstrapFirstAdmin = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Sign in first.");
  }
  const setupCode = functions.config().admin && functions.config().admin.setup_code;
  if (!setupCode || data.setupCode !== setupCode) {
    throw new functions.https.HttpsError("permission-denied", "Invalid or missing setup code.");
  }
  await admin.auth().setCustomUserClaims(context.auth.uid, { admin: true });
  return { ok: true };
});
