/* SentinelFlow SOAR — login.js
   ---------------------------------------------------------------------
   Real authentication via Firebase (see js/firebase-config.js for the
   one-time setup). Both the email/password form and the Google button
   create or sign in to an actual Firebase Authentication account, so
   the same account — and anything purchased on it — follows the user
   to any device or browser.

   Nothing here will throw if you haven't configured Firebase yet; the
   buttons will tell the visitor sign-in isn't set up rather than fail
   silently.
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

  function escapeHtml(s) {
    var div = document.createElement("div");
    div.textContent = s == null ? "" : s;
    return div.innerHTML;
  }

  // Where to send the user after a successful sign-in. A page can link
  // here with ?next=payment.html%3Fplan%3Dmonthly to come straight back
  // to what they were trying to do.
  function nextUrl() {
    var params = new URLSearchParams(window.location.search);
    return params.get("next") || "index.html";
  }

  /* ---------------------- Already-signed-in banner ------------------------ */
  var note = document.getElementById("alreadySignedIn");
  sfOnAuthReady(function (user) {
    if (user && note) {
      note.style.display = "flex";
      note.innerHTML = "Signed in as " + escapeHtml(user.displayName || user.email) +
        '. <a href="' + nextUrl() + '">Continue →</a>';
    }
  });

  /* ================================================================
     TAB SWITCHING (sign in <-> create account)
     ================================================================ */
  var tabSignin = document.getElementById("tabSignin");
  var tabSignup = document.getElementById("tabSignup");
  var signinForm = document.getElementById("signinForm");
  var signupForm = document.getElementById("signupForm");
  var switchHint = document.getElementById("switchHint");
  var gotoSignup = document.getElementById("gotoSignup");

  function showSignin() {
    tabSignin.classList.add("active");
    tabSignup.classList.remove("active");
    signinForm.style.display = "block";
    signupForm.style.display = "none";
    switchHint.innerHTML = 'New to SentinelFlow? <a href="#" id="gotoSignup">Create an account</a>';
    document.getElementById("gotoSignup").addEventListener("click", function (e) { e.preventDefault(); showSignup(); });
  }
  function showSignup() {
    tabSignup.classList.add("active");
    tabSignin.classList.remove("active");
    signupForm.style.display = "block";
    signinForm.style.display = "none";
    switchHint.innerHTML = 'Already have an account? <a href="#" id="gotoSignin">Sign in</a>';
    document.getElementById("gotoSignin").addEventListener("click", function (e) { e.preventDefault(); showSignin(); });
  }

  tabSignin.addEventListener("click", showSignin);
  tabSignup.addEventListener("click", showSignup);
  gotoSignup.addEventListener("click", function (e) { e.preventDefault(); showSignup(); });

  var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var passwordPattern = /^(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/; // 8+ chars, 1 number, 1 symbol

  function setError(fieldId, hasError) {
    var field = document.getElementById(fieldId);
    if (field) field.classList.toggle("has-error", hasError);
    return hasError;
  }
  function showStatus(el, msg, ok) {
    el.textContent = msg;
    el.classList.remove("ok", "err");
    el.classList.add("show", ok ? "ok" : "err");
  }
  function notConfigured(el) {
    showStatus(el, "Sign-in isn't connected to a backend yet — see js/firebase-config.js to set up Firebase.", false);
  }
  function friendlyAuthError(err) {
    var map = {
      "auth/email-already-in-use": "An account with that email already exists — try signing in instead.",
      "auth/invalid-email": "That doesn't look like a valid email address.",
      "auth/weak-password": "Password is too weak — use 8+ characters with a number and a symbol.",
      "auth/user-not-found": "No account found for that email.",
      "auth/wrong-password": "Incorrect password.",
      "auth/invalid-credential": "Incorrect email or password.",
      "auth/too-many-requests": "Too many attempts — please wait a moment and try again.",
      "auth/popup-closed-by-user": "The Google sign-in window was closed before finishing."
    };
    return map[err.code] || (err.message || "Something went wrong. Please try again.");
  }

  /* ------------------------------- Sign up ------------------------------- */
  signupForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = document.getElementById("su-name").value.trim();
    var email = document.getElementById("su-email").value.trim().toLowerCase();
    var password = document.getElementById("su-password").value;
    var terms = document.getElementById("su-terms").checked;
    var status = document.getElementById("suStatus");

    var hasError = false;
    hasError = setError("su-field-name", name.length < 2) || hasError;
    hasError = setError("su-field-email", !emailPattern.test(email)) || hasError;
    hasError = setError("su-field-password", !passwordPattern.test(password)) || hasError;
    if (hasError) { status.classList.remove("show"); return; }
    if (!terms) { showStatus(status, "You need to accept the terms and privacy policy to continue.", false); return; }

    if (!FIREBASE_CONFIGURED) { notConfigured(status); return; }

    firebase.auth().createUserWithEmailAndPassword(email, password)
      .then(function (cred) { return cred.user.updateProfile({ displayName: name }).then(function () { return cred.user; }); })
      .then(function (user) { return sfEnsureUserDoc(Object.assign({}, user, { displayName: name })); })
      .then(function () {
        showStatus(status, "Account created. Redirecting…", true);
        setTimeout(function () { window.location.href = nextUrl(); }, 600);
      })
      .catch(function (err) { showStatus(status, friendlyAuthError(err), false); });
  });

  /* ------------------------------- Sign in -------------------------------- */
  signinForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var email = document.getElementById("si-email").value.trim().toLowerCase();
    var password = document.getElementById("si-password").value;
    var status = document.getElementById("siStatus");

    var hasError = false;
    hasError = setError("si-field-email", !emailPattern.test(email)) || hasError;
    hasError = setError("si-field-password", password.length === 0) || hasError;
    if (hasError) { status.classList.remove("show"); return; }

    if (!FIREBASE_CONFIGURED) { notConfigured(status); return; }

    var remember = document.getElementById("si-remember").checked;
    var persistence = remember ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION;

    firebase.auth().setPersistence(persistence)
      .then(function () { return firebase.auth().signInWithEmailAndPassword(email, password); })
      .then(function (cred) { return sfEnsureUserDoc(cred.user); })
      .then(function () {
        showStatus(status, "Signed in. Redirecting…", true);
        setTimeout(function () { window.location.href = nextUrl(); }, 500);
      })
      .catch(function (err) { showStatus(status, friendlyAuthError(err), false); });
  });

  /* ================================================================
     GOOGLE SIGN-IN via Firebase Auth's GoogleAuthProvider popup
     ================================================================ */
  var googleBtn = document.getElementById("googleBtn");
  googleBtn.addEventListener("click", function () {
    if (!FIREBASE_CONFIGURED) {
      alert("Google sign-in isn't connected to a backend yet — see js/firebase-config.js to set up Firebase (enable the Google provider under Authentication).");
      return;
    }
    var provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider)
      .then(function (result) { return sfEnsureUserDoc(result.user); })
      .then(function () { window.location.href = nextUrl(); })
      .catch(function (err) {
        if (err.code !== "auth/popup-closed-by-user") alert(friendlyAuthError(err));
      });
  });
})();
