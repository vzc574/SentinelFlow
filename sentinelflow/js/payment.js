/* SentinelFlow SOAR — payment.js
   ---------------------------------------------------------------------
   PAYPAL: Real client-side PayPal Buttons. createOrder() sets the real
   amount for the selected plan. onApprove() does NOT mark the order
   paid by itself — it calls a Cloud Function ("verifyPaypalPayment")
   that re-checks the payment with PayPal's server using your secret
   key, and only THEN writes paid:true to the user's Firestore
   document. A browser is never trusted to grant itself a paid plan —
   see /firestore.rules and /functions/index.js.

   TELEBIRR / CBE: Neither has a public client-side checkout SDK like
   PayPal's. These write a "payment_claims" document to Firestore with
   status "pending", which shows up for review on admin.html. An admin
   approves it there, which is the only other path (besides the Cloud
   Function above) allowed to set paid:true — enforced by security
   rules, not by anything in this file.
   --------------------------------------------------------------------- */
(function () {
  "use strict";

  var root = document.documentElement;
  var stored = localStorage.getItem("sf-theme");
  var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  root.setAttribute("data-theme", stored || (prefersDark ? "dark" : "light"));

  var themeBtn = document.getElementById("themeToggle");
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      localStorage.setItem("sf-theme", next);
    });
  }
  var navToggle = document.getElementById("navToggle");
  var navLinks = document.getElementById("navLinks");
  if (navToggle && navLinks) {
    navToggle.addEventListener("click", function () { navLinks.classList.toggle("open"); });
  }
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  function el(html) {
    var t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstChild;
  }
  function escapeHtml(s) {
    var div = document.createElement("div");
    div.textContent = s == null ? "" : s;
    return div.innerHTML;
  }

  /* ---------------------------------- Plan --------------------------------- */
  var PLANS = {
    weekly: { label: "Weekly", amount: "7.00", period: "week" },
    monthly: { label: "Monthly", amount: "19.00", period: "month" },
    yearly: { label: "Yearly", amount: "185.00", period: "year" }
  };
  var planKey = new URLSearchParams(window.location.search).get("plan");
  var plan = PLANS[planKey];

  if (!plan) {
    // No (or an invalid/free) plan was requested — send them back to pick one.
    window.location.href = "download.html";
    return;
  }

  document.getElementById("orderSummary").appendChild(el(
    '<h4 class="h3" style="margin-bottom:16px;">Order summary</h4>' +
    '<div class="order-row"><span>SentinelFlow Professional</span><span>' + plan.label + '</span></div>' +
    '<div class="order-row"><span>Billing cycle</span><span>Every ' + plan.period + '</span></div>' +
    '<div class="order-row order-total"><span>Total due today</span><span>$' + plan.amount + '</span></div>'
  ));

  /* ------------------------------- Tab switching ---------------------------- */
  var payTabs = document.getElementById("payTabs");
  payTabs.addEventListener("click", function (e) {
    var tab = e.target.closest("[data-method]");
    if (!tab) return;
    var method = tab.getAttribute("data-method");
    payTabs.querySelectorAll(".pay-tab").forEach(function (t) { t.classList.toggle("active", t === tab); });
    document.querySelectorAll(".pay-panel").forEach(function (p) {
      p.classList.toggle("active", p.id === "panel-" + method);
    });
  });

  /* ================================================================
     SIGN-IN GATE
     ================================================================ */
  var gate = document.getElementById("signinGate");
  var header = document.getElementById("checkoutHeader");
  var body = document.getElementById("checkoutBody");
  var gateLink = document.getElementById("gateSigninLink");
  gateLink.href = "login.html?next=" + encodeURIComponent(window.location.pathname.split("/").pop() + window.location.search);

  var currentUser = null;

  sfOnAuthReady(function (user) {
    currentUser = user;
    if (!FIREBASE_CONFIGURED) {
      gate.style.display = "flex";
      gate.querySelector(".lede").textContent = "Checkout isn't connected to a backend yet — see js/firebase-config.js to set up Firebase.";
      return;
    }
    if (!user) {
      gate.style.display = "flex";
      header.style.display = "none";
      body.style.display = "none";
      return;
    }
    gate.style.display = "none";
    header.style.display = "block";
    body.style.display = "block";
    sfEnsureUserDoc(user).then(initPayPalButtons);
  });

  /* ================================================================
     PAYPAL
     ================================================================ */
  function initPayPalButtons() {
    if (typeof paypal === "undefined") {
      document.getElementById("paypalNotConfigured").style.display = "block";
      return;
    }
    paypal.Buttons({
      style: { shape: "rect", color: "gold", layout: "vertical", label: "paypal" },
      createOrder: function (data, actions) {
        return actions.order.create({
          purchase_units: [{
            description: "SentinelFlow Professional — " + plan.label + " plan",
            amount: { value: plan.amount, currency_code: "USD" }
          }]
        });
      },
      onApprove: function (data) {
        // Deliberately NOT calling actions.order.capture() purely client-side
        // and trusting the result. We hand the order ID to a Cloud Function
        // that captures/verifies it server-side with PayPal and only then
        // grants the entitlement. See /functions/index.js.
        var verify = (FIREBASE_CONFIGURED && typeof firebase.functions === "function")
          ? firebase.functions().httpsCallable("verifyPaypalPayment")
          : null;
        if (!verify) {
          alert("Payment captured on PayPal's side, but the verification function isn't deployed yet — see /README-BACKEND-SETUP.md.");
          return;
        }
        return verify({ orderID: data.orderID, plan: planKey })
          .then(function () {
            window.location.href = "download.html?paid=1";
          })
          .catch(function (err) {
            alert("We couldn't verify that payment automatically (" + (err.message || err) + "). Contact support with order ID " + data.orderID + ".");
          });
      },
      onError: function (err) {
        alert("PayPal reported an error — please try again, or use Telebirr/CBE instead.");
      }
    }).render("#paypal-button-container");
  }

  /* ================================================================
     TELEBIRR — manual verification claim
     ================================================================ */
  var telebirrForm = document.getElementById("telebirrForm");
  telebirrForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var phone = document.getElementById("tb-phone").value.trim();
    var ref = document.getElementById("tb-ref").value.trim();
    var status = document.getElementById("telebirrStatus");

    var phoneOk = /^0?9\d{8}$/.test(phone.replace(/\s/g, ""));
    var refOk = ref.length >= 6;
    setFieldError("field-tb-phone", !phoneOk);
    setFieldError("field-tb-ref", !refOk);
    if (!phoneOk || !refOk) { status.classList.remove("show"); return; }

    submitClaim("telebirr", { phone: phone, reference: ref }, status, telebirrForm);
  });

  /* ================================================================
     CBE — manual verification claim
     ================================================================ */
  var cbeForm = document.getElementById("cbeForm");
  cbeForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var ref = document.getElementById("cbe-ref").value.trim();
    var name = document.getElementById("cbe-name").value.trim();
    var status = document.getElementById("cbeStatus");

    var refOk = ref.length >= 6;
    var nameOk = name.length >= 2;
    setFieldError("field-cbe-ref", !refOk);
    setFieldError("field-cbe-name", !nameOk);
    if (!refOk || !nameOk) { status.classList.remove("show"); return; }

    submitClaim("cbe", { reference: ref, senderName: name }, status, cbeForm);
  });

  function setFieldError(fieldId, hasError) {
    var field = document.getElementById(fieldId);
    if (field) field.classList.toggle("has-error", hasError);
  }

  function submitClaim(method, details, statusEl, form) {
    if (!FIREBASE_CONFIGURED || !currentUser) {
      showStatus(statusEl, "You need to be signed in and connected to a backend to submit this.", false);
      return;
    }
    var claim = Object.assign({
      uid: currentUser.uid,
      email: currentUser.email,
      plan: planKey,
      amount: plan.amount,
      method: method,
      status: "pending",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }, details);

    firebase.firestore().collection("payment_claims").add(claim)
      .then(function () {
        return firebase.firestore().collection("users").doc(currentUser.uid).set(
          { plan: planKey, paid: false }, { merge: true }
        );
      })
      .then(function () {
        showStatus(statusEl, "Submitted — we'll verify your " + method.toUpperCase() + " payment and activate your plan, usually within a few hours.", true);
        form.reset();
      })
      .catch(function (err) {
        showStatus(statusEl, "Couldn't submit that (" + (err.message || err) + "). Please try again.", false);
      });
  }

  function showStatus(el, msg, ok) {
    el.textContent = msg;
    el.classList.remove("ok", "err");
    el.classList.add("show", ok ? "ok" : "err");
  }

  /* ================================================================
     AUTH AREA (same pattern as every other page)
     ================================================================ */
  (function initAuthArea() {
    var authArea = document.getElementById("authArea");
    if (!authArea || typeof sfOnAuthReady !== "function") return;
    sfOnAuthReady(function (user) {
      if (!user) return;
      var initials = (user.displayName || user.email || "?")
        .split(" ").map(function (p) { return p.charAt(0); }).slice(0, 2).join("").toUpperCase();
      var avatarHtml = user.photoURL
        ? '<img class="profile-avatar" src="' + user.photoURL + '" alt="">'
        : '<span class="profile-avatar-fallback">' + initials + '</span>';
      authArea.innerHTML =
        '<div class="profile-menu">' +
          '<button class="profile-trigger" id="profileTrigger" aria-expanded="false">' +
            avatarHtml + '<span class="profile-name">' + escapeHtml(user.displayName || user.email) + '</span>' +
          '</button>' +
          '<div class="profile-dropdown" id="profileDropdown">' +
            '<div class="profile-email">' + escapeHtml(user.email) + '</div>' +
            '<button class="profile-signout" id="signOutBtn">Sign out</button>' +
          '</div>' +
        '</div>';
      var trigger = document.getElementById("profileTrigger");
      var dropdown = document.getElementById("profileDropdown");
      trigger.addEventListener("click", function () {
        var open = dropdown.classList.toggle("open");
        trigger.setAttribute("aria-expanded", String(open));
      });
      document.addEventListener("click", function (e) {
        if (!authArea.contains(e.target)) dropdown.classList.remove("open");
      });
      document.getElementById("signOutBtn").addEventListener("click", function () {
        firebase.auth().signOut().then(function () { window.location.href = "index.html"; });
      });
    });
  })();
})();
