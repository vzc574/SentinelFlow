/* SentinelFlow SOAR — firebase-config.js
   ---------------------------------------------------------------------
   This is the one place that knows how to reach your real backend.
   Firebase gives this static site three things it cannot have on its
   own: real accounts (Firebase Authentication), a real cloud database
   (Firestore) that's the same data no matter which device or browser
   signs in, and a place to run trusted server-side code (Cloud
   Functions) for things a browser must never be trusted to decide on
   its own — like "did this PayPal payment actually happen" or "is this
   person an admin."

   SETUP (one-time, takes about 10 minutes):
   1. Go to https://console.firebase.google.com and create a project
      (the free "Spark" plan covers this site entirely).
   2. Build > Authentication > get started. Enable the "Email/Password"
      and "Google" sign-in providers.
   3. Build > Firestore Database > create database (start in
      "production mode" — we provide the real security rules below).
   4. Project settings (gear icon) > General > "Your apps" > add a Web
      app. Firebase will show you a config object — copy its values
      into FIREBASE_CONFIG below.
   5. Deploy the security rules in /firestore.rules from the Firebase
      console's Firestore > Rules tab (paste and publish), or with the
      Firebase CLI: `firebase deploy --only firestore:rules`.
   6. Deploy the Cloud Function in /functions (see /functions/README.md
      and /README-BACKEND-SETUP.md) so PayPal payments can be verified
      server-side.
   7. See /README-BACKEND-SETUP.md for granting yourself the admin
      role so you can sign in to admin.html.

   Until you fill this in, every page on the site still works — sign-in
   buttons will show a clear "not configured yet" message instead of
   silently failing.
   --------------------------------------------------------------------- */

var FIREBASE_CONFIG = {
  apiKey: "AIzaSyBfyROcIaRpT2ilAYk4a4zy_qrKUXOliQs",
  authDomain: "soar-9a428.firebaseapp.com",
  projectId: "soar-9a428",
  storageBucket: "soar-9a428.firebasestorage.app",
  messagingSenderId: "556910562290",
  appId: "1:556910562290:web:8cb1c25d708a2a21f7b96b"
};

var FIREBASE_CONFIGURED = FIREBASE_CONFIG.apiKey.indexOf("YOUR_FIREBASE_API_KEY") !== 0;

if (FIREBASE_CONFIGURED && window.firebase) {
  firebase.initializeApp(FIREBASE_CONFIG);
}

/** Shared helper: run `fn(user)` whenever auth state is known/changes.
 *  Calls fn(null) immediately if Firebase isn't configured yet, so
 *  every page degrades gracefully before you've set this up. */
function sfOnAuthReady(fn) {
  if (!FIREBASE_CONFIGURED || !window.firebase) { fn(null); return; }
  firebase.auth().onAuthStateChanged(function (user) { fn(user); });
}

/** Shared helper: get (or lazily create) this user's Firestore profile
 *  document, keyed by their real Firebase Auth UID — the same UID no
 *  matter which device or browser they sign in from. */
function sfEnsureUserDoc(user) {
  if (!FIREBASE_CONFIGURED || !user) return Promise.resolve(null);
  var ref = firebase.firestore().collection("users").doc(user.uid);
  return ref.get().then(function (snap) {
    if (snap.exists) return snap.data();
    var doc = {
      name: user.displayName || user.email,
      email: user.email,
      photoURL: user.photoURL || null,
      provider: user.providerData[0] ? user.providerData[0].providerId : "password",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      plan: "free",
      paid: false
    };
    return ref.set(doc, { merge: true }).then(function () { return doc; });
  });
}
