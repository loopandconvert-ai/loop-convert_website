/* Loop&Convert site script. No dependencies. */

/* ------------------------------------------------------------------
   SETTINGS
   formEndpoint: your Formspree form URL, for example
   "https://formspree.io/f/abcdwxyz". The demo and contact forms send to it.
   While it is empty, the forms open a pre-filled email to you instead,
   so no message is lost.
   calLink: the Cal.com event shown on the Book a call page.
------------------------------------------------------------------- */
var LC_CONFIG = {
  formEndpoint: "https://formspree.io/f/xzedkvdn",
  calLink: "iulian-bostan/30min"
};

(function () {
  "use strict";

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function store(key, value) {
    try {
      if (value === undefined) return window.sessionStorage.getItem(key);
      if (value === null) window.sessionStorage.removeItem(key);
      else window.sessionStorage.setItem(key, value);
    } catch (e) { return null; }
    return null;
  }

  /* Year in footer */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  /* Mobile menu */
  var menuBtn = document.getElementById("menu-btn");
  var nav = document.getElementById("site-nav");
  if (menuBtn && nav) {
    menuBtn.addEventListener("click", function () {
      var open = menuBtn.getAttribute("aria-expanded") === "true";
      menuBtn.setAttribute("aria-expanded", String(!open));
      menuBtn.textContent = open ? "Menu" : "Close";
      nav.classList.toggle("is-open", !open);
    });
    nav.addEventListener("click", function (e) {
      var a = e.target.closest("a");
      if (a && nav.classList.contains("is-open")) {
        menuBtn.setAttribute("aria-expanded", "false");
        menuBtn.textContent = "Menu";
        nav.classList.remove("is-open");
      }
    });
  }

  /* Products dropdown */
  var dropBtn = document.getElementById("products-btn");
  var dropPanel = document.getElementById("products-menu");
  if (dropBtn && dropPanel) {
    var setDrop = function (open) {
      dropBtn.setAttribute("aria-expanded", String(open));
      dropPanel.hidden = !open;
    };
    var hoverOpenedAt = 0;
    dropBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      /* A click right after hover opened the menu should keep it open, not close it */
      if (Date.now() - hoverOpenedAt < 600) { setDrop(true); return; }
      setDrop(dropBtn.getAttribute("aria-expanded") !== "true");
    });
    document.addEventListener("click", function (e) {
      if (!dropPanel.hidden && !e.target.closest(".nav-drop")) setDrop(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !dropPanel.hidden) { setDrop(false); dropBtn.focus(); }
    });
    var wrap = dropBtn.closest(".nav-drop");
    var hoverable = window.matchMedia && window.matchMedia("(hover: hover) and (min-width: 861px)");
    var closeTimer;
    wrap.addEventListener("mouseenter", function () {
      if (hoverable && hoverable.matches) {
        clearTimeout(closeTimer);
        if (dropPanel.hidden) hoverOpenedAt = Date.now();
        setDrop(true);
      }
    });
    wrap.addEventListener("mouseleave", function () {
      if (hoverable && hoverable.matches) { closeTimer = setTimeout(function () { setDrop(false); }, 180); }
    });
    wrap.addEventListener("focusout", function (e) {
      if (!wrap.contains(e.relatedTarget)) setDrop(false);
    });
  }

  /* Home: example converter */
  var conv = document.getElementById("converter");
  if (conv) {
    var examples = [
      { before: "Copying order emails into a spreadsheet every morning", kind: "Automation and dashboard", after: "An agent reads each order email and lists it in one dashboard your team already has open." },
      { before: "Answering the same twenty questions on the phone all day", kind: "Call assistant", after: "A call assistant answers the common questions, books appointments and passes the rest to a person." },
      { before: "Following up on quotes whenever someone remembers", kind: "Automation", after: "Every quote gets a follow-up on schedule, and the pipeline is visible to the whole team." },
      { before: "Reading every contract line by line before anyone signs", kind: "Our product", after: "A risk report on each contract in under three minutes, with red flags and key clauses.", link: "contract-analysis.html" },
      { before: "Posting on social media only when there's time", kind: "Campaign", after: "A content system that drafts posts, schedules them and reports what worked." }
    ];
    var idx = 0;
    var els = {
      before: document.getElementById("conv-before"),
      kind: document.getElementById("conv-kind"),
      after: document.getElementById("conv-after"),
      count: document.getElementById("conv-count"),
      linkWrap: document.getElementById("conv-link-wrap"),
      link: document.getElementById("conv-link")
    };
    var auto = !reduceMotion;
    var timer, convertTimer;

    var render = function (i, animate) {
      var ex = examples[i];
      clearTimeout(convertTimer);
      if (animate && !reduceMotion) conv.classList.remove("is-converted");
      els.before.textContent = ex.before;
      els.kind.textContent = ex.kind;
      els.after.textContent = ex.after;
      els.count.textContent = (i + 1) + " of " + examples.length;
      if (ex.link) { els.link.href = ex.link; els.linkWrap.hidden = false; } else { els.linkWrap.hidden = true; }
      if (animate && !reduceMotion) {
        convertTimer = setTimeout(function () { conv.classList.add("is-converted"); }, 650);
      } else {
        conv.classList.add("is-converted");
      }
    };
    var go = function (step) {
      idx = (idx + step + examples.length) % examples.length;
      render(idx, true);
    };
    var schedule = function () {
      clearInterval(timer);
      if (auto) timer = setInterval(function () { go(1); }, 5200);
    };
    document.getElementById("conv-next").addEventListener("click", function () { auto = false; clearInterval(timer); go(1); });
    document.getElementById("conv-prev").addEventListener("click", function () { auto = false; clearInterval(timer); go(-1); });
    conv.addEventListener("mouseenter", function () { clearInterval(timer); });
    conv.addEventListener("mouseleave", schedule);
    document.addEventListener("visibilitychange", function () { if (document.hidden) clearInterval(timer); else schedule(); });
    schedule();
  }

  /* Home: quick ask carries the text to the booking page */
  var ask = document.getElementById("ask-form");
  if (ask) {
    ask.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = document.getElementById("ask-input").value.trim();
      if (v) store("lc_problem", v);
      window.location.href = "book-a-call.html";
    });
  }

  /* Book a call: Cal.com calendar. The text from the home page ask box
     is passed on as the booking notes. */
  var calEl = document.getElementById("cal-inline");
  if (calEl) {
    (function (C, A, L) {
      var p = function (a, ar) { a.q.push(ar); };
      var d = C.document;
      C.Cal = C.Cal || function () {
        var cal = C.Cal;
        var ar = arguments;
        if (!cal.loaded) {
          cal.ns = {};
          cal.q = cal.q || [];
          d.head.appendChild(d.createElement("script")).src = A;
          cal.loaded = true;
        }
        if (ar[0] === L) {
          var api = function () { p(api, arguments); };
          var namespace = ar[1];
          api.q = api.q || [];
          if (typeof namespace === "string") {
            cal.ns[namespace] = cal.ns[namespace] || api;
            p(cal.ns[namespace], ar);
            p(cal, [L, namespace, api]);
          } else {
            p(cal, ar);
          }
          return;
        }
        p(cal, ar);
      };
    })(window, "https://app.cal.com/embed/embed.js", "init");

    var calConfig = { layout: "month_view", theme: "light" };
    var notes = store("lc_problem");
    if (notes) { calConfig.notes = notes; store("lc_problem", null); }
    window.Cal("init", "discovery", { origin: "https://cal.com" });
    window.Cal.ns.discovery("inline", { elementOrSelector: "#cal-inline", calLink: LC_CONFIG.calLink, layout: "month_view", config: calConfig });
    window.Cal.ns.discovery("ui", { theme: "light", hideEventTypeDetails: false, layout: "month_view" });
  }

  /* Images: show a calm panel instead of a broken image if a file is missing */
  document.querySelectorAll(".media img").forEach(function (img) {
    var mark = function () { img.closest(".media").classList.add("is-missing"); };
    if (img.complete && img.naturalWidth === 0) mark();
    img.addEventListener("error", mark);
  });

  /* Copy buttons (email address) */
  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      var done = function () { btn.textContent = "Copied"; setTimeout(function () { btn.textContent = "Copy"; }, 1800); };
      var fallback = function () {
        var addr = document.getElementById("demo-addr");
        if (addr && window.getSelection) {
          var r = document.createRange(); r.selectNodeContents(addr);
          var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
          btn.textContent = "Selected, press Ctrl+C";
        }
      };
      try {
        navigator.clipboard.writeText(text).then(done, fallback);
      } catch (e) { fallback(); }
    });
  });

  /* Simple forms: demo request (product page) and questions (contact page) */
  var simpleForms = {
    demo: { done: "Demo requested.", body: "We'll email you within one working day to set up a 30-minute demo.", area: "demo-area", subject: "Demo request: Contract Analysis" },
    contact: { done: "Question sent.", body: "We'll reply by email within one working day.", area: "contact-area", subject: "Question from the website" }
  };
  document.querySelectorAll('form[data-lc-form="demo"], form[data-lc-form="contact"]').forEach(function (f) {
    var kind = f.getAttribute("data-lc-form");
    var cfg = simpleForms[kind];
    var summary = f.querySelector(".form-summary");
    var fieldError = function (input, msg) {
      var field = input.closest(".field");
      var err = field ? field.querySelector(".error") : null;
      if (field) field.classList.toggle("has-error", !!msg);
      if (err) { err.textContent = msg || ""; err.hidden = !msg; }
      if (msg) { input.setAttribute("aria-invalid", "true"); if (err) input.setAttribute("aria-describedby", err.id); }
      else { input.removeAttribute("aria-invalid"); input.removeAttribute("aria-describedby"); }
    };
    var check = function (input) {
      var v = input.value.trim();
      var min = parseInt(input.getAttribute("data-min") || "2", 10);
      var ok = input.type === "email" ? /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) : v.length >= min;
      fieldError(input, ok ? "" : input.getAttribute("data-msg"));
      return ok;
    };
    f.querySelectorAll("[required]").forEach(function (input) {
      /* Clear an error while the person types, so the layout is settled before they click Send */
      input.addEventListener("input", function () {
        if (input.closest(".field").classList.contains("has-error")) check(input);
      });
    });
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var bad = [];
      f.querySelectorAll("[required]").forEach(function (input) { if (!check(input)) bad.push(input); });
      if (bad.length) {
        summary.textContent = bad.length === 1 ? "One thing needs fixing before you can send." : bad.length + " things need fixing before you can send.";
        summary.hidden = false;
        bad[0].focus();
        return;
      }
      summary.hidden = true;
      var data = new FormData(f);
      var payload = { form: kind, page: window.location.pathname, sent_at: new Date().toISOString() };
      data.forEach(function (v, k) { payload[k] = String(v).trim(); });
      var btn = f.querySelector('button[type="submit"]');
      var label = btn.textContent;
      btn.disabled = true; btn.textContent = "Sending...";
      var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
      var finish = function () {
        var area = document.getElementById(cfg.area);
        area.innerHTML = '<div class="done done-plain" tabindex="-1">' +
          "<h2>" + cfg.done + "</h2>" +
          '<p class="lede">Thanks, ' + esc(payload.name.split(" ")[0]) + ". " + cfg.body + "</p>" +
          "<dl><dt>Email</dt><dd>" + esc(payload.email) + "</dd></dl>" +
          "</div>";
        var d = area.querySelector(".done"); if (d) d.focus();
      };
      /* No form service connected yet: hand the message to the visitor's email app */
      var sendByEmail = function () {
        var to = (window.LC_SITE && window.LC_SITE.email) || "";
        var lines = [];
        Object.keys(payload).forEach(function (k) {
          if (k !== "page" && k !== "sent_at" && payload[k]) lines.push(k.replace(/_/g, " ") + ": " + payload[k]);
        });
        var href = "mailto:" + to + "?subject=" + encodeURIComponent(cfg.subject) + "&body=" + encodeURIComponent(lines.join("\n"));
        var area = document.getElementById(cfg.area);
        area.innerHTML = '<div class="done done-plain" tabindex="-1">' +
          "<h2>One more step.</h2>" +
          '<p class="lede">Your email app has opened with your message filled in. Press send there and we\'ll reply within one working day.</p>' +
          '<p><a class="btn" href="' + esc(href) + '">Open the email again</a></p>' +
          '<p class="muted small">Or write to us directly at <a class="text-link" href="mailto:' + esc(to) + '">' + esc(to) + "</a>.</p>" +
          "</div>";
        window.location.href = href;
        var d = area.querySelector(".done"); if (d) d.focus();
      };
      if (!LC_CONFIG.formEndpoint) { sendByEmail(); return; }
      fetch(LC_CONFIG.formEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload)
      }).then(function (res) {
        if (!res.ok) throw new Error("status " + res.status);
        finish();
      }).catch(function () {
        btn.disabled = false; btn.textContent = label;
        summary.textContent = "Your message didn't go through. Check your connection and try again, or email us directly.";
        summary.hidden = false;
      });
    });
  });
})();
