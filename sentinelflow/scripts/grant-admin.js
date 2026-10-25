/**
 * SentinelFlow SOAR — grant-admin.js
 * ---------------------------------------------------------------------
 * Run this ONCE, locally, on your own machine, to make an account an
 * admin who can sign in to admin.html. It never runs in the browser
 * and is never deployed to the website — that's the point: granting
 * admin rights has to happen somewhere a visitor to the site can't
 * reach.
 *
 * SETUP:
 *   1. Firebase console > Project settings > Service accounts >
 *      "Generate new private key". Save the downloaded JSON file
 *      somewhere OUTSIDE this project folder (don't commit it).
 *   2. npm install firebase-admin   (in this /scripts folder, or
 *      wherever you run this from)
 *   3. node grant-admin.js /path/to/serviceAccountKey.json you@example.com
 *
 * The target account must already exist (sign up on the site first
 * with the email you want to grant admin to, then run this).
 * ---------------------------------------------------------------------
 */

const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const path = require("path");

const [, , keyPath, email] = process.argv;

if (!keyPath || !email) {
  console.error("Usage: node grant-admin.js <keyPath> <email>");
  process.exit(1);
}

try {
  const serviceAccount = require(path.resolve(keyPath));

  initializeApp({
    credential: cert(serviceAccount)
  });

  const auth = getAuth();

  auth.getUserByEmail(email)
    .then((user) => auth.setCustomUserClaims(user.uid, { admin: true }))
    .then(() => {
      console.log(`\nSUCCESS: ${email} now has admin privileges!\n`);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Error:", err.message);
      process.exit(1);
    });
} catch (err) {
  console.error("Init Error:", err.message);
  process.exit(1);
}