/* ============================================================
   main.js — UI behaviour
   Ready hook, navigation + active indicator, mobile drawer,
   video lightbox + showreels, cursor glow.
   ============================================================ */

(function () {
  "use strict";

  var doc = document;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ========================================================
     1. Ready — kick off the hero intro once the page loads
     ======================================================== */
  function setupReady() {
    var done = false;
    function reveal() {
      if (done) { return; }
      done = true;
      window.dispatchEvent(new Event("portfolio:ready"));
    }
    if (doc.readyState === "complete") { reveal(); }
    else { window.addEventListener("load", reveal); }
    /* Safety net */
    window.setTimeout(reveal, 2500);
  }

  /* ========================================================
     2. Navigation: stuck state, active link + indicator
     ======================================================== */
  function setupNav() {
    var nav = doc.getElementById("nav");
    var linksWrap = doc.getElementById("navLinks");
    var indicator = doc.getElementById("navIndicator");
    var burger = doc.getElementById("burger");
    var drawer = doc.getElementById("drawer");

    var navLinks = [].slice.call(doc.querySelectorAll(".nav__link"));
    var drawerLinks = [].slice.call(doc.querySelectorAll(".drawer a"));
    var sections = [].slice.call(doc.querySelectorAll("main section[id]"));

    /* --- stuck state on scroll --- */
    function onScroll() {
      if (!nav) { return; }
      if (window.scrollY > 24) { nav.classList.add("is-stuck"); }
      else { nav.classList.remove("is-stuck"); }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    /* --- indicator --- */
    function moveIndicator(link) {
      if (!indicator || !linksWrap || !link) { return; }
      if (!linksWrap.offsetParent) { return; } /* hidden (mobile) */
      var lb = link.getBoundingClientRect();
      var pb = linksWrap.getBoundingClientRect();
      indicator.style.width = lb.width + "px";
      indicator.style.transform = "translate(" + (lb.left - pb.left) + "px, -50%)";
      indicator.style.opacity = "1";
    }

    /* --- active section --- */
    var activeId = "";
    function setActive(id) {
      if (id === activeId) { return; }
      activeId = id;
      var activeNavLink = null;

      navLinks.forEach(function (a) {
        var on = a.getAttribute("href") === "#" + id;
        a.classList.toggle("is-active", on);
        if (on) { activeNavLink = a; }
      });
      drawerLinks.forEach(function (a) {
        a.classList.toggle("is-active", a.getAttribute("href") === "#" + id);
      });

      if (activeNavLink) { moveIndicator(activeNavLink); }
      else if (indicator) { indicator.style.opacity = "0"; }
    }

    function updateActive() {
      if (!sections.length) { return; }
      var probe = window.scrollY + (nav ? nav.offsetHeight : 74) + 60;
      var current = null;
      for (var i = 0; i < sections.length; i++) {
        if (sections[i].offsetTop <= probe) { current = sections[i]; }
      }
      setActive(current ? current.id : "");
    }
    window.addEventListener("scroll", updateActive, { passive: true });
    window.addEventListener("resize", updateActive);
    updateActive();

    /* --- mobile drawer --- */
    function openDrawer() {
      if (!drawer) { return; }
      drawer.classList.add("is-open");
      if (burger) { burger.classList.add("is-open"); burger.setAttribute("aria-expanded", "true"); burger.setAttribute("aria-label", "Close menu"); }
      doc.body.classList.add("drawer-open");
    }
    function closeDrawer() {
      if (!drawer) { return; }
      drawer.classList.remove("is-open");
      if (burger) { burger.classList.remove("is-open"); burger.setAttribute("aria-expanded", "false"); burger.setAttribute("aria-label", "Open menu"); }
      doc.body.classList.remove("drawer-open");
    }
    if (burger) {
      burger.addEventListener("click", function () {
        if (drawer && drawer.classList.contains("is-open")) { closeDrawer(); }
        else { openDrawer(); }
      });
    }
    drawerLinks.forEach(function (a) { a.addEventListener("click", closeDrawer); });

    doc.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { closeDrawer(); }
    });

    /* Recompute the indicator when the active link's text size settles. */
    if (doc.fonts && doc.fonts.ready) {
      doc.fonts.ready.then(function () { updateActive(); });
    }
  }

  /* ========================================================
     3. Video lightbox
     ======================================================== */
  function setupLightbox() {
    var lb = doc.getElementById("lightbox");
    var vid = doc.getElementById("lightboxVideo");
    var title = doc.getElementById("lightboxTitle");
    var closeBtn = doc.getElementById("lightboxClose");
    if (!lb || !vid) { return; }

    var lastFocus = null;

    function open(src, label) {
      if (!src) { return; }
      lastFocus = doc.activeElement;
      if (title) { title.textContent = label || "Reel"; }
      vid.setAttribute("src", src);
      lb.classList.add("is-open");
      doc.body.classList.add("is-loading");
      var p = vid.play();
      if (p && p.catch) { p.catch(function () {}); }
      if (closeBtn) { closeBtn.focus(); }
    }

    function close() {
      lb.classList.remove("is-open");
      doc.body.classList.remove("is-loading");
      try { vid.pause(); } catch (err) { /* noop */ }
      vid.removeAttribute("src");
      try { vid.load(); } catch (err) { /* noop */ }
      if (lastFocus && lastFocus.focus) { lastFocus.focus(); }
    }

    [].slice.call(doc.querySelectorAll(".reel")).forEach(function (reel) {
      reel.addEventListener("click", function () {
        open(reel.getAttribute("data-video"), reel.getAttribute("data-title"));
      });
    });

    if (closeBtn) { closeBtn.addEventListener("click", close); }
    lb.addEventListener("click", function (e) { if (e.target === lb) { close(); } });
    doc.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && lb.classList.contains("is-open")) { close(); }
    });

    window.__closeLightbox = close;
  }

  /* ========================================================
     4. Card hover glow follow (projects)
     ======================================================== */
  function setupCardGlow() {
    if (!finePointer || reduce) { return; }
    [].slice.call(doc.querySelectorAll(".project")).forEach(function (card) {
      card.addEventListener("pointermove", function (e) {
        var b = card.getBoundingClientRect();
        var px = ((e.clientX - b.left) / b.width) * 100;
        var py = ((e.clientY - b.top) / b.height) * 100;
        card.style.setProperty("--gx", px + "%");
        card.style.setProperty("--gy", py + "%");
      });
    });
  }

  /* ========================================================
     5. Showreel videos — muted, loop, play when in view
     ======================================================== */
  function setupReels() {
    var reels = [].slice.call(doc.querySelectorAll(".reel video"));
    if (!reels.length) { return; }

    reels.forEach(function (v) {
      v.muted = true;
      v.loop = true;
      v.setAttribute("playsinline", "");
    });

    /* Respect reduced motion: leave them paused on the first frame. */
    if (reduce) { return; }

    function play(v) {
      var p = v.play();
      if (p && p.catch) { p.catch(function () {}); }
    }

    if (!("IntersectionObserver" in window)) {
      reels.forEach(play);
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { play(entry.target); }
        else { try { entry.target.pause(); } catch (err) {} }
      });
    }, { rootMargin: "120px 0px", threshold: 0.15 });

    reels.forEach(function (v) { io.observe(v); });
  }

  /* ========================================================
     6. Mascot — tap to return to the top
     ======================================================== */
  function setupMascotTop() {
    var hosts = [].slice.call(doc.querySelectorAll("[data-mascot]"));
    hosts.forEach(function (host) {
      var wrap = host.parentNode && host.parentNode.classList &&
        host.parentNode.classList.contains("mascot-host") ? host.parentNode : host;
      wrap.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      });
    });
  }

  /* ---- boot ---- */
  function boot() {
    setupReady();
    setupNav();
    setupLightbox();
    setupCardGlow();
    setupReels();
    setupMascotTop();
  }

  if (doc.readyState === "loading") {
    doc.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
