/* SentinelFlow SOAR — admin.js
   ---------------------------------------------------------------------
   Security model, spelled out:
   - Signing in here uses the same real Firebase Authentication as the
     rest of the site — no password is ever hardcoded in this file, so
     there's nothing for someone to find by viewing source.
   - After sign-in we check the account's ID token for a custom claim
     `admin: true`. That claim can ONLY be set server-side (by the
     grant-admin.js script or a Cloud Function using the Admin SDK) —
     a signed-in user has no way to grant it to themselves.
   - The client-side check below is for the UI only. The real boundary
     is in firestore.rules: every read/write this page does is also
     re-checked by the database against that same claim, so even if
     someone bypassed this page entirely and talked to Firestore
     directly, they still couldn't read user data or approve a payment
     without a genuine admin-claimed account.
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
  function fmtDate(ts) {
    if (!ts || !ts.toDate) return "—";
    return ts.toDate().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  var loginGate = document.getElementById("loginGate");
  var deniedGate = document.getElementById("deniedGate");
  var dashboard = document.getElementById("dashboard");

  function showOnly(which) {
    loginGate.style.display = which === "login" ? "flex" : "none";
    deniedGate.style.display = which === "denied" ? "flex" : "none";
    dashboard.style.display = which === "dashboard" ? "grid" : "none";
  }

  /* ================================================================
     LOGIN
     ================================================================ */
  var form = document.getElementById("adminLoginForm");
  var status = document.getElementById("adminLoginStatus");

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!FIREBASE_CONFIGURED) {
      showStatus("Backend isn't connected yet — see js/firebase-config.js.", false);
      return;
    }
    var email = document.getElementById("a-email").value.trim();
    var password = document.getElementById("a-password").value;
    if (!email || !password) {
      showStatus("Enter your email and password.", false);
      return;
    }
    firebase.auth().signInWithEmailAndPassword(email, password)
      .catch(function (err) { showStatus(err.message || "Sign-in failed.", false); });
  });

  function showStatus(msg, ok) {
    status.textContent = msg;
    status.classList.remove("ok", "err");
    status.classList.add("show", ok ? "ok" : "err");
  }

  document.getElementById("deniedSignOut").addEventListener("click", function () {
    firebase.auth().signOut();
  });

  /* ================================================================
     AUTH STATE -> CLAIM CHECK
     ================================================================ */
  if (FIREBASE_CONFIGURED) {
    firebase.auth().onAuthStateChanged(function (user) {
      if (!user) { showOnly("login"); return; }
      user.getIdTokenResult(true).then(function (tokenResult) {
        if (tokenResult.claims && tokenResult.claims.admin === true) {
          showOnly("dashboard");
          document.getElementById("adminTopActions").innerHTML =
            '<span class="small body-dim" style="margin-right:12px;">' + escapeHtml(user.email) + '</span>' +
            '<button class="btn btn-ghost" id="topSignOut">Sign out</button>';
          document.getElementById("topSignOut").addEventListener("click", function () { firebase.auth().signOut(); });
          loadDashboard();
        } else {
          showOnly("denied");
        }
      });
    });
  }

  /* ================================================================
     SIDEBAR NAV
     ================================================================ */
  document.querySelectorAll(".admin-side a").forEach(function (link) {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      document.querySelectorAll(".admin-side a").forEach(function (a) { a.classList.remove("active"); });
      link.classList.add("active");
      document.querySelectorAll(".admin-main > section").forEach(function (s) { s.style.display = "none"; });
      document.getElementById("panel-" + link.getAttribute("data-panel")).style.display = "block";
    });
  });

  /* ================================================================
     DATA LOADING
     ================================================================ */
  function loadDashboard() {
    var db = firebase.firestore();

    db.collection("users").orderBy("createdAt", "desc").get().then(function (snap) {
      renderUsers(snap);
      renderOverview(snap.size, null, null);
    });

    db.collection("payment_claims").orderBy("createdAt", "desc").get().then(function (snap) {
      renderClaims(snap);
      var pending = snap.docs.filter(function (d) { return d.data().status === "pending"; }).length;
      renderOverview(null, pending, null);
    });

    db.collection("messages").orderBy("createdAt", "desc").get().then(function (snap) {
      renderMessages(snap);
      renderOverview(null, null, snap.size);
    });
  }

  var overviewCache = { users: null, pending: null, messages: null };
  function renderOverview(users, pending, messages) {
    if (users !== null) overviewCache.users = users;
    if (pending !== null) overviewCache.pending = pending;
    if (messages !== null) overviewCache.messages = messages;
    var wrap = document.getElementById("overviewStats");
    wrap.innerHTML = "";
    [
      { label: "Total users", value: overviewCache.users },
      { label: "Pending payment claims", value: overviewCache.pending },
      { label: "Contact messages", value: overviewCache.messages }
    ].forEach(function (s) {
      wrap.appendChild(el('<div class="stat"><strong>' + (s.value == null ? "…" : s.value) + '</strong><span>' + s.label + '</span></div>'));
    });
  }

  function renderUsers(snap) {
    var body = document.getElementById("usersTableBody");
    var empty = document.getElementById("usersEmpty");
    body.innerHTML = "";
    if (snap.empty) { empty.style.display = "block"; return; }
    empty.style.display = "none";
    snap.forEach(function (doc) {
      var u = doc.data();
      var statusPill = u.plan === "free"
        ? '<span class="status-pill free">Free</span>'
        : (u.paid ? '<span class="status-pill paid">Active</span>' : '<span class="status-pill pending">Pending</span>');
      body.appendChild(el(
        '<tr><td>' + escapeHtml(u.name || "—") + '</td>' +
        '<td>' + escapeHtml(u.email || "—") + '</td>' +
        '<td class="mono small">' + escapeHtml(u.plan || "free") + '</td>' +
        '<td>' + statusPill + '</td>' +
        '<td>' + fmtDate(u.createdAt) + '</td></tr>'
      ));
    });
  }

  function renderClaims(snap) {
    var body = document.getElementById("claimsTableBody");
    var empty = document.getElementById("claimsEmpty");
    body.innerHTML = "";
    if (snap.empty) { empty.style.display = "block"; return; }
    empty.style.display = "none";
    snap.forEach(function (doc) {
      var c = doc.data();
      var ref = c.reference || "—";
      var pill = c.status === "approved" ? '<span class="status-pill paid">Approved</span>'
        : c.status === "rejected" ? '<span class="status-pill none">Rejected</span>'
        : '<span class="status-pill pending">Pending</span>';
      var actions = c.status === "pending"
        ? '<button class="btn btn-xs btn-approve" data-action="approve" data-id="' + doc.id + '">Approve</button> ' +
          '<button class="btn btn-xs btn-reject" data-action="reject" data-id="' + doc.id + '">Reject</button>'
        : "";
      body.appendChild(el(
        '<tr><td>' + escapeHtml(c.email || c.uid || "—") + '</td>' +
        '<td class="mono small">' + escapeHtml((c.method || "").toUpperCase()) + '</td>' +
        '<td class="mono small">' + escapeHtml(c.plan || "—") + '</td>' +
        '<td class="mono small">' + escapeHtml(ref) + '</td>' +
        '<td>' + pill + '</td>' +
        '<td>' + fmtDate(c.createdAt) + '</td>' +
        '<td>' + actions + '</td></tr>'
      ));
    });
  }

  document.getElementById("claimsTableBody").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-action]");
    if (!btn) return;
    var id = btn.getAttribute("data-id");
    var action = btn.getAttribute("data-action");
    var db = firebase.firestore();

    db.collection("payment_claims").doc(id).get().then(function (snap) {
      var claim = snap.data();
      var updates = [db.collection("payment_claims").doc(id).update({ status: action === "approve" ? "approved" : "rejected" })];
      if (action === "approve") {
        updates.push(db.collection("users").doc(claim.uid).set({ plan: claim.plan, paid: true }, { merge: true }));
      }
      return Promise.all(updates);
    }).then(function () {
      loadDashboard();
    }).catch(function (err) {
      alert("Couldn't update that claim: " + (err.message || err));
    });
  });

  function renderMessages(snap) {
    var list = document.getElementById("messagesList");
    var empty = document.getElementById("messagesEmpty");
    list.innerHTML = "";
    if (snap.empty) { empty.style.display = "block"; return; }
    empty.style.display = "none";
    snap.forEach(function (doc) {
      var m = doc.data();
      list.appendChild(el(
        '<div class="card" style="margin-bottom:1px;">' +
          '<div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px;">' +
            '<strong>' + escapeHtml(m.name || "—") + '</strong>' +
            '<span class="mono small body-dim">' + fmtDate(m.createdAt) + '</span>' +
          '</div>' +
          '<p class="small body-dim" style="margin-top:4px;">' + escapeHtml(m.email || "") + ' · ' + escapeHtml(m.company || "") + ' · ' + escapeHtml(m.topic || "") + '</p>' +
          '<p style="margin-top:12px;">' + escapeHtml(m.message || "") + '</p>' +
        '</div>'
      ));
    });
  }
})();
