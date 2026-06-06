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
    d.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch (e) {}
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

/* ---- hero video fade-in ---- */
(function () {
  var v = document.getElementById("hero-video");
  if (!v) return;
  function ready() { v.classList.add("is-ready"); }
  if (v.readyState >= 2) ready();
  v.addEventListener("canplay", ready, { once: true });
  v.addEventListener("loadeddata", ready, { once: true });
  setTimeout(ready, 2500);
})();

/* ---- mobile nav ---- */
(function () {
  var toggle = document.getElementById("nav-toggle");
  var nav = document.getElementById("topnav");
  if (!toggle || !nav) return;
  toggle.addEventListener("click", function () {
    var open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  nav.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", function () {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
})();

/* ---- gallery hover-play ---- */
(function () {
  document.querySelectorAll(".gitem video").forEach(function (video) {
    var item = video.closest(".gitem");
    if (!item) return;
    item.addEventListener("mouseenter", function () { video.play().catch(function () {}); });
    item.addEventListener("mouseleave", function () { video.pause(); video.currentTime = 0; });
  });
})();

/* ---- lightbox ---- */
(function () {
  var lb = document.getElementById("lightbox");
  var media = document.getElementById("lightbox-media");
  var cap = document.getElementById("lightbox-cap");
  var closeBtn = document.getElementById("lightbox-close");
  if (!lb || !media) return;

  function open(srcEl, caption, state) {
    media.innerHTML = "";
    var clone = srcEl.cloneNode(true);
    if (clone.tagName.toLowerCase() === "video") {
      clone.removeAttribute("muted");
      clone.muted = false;
      clone.setAttribute("controls", "");
      clone.removeAttribute("loop");
      var t = (state && state.currentTime) || 0;
      var wasPaused = state ? state.wasPaused : true;
      var go = function () {
        try { clone.currentTime = t; } catch (e) {}
        if (!wasPaused) clone.play().catch(function () {});
      };
      if (clone.readyState >= 1) go();
      else clone.addEventListener("loadedmetadata", go, { once: true });
    }
    media.appendChild(clone);
    cap.textContent = caption || "";
    lb.classList.add("is-open");
    document.body.classList.add("lb-open");
    lb.setAttribute("aria-hidden", "false");
  }

  function close() {
    var v = media.querySelector("video");
    if (v) v.pause();
    media.innerHTML = "";
    lb.classList.remove("is-open");
    document.body.classList.remove("lb-open");
    lb.setAttribute("aria-hidden", "true");
  }

  closeBtn.addEventListener("click", close);
  lb.addEventListener("click", function (e) { if (e.target === lb) close(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && lb.classList.contains("is-open")) close();
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
      open(el, caption, state);
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
