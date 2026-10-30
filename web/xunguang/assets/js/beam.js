/* 循光践道官网 · 天光版（v4）脚本
 * 原生 JS，零依赖：
 * 1) 天光随整页滚动落下，横向轻微摆动
 * 2) 落到首页最下面的「道」字上：点亮「道」、光晕铺开、星野增亮
 * 3) 顶部阅读进度
 */
(function () {
  "use strict";

  if (!document.body.classList.contains("xgb")) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var beam = document.createElement("div");
  beam.className = "xgb-beam";
  beam.setAttribute("aria-hidden", "true");
  beam.innerHTML =
    '<span class="xgb-beam__glow"></span>' +
    '<span class="xgb-beam__trail"></span>' +
    '<span class="xgb-beam__core"></span>' +
    '<span class="xgb-beam__head"></span>' +
    '<span class="xgb-beam__ring"></span>';
  document.body.appendChild(beam);

  var horizon = document.createElement("div");
  horizon.className = "xgb-horizon";
  horizon.setAttribute("aria-hidden", "true");
  document.body.insertBefore(horizon, beam);

  var flood = document.createElement("div");
  flood.className = "xgb-flood";
  flood.setAttribute("aria-hidden", "true");
  document.body.insertBefore(flood, beam);

  var progress = document.createElement("div");
  progress.className = "xgb-progress";
  progress.setAttribute("aria-hidden", "true");
  progress.innerHTML = "<span></span>";
  document.body.appendChild(progress);
  var progressBar = progress.firstChild;

  var dao = document.querySelector(".xgl-dao");
  var daoChar = document.querySelector(".xgl-dao__char");

  /* 只有首页最下面有「道」，内页不做落点 */
  var hasDao = !!(dao && daoChar);

  var maxScroll = 1;
  var startY = 0;
  var endY = 0;
  var arrivalY = 1;
  var arrived = false;

  if (hasDao && !reduceMotion) dao.classList.add("xgl-armed");

  function measure() {
    var vh = window.innerHeight;
    maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
    startY = vh * 0.14;
    endY = vh * 0.86;

    if (!hasDao) return;

    var box = daoChar.getBoundingClientRect();
    // 落地判定：光点到达「道」字中心
    arrivalY = box.top + window.scrollY + box.height * 0.5;
    // 滚到底时，光点正好落在「道」字上
    endY = Math.max(startY + 60, arrivalY - maxScroll);
  }

  function place(xPct, yPct) {
    beam.style.setProperty("--x", xPct.toFixed(2) + "vw");
    beam.style.setProperty("--y", yPct.toFixed(2) + "vh");
  }

  function arrive() {
    if (arrived) return;
    arrived = true;
    document.body.classList.add("xgb-arrived");
    if (hasDao) dao.classList.add("is-arrived");
  }

  function reset() {
    if (!arrived) return;
    arrived = false;
    document.body.classList.remove("xgb-arrived");
    if (hasDao) dao.classList.remove("is-arrived");
  }

  function update() {
    var scrollY = window.scrollY;
    var vh = window.innerHeight;
    var p = Math.min(1, Math.max(0, scrollY / maxScroll));

    progressBar.style.width = (p * 100).toFixed(2) + "%";

    if (reduceMotion) {
      arrive();
      if (hasDao) {
        var cb = daoChar.getBoundingClientRect();
        place(
          ((cb.left + cb.width / 2) / window.innerWidth) * 100,
          ((cb.top + cb.height / 2) / vh) * 100
        );
      } else {
        place(50, 52);
      }
      return;
    }

    var y = startY + (endY - startY) * p;
    var x = 50 + Math.sin(p * 4.6) * 11 * (1 - p * 0.6);
    place(x, (y / vh) * 100);

    if (!hasDao) return;

    // 「道」字升到视野中段 → 落地；退回到它下方 → 复位，可重新看一遍
    var charRect = daoChar.getBoundingClientRect();
    var charCenter = charRect.top + charRect.height * 0.5;
    if (!arrived && charCenter <= vh * 0.6) {
      arrive();
    } else if (arrived && charRect.top > vh * 0.94) {
      reset();
    }

    if (arrived) {
      // 光停在「道」字中心，光晕以它为圆心铺满整片天空
      var rect = daoChar.getBoundingClientRect();
      var cx = ((rect.left + rect.width / 2) / window.innerWidth) * 100;
      var cy = ((rect.top + rect.height / 2) / vh) * 100;
      place(cx, cy);
      flood.style.setProperty("--fx", cx.toFixed(2) + "vw");
      flood.style.setProperty("--fy", cy.toFixed(2) + "vh");
    }
  }

  if (reduceMotion) {
    measure();
    update();
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
  window.addEventListener("resize", function () {
    measure();
    onScroll();
  });
  window.addEventListener("load", function () {
    measure();
    onScroll();
  });

  measure();
  update();
})();
