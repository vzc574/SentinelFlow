/* SentinelFlow SOAR — about.js */
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

  /* --------------------------------- Values ---------------------------------- */
  var values = [
    { t: "Signal over noise", d: "If a feature adds another dashboard to stare at instead of removing work, we don't ship it." },
    { t: "Analyst-tested", d: "Every playbook template ships only after a working SOC analyst has run it against real cases." },
    { t: "Boring reliability", d: "Containment actions run when they're supposed to, every time. Uptime is a feature, not a footnote." },
    { t: "Plain-language security", d: "Findings and reports are written so anyone on the team can read them, not just the person who wrote the rule." }
  ];
  var valuesGrid = document.getElementById("valuesGrid");
  values.forEach(function (v, i) {
    valuesGrid.appendChild(el('<div class="card"><span class="card-index">' + String(i + 1).padStart(2, "0") + '</span><h3 class="h3">' + v.t + '</h3><p>' + v.d + '</p></div>'));
  });

  /* -------------------------------- Timeline ---------------------------------- */
  var milestones = [
    { y: "2021", t: "Built as an internal tool", d: "Started as a set of internal scripts stitching a SIEM and a ticketing system together during a short-staffed quarter." },
    { y: "2022", t: "Spun out as SentinelFlow", d: "Left the internal SOC to become a standalone product after three other teams asked to use it." },
    { y: "2023", t: "First 100 SOC deployments", d: "Crossed 100 production deployments and shipped the visual playbook builder." },
    { y: "2024", t: "SOC 2 Type II certified", d: "Completed our first SOC 2 Type II audit and opened a second region for data residency." },
    { y: "2026", t: "480+ teams in production", d: "Now running across financial services, healthcare, SaaS and critical infrastructure customers." }
  ];
  var timelineList = document.getElementById("timelineList");
  milestones.forEach(function (m) {
    timelineList.appendChild(el('<div class="timeline-item"><time>' + m.y + '</time><div><h4 class="h3">' + m.t + '</h4><p class="body-dim" style="margin-top:6px;">' + m.d + '</p></div></div>'));
  });

  /* ---------------------------------- Team ------------------------------------ */
  var team = [
    { i: "MK", n: "Mira Kessler", r: "Co-founder & CEO", b: "Former SOC lead at a payments company; spent six years on the response floor before building this." },
    { i: "DP", n: "Dev Prasad", r: "Co-founder & CTO", b: "Built the correlation engine that became SentinelFlow's core detection pipeline." },
    { i: "TH", n: "Tomas Haugen", r: "Head of Detection Engineering", b: "Writes and reviews every default detection rule that ships in the platform." },
    { i: "SW", n: "Sanaa Williams", r: "Head of Customer Security", b: "Leads onboarding and works directly with SOC teams migrating from legacy tooling." }
  ];
  var teamGrid = document.getElementById("teamGrid");
  team.forEach(function (p) {
    teamGrid.appendChild(el('<div class="people-card"><div class="people-avatar">' + p.i + '</div><h4 class="h3">' + p.n + '</h4><div class="people-role">' + p.r + '</div><p class="body-dim small" style="margin-top:10px;">' + p.b + '</p></div>'));
  });

  /* --------------------------------- Offices ----------------------------------- */
  var offices = [
    { c: "Austin, TX", d: "Product, engineering and detection research headquarters." },
    { c: "Lisbon, Portugal", d: "European engineering hub and EU data residency region." },
    { c: "Remote, follow-the-sun", d: "Customer security and support coverage across time zones." }
  ];
  var officeGrid = document.getElementById("officeGrid");
  offices.forEach(function (o) {
    officeGrid.appendChild(el('<div class="card"><h3 class="h3">' + o.c + '</h3><p>' + o.d + '</p></div>'));
  });
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
})();
