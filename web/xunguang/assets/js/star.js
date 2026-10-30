/* 循光践道官网 · 星汉版（v3）脚本
 * 原生 JS，零依赖：
 * 1) 全站星野画布：星点呼吸、随滚动轻微视差
 * 2) 流星：不定时划过，带渐变拖尾
 * 3) 右下角注入「返回经典版」入口
 */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ========== 版本切换入口 ========== */
  function injectVersionSwitch() {
    if (document.querySelector(".xg-vswitch")) return;

    if (!document.querySelector('link[href$="version-switch.css"]')) {
      var css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = "../assets/css/version-switch.css";
      document.head.appendChild(css);
    }

    var file = window.location.pathname.split("/").pop() || "index.html";
    var link = document.createElement("a");
    link.className = "xg-vswitch";
    link.href = "../" + file + window.location.search + window.location.hash;
    link.setAttribute("aria-label", "返回经典版官网");
    link.innerHTML = "<span>经典版</span><em>返回</em>";
    document.body.appendChild(link);
  }

  /* ========== 星野 ========== */
  var canvas = document.createElement("canvas");
  canvas.className = "xgs-sky";
  canvas.setAttribute("aria-hidden", "true");
  document.body.insertBefore(canvas, document.body.firstChild);

  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var width = 0;
  var height = 0;
  var dpr = 1;
  var stars = [];
  var meteors = [];
  var nextMeteorAt = 0;
  var lastFrame = 0;
  var rafId = 0;

  function makeStars() {
    var total = Math.min(260, Math.max(90, Math.round((width * height) / 7000)));
    stars = [];
    for (var i = 0; i < total; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 0.35 + Math.random() * 1.05,
        alpha: 0.22 + Math.random() * 0.62,
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 1.1,
        depth: 0.25 + Math.random() * 0.75,
        warm: Math.random() > 0.62
      });
    }
  }

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    makeStars();
    if (reduceMotion) drawStatic();
  }

  function starFill(star, alpha) {
    return star.warm
      ? "rgba(255, 243, 218, " + alpha.toFixed(3) + ")"
      : "rgba(214, 230, 255, " + alpha.toFixed(3) + ")";
  }

  function drawStars(time, scrollY) {
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var twinkle = 0.66 + 0.34 * Math.sin(time * 0.001 * s.speed + s.phase);
      var alpha = s.alpha * twinkle;
      var y = s.y - scrollY * 0.055 * s.depth;
      y = ((y % height) + height) % height;

      ctx.beginPath();
      ctx.fillStyle = starFill(s, alpha);
      ctx.arc(s.x, y, s.r, 0, Math.PI * 2);
      ctx.fill();

      // 亮星带一圈极淡的光晕
      if (s.r > 1.15) {
        ctx.beginPath();
        ctx.fillStyle = starFill(s, alpha * 0.12);
        ctx.arc(s.x, y, s.r * 4.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawStatic() {
    ctx.clearRect(0, 0, width, height);
    drawStars(0, window.scrollY || 0);
  }

  function spawnMeteor() {
    if (meteors.length > 2) return;

    var fromRight = Math.random() > 0.25;
    var speed = 640 + Math.random() * 420;
    var angle = (28 + Math.random() * 14) * (Math.PI / 180);
    var dirX = fromRight ? -1 : 1;

    meteors.push({
      x: fromRight ? width * (0.42 + Math.random() * 0.6) : width * Math.random() * 0.5,
      y: -40 + Math.random() * height * 0.32,
      vx: Math.cos(angle) * speed * dirX,
      vy: Math.sin(angle) * speed,
      len: 130 + Math.random() * 170,
      life: 0,
      ttl: 0.9 + Math.random() * 0.7,
      width: 1 + Math.random() * 0.9
    });
  }

  function drawMeteors(delta) {
    for (var i = meteors.length - 1; i >= 0; i--) {
      var m = meteors[i];
      m.life += delta;
      m.x += m.vx * delta;
      m.y += m.vy * delta;

      var progress = m.life / m.ttl;
      if (progress >= 1) {
        meteors.splice(i, 1);
        continue;
      }

      var fade = Math.sin(Math.PI * progress); // 淡入淡出
      var speed = Math.sqrt(m.vx * m.vx + m.vy * m.vy) || 1;
      var tailX = m.x - (m.vx / speed) * m.len;
      var tailY = m.y - (m.vy / speed) * m.len;

      var grad = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
      grad.addColorStop(0, "rgba(255, 250, 236, " + (0.92 * fade).toFixed(3) + ")");
      grad.addColorStop(0.18, "rgba(255, 232, 184, " + (0.55 * fade).toFixed(3) + ")");
      grad.addColorStop(1, "rgba(180, 205, 255, 0)");

      ctx.beginPath();
      ctx.strokeStyle = grad;
      ctx.lineWidth = m.width;
      ctx.lineCap = "round";
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();

      ctx.beginPath();
      ctx.fillStyle = "rgba(255, 252, 244, " + (0.95 * fade).toFixed(3) + ")";
      ctx.arc(m.x, m.y, m.width * 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function frame(time) {
    var delta = lastFrame ? Math.min(0.05, (time - lastFrame) / 1000) : 0.016;
    lastFrame = time;

    ctx.clearRect(0, 0, width, height);
    drawStars(time, window.scrollY || 0);
    drawMeteors(delta);

    if (time > nextMeteorAt) {
      spawnMeteor();
      nextMeteorAt = time + 3600 + Math.random() * 6200;
    }

    rafId = window.requestAnimationFrame(frame);
  }

  function start() {
    if (reduceMotion) return;
    if (!rafId) {
      lastFrame = 0;
      rafId = window.requestAnimationFrame(frame);
    }
  }

  function stop() {
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  resize();
  nextMeteorAt = performance.now() + 1200;
  start();

  var resizeTimer = 0;
  window.addEventListener("resize", function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resize, 180);
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop();
    else start();
  });

  injectVersionSwitch();
})();
