/* 循光践道官网 · 交互脚本
 * 原生 JS，零依赖
 * 1) 页头随滚动变实
 * 2) 移动端菜单
 * 3) 首屏「光 → 道」滚动进度
 * 4) 内容入场
 */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ========== 页头 ========== */
  var header = document.querySelector(".xg-header");
  var navToggle = document.querySelector(".xg-nav-toggle");
  var nav = document.querySelector(".xg-nav");
  var darkSection = document.querySelector(".xg-dawn, .xg-page-hero");

  function solidThreshold() {
    if (!darkSection) return 40;
    var top = darkSection.getBoundingClientRect().top + window.scrollY;
    return top + darkSection.offsetHeight - 76;
  }

  function syncHeader() {
    if (!header) return;
    var solid =
      window.scrollY > solidThreshold() ||
      document.body.classList.contains("xg-nav-open");
    header.classList.toggle("is-solid", solid);
  }

  function closeNav() {
    if (!nav || !navToggle) return;
    nav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "打开菜单");
    document.body.classList.remove("xg-nav-open");
    syncHeader();
  }

  if (navToggle && nav) {
    navToggle.addEventListener("click", function () {
      var open = navToggle.getAttribute("aria-expanded") === "true";
      if (open) {
        closeNav();
      } else {
        nav.classList.add("is-open");
        navToggle.setAttribute("aria-expanded", "true");
        navToggle.setAttribute("aria-label", "关闭菜单");
        document.body.classList.add("xg-nav-open");
        syncHeader();
      }
    });

    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) closeNav();
    });

    document.addEventListener("click", function (event) {
      if (!nav.classList.contains("is-open")) return;
      if (nav.contains(event.target) || navToggle.contains(event.target)) return;
      closeNav();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeNav();
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 720) closeNav();
    });
  }

  /* ========== 首屏滚动叙事 ========== */
  var dawn = document.querySelector(".xg-dawn");

  function updateDawn() {
    if (!dawn) return;

    if (reduceMotion) {
      dawn.style.setProperty("--p", "0.7");
      dawn.dataset.phase = "3";
      return;
    }

    var rect = dawn.getBoundingClientRect();
    var travel = rect.height - window.innerHeight;
    if (travel <= 0) {
      dawn.style.setProperty("--p", "0");
      dawn.dataset.phase = "0";
      return;
    }

    // 末尾留一屏作为“光完全释放”的停留，避免光刚充满画面就被下一段顶走
    var hold = window.innerHeight;
    var animated = Math.max(1, travel - hold);
    var progress = Math.min(1, Math.max(0, -rect.top / animated));
    dawn.style.setProperty("--p", progress.toFixed(4));

    var phase = 0;
    if (progress > 0.16) phase = 1;
    if (progress > 0.38) phase = 2;
    if (progress > 0.62) phase = 3;
    dawn.dataset.phase = String(phase);
  }

  /* ========== 滚动调度 ========== */
  var ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      syncHeader();
      updateDawn();
      ticking = false;
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  syncHeader();
  updateDawn();

  /* ========== 图库灯箱 ========== */
  var galleryItems = Array.prototype.slice.call(
    document.querySelectorAll(".xg-gallery__item")
  );

  if (galleryItems.length) {
    var galleryData = galleryItems.map(function (item) {
      var img = item.querySelector("img");
      return {
        src: img ? img.getAttribute("src") : "",
        alt: img ? img.getAttribute("alt") : "",
        title: item.querySelector(".xg-gallery__item-title").textContent,
        desc: item.querySelector(".xg-gallery__desc").textContent
      };
    });

    var lightbox = document.createElement("div");
    lightbox.className = "xg-lightbox";
    lightbox.id = "xg-lightbox";
    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");
    lightbox.setAttribute("aria-label", "图库大图浏览");
    lightbox.hidden = true;
    lightbox.innerHTML =
      '<button class="xg-lightbox__close" type="button" aria-label="关闭大图">&times;</button>' +
      '<button class="xg-lightbox__nav xg-lightbox__nav--prev" type="button" aria-label="上一张">&lsaquo;</button>' +
      '<figure class="xg-lightbox__figure">' +
      '<img class="xg-lightbox__img" alt="" />' +
      '<figcaption class="xg-lightbox__caption">' +
      '<span class="xg-lightbox__count"></span>' +
      '<span class="xg-lightbox__title"></span>' +
      '<span class="xg-lightbox__desc"></span>' +
      "</figcaption>" +
      "</figure>" +
      '<button class="xg-lightbox__nav xg-lightbox__nav--next" type="button" aria-label="下一张">&rsaquo;</button>';
    document.body.appendChild(lightbox);

    var lightboxImg = lightbox.querySelector(".xg-lightbox__img");
    var lightboxCount = lightbox.querySelector(".xg-lightbox__count");
    var lightboxTitle = lightbox.querySelector(".xg-lightbox__title");
    var lightboxDesc = lightbox.querySelector(".xg-lightbox__desc");
    var closeBtn = lightbox.querySelector(".xg-lightbox__close");
    var prevBtn = lightbox.querySelector(".xg-lightbox__nav--prev");
    var nextBtn = lightbox.querySelector(".xg-lightbox__nav--next");
    var current = 0;
    var lastTrigger = null;

    function pad(num) {
      return num < 10 ? "0" + num : String(num);
    }

    function renderLightbox() {
      var data = galleryData[current];
      lightboxImg.src = data.src;
      lightboxImg.alt = data.alt;
      lightboxTitle.textContent = data.title;
      lightboxDesc.textContent = data.desc;
      lightboxCount.textContent =
        pad(current + 1) + " / " + pad(galleryData.length);
    }

    function openLightbox(index, trigger) {
      current = index;
      lastTrigger = trigger || null;
      renderLightbox();
      lightbox.hidden = false;
      document.body.classList.add("xg-lightbox-open");
      closeBtn.focus();
    }

    function closeLightbox() {
      lightbox.hidden = true;
      document.body.classList.remove("xg-lightbox-open");
      if (lastTrigger) lastTrigger.focus();
    }

    function stepLightbox(offset) {
      current =
        (current + offset + galleryData.length) % galleryData.length;
      renderLightbox();
    }

    galleryItems.forEach(function (item, index) {
      item.addEventListener("click", function () {
        openLightbox(index, item);
      });
    });

    closeBtn.addEventListener("click", closeLightbox);
    prevBtn.addEventListener("click", function () {
      stepLightbox(-1);
    });
    nextBtn.addEventListener("click", function () {
      stepLightbox(1);
    });

    lightbox.addEventListener("click", function (event) {
      if (event.target === lightbox) closeLightbox();
    });

    document.addEventListener("keydown", function (event) {
      if (lightbox.hidden) return;
      if (event.key === "Escape") closeLightbox();
      if (event.key === "ArrowLeft") stepLightbox(-1);
      if (event.key === "ArrowRight") stepLightbox(1);
    });
  }

  /* ========== 书单：触屏点按展开推荐语 ========== */
  var bookCards = Array.prototype.slice.call(document.querySelectorAll(".xg-book"));
  var noHover = window.matchMedia("(hover: none)").matches;

  function toggleBook(card) {
    var active = card.classList.contains("is-active");
    bookCards.forEach(function (item) {
      item.classList.remove("is-active");
    });
    if (!active) card.classList.add("is-active");
  }

  if (bookCards.length) {
    bookCards.forEach(function (card) {
      card.addEventListener("click", function () {
        if (noHover) toggleBook(card);
      });

      card.addEventListener("keydown", function (event) {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        toggleBook(card);
      });
    });

    document.addEventListener("click", function (event) {
      if (!noHover) return;
      if (event.target.closest(".xg-book")) return;
      bookCards.forEach(function (item) {
        item.classList.remove("is-active");
      });
    });
  }

  /* ========== 内容入场 ========== */
  var revealItems = Array.prototype.slice.call(
    document.querySelectorAll(".xg-reveal")
  );

  if (!revealItems.length) return;

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach(function (item) {
      item.classList.add("is-visible");
    });
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.12 }
  );

  revealItems.forEach(function (item) {
    observer.observe(item);
  });
})();
