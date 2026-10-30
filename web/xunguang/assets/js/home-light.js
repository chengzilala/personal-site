/* 循光践道官网 · 光影版首页交互
 * 1) 光束随滚动下落、左右漂移、尾巴变长
 * 2) 光扫过的标题 / 卡片依次点亮
 * 3) 光束落到「道」字时触发见道动画
 * 原生 JS，零依赖
 */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var beam = document.querySelector(".xgl-beam");
  var dao = document.querySelector(".xgl-dao");
  var daoChar = document.querySelector(".xgl-dao__char");
  var progressBar = document.querySelector(".xgl-progress span");

  if (!beam || !dao || !daoChar) return;

  var litNodes = Array.prototype.slice.call(
    document.querySelectorAll(
      ".xg-kicker, .xg-title, .xg-lead, .xg-intro__quote, .xg-track, .xg-pillar, .xg-mode, .xg-quote, .xg-book, .xg-gallery__item"
    )
  );

  var litTargets = [];
  var maxScroll = 1;
  var arrivalY = 1; // 光束头部碰到「道」字上部的页面坐标
  var beamStartY = 0; // 光束起始屏幕 Y
  var beamEndY = 0; // 滚到底时落点的屏幕 Y
  var arrived = false;
  var ticking = false;

  dao.classList.add("xgl-armed");

  function measure() {
    litTargets = litNodes.map(function (el) {
      return {
        el: el,
        top: el.getBoundingClientRect().top + window.scrollY,
        lit: el.classList.contains("xgl-lit")
      };
    });

    var charBox = daoChar.getBoundingClientRect();
    var charPageTop = charBox.top + window.scrollY;

    // 落地判定：光束头部到达「道」字中心，和爆闪的圆心对齐
    arrivalY = charPageTop + charBox.height * 0.5;

    // 页面终点 = 文档底部：滚到底那一下正好落地，之后不再往下
    maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    beamStartY = window.innerHeight * 0.12;
    // 滚到底时落点在屏幕上的位置，让光正好停在字上
    beamEndY = Math.max(beamStartY + 60, arrivalY - maxScroll);
  }

  function arrive() {
    if (arrived) return;
    arrived = true;
    dao.classList.add("is-arrived");
    beam.classList.add("is-arrived");
  }

  // 回到「见道」上方时复位，让整段追光可以重新走一遍
  function reset() {
    arrived = false;
    dao.classList.remove("is-arrived");
    beam.classList.remove("is-arrived");
  }

  function update() {
    var scrollY = window.scrollY;
    var vh = window.innerHeight;
    var p = Math.min(1, Math.max(0, scrollY / maxScroll));

    if (reduceMotion) {
      arrive();
      if (progressBar) progressBar.style.width = "100%";
      return;
    }

    var beamY = beamStartY + (beamEndY - beamStartY) * p;
    var swing = Math.sin(p * Math.PI * 3.1) * (1 - p * 0.82);
    var drift = swing * Math.min(window.innerWidth * 0.11, 140);
    var x = window.innerWidth / 2 + drift;

    beam.style.transform = "translate3d(" + x.toFixed(1) + "px," + beamY.toFixed(1) + "px,0)";
    beam.style.opacity = (0.72 + p * 0.28).toFixed(3);
    beam.style.setProperty("--tail", (24 + 26 * p).toFixed(1) + "vh");

    if (progressBar) progressBar.style.width = (p * 100).toFixed(2) + "%";

    var beamPageY = scrollY + beamY;
    for (var i = 0; i < litTargets.length; i += 1) {
      var item = litTargets[i];
      if (!item.lit && beamPageY >= item.top + 36) {
        item.lit = true;
        item.el.classList.add("xgl-lit");
      } else if (item.lit && beamPageY < item.top - 140) {
        // 往回滚时让光依次熄灭，重新往下才有点亮的过程
        item.lit = false;
        item.el.classList.remove("xgl-lit");
      }
    }

    // 光束落到「道」字上 → 落地爆亮；往回退开一段 → 复位，重新往下可再看一次
    if (!arrived && beamPageY >= arrivalY - 2) {
      arrive();
    } else if (arrived && beamPageY < arrivalY - vh * 0.75) {
      reset();
    }
  }

  function requestUpdate() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      update();
      ticking = false;
    });
  }

  function remeasure() {
    measure();
    requestUpdate();
  }

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", remeasure);
  window.addEventListener("load", remeasure);

  Array.prototype.forEach.call(document.images, function (img) {
    if (!img.complete) img.addEventListener("load", remeasure, { once: true });
  });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(remeasure);
  }

  measure();
  update();
})();
