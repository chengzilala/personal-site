/* 循光践道 · 新官网设计 Demo「追光见道」
 * 原生 JS，零依赖
 * 1) 一束光随滚动从顶部一路落到底部（落地位置对齐「道」字中心）
 * 2) 光扫过的文字被点亮：光过之后保持明亮，光未到则暗淡
 * 3) 接近终点时光变强，落地瞬间爆闪，见「道」
 */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    .matches;

  var beam = document.querySelector(".xg-dl-beam");
  var burst = document.querySelector(".xg-dl-burst");
  var progressBar = document.querySelector(".xg-dl-progress span");
  var dao = document.querySelector(".xg-dl-dao");
  var dustLayer = document.querySelector(".xg-dl-dust");
  var litEls = Array.prototype.slice.call(
    document.querySelectorAll(".xg-dl-lit")
  );

  if (!beam) return;

  var litState = litEls.map(function () {
    return 0;
  });
  var dust = [];
  var startY = 0;
  var endY = 0;
  var isLanded = false;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  /* 起点在视口顶部，终点对齐「道」字的中心 */
  function measure() {
    var vh = window.innerHeight;
    startY = vh * 0.12;

    if (dao) {
      var maxScroll = document.documentElement.scrollHeight - vh;
      var rect = dao.getBoundingClientRect();
      var center = rect.top + window.scrollY + rect.height / 2;
      endY = clamp(center - Math.max(0, maxScroll), vh * 0.45, vh * 0.86);
    } else {
      endY = vh * 0.72;
    }

    if (burst) burst.style.setProperty("--land-y", endY + "px");
  }

  /* 微尘：靠近光点时被点亮 */
  if (dustLayer && !reduceMotion) {
    for (var i = 0; i < 30; i++) {
      var dot = document.createElement("span");
      dot.className = "xg-dl-dust__dot";
      var dx = 4 + Math.random() * 92;
      var dy = 2 + Math.random() * 96;
      dot.style.left = dx + "vw";
      dot.style.top = dy + "vh";
      dot.style.animationDelay = -Math.random() * 6 + "s";
      dot.style.animationDuration = 4 + Math.random() * 5 + "s";
      dustLayer.appendChild(dot);
      dust.push({
        el: dot,
        x: dx,
        y: dy,
        base: 0.06 + Math.random() * 0.14
      });
    }
  }

  function render() {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var maxScroll = document.documentElement.scrollHeight - vh;
    var p = maxScroll > 0 ? clamp(window.scrollY / maxScroll, 0, 1) : 1;

    // 越接近末尾越有"加速下坠"的感觉
    var travel = Math.pow(p, 1.2);
    var y = startY + (endY - startY) * travel;

    // 横向轻微偏移，像流星在"找落点"；最后收束回中轴
    var settle = 1 - Math.pow(travel, 10);
    var drift = Math.sin(travel * Math.PI * 2.4);
    var x = 50 + drift * 7 * settle;

    // 拖尾顺着横向移动方向轻轻摆一下
    var tilt = -Math.cos(travel * Math.PI * 2.4) * 5 * settle;

    // 越往下光越强
    var power = 0.26 + 0.74 * Math.pow(p, 1.7);

    beam.style.setProperty("--x", x.toFixed(2) + "vw");
    beam.style.setProperty("--y", y.toFixed(1) + "px");
    beam.style.setProperty("--power", power.toFixed(3));
    beam.style.setProperty("--tail", (16 + 30 * travel).toFixed(1) + "vh");
    beam.style.setProperty("--tilt", tilt.toFixed(2) + "deg");

    if (progressBar) progressBar.style.width = (p * 100).toFixed(2) + "%";

    var beamX = (x / 100) * vw;

    // 文字：光已扫过 -> 亮；光还没到 -> 按距离渐暗
    for (var i = 0; i < litEls.length; i++) {
      var rect = litEls[i].getBoundingClientRect();
      var centerY = rect.top + rect.height / 2;
      var target = centerY <= y ? 1 : clamp(1 - (centerY - y) / 130, 0, 1);
      litState[i] +=
        (target - litState[i]) * (reduceMotion ? 1 : 0.12);
      litEls[i].style.setProperty("--lit", litState[i].toFixed(3));
    }

    // 微尘亮度
    for (var j = 0; j < dust.length; j++) {
      var d = dust[j];
      var dxp = (d.x / 100) * vw - beamX;
      var dyp = ((d.y / 100) * vh - y) * 0.85;
      var dist = Math.sqrt(dxp * dxp + dyp * dyp);
      var nearLight = clamp(1 - dist / 280, 0, 1);
      d.el.style.opacity = (d.base + nearLight * 0.8).toFixed(3);
    }

    // 落地：以"距道字中心还剩多少像素"为准，比按百分比更准
    var landedNow = endY - y <= 8;
    if (landedNow !== isLanded) {
      isLanded = landedNow;
      document.body.classList.toggle("is-landed", isLanded);
    }

    if (!reduceMotion) window.requestAnimationFrame(render);
  }

  if (reduceMotion) {
    beam.style.setProperty("--x", "50vw");
    beam.style.setProperty("--y", "45vh");
    beam.style.setProperty("--power", "1");
    litEls.forEach(function (el) {
      el.style.setProperty("--lit", "1");
    });
    document.body.classList.add("is-landed");
    measure();
    return;
  }

  measure();
  window.requestAnimationFrame(render);
  window.addEventListener("resize", measure);
  window.addEventListener("load", measure);
  window.setTimeout(measure, 400);
})();
