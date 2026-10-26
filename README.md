# SentinelFlow SOAR

**Live site:** https://sentinelflow-r4f6.onrender.com
**Repository:** https://github.com/vzc574/SentinelFlow

SentinelFlow is a **Security Orchestration, Automation and Response (SOAR)**
platform for Security Operations Center (SOC) teams. It collects alerts from
the security tools an organization already uses, groups related alerts into a
single case, enriches them with threat intelligence, and runs the first steps
of the response automatically. Analysts then only have to confirm, adjust or
escalate, instead of doing every repetitive step by hand.

This repository contains the **SentinelFlow website**: the public product
site, user accounts, plan selection, payment (PayPal, Telebirr and CBE), an
admin panel, and the download of the SentinelFlow Windows desktop build.

---

## Table of contents

1. [Demo video](#demo-video)
2. [Group members](#group-members)
3. [Purpose of the project](#purpose-of-the-project)
4. [Main features](#main-features)
5. [Plans and pricing](#plans-and-pricing)
6. [How it works (user journey)](#how-it-works-user-journey)
7. [System architecture](#system-architecture)
8. [Data model](#data-model)
9. [Security design](#security-design)
10. [Project structure](#project-structure)
11. [Technologies](#technologies)
12. [Run locally](#run-locally)
13. [Deployment](#deployment)
14. [Current status](#current-status)
15. [Known limitations and future work](#known-limitations-and-future-work)

---

## Demo video

The project demonstration video is [`design.mp4`](design.mp4) in the root of
this repository
([direct download](https://github.com/vzc574/SentinelFlow/raw/main/design.mp4),
about 27 MB). It is kept in the repository only and is not published on the
live site.

## Group members

| No. | Name               | ID           |
|-----|--------------------|--------------|
| 1   | Abreham Solomon    | CTC-2933-26  |
| 2   | Bereket Getnet     | CTC-683-26   |
| 3   | Natnael Tilahun    | CTC-3177-26  |
| 4   | Tesfamikael Almaw  | CTC-1358-26  |
| 5   | Yohannes Eshetu    | CTC-3233-26  |

---

## Purpose of the project

### The problem

A SOC receives thousands of alerts every week from SIEMs, endpoint detection
and response (EDR) tools, identity providers and cloud services. Most of these
alerts are false positives or duplicates of each other. Because the volume is
so high:

- analysts can investigate only a small part of the alerts, so **real attacks
  are missed or found late**;
- the same manual steps (look up an IP, check a user, isolate a machine, open
  a ticket) are **repeated over and over**, which leads to burnout;
- information gets **lost between shifts**, because evidence and notes are
  spread across many tools and spreadsheets.

Small and medium organizations, including many in **Ethiopia**, face the same
threats as large companies but have extra problems:

- enterprise security tools are expensive and usually **priced by data
  volume**;
- most security software can only be bought with **international cards**,
  which many local organizations do not have;
- they **do not have enough staff** to triage every alert by hand.

### Our goal

SentinelFlow aims to **give analysts their time back**. The software does the
repetitive first part of triage and response automatically, so people spend
their time on decisions that need human judgment. At the same time, the
website makes the product **accessible to local organizations** by:

- offering a **Free** plan and short **weekly** plans, not only long, expensive
  contracts;
- pricing by period, **not by data volume**;
- accepting **Telebirr** and **Commercial Bank of Ethiopia (CBE)** payments in
  addition to PayPal.

---

## Main features

### A. SentinelFlow product (desktop build)

These are the capabilities of the SentinelFlow platform presented on the
website and delivered through the downloadable build.

| Module | What it does |
|--------|--------------|
| **Detection engine** | Correlates events from SIEM, EDR, identity and cloud logs into a single scored case, removing duplicate alerts before an analyst sees them. |
| **Automated playbooks** | Response logic built in a visual editor, for example isolate a host, disable a user or open a ticket, which runs as soon as its conditions match. |
| **Case management** | One timeline per incident with alerts, evidence, actions taken and analyst notes, so nothing is lost when a shift changes. |
| **Threat intelligence** | Built-in feeds enrich indicators (IPs, domains, hashes) automatically and flag matches with known malicious infrastructure. |
| **Integration hub** | Two-way connectors to the tools a SOC already runs, so SentinelFlow works alongside the existing SIEM and EDR instead of replacing them. |
| **Compliance reporting** | Audit-ready reports mapped to SOC 2, ISO 27001 and HIPAA controls, generated from case history. |
| **Antivirus and performance optimizer** | Included in every plan, including Free. |
| **SOC analysis (Blue Team) and AI report writer** | Included in the paid Professional build. |

**Response workflow** used by the product:

1. **Detect**: raw events arrive from connected sources and are normalized
   into a common format.
2. **Triage**: correlation rules and threat intelligence score each case and
   send it to the right queue.
3. **Automate**: matching playbooks run immediately, so containment starts
   before an analyst opens the case.
4. **Resolve**: the analyst confirms, adjusts or escalates, and the full
   timeline is logged for audit.

### B. Website (this repository)

| Feature | Details |
|---------|---------|
| **Product pages** | Home (capabilities, workflow, integrations, pricing, FAQ), About, Contact, Privacy policy and Terms of service. |
| **User accounts** | Sign up and sign in with **email and password** or **Google**, using Firebase Authentication. Passwords must have at least 8 characters, a number and a symbol. Clear error messages for wrong passwords, existing accounts and similar cases. |
| **Account works on every device** | The plan and payment status are stored on the account in the cloud, not in the browser. A user who pays on one computer can sign in on another and download the Professional build there too. |
| **Profile widget** | After sign-in, the navigation bar shows the user's name and current plan status (Free, payment pending, or active). |
| **Plan selection** | Free, Weekly, Monthly and Yearly plans on `download.html`. |
| **Three payment methods** | **PayPal** (card or PayPal balance, verified on the server), **Telebirr** and **CBE** (the user pays, then submits the transaction reference for verification). |
| **Admin panel** | `admin.html`, restricted to accounts with a server-granted admin claim. It shows an overview (number of users, pending claims, messages), the user list, Telebirr/CBE payment claims with **Approve / Reject** buttons, and contact messages. Approving a claim activates the user's plan immediately. |
| **Downloads** | Paid users get the Professional build (`SentinelFlow_Setup.exe`); free users get the core build. |
| **Contact form** | Name, work email, company, reason (sales, support, security disclosure, partnership, other) and message, with input validation. Messages are stored in the database and only admins can read them. |
| **Light and dark theme** | Follows the system setting by default; the user's choice is remembered. |
| **Responsive and accessible** | Works on phones and desktops, with a "skip to content" link and labelled form fields. |

---

## Plans and pricing

| Plan    | Price       | Includes |
|---------|-------------|----------|
| Free    | $0, forever | Core detection engine, antivirus, performance optimizer, community support |
| Weekly  | $7 / week   | Full Professional build, antivirus, performance optimizer, SOC analysis (Blue Team), AI report writer |
| Monthly | $19 / month | Same as Weekly |
| Yearly  | $185 / year | Same as Weekly |

---

## How it works (user journey)

1. **Sign up / sign in** (`login.html`)
   Firebase Authentication creates the account. A profile document
   `users/{uid}` is created with `plan: "free"` and `paid: false`.
2. **Choose a plan** (`download.html`)
   The user picks Free, Weekly, Monthly or Yearly. Free users can download the
   core build straight away.
3. **Pay** (`payment.html`). The user must be signed in.
   - **PayPal**: the user pays through PayPal's own checkout. The
     `verifyPaypalPayment` Cloud Function then asks PayPal's API whether the
     payment really happened and for the correct amount, and only then marks
     the user as paid. The plan unlocks instantly.
   - **Telebirr**: the user pays in the Telebirr app, then enters their
     Telebirr phone number and the transaction reference from the
     confirmation SMS.
   - **CBE**: the user transfers the amount to the SentinelFlow account shown
     on the page, then enters the transaction reference and the name on the
     sending account.
   Telebirr and CBE submissions are saved in `payment_claims` with status
   `pending`, and the user's plan shows "payment pending".
4. **Admin review** (`admin.html`)
   An admin checks the reference against the real Telebirr/CBE records and
   clicks Approve or Reject. Approving sets the user's plan to active.
5. **Download**
   The Download page now shows "plan active" and offers the Professional
   build.
6. **Contact** (`contact.html`)
   Anyone can send a message. It is stored in `messages` for admins.

---

## System architecture

```
                    ┌────────────────────────────────────────┐
                    │  Browser                               │
                    │  Static site (HTML / CSS / JavaScript) │
                    │  hosted on Render                      │
                    └───────┬───────────────┬────────────┬───┘
                            │               │            │
          sign up / sign in │   read/write  │            │ verify PayPal order
                            ▼               ▼            ▼
              ┌──────────────────┐ ┌───────────────┐ ┌────────────────────┐
              │ Firebase         │ │ Cloud         │ │ Cloud Functions    │
              │ Authentication   │ │ Firestore     │ │ (Node.js)          │
              │ email + Google   │ │ users         │ │ verifyPaypalPayment│──► PayPal API
              │ admin claim      │ │ payment_claims│ │ bootstrapFirstAdmin│
              └──────────────────┘ │ messages      │ └────────────────────┘
                                   └───────▲───────┘
                                           │
                               firestore.rules: who may read
                               and write each document
```

- The **frontend** is plain HTML, CSS and JavaScript with no build step, so it
  can be hosted as a static site.
- **Firebase** provides the backend without running our own server:
  Authentication for accounts, Firestore as the database, and Cloud Functions
  for code that must run on a trusted server.
- **Firestore security rules** are the real protection layer: the database
  itself refuses requests that the rules do not allow, whatever the browser
  sends.

---

## Data model

| Collection | Document | Main fields | Who can access |
|------------|----------|-------------|----------------|
| `users` | `users/{uid}` | name, email, provider, `plan`, `paid`, created date | The user (read own profile; cannot change `plan` or `paid`), admins |
| `payment_claims` | one per Telebirr/CBE submission | user ID, method, plan, transaction reference, phone or sender name, `status` (pending / approved / rejected), date | The user who created it (read own), admins (read, approve, reject) |
| `messages` | one per contact form submission | name, email, company, reason, message, date | Anyone can create; only admins can read |

---

## Security design

- **No secrets in the site code.** The Firebase web config in
  `js/firebase-config.js` is public by design; access is controlled by
  security rules, not by hiding keys. The PayPal secret is stored only in
  the Cloud Functions configuration.
- **Users cannot make themselves "paid".** `firestore.rules` blocks a client
  from changing its own `paid` or `plan` fields. Only the PayPal Cloud
  Function or an admin can change them. Editing the page in the browser's
  developer tools does not help.
- **PayPal payments are verified on the server.** The browser only reports an
  order ID; the Cloud Function confirms it with PayPal before activating the
  plan.
- **Admin is a server-granted claim.** There is no admin password anywhere in
  the site. The `admin` custom claim can only be set by server-side code
  (`scripts/grant-admin.js` or `bootstrapFirstAdmin`), and both the admin page
  and the database rules check it. The admin page is not linked from the
  public menu.
- **Private data stays private.** Users can read only their own profile and
  their own claims. Contact messages are readable by admins only.
  Unauthenticated reads of `users`, `payment_claims` and `messages` are
  denied.
- **Input validation** on all forms (email format, password strength,
  required fields, phone number format), and user-supplied text is escaped
  before being shown, to prevent cross-site scripting (XSS).
- **Server-only files are not published.** The Render build copies only the
  public site into `public/`, so `functions/`, `scripts/`, the Firebase
  config files and the demo video are not served.
- **Security headers.** HTTPS everywhere (provided by Render) and
  `X-Frame-Options: DENY` set in `render.yaml`, which prevents clickjacking.

---

## Project structure

```
├── index.html          home page: capabilities, workflow, integrations, pricing, FAQ
├── about.html          mission, values, milestones, team
├── contact.html        contact form and contact channels
├── privacy.html        privacy policy
├── terms.html          terms of service
├── login.html          sign up / sign in (email + Google)
├── download.html       plans, account status and downloads
├── payment.html        PayPal, Telebirr and CBE checkout
├── admin.html          admin panel (overview, users, claims, messages)
├── css/style.css       shared styles, light and dark theme
├── js/                 one script per page + firebase-config.js
├── assets/             icon and images
├── downloads/          SentinelFlow_Setup.exe (Windows installer)
├── functions/          Firebase Cloud Functions (PayPal verification, first admin)
├── scripts/            grant-admin.js (give a user admin rights)
├── firestore.rules     database security rules
├── firestore.indexes.json, firebase.json, .firebaserc   Firebase project config
├── render.yaml         Render deployment config
├── design.mp4          demo video (not published on the live site)
└── README-BACKEND-SETUP.md   step-by-step Firebase / PayPal / admin setup
```

---

## Technologies

| Area | Technology |
|------|------------|
| Frontend | HTML5, CSS3, JavaScript (no framework) |
| Authentication | Firebase Authentication (email/password, Google) |
| Database | Cloud Firestore with security rules |
| Server code | Firebase Cloud Functions (Node.js) |
| Payments | PayPal JS SDK + server-side verification; Telebirr and CBE with manual verification |
| Hosting | Render (static site) |
| Version control | Git and GitHub |

---

## Run locally

```bash
git clone https://github.com/vzc574/SentinelFlow.git
cd SentinelFlow
python3 -m http.server 8080
```

Then open http://localhost:8080.

Sign-in and the database use the Firebase project configured in
`js/firebase-config.js`. To use your own Firebase project, follow
[README-BACKEND-SETUP.md](README-BACKEND-SETUP.md).

## Deployment

- **Website:** deployed on **Render** as a static site, configured in
  `render.yaml`. Every push to `main` redeploys it automatically.
- **Backend:** Firebase project. Security rules are deployed with
  `firebase deploy --only firestore:rules` and Cloud Functions with
  `firebase deploy --only functions`.

Full backend setup (Firebase project, rules, PayPal, first admin) is described
in [README-BACKEND-SETUP.md](README-BACKEND-SETUP.md).

---

## Current status

| Part | Status |
|------|--------|
| Website pages (home, about, contact, privacy, terms) | Done and live on Render |
| Accounts (email/password and Google) | Done, connected to Firebase |
| Plan status stored per account (works on any device) | Done |
| Telebirr and CBE payment claims | Done (manual verification by admin) |
| Admin panel (users, claims, messages) | Done |
| Contact form | Done |
| Firestore security rules | Written; must be deployed to the Firebase project |
| PayPal | Built, but not live: needs a real PayPal client ID and the Cloud Function deployed |
| Windows installer download | Available (`downloads/SentinelFlow_Setup.exe`) |
| Demo video | Added (`design.mp4`) |

## Known limitations and future work

- **PayPal is not live yet.** It needs a real PayPal client ID in
  `payment.html` and the `verifyPaypalPayment` Cloud Function deployed (this
  requires the Firebase Blaze plan).
- **CBE account details are placeholders** in `payment.html` and must be
  replaced with the real account.
- **Telebirr and CBE are verified manually** by an admin. Automating this
  needs access to the Telebirr and CBE merchant APIs.
- **The Windows installer is not code-signed**, so Windows SmartScreen shows a
  warning when it is downloaded.
- **Planned:** email notification to admins when a new payment claim arrives,
  plan expiry handling for weekly/monthly/yearly plans, and Amharic language
  support.
