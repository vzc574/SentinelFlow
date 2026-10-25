/* SentinelFlow SOAR — contact.js */
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

  /* ------------------------------- Contact channels --------------------------- */
  var channels = [
    { t: "Sales", d: "For pricing, demos and trial questions.", link: "mailto:sales@sentinelflow.io", label: "sales@sentinelflow.io" },
    { t: "Support", d: "For existing customers with product issues.", link: "mailto:support@sentinelflow.io", label: "support@sentinelflow.io" },
    { t: "Live chat", d: "In-app chat is staffed 9am–7pm ET, Monday–Friday.", link: "login.html", label: "Open the app to chat" }
  ];
  var channelGrid = document.getElementById("channelGrid");
  channels.forEach(function (c) {
    channelGrid.appendChild(el('<div class="contact-card"><h3 class="h3">' + c.t + '</h3><p class="body-dim" style="margin:10px 0 14px;">' + c.d + '</p><a href="' + c.link + '">' + c.label + ' →</a></div>'));
  });

  /* ----------------------------------- Offices --------------------------------- */
  var offices = [
    { c: "Austin, TX", a: "600 Congress Ave, Suite 1400, Austin, TX 78701", p: "+1 (512) 555-0142" },
    { c: "Lisbon, Portugal", a: "Avenida da Liberdade 110, 1250-146 Lisboa", p: "+351 21 555 0198" },
    { c: "Remote support desk", a: "Follow-the-sun coverage, no physical location", p: "Available via live chat and email" }
  ];
  var officeGrid = document.getElementById("officeGrid");
  offices.forEach(function (o) {
    officeGrid.appendChild(el('<div class="card"><h3 class="h3">' + o.c + '</h3><p class="body-dim" style="margin-top:8px;">' + o.a + '</p><p class="mono small" style="margin-top:10px; color:var(--ink-faint);">' + o.p + '</p></div>'));
  });

  /* ------------------------------------- FAQ ------------------------------------ */
  var faqs = [
    { q: "I'm an existing customer — where do I open a ticket?", a: "Sign in to the app and use the support panel; tickets opened there are tracked against your plan's SLA." },
    { q: "Do you offer a guided demo before the trial?", a: "Yes, sales can walk through a live environment tailored to your stack — mention that in the form above." },
    { q: "How do I report a security vulnerability?", a: "Email security@sentinelflow.io directly rather than using the contact form, so it reaches the security team immediately." }
  ];
  var faqList = document.getElementById("faqList");
  faqs.forEach(function (f) {
    var item = el(
      '<div class="faq-item"><button class="faq-q" aria-expanded="false"><span>' + f.q + '</span><span class="plus"></span></button>' +
      '<div class="faq-a"><p>' + f.a + '</p></div></div>'
    );
    var btn = item.querySelector(".faq-q");
    var panel = item.querySelector(".faq-a");
    btn.addEventListener("click", function () {
      var isOpen = item.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(isOpen));
      panel.style.maxHeight = isOpen ? panel.scrollHeight + "px" : "0px";
    });
    faqList.appendChild(item);
  });

  /* --------------------------------- Form validation ----------------------------- */
  var form = document.getElementById("contactForm");
  var note = document.getElementById("formNote");

  function setError(fieldId, hasError) {
    var field = document.getElementById(fieldId);
    if (field) field.classList.toggle("has-error", hasError);
    return hasError;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = document.getElementById("name").value.trim();
    var email = document.getElementById("email").value.trim();
    var company = document.getElementById("company").value.trim();
    var topic = document.getElementById("topic").value;
    var message = document.getElementById("message").value.trim();
    var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    var hasError = false;
    hasError = setError("field-name", name.length < 2) || hasError;
    hasError = setError("field-email", !emailPattern.test(email)) || hasError;
    hasError = setError("field-company", company.length < 2) || hasError;
    hasError = setError("field-topic", topic === "") || hasError;
    hasError = setError("field-message", message.length < 10) || hasError;

    note.classList.remove("show");
    if (hasError) return;

    if (!FIREBASE_CONFIGURED) {
      note.textContent = "Message isn't connected to a backend yet — see js/firebase-config.js to set this up.";
      note.classList.add("show");
      return;
    }

    firebase.firestore().collection("messages").add({
      name: name,
      email: email,
      company: company,
      topic: topic,
      message: message,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function () {
      note.textContent = "Thanks, " + name.split(" ")[0] + " — your message has been sent. We'll reply at " + email + " within one business day.";
      note.classList.add("show");
      form.reset();
    }).catch(function (err) {
      note.textContent = "Couldn't send that (" + (err.message || err) + "). Please try again or email us directly.";
      note.classList.add("show");
    });
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
