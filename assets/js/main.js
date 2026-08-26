/* ============================================================
   FPV — theme toggle, reveal, hero video, gallery hover-play,
   lightbox, mobile nav, smooth scroll, year.
   ============================================================ */

/* ---- theme toggle (persisted) ---- */
(function () {
  var btn = document.getElementById("theme-toggle");
  if (!btn) return;
  btn.addEventListener("click", function () {
    var d = document.documentElement;
    var next = d.dataset.theme === "dark" ? "light" : "dark";
    /* __setTheme is defined by the boot script in <head>; it writes the
       cookie that carries the choice across the sibling subdomains. */
    if (window.__setTheme) window.__setTheme(next);
    else d.dataset.theme = next;
  });
})();

/* ---- reveal on scroll ---- */
(function () {
  var els = document.querySelectorAll("[data-reveal]");
  if (!els.length || !("IntersectionObserver" in window)) {
    els.forEach(function (el) { el.classList.add("is-in"); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  els.forEach(function (el) { io.observe(el); });
})();

/* ---- hero: instant preview -> loading screen fades -> full reel upgrades ---- */
(function () {
  var loader = document.getElementById("hero-loader");
  var lq = document.getElementById("hero-lq");
  var hq = document.getElementById("hero-hq");
  if (!lq) return;
  var bar = loader ? loader.querySelector(".hero-loader__bar span") : null;
  var loaderHidden = false, upgraded = false;

  function hideLoader() {
    if (loaderHidden || !loader) return;
    loaderHidden = true;
    if (bar) bar.style.width = "100%";
    loader.classList.add("is-hidden");
  }

  /* progress bar tracks how much of the preview has buffered */
  lq.addEventListener("progress", function () {
    if (!bar || loaderHidden) return;
    try {
      if (lq.buffered.length && lq.duration) {
        var pct = (lq.buffered.end(lq.buffered.length - 1) / lq.duration) * 100;
        bar.style.width = Math.max(8, Math.min(95, pct)) + "%";
      }
    } catch (e) {}
  });

  /* preview can play -> reveal it, drop the loader, start loading the full reel */
  function previewReady() {
    lq.classList.add("is-ready");
    setTimeout(hideLoader, 200);
    upgrade();
  }
  if (lq.readyState >= 3) previewReady();
  else {
    lq.addEventListener("canplay", previewReady, { once: true });
    lq.addEventListener("loadeddata", previewReady, { once: true });
  }
  lq.addEventListener("error", hideLoader);
  setTimeout(hideLoader, 6000); /* safety: never get stuck */

  /* quietly load the full-quality reel and crossfade to it when ready */
  function upgrade() {
    if (upgraded || !hq) return;
    upgraded = true;
    var c = navigator.connection;
    if (c && (c.saveData || /(^|-)(2g|slow-2g)$/.test(c.effectiveType || ""))) return; /* respect data saver */
    hq.src = "assets/videos/reel.mp4";
    hq.load();
    hq.addEventListener("canplaythrough", function () {
      try { hq.currentTime = lq.currentTime % (hq.duration || lq.duration || 1); } catch (e) {}
      var p = hq.play();
      function show() {
        hq.classList.add("is-ready");
        setTimeout(function () { try { lq.pause(); } catch (e) {} }, 1000);
      }
      if (p && p.then) p.then(show).catch(function () {}); else show();
    }, { once: true });
  }
})();

/* ---- mobile nav drawer ---- */
(function () {
  var toggle = document.getElementById("nav-toggle");
  var nav = document.getElementById("topnav");
  if (!toggle || !nav) return;

  function set(open) {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  }
  toggle.addEventListener("click", function () {
    set(!nav.classList.contains("is-open"));
  });
  /* a drawer that stays open after you pick something, or that you cannot
     dismiss without finding the button again, is worse than no drawer */
  nav.addEventListener("click", function (e) {
    if (e.target.closest("a")) set(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && nav.classList.contains("is-open")) { set(false); toggle.focus(); }
  });
  document.addEventListener("click", function (e) {
    if (!nav.classList.contains("is-open")) return;
    if (!nav.contains(e.target) && !toggle.contains(e.target)) set(false);
  });
})();

/* ---- gallery preview playback (hover or keyboard focus) ---- */
(function () {
  document.querySelectorAll(".gitem video").forEach(function (video) {
    var item = video.closest(".gitem");
    if (!item) return;
    function start() { video.play().catch(function () {}); }
    function stop() { video.pause(); video.currentTime = 0; }
    item.addEventListener("mouseenter", start);
    item.addEventListener("mouseleave", stop);
    /* the tile is a button now, so tabbing to it should preview too */
    item.addEventListener("focus", start);
    item.addEventListener("blur", stop);
  });
})();

/* ---- lightbox ---- */
(function () {
  var lb = document.getElementById("lightbox");
  var media = document.getElementById("lightbox-media");
  var cap = document.getElementById("lightbox-cap");
  var closeBtn = document.getElementById("lightbox-close");
  if (!lb || !media) return;

  var lastFocus = null;
  var FOCUSABLE = 'a[href], button:not([disabled]), video[controls], [tabindex]:not([tabindex="-1"])';

  /* while the dialog is up, nothing behind it should be reachable by Tab */
  function background(inert) {
    Array.prototype.forEach.call(document.body.children, function (el) {
      if (el === lb) return;
      if (inert) el.setAttribute("inert", "");
      else el.removeAttribute("inert");
    });
  }

  function open(srcEl, caption, state, fullSrc) {
    media.innerHTML = "";
    var clone = srcEl.cloneNode(true);
    if (clone.tagName.toLowerCase() === "video") {
      /* the grid plays a small muted preview; the lightbox gets the
         full-quality file (with audio), resuming at the same moment */
      if (fullSrc) clone.setAttribute("src", fullSrc);
      clone.removeAttribute("muted");
      clone.muted = false;
      clone.setAttribute("controls", "");
      clone.setAttribute("preload", "auto");
      clone.removeAttribute("loop");
      var t = (state && state.currentTime) || 0;
      var wasPaused = state ? state.wasPaused : true;
      var go = function () {
        try { clone.currentTime = t; } catch (e) {}
        if (!wasPaused) clone.play().catch(function () {});
      };
      if (clone.readyState >= 1) go();
      else clone.addEventListener("loadedmetadata", go, { once: true });
    } else {
      clone.setAttribute("loading", "eager"); /* show immediately in the lightbox */
    }
    media.appendChild(clone);
    cap.textContent = caption || "";

    lastFocus = document.activeElement;
    lb.classList.add("is-open");
    document.body.classList.add("lb-open");
    lb.setAttribute("aria-hidden", "false");
    background(true);
    closeBtn.focus();
  }

  function close() {
    var v = media.querySelector("video");
    if (v) v.pause();
    media.innerHTML = "";
    lb.classList.remove("is-open");
    document.body.classList.remove("lb-open");
    lb.setAttribute("aria-hidden", "true");
    background(false);
    /* put the caret back on the tile that opened it */
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    lastFocus = null;
  }

  closeBtn.addEventListener("click", close);
  lb.addEventListener("click", function (e) { if (e.target === lb) close(); });

  document.addEventListener("keydown", function (e) {
    if (!lb.classList.contains("is-open")) return;
    if (e.key === "Escape") { close(); return; }
    if (e.key !== "Tab") return;
    /* keep Tab inside the dialog for browsers without inert */
    var items = lb.querySelectorAll(FOCUSABLE);
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  document.querySelectorAll(".gitem").forEach(function (item) {
    var el = item.querySelector("img, video");
    if (!el) return;
    var caption = item.getAttribute("data-caption") || "";
    item.addEventListener("click", function () {
      var state = null;
      if (el.tagName.toLowerCase() === "video") {
        state = { currentTime: el.currentTime || 0, wasPaused: el.paused };
        el.pause();
      }
      open(el, caption, state, item.getAttribute("data-full"));
    });
  });
})();

/* ---- smooth scroll for in-page anchors ---- */
(function () {
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      if (id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
})();

/* ---- footer year ---- */
(function () {
  var y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
})();

/* ---- nav label letter-by-letter stagger ---- */
(function () {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  document.querySelectorAll(".topnav__link").forEach(function (link, li) {
    var text = link.textContent;
    link.textContent = "";
    link.classList.add("stagger");
    for (var i = 0; i < text.length; i++) {
      var s = document.createElement("span");
      if (text[i] === " ") { s.className = "sp"; s.innerHTML = "&nbsp;"; }
      else s.textContent = text[i];
      s.style.setProperty("--ci", li * 3 + i);
      link.appendChild(s);
    }
  });
})();

/* ---- scrolled nav state ---- */
(function () {
  function onScroll() { document.body.classList.toggle("scrolled", window.scrollY > 40); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();

/* ---- idle at top for 3s -> fade UI, reel goes fullscreen ---- */
(function () {
  var timer = null;
  function atTop() { return window.scrollY < 60; }
  function minimize() { if (atTop()) document.body.classList.add("ui-minimal"); }
  function schedule() { clearTimeout(timer); timer = setTimeout(minimize, 3000); }
  function wake() {
    if (document.body.classList.contains("ui-minimal")) {
      document.body.classList.remove("ui-minimal");
    }
    schedule();
  }
  ["mousemove", "mousedown", "keydown", "touchstart", "wheel", "scroll"].forEach(function (ev) {
    window.addEventListener(ev, wake, { passive: true });
  });
  schedule();
})();

/* ---- favicon follows the theme ----
   The SVG carries its own prefers-color-scheme query, which covers the OS
   setting before this runs. That query cannot see the in-page toggle though,
   so swap the file when data-theme changes. The <link> is replaced rather
   than re-pointed: several browsers ignore an href edit on a live icon. */
(function () {
  var cur = document.querySelector('link[rel="icon"]');
  if (!cur) return;
  var base = cur.getAttribute("href").replace(/favicon(-dark|-light)?\.svg$/, "favicon");
  var shown = null;
  function sync() {
    var want = document.documentElement.dataset.theme === "light" ? "light" : "dark";
    if (want === shown) return;
    shown = want;
    var next = document.createElement("link");
    next.rel = "icon";
    next.type = "image/svg+xml";
    next.href = base + "-" + want + ".svg";
    cur.parentNode.replaceChild(next, cur);
    cur = next;
  }
  sync();
  new MutationObserver(sync).observe(document.documentElement,
    { attributes: true, attributeFilter: ["data-theme"] });
})();
