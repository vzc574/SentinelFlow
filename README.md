# SentinelFlow SOAR

**Live site:** https://sentinelflow-r4f6.onrender.com

SentinelFlow is a security orchestration, automation and response (SOAR)
platform. This repository holds its website, where users create accounts,
choose a plan, pay, and download the SentinelFlow desktop build.

Team members are listed in [MEMBERS.md](MEMBERS.md).

---

## The problem

Security Operations Center (SOC) analysts receive thousands of alerts a week
from SIEMs, endpoint tools and cloud services. Most of them are noise or
repeats, and teams can only investigate a small part of them. Real attacks get
missed or found late, and analysts burn out on repetitive triage work.

Small organizations, including many in Ethiopia, face the same threats but:

- cannot afford large enterprise security tools priced by data volume;
- cannot pay with international cards, so they are locked out of most
  security software;
- lack staff to triage every alert by hand.

## Our solution

SentinelFlow takes signal from a SIEM, EDR and cloud logs, groups related
alerts into cases, and runs the first steps of response automatically, so
analysts spend their time on real incidents.

The product comes in plans priced per period, not per data volume, and can be
paid with **PayPal**, **Telebirr** or **Commercial Bank of Ethiopia (CBE)**.

| Plan    | Price       | Includes |
|---------|-------------|----------|
| Free    | $0          | Core detection engine, antivirus, performance optimizer, community support |
| Weekly  | $7 / week   | Full Professional build, SOC analysis (Blue Team), AI report writer |
| Monthly | $19 / month | Same as Weekly |
| Yearly  | $185 / year | Same as Weekly |

## How it works

```
 Browser (static site on Render)
   │
   ├── Firebase Authentication ── email/password and Google sign-in
   │
   ├── Cloud Firestore ────────── users, payment_claims, messages
   │      └── firestore.rules decide who can read/write what
   │
   └── Cloud Functions ────────── verifyPaypalPayment, bootstrapFirstAdmin
          └── checks payments with PayPal on the server, never trusts the browser
```

1. **Sign up / sign in** (`login.html`): Firebase Auth creates the account. A
   profile document `users/{uid}` is created with `plan: "free"` and
   `paid: false`. Because it is tied to the account, it works on any device.
2. **Choose a plan** (`download.html`): the user picks Free, Weekly, Monthly or
   Yearly.
3. **Pay** (`payment.html`):
   - **PayPal**: after checkout, the `verifyPaypalPayment` Cloud Function asks
     PayPal's API whether the payment really happened, then marks the user as
     paid.
   - **Telebirr / CBE**: the user sends money and submits the transaction
     reference. It is saved in `payment_claims` for an admin to check.
4. **Admin review** (`admin.html`): an admin sees pending claims and
   approves or rejects them. Approving activates the user's plan right away.
5. **Download**: paid users get the Professional build
   (`downloads/SentinelFlow_Setup.exe`); free users get the core build.
6. **Contact** (`contact.html`): anyone can send a message; it is stored in
   `messages` and only admins can read it.

## Security design

- **No secrets in the site code.** The Firebase web config in
  `js/firebase-config.js` is public by design; access is controlled by rules,
  not by hiding keys.
- **Users cannot make themselves "paid".** `firestore.rules` blocks a client
  from changing its own `paid` or `plan` fields. Only the PayPal Cloud
  Function or an admin can.
- **Admin is a server-granted claim.** There is no admin password in the site.
  The `admin` custom claim is set only by server-side code
  (`scripts/grant-admin.js` or `bootstrapFirstAdmin`), and both the admin page
  and the database rules check it.
- **Private data stays private.** Users can read only their own profile and
  claims; contact messages are readable by admins only. Unauthenticated reads
  of `users`, `payment_claims` and `messages` are denied.
- **Server-only files are not published.** The Render build copies only the
  public site into `public/`, so `functions/`, `scripts/` and the Firebase
  config files are not served.
- **Security headers.** HTTPS, `X-Frame-Options: DENY` (blocks clickjacking)
  and `X-Content-Type-Options: nosniff`.

## Project structure

```
├── index.html, about.html, contact.html, privacy.html, terms.html
├── login.html          sign up / sign in
├── download.html       plans and downloads
├── payment.html        PayPal, Telebirr and CBE checkout
├── admin.html          admin panel (claims, users, messages)
├── css/style.css
├── js/                 one script per page + firebase-config.js
├── assets/             images and icon
├── downloads/          SentinelFlow_Setup.exe (Windows installer)
├── functions/          Firebase Cloud Functions (PayPal verify, first admin)
├── scripts/            grant-admin.js (give a user admin rights)
├── firestore.rules     database security rules
├── render.yaml         Render deployment config
└── README-BACKEND-SETUP.md   step-by-step Firebase / PayPal setup
```

## Run locally

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080.

## Deploy

The site is deployed on **Render** as a static site using `render.yaml`. Every
push to `main` redeploys automatically.

Backend setup (Firebase project, rules, PayPal, first admin) is described in
[README-BACKEND-SETUP.md](README-BACKEND-SETUP.md).

## Technologies

- HTML, CSS, JavaScript (no framework)
- Firebase Authentication, Cloud Firestore, Cloud Functions (Node.js)
- PayPal JS SDK
- Render (static hosting, Cloudflare CDN)

## Known limitations and next steps

- **PayPal is not live yet.** It needs a real PayPal client ID in
  `payment.html` and the Cloud Function deployed (Firebase Blaze plan).
- **CBE account details are placeholders** in `payment.html` and must be
  replaced with the real account.
- **Telebirr and CBE are verified manually** by an admin. Automating this
  needs the Telebirr and CBE merchant APIs.
- **The Windows installer is not code-signed**, so Windows SmartScreen shows a
  warning on download.
- Planned: email notification to admins when a new payment claim arrives.
