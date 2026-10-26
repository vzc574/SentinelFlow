# SentinelFlow SOAR — backend setup

This site is static (HTML/CSS/JS), but three things it now does —
**real accounts that work on any device, a real database of who's
paid, and a secure admin panel** — need an actual backend. We used
**Firebase** because it gives you all three without you having to
host and maintain a server yourself.

Everything below is a one-time setup. None of it requires you to know
how to run a server — you're filling in config values and clicking
through the Firebase console, the same way you did for the Google
sign-in client ID.

## 1. Create the Firebase project

1. Go to <https://console.firebase.google.com> → **Add project**.
   The free "Spark" plan covers this site.
2. **Build → Authentication → Get started.** Enable the **Email/Password**
   and **Google** sign-in providers.
3. **Build → Firestore Database → Create database.** Choose
   **production mode** (we provide real security rules below — don't
   leave it in open test mode).
4. **Project settings (gear icon) → General → Your apps → Add app → Web.**
   Firebase shows you a config object. Copy those six values into
   `js/firebase-config.js` (`FIREBASE_CONFIG`).

At this point, sign-up/sign-in on `login.html`, the navbar profile
widget, and the contact form (`messages` collection) will all work —
they only need steps 1–4.

## 2. Deploy the security rules

Open `firestore.rules` in this project. In the Firebase console:
**Firestore Database → Rules** → paste the contents → **Publish**.

(Or with the CLI: `firebase deploy --only firestore:rules`, after
`firebase init` in this folder and selecting your project.)

**Do this before accepting real payments.** These rules are what stop
someone from opening devtools and setting their own account to
`paid: true` — the app code alone can't prevent that; the database has
to refuse it.

## 3. PayPal

1. Create a PayPal developer account at <https://developer.paypal.com>
   → **Apps & Credentials**. Use **Sandbox** credentials while testing.
2. In `payment.html`, replace `YOUR_PAYPAL_CLIENT_ID` in the PayPal SDK
   `<script>` tag with your client ID.
3. Deploy the Cloud Function that verifies payments server-side (this
   is the piece that actually checks with PayPal that money changed
   hands, rather than trusting the browser):
   ```bash
   cd functions
   npm install
   firebase functions:config:set paypal.client_id="YOUR_CLIENT_ID" \
                                  paypal.secret="YOUR_SECRET" \
                                  paypal.env="sandbox"
   firebase deploy --only functions
   ```
4. When you're ready to take real payments, switch to your PayPal
   **Live** credentials in both places and set `paypal.env="live"`.

Without this function deployed, the PayPal buttons still render and
collect payment on PayPal's side, but the page will tell the user the
verification step isn't connected yet rather than pretending it
succeeded.

## 4. Telebirr and CBE

Neither Telebirr nor the Commercial Bank of Ethiopia offers a public
client-side JS checkout SDK the way PayPal does — processing these for
real requires their merchant APIs, which run server-side with your own
merchant credentials (and, for Telebirr, cryptographic request signing).
That's a genuine integration project in its own right.

What's built now: a real, working **manual verification flow**. The
user submits their transaction reference, it's stored in the
`payment_claims` collection, and you approve or reject it from
`admin.html` — approving instantly activates their plan. This is a
legitimate way to run these payment methods manually; many businesses
in Ethiopia do exactly this. If you later get access to Telebirr's or
CBE's merchant API, the `payment_claims` flow is where you'd plug in
automated verification, the same way the PayPal Cloud Function does.

Update the placeholder bank details in `payment.html`'s CBE panel
(account name, number, branch) with your real ones.

## 5. Grant yourself admin access

Admin access is a custom claim on your Firebase Auth account that
**only server-side code can grant** — there's no admin password
anywhere in the site's code for someone to find.

1. Sign up for a normal account on the site first (via `login.html`),
   using the email you want to administer with.
2. Firebase console → Project settings → Service accounts → **Generate
   new private key**. Save the JSON file somewhere outside this
   project folder (never commit it or upload it anywhere public).
3. From `scripts/`:
   ```bash
   npm install firebase-admin
   node grant-admin.js /path/to/serviceAccountKey.json you@example.com
   ```
4. Sign out and back in at `admin.html` (not linked from the public
   navbar on purpose — go to it directly by URL).

## What's genuinely secure here vs. what to double check

- **Admin login** has no hardcoded credentials in any file a browser
  can download, and both the client UI and the database rules check
  the same server-granted claim — someone would need to compromise
  your Firebase project itself, not just read the site's source, to
  get in.
- **Paid status** can only be set by the PayPal Cloud Function or an
  admin approving a claim — never by the client directly. This is
  enforced by `firestore.rules`, not just by the app's JavaScript.
- **Review `firestore.rules` yourself** (and ideally test them with
  the Firebase emulator suite) before going live — they're a strong
  starting point, written for this exact data model, but you know your
  requirements better than a first pass can.
- **Telebirr/CBE approval is manual by design** right now — budget for
  checking `admin.html` periodically, or build a notification (e.g. a
  Cloud Function that emails you) when a new claim comes in.
