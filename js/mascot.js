/* ============================================================
   mascot.js — vanilla-JS port of "page-mascot" (MIT © Kamran Ahmed)
   https://koboyo.com/page-mascot

   The original is a React component. This is a dependency-free,
   no-build port for this plain HTML/CSS/JS site. It keeps the same
   behaviour: a two-sheet 3x3 sprite character that looks toward the
   cursor, settles in a dead zone, reacts when clicked, and squashes.

   Sheets: crt-directions.webp (9 head directions)
           crt-reactions.webp  (9 expressions)
   ============================================================ */

(function () {
  "use strict";

  /* ---- sprite layout (identical to the React source) ---- */
  var DIRECTIONS = [
    "up-left", "up", "up-right",
    "left", "center", "right",
    "down-left", "down", "down-right"
  ];
  var REACTIONS = [
    "blink", "heart", "sparkle",
    "surprised", "wink", "bashful",
    "sleepy", "dizzy", "delighted"
  ];
  /* Clockwise from the right, matching atan2 with y pointing down. */
  var CLOCKWISE = [
    "right", "down-right", "down", "down-left",
    "left", "up-left", "up", "up-right"
  ];
  var SECTOR = (Math.PI * 2) / CLOCKWISE.length;
  var HYSTERESIS = 0.12;
  var DEAD_ZONE = 70;
  var PAYOFFS = ["heart", "sparkle", "delighted"];
  var BOOP_PAYOFF = 120;
  var BOOP_END = 560;
  var SQUASH_MS = 420;
  var DIZZY_AFTER = 4;
  var DIZZY_WINDOW = 1600;
  var DIZZY_END = 1100;

  /* Per-keyframe easing with the effect itself linear — an easing on the
     effect would reinterpret every offset and front-load the bounce. */
  var SQUASH = [
    { transform: "scale(1, 1)", easing: "ease-in" },
    { transform: "scale(1.10, 0.86)", offset: 0.18, easing: "ease-out" },
    { transform: "scale(0.95, 1.08)", offset: 0.45, easing: "ease-in-out" },
    { transform: "scale(1.03, 0.97)", offset: 0.72, easing: "ease-in-out" },
    { transform: "scale(1, 1)" }
  ];

  /* background-size 300% 300% makes each cell a clean 0/50/100% step. */
  function cell(index) {
    return ((index % 3) * 50) + "% " + (Math.floor(index / 3) * 50) + "%";
  }
  function wrap(angle) {
    return Math.atan2(Math.sin(angle), Math.cos(angle));
  }

  function mount(host) {
    if (!host || host.getAttribute("data-mascot-ready") === "1") { return; }

    var directions = host.getAttribute("data-directions");
    var reactions = host.getAttribute("data-reactions");
    if (!directions || !reactions) { return; }
    host.setAttribute("data-mascot-ready", "1");

    var size = parseInt(host.getAttribute("data-size") || "120", 10);
    var label = host.getAttribute("data-label") || "mascot";

    /* ---- build the DOM (mirrors the component's markup) ---- */
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mascot";
    btn.setAttribute("aria-label", "Boop the " + label);
    btn.style.setProperty("--mascot-size", size + "px");

    var squash = document.createElement("span");
    squash.className = "mascot__squash";

    var dirLayer = document.createElement("span");
    dirLayer.className = "mascot__sheet mascot__sheet--dir";
    dirLayer.style.backgroundImage = 'url("' + directions + '")';

    var reactLayer = document.createElement("span");
    reactLayer.className = "mascot__sheet mascot__sheet--react";
    reactLayer.style.backgroundImage = 'url("' + reactions + '")';

    squash.appendChild(dirLayer);
    squash.appendChild(reactLayer);
    btn.appendChild(squash);
    host.appendChild(btn);

    /* ---- state ---- */
    var direction = "center";
    var reaction = null;
    var timers = [];
    var boops = { count: 0, at: 0 };

    function render() {
      dirLayer.style.backgroundPosition = cell(DIRECTIONS.indexOf(direction));
      dirLayer.style.opacity = reaction ? "0" : "1";
      reactLayer.style.backgroundPosition = cell(REACTIONS.indexOf(reaction || "blink"));
      reactLayer.style.opacity = reaction ? "1" : "0";
    }

    function setDirection(next) {
      if (next === direction) { return; }
      direction = next;
      render();
    }
    function setReaction(next) {
      if (next === reaction) { return; }
      reaction = next;
      render();
    }

    /* ---- cursor tracking (fine pointers only) ---- */
    var fine = window.matchMedia &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    if (fine) {
      var sector = -1;
      var pointer = null;

      var aim = function () {
        if (!pointer) { return; }
        var box = btn.getBoundingClientRect();
        var dx = pointer.x - (box.left + box.width / 2);
        var dy = pointer.y - (box.top + box.height / 2);

        if (Math.sqrt(dx * dx + dy * dy) < DEAD_ZONE) {
          sector = -1;
          setDirection("center");
          return;
        }
        /* Hold the current sector until the pointer is well past its edge. */
        var angle = Math.atan2(dy, dx);
        if (sector !== -1 && Math.abs(wrap(angle - sector * SECTOR)) < SECTOR / 2 + HYSTERESIS) {
          return;
        }
        sector = (Math.round(angle / SECTOR) + CLOCKWISE.length) % CLOCKWISE.length;
        setDirection(CLOCKWISE[sector]);
      };

      window.addEventListener("pointermove", function (e) {
        pointer = { x: e.clientX, y: e.clientY };
        aim();
      }, { passive: true });
      window.addEventListener("scroll", aim, { passive: true });
    }

    /* ---- boop reactions ---- */
    function boop() {
      timers.forEach(window.clearTimeout);
      timers = [];

      var later = function (ms, next) {
        timers.push(window.setTimeout(function () { setReaction(next); }, ms));
      };
      var now = Date.now();
      boops.count = (now - boops.at < DIZZY_WINDOW) ? boops.count + 1 : 1;
      boops.at = now;

      if (boops.count >= DIZZY_AFTER) {
        boops.count = 0;
        setReaction("dizzy");
        later(DIZZY_END, null);
      } else {
        setReaction("blink");
        later(BOOP_PAYOFF, PAYOFFS[(boops.count - 1) % PAYOFFS.length]);
        later(BOOP_END, null);
      }

      if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
      }
      if (squash.animate) {
        squash.animate(SQUASH, { duration: SQUASH_MS, easing: "linear" });
      }
    }

    btn.addEventListener("click", boop);

    render();
  }

  function init() {
    var nodes = document.querySelectorAll("[data-mascot]");
    for (var i = 0; i < nodes.length; i++) { mount(nodes[i]); }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.__mountMascot = mount;
})();
