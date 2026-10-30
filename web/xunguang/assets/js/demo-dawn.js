/* 循光践道 · 首页核心动效 Demo「光起」
 * 原生 JS，零依赖
 * 只做一件事：把滚动进度变成光的进度
 * 0 → 起光；1/2/3 → 三句话依次出现；4 → 光升到底，出现出口
 */
(function () {
  "use strict";

  var root = document.querySelector(".xg-dd");
  if (!root) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    .matches;

  var currentPhase = -1;
  var isEnd = false;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function update() {
    var travel = root.offsetHeight - window.innerHeight;
    var top = root.getBoundingClientRect().top;
    var p = travel > 0 ? clamp(-top / travel, 0, 1) : 1;

    root.style.setProperty("--p", p.toFixed(4));

    var phase = 0;
    if (p >= 0.14) phase = 1;
    if (p >= 0.36) phase = 2;
    if (p >= 0.58) phase = 3;
    if (p >= 0.84) phase = 4;

    if (phase !== currentPhase) {
      currentPhase = phase;
      root.dataset.phase = String(phase);
    }

    var endNow = phase === 4;
    if (endNow !== isEnd) {
      isEnd = endNow;
      root.classList.toggle("is-end", isEnd);
    }
  }

  if (reduceMotion) {
    root.style.setProperty("--p", "1");
    root.dataset.phase = "4";
    root.classList.add("is-end");
    return;
  }

  var ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      update();
      ticking = false;
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();
})();
