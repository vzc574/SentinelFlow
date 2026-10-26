/* SentinelFlow SOAR — download.js (now the plan-selection / "my plan" page) */
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

  var PLAN_LABEL = { free: "Free", weekly: "Weekly", monthly: "Monthly", yearly: "Yearly" };

  /* --------------------------------- Plans -------------------------------- */
  var plans = [
    { key: "free", name: "Free", price: "$0", period: "forever", features: ["Core detection engine", "Antivirus", "Performance Optimizer", "Community support"], highlight: false },
    { key: "weekly", name: "Weekly", price: "$7", period: "/week", features: ["Full Professional build", "Antivirus", "Performance Optimizer", "SOC Analysis (Blue Team)", "AI Report Writer"], highlight: false },
    { key: "monthly", name: "Monthly", price: "$19", period: "/month", features: ["Full Professional build", "Antivirus", "Performance Optimizer", "SOC Analysis (Blue Team)", "AI Report Writer"], highlight: true },
    { key: "yearly", name: "Yearly", price: "$185", period: "/year", features: ["Full Professional build", "Antivirus", "Performance Optimizer", "SOC Analysis (Blue Team)", "AI Report Writer"], highlight: false }
  ];

  var urlPlan = new URLSearchParams(window.location.search).get("plan");
  var planGrid = document.getElementById("planGrid");

  plans.forEach(function (p) {
    var li = p.features.map(function (f) { return "<li>" + f + "</li>"; }).join("");
    var selected = urlPlan === p.key;
    var ctaLabel = p.key === "free" ? "Get the free build" : "Pay & download";
    var card = el(
      '<div class="plan' + (p.highlight ? " is-highlight" : "") + '"' +
      (selected ? ' style="outline:2px solid var(--accent); outline-offset:-2px;"' : '') + '>' +
      (p.highlight ? '<span class="plan-badge">MOST POPULAR</span>' : '') +
      '<h3>' + p.name + '</h3>' +
      '<div class="price">' + p.price + ' <span>' + p.period + '</span></div>' +
      '<ul>' + li + '</ul>' +
      '<button class="btn ' + (p.highlight ? "btn-primary" : "btn-ghost") + ' btn-block" data-plan="' + p.key + '">' + ctaLabel + '</button></div>'
    );
    planGrid.appendChild(card);
  });

  planGrid.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-plan]");
    if (!btn) return;
    var plan = btn.getAttribute("data-plan");
    if (plan === "free") {
      claimFreePlan();
    } else {
      window.location.href = "payment.html?plan=" + plan;
    }
  });

  /* ------------------------------ Free plan claim --------------------------- */
  function claimFreePlan() {
    if (!FIREBASE_CONFIGURED) {
      alert("Sign-in isn't connected to a backend yet — see js/firebase-config.js to set this up.");
      return;
    }
    var user = firebase.auth().currentUser;
    if (!user) {
      window.location.href = "login.html?next=" + encodeURIComponent("download.html?plan=free");
      return;
    }
    firebase.firestore().collection("users").doc(user.uid).set({ plan: "free" }, { merge: true })
      .then(function () { triggerDemoDownload("free"); });
  }

  // There's no real installer binary wired into this static build — this
  // downloads a small placeholder file so the "download" action has
  // something real to show. Swap in your actual release artifact URLs
  // once you have them (see download links in the old build for the
  // pattern, or point this at your release host).
  function triggerDemoDownload(planLabel) {
  // Path to your actual .exe file on your server/project folder
  var exeUrl = "downloads/SentinelFlow_Setup.exe";

  // Create an invisible anchor element to trigger the download
  var a = document.createElement("a");
  a.href = exeUrl;
  
  // Sets the downloaded filename that the user will see on their computer
  a.download = "SentinelFlow_Setup.exe";
  
  document.body.appendChild(a);
  a.click();
  a.remove();
}

  /* ---------------------------- Current plan status -------------------------- */
  var note = document.getElementById("currentPlanNote");
  sfOnAuthReady(function (user) {
    if (!user) return;
    sfEnsureUserDoc(user).then(function () {
      return firebase.firestore().collection("users").doc(user.uid).get();
    }).then(function (snap) {
      var data = snap.data() || {};
      var plan = data.plan || "free";
      var paid = !!data.paid;
      var pill, label;
      if (plan === "free") { pill = "free"; label = "Free plan"; }
      else if (paid) { pill = "paid"; label = PLAN_LABEL[plan] + " plan — active"; }
      else { pill = "pending"; label = PLAN_LABEL[plan] + " plan — payment pending"; }

      note.appendChild(el(
        '<div class="card" style="margin-bottom:1px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">' +
        '<div><span class="status-pill ' + pill + '">' + escapeHtml(label) + '</span>' +
        '<p class="body-dim small" style="margin-top:8px;">Signed in as ' + escapeHtml(user.email) + '</p></div>' +
        (plan !== "free" && paid
          ? '<button class="btn btn-primary" id="downloadProBtn">Download Professional build</button>'
          : '') +
        '</div>'
      ));

      var dlBtn = document.getElementById("downloadProBtn");
      if (dlBtn) dlBtn.addEventListener("click", function () { triggerDemoDownload(plan); });
    });
  });
})();

/* ================================================================
     AUTH AREA — swap Sign in / Get started for a profile widget when
     someone is signed in to a real Firebase account (works the same on
     any device, since it's backed by a real account, not local data).
     ================================================================ */
(function initAuthArea() {
  var authArea = document.getElementById("authArea");
  if (!authArea || typeof sfOnAuthReady !== "function") return;

  function escapeHtml(s) {
    var div = document.createElement("div");
    div.textContent = s == null ? "" : s;
    return div.innerHTML;
  }

  sfOnAuthReady(function (user) {
    if (!user) return; // leave the default Sign in / Get started buttons as-is

    var initials = (user.displayName || user.email || "?")
      .split(" ").map(function (p) { return p.charAt(0); }).slice(0, 2).join("").toUpperCase();
    var avatarHtml = user.photoURL
      ? '<img class="profile-avatar" src="' + user.photoURL + '" alt="">'
      : '<span class="profile-avatar-fallback">' + initials + '</span>';

    authArea.innerHTML =
      '<div class="profile-menu">' +
      '<button class="profile-trigger" id="profileTrigger" aria-expanded="false">' +
      avatarHtml +
      '<span class="profile-name">' + escapeHtml(user.displayName || user.email) + '</span>' +
      '</button>' +
      '<div class="profile-dropdown" id="profileDropdown">' +
      '<div class="profile-email">' + escapeHtml(user.email) + '</div>' +
      '<a href="download.html" style="display:block; padding:9px 10px; font-size:0.88rem; color:var(--ink-dim); border-radius:var(--radius);">My plan</a>' +
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