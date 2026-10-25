/* SentinelFlow SOAR — terms.js */
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

  var tocLinks = Array.prototype.slice.call(document.querySelectorAll(".legal-toc a"));
  var sections = tocLinks
    .map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); })
    .filter(Boolean);

  function onScroll() {
    var pos = window.scrollY + 120;
    var current = sections[0];
    sections.forEach(function (s) { if (s.offsetTop <= pos) current = s; });
    tocLinks.forEach(function (a) {
      a.style.color = a.getAttribute("href") === "#" + current.id ? "var(--accent)" : "";
    });
  }
  if (sections.length) {
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }
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
