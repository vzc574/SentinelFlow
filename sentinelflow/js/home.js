/* SentinelFlow SOAR — home.js */
(function () {
  "use strict";

  /* ---------- Theme toggle (persisted, respects OS preference) ---------- */
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

  /* ---------------------------- Mobile nav ------------------------------ */
  var navToggle = document.getElementById("navToggle");
  var navLinks = document.getElementById("navLinks");
  if (navToggle && navLinks) {
    navToggle.addEventListener("click", function () {
      navLinks.classList.toggle("open");
    });
  }

  /* ------------------------------ Footer year ---------------------------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ------------------------------ Live feed ------------------------------ */
  var feedPool = [
    { sev: "crit", msg: "Lateral movement detected — host FIN-WS-114 to DC-02" },
    { sev: "warn", msg: "Impossible travel flagged for user j.alvarez@corp" },
    { sev: "info", msg: "Playbook 'Isolate Endpoint' completed on 3 hosts" },
    { sev: "crit", msg: "Ransomware-pattern file writes on SHARE-07" },
    { sev: "warn", msg: "New OAuth grant with mail.read scope — reviewing" },
    { sev: "info", msg: "Threat intel match: known C2 domain blocked at edge" },
    { sev: "warn", msg: "Privilege escalation attempt on build-agent-03" },
    { sev: "info", msg: "Case SOC-1183 auto-closed, false positive confirmed" },
    { sev: "crit", msg: "Exfil-volume anomaly on egress from VPC prod-east" },
    { sev: "info", msg: "MFA enrollment reminder sent to 4 stale accounts" },
    { sev: "warn", msg: "Suspicious PowerShell encoded command on FIN-WS-041" },
    { sev: "info", msg: "Playbook 'Reset Credentials' queued for approval" }
  ];
  var sevLabel = { crit: "CRIT", warn: "WARN", info: "INFO" };

  function randomTime() {
    var h = String(Math.floor(Math.random() * 24)).padStart(2, "0");
    var m = String(Math.floor(Math.random() * 60)).padStart(2, "0");
    return h + ":" + m;
  }

  function buildRow(entry) {
    var row = document.createElement("div");
    row.className = "feed-row";
    row.innerHTML =
      '<time>' + randomTime() + '</time>' +
      '<span class="sev sev-' + entry.sev + '">' + sevLabel[entry.sev] + '</span>' +
      '<span class="msg">' + entry.msg + '</span>';
    return row;
  }

  var feedBody = document.getElementById("feedBody");
  if (feedBody) {
    for (var i = 0; i < 9; i++) {
      feedBody.appendChild(buildRow(feedPool[Math.floor(Math.random() * feedPool.length)]));
    }
    setInterval(function () {
      var entry = feedPool[Math.floor(Math.random() * feedPool.length)];
      feedBody.insertBefore(buildRow(entry), feedBody.firstChild);
      if (feedBody.children.length > 12) {
        feedBody.removeChild(feedBody.lastChild);
      }
    }, 2600);
  }

  /* ---------------------------- Trust industries -------------------------- */
  var industries = ["Financial services", "Healthcare", "SaaS & technology", "Critical infrastructure", "Public sector", "Retail & e-commerce"];
  renderTags("trustTags", industries);

  /* -------------------------------- Stats -------------------------------- */
  var stats = [
    { value: "480+", label: "SOC teams running SentinelFlow in production" },
    { value: "2.4M", label: "average daily events correlated per deployment" },
    { value: "92%", label: "of alerts triaged automatically, no human touch" },
    { value: "11 min", label: "median time from detection to containment" }
  ];
  var statsGrid = document.getElementById("statsGrid");
  stats.forEach(function (s) {
    statsGrid.appendChild(el('<div class="stat"><strong>' + s.value + '</strong><span>' + s.label + '</span></div>'));
  });

  /* ----------------------------- Capabilities ----------------------------- */
  var caps = [
    { i: "01", title: "Detection engine", desc: "Correlates events from your SIEM, EDR, identity and cloud logs into a single scored case, cutting duplicate alerts before an analyst ever sees them." },
    { i: "02", title: "Automated playbooks", desc: "Build response logic in a visual editor — isolate a host, disable a user, or open a ticket — and let SentinelFlow run it the moment conditions match." },
    { i: "03", title: "Case management", desc: "Every incident gets one timeline: alerts, evidence, actions taken and analyst notes, so handoffs between shifts don't lose context." },
    { i: "04", title: "Threat intelligence", desc: "Built-in feeds enrich indicators automatically and flag matches against known infrastructure, without a separate lookup step." },
    { i: "05", title: "Integration hub", desc: "Two-way connectors for the tools your SOC already runs — no custom scripts to maintain when an API changes." },
    { i: "06", title: "Compliance reporting", desc: "Generate audit-ready reports mapped to SOC 2, ISO 27001 and HIPAA controls directly from case history." }
  ];
  var capGrid = document.getElementById("capGrid");
  caps.forEach(function (c) {
    capGrid.appendChild(el('<div class="card"><span class="card-index">' + c.i + '</span><h3 class="h3">' + c.title + '</h3><p>' + c.desc + '</p></div>'));
  });

  /* ------------------------------- Workflow ------------------------------- */
  var steps = [
    { n: "1", title: "Detect", desc: "Raw events arrive from connected sources and are normalized into a common schema." },
    { n: "2", title: "Triage", desc: "Correlation rules and threat intel enrichment score each case and route it to the right queue." },
    { n: "3", title: "Automate", desc: "Matching playbooks fire immediately — containment actions run before an analyst opens the case." },
    { n: "4", title: "Resolve", desc: "The analyst confirms, adjusts or escalates, and the full timeline is logged for audit." }
  ];
  var workflowRow = document.getElementById("workflowRow");
  steps.forEach(function (s) {
    workflowRow.appendChild(el('<div class="workflow-step"><span class="workflow-num">STEP ' + s.n + '</span><h4>' + s.title + '</h4><p>' + s.desc + '</p></div>'));
  });

  /* ----------------------------- Integrations ------------------------------ */
  var integrations = ["Splunk", "Microsoft Sentinel", "CrowdStrike Falcon", "Okta", "AWS GuardDuty", "Slack", "Jira", "PagerDuty"];
  renderTags("integrationTags", integrations);

  /* -------------------------------- Metrics --------------------------------- */
  var metrics = [
    { value: "-63%", label: "reduction in mean time to triage within the first quarter" },
    { value: "4.1x", label: "more cases closed per analyst per shift" },
    { value: "-71%", label: "fewer alerts escalated that turn out to be noise" }
  ];
  var metricsGrid = document.getElementById("metricsGrid");
  metrics.forEach(function (m) {
    metricsGrid.appendChild(el('<div class="stat"><strong>' + m.value + '</strong><span>' + m.label + '</span></div>'));
  });

  /* ------------------------------ Testimonials -------------------------------- */
  var quotes = [
    { q: "We stopped losing context between shifts. The case timeline alone paid for the switch.", name: "R. Okafor", role: "SOC Manager, mid-market SaaS" },
    { q: "Our tier-1 queue dropped by more than half in the first month, and it stayed down.", name: "M. Lindqvist", role: "Director of Security Operations" },
    { q: "The playbook editor is the first automation tool our analysts actually wanted to use.", name: "A. Farrow", role: "Lead Detection Engineer" }
  ];
  var quoteGrid = document.getElementById("quoteGrid");
  quotes.forEach(function (t) {
    quoteGrid.appendChild(el('<figure class="quote"><blockquote>"' + t.q + '"</blockquote><figcaption>' + t.name + ' — ' + t.role + '</figcaption></figure>'));
  });

  /* ------------------------------ Compliance ---------------------------------- */
  renderTags("complianceTags", ["SOC 2 Type II", "ISO 27001", "GDPR ready", "HIPAA compatible"]);

  /* -------------------------------- Pricing ------------------------------------ */
  var plans = [
    { key: "free", name: "Free", price: "$0", period: "forever", features: ["Core detection engine", "Antivirus", "Performance Optimizer", "Community support"], cta: "Get Started For Free", highlight: false },
    { key: "weekly", name: "Weekly", price: "$7", period: "/week", features: ["Full Professional build", "Antivirus", "Performance Optimizer", "SOC Analysis (Blue Team)", "AI Report Writer"], cta: "Choose Weekly", highlight: false },
    { key: "monthly", name: "Monthly", price: "$19", period: "/month", features: ["Full Professional build", "Antivirus", "Performance Optimizer", "SOC Analysis (Blue Team)", "AI Report Writer"], cta: "Choose Monthly", highlight: true },
    { key: "yearly", name: "Yearly", price: "$185", period: "/year", features: ["Full Professional build", "Antivirus", "Performance Optimizer", "SOC Analysis (Blue Team)", "AI Report Writer"], cta: "Choose Yearly", highlight: false }
  ];
  var pricingGrid = document.getElementById("pricingGrid");
  plans.forEach(function (p) {
    var li = p.features.map(function (f) { return "<li>" + f + "</li>"; }).join("");
    pricingGrid.appendChild(el(
      '<div class="plan' + (p.highlight ? " is-highlight" : "") + '">' +
      (p.highlight ? '<span class="plan-badge">MOST POPULAR</span>' : '') +
      '<h3>' + p.name + '</h3>' +
      '<div class="price">' + p.price + ' <span>' + p.period + '</span></div>' +
      '<ul>' + li + '</ul>' +
      '<a href="download.html?plan=' + p.key + '" class="btn ' + (p.highlight ? "btn-primary" : "btn-ghost") + '">' + p.cta + '</a></div>'
    ));
  });

  /* ---------------------------------- FAQ ---------------------------------------- */
  var faqs = [
    { q: "Do we need to replace our SIEM to use SentinelFlow?", a: "No. SentinelFlow sits alongside your existing SIEM and EDR tools, pulling in alerts through native connectors rather than replacing the logging layer you already have." },
    { q: "How long does onboarding usually take?", a: "Most teams connect their first data source in under an hour and have a working playbook running within the first day of the trial." },
    { q: "Can we write our own detection and response logic?", a: "Yes. The playbook builder supports custom conditions, branching logic and calls to your own internal APIs alongside the pre-built library." },
    { q: "Is our data used to train any shared models?", a: "No. Case data, logs and playbook contents stay isolated to your tenant and are never used to train models shared across customers." },
    { q: "What happens to our cases if we cancel?", a: "You can export full case history, playbooks and audit logs at any time, including a 30-day window after cancellation." }
  ];
  var faqList = document.getElementById("faqList");
  faqs.forEach(function (f, idx) {
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

  /* --------------------------------- helpers -------------------------------------- */
  function el(html) {
    var t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstChild;
  }
  function renderTags(id, list) {
    var wrap = document.getElementById(id);
    if (!wrap) return;
    list.forEach(function (name) {
      wrap.appendChild(el('<span class="tag"><span class="dot"></span>' + name + '</span>'));
    });
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
