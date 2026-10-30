/* 循光践道官网 · 文化词库
 * 原生 JS，零依赖
 * 1) 词云排布（桌面螺旋排布 / 手机自动换行）
 * 2) 悬停、聚焦、轻点词条，弹出说明卡
 * 3) 主题筛选与词条索引
 */
(function () {
  "use strict";

  var DATA = window.XG_LEXICON;
  var cloud = document.getElementById("xg-cloud");
  var filterWrap = document.getElementById("xg-lex-filters");
  var indexWrap = document.getElementById("xg-lexicon-index");
  var updatedEl = document.getElementById("xg-lexicon-updated");
  var pop = document.getElementById("xg-lex-pop");

  if (!DATA || !DATA.terms || !cloud || !pop) return;

  var terms = DATA.terms.slice();
  var termMap = {};
  var categoryMap = {};

  terms.forEach(function (term) {
    termMap[term.id] = term;
  });

  (DATA.categories || []).forEach(function (cat) {
    categoryMap[cat.id] = cat;
  });

  var state = {
    filter: "all",
    activeId: null,
    anchor: null
  };

  var closeTimer = null;
  var isTouch = window.matchMedia("(hover: none)").matches;
  var verticalIds = {
    dao: true,
    hua: true,
    jiaxue: true,
    shangye: true,
    shaixuan: true
  };

  /* ========== 工具 ========== */

  function weightRange() {
    var values = terms.map(function (term) {
      return term.weight || 0;
    });
    return {
      min: Math.min.apply(null, values),
      max: Math.max.apply(null, values)
    };
  }

  var range = weightRange();

  function weightScale(term) {
    if (range.max === range.min) return 0.5;
    var k = ((term.weight || 0) - range.min) / (range.max - range.min);
    return Math.pow(k, 0.62);
  }

  function categoryName(id) {
    return categoryMap[id] ? categoryMap[id].name : "";
  }

  function sourceText(term) {
    var list = (term.sources || []).slice(0, 2).map(function (title) {
      return title.charAt(0) === "《" ? title : "《" + title + "》";
    });
    if (!list.length) return "整理自循光践道知识库";
    return "整理自知识库 · " + list.join("、");
  }

  function filteredTerms() {
    if (state.filter === "all") return terms.slice();
    return terms.filter(function (term) {
      return term.category === state.filter;
    });
  }

  /* ========== 词条元素 ========== */

  function setActive(button) {
    Array.prototype.forEach.call(
      document.querySelectorAll(".xg-cloud__word, .xg-lex-item"),
      function (el) {
        var active = button && el === button;
        el.classList.toggle("is-active", active);
        if (el.classList.contains("xg-cloud__word")) {
          el.setAttribute("aria-expanded", active ? "true" : "false");
        }
      }
    );
  }

  function makeWord(term, index, flow) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "xg-cloud__word";
    button.dataset.id = term.id;
    button.textContent = term.term;
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-haspopup", "dialog");
    button.style.animationDelay = Math.min(index * 22, 500) + "ms";

    // 留一个下限，避免 0 权重的词（如「引荐人」）小到看不清
    var k = 0.08 + weightScale(term) * 0.92;
    button.style.fontSize = (flow ? 12.5 + k * 13 : 13 + k * 31).toFixed(1) + "px";
    button.style.opacity = (0.62 + k * 0.32).toFixed(2);

    if (!flow && verticalIds[term.id]) {
      button.classList.add("xg-cloud__word--vertical");
    }

    button.addEventListener("mouseenter", function () {
      if (!isTouch) openTerm(term, button);
    });
    button.addEventListener("mouseleave", function () {
      if (!isTouch) scheduleClose();
    });
    button.addEventListener("focus", function () {
      openTerm(term, button);
    });
    button.addEventListener("blur", function () {
      scheduleClose();
    });
    button.addEventListener("click", function (event) {
      event.stopPropagation();
      if (state.activeId === term.id) {
        closePop();
      } else {
        openTerm(term, button);
      }
    });

    return button;
  }

  /* ========== 词云排布 ========== */

  function collides(x, y, w, h, boxes, pad) {
    for (var i = 0; i < boxes.length; i += 1) {
      var box = boxes[i];
      if (
        x < box.x + box.w + pad &&
        x + w + pad > box.x &&
        y < box.y + box.h + pad &&
        y + h + pad > box.y
      ) {
        return true;
      }
    }
    return false;
  }

  function findSpot(w, h, W, H, boxes, pad) {
    var cx = W / 2 - w / 2;
    var cy = H / 2 - h / 2;

    if (!boxes.length) return { x: cx, y: cy };

    for (var i = 1; i < 7000; i += 1) {
      var t = i * 0.34;
      var radius = 2.2 * t;
      var angle = t;
      var x = cx + Math.cos(angle) * radius * 1.32;
      var y = cy + Math.sin(angle) * radius * 0.78;

      if (radius > Math.max(W, H) * 1.1) break;

      if (x < 8 || y < 8 || x + w > W - 8 || y + h > H - 8) continue;
      if (!collides(x, y, w, h, boxes, pad)) {
        return { x: x, y: y };
      }
    }

    return null;
  }

  function layoutCloud() {
    var visible = filteredTerms();
    var flow = window.matchMedia("(max-width: 720px)").matches;

    closePop();
    cloud.innerHTML = "";
    cloud.classList.toggle("is-flow", flow);
    cloud.style.height = "";

    visible
      .slice()
      .sort(function (a, b) {
        return (b.weight || 0) - (a.weight || 0);
      })
      .forEach(function (term, index) {
        cloud.appendChild(makeWord(term, index, flow));
      });

    if (flow) {
      cloud.style.minHeight = "";
      return;
    }

    var W = cloud.clientWidth;
    var H = Math.max(380, Math.min(640, Math.round(W * 0.58)));
    if (visible.length <= 8) H = Math.max(320, Math.round(H * 0.78));

    cloud.style.height = H + "px";

    var words = Array.prototype.slice.call(cloud.children);
    words.forEach(function (el) {
      el.style.visibility = "hidden";
    });

    var boxes = [];
    words
      .slice()
      .sort(function (a, b) {
        return parseFloat(b.style.fontSize) - parseFloat(a.style.fontSize);
      })
      .forEach(function (el) {
        var w = el.offsetWidth;
        var h = el.offsetHeight;
        var spot = findSpot(w, h, W, H, boxes, 9);

        if (!spot) {
          el.style.display = "none";
          return;
        }

        el.style.left = Math.round(spot.x) + "px";
        el.style.top = Math.round(spot.y) + "px";
        boxes.push({ x: spot.x, y: spot.y, w: w, h: h });
      });

    words.forEach(function (el) {
      el.style.visibility = "";
    });
  }

  /* ========== 说明卡 ========== */

  function positionPop(anchor) {
    if (!anchor || !anchor.getBoundingClientRect) return;
    if (window.matchMedia("(max-width: 720px)").matches) {
      pop.style.left = "";
      pop.style.top = "";
      return;
    }

    var rect = anchor.getBoundingClientRect();
    var box = pop.getBoundingClientRect();
    var margin = 14;
    var vw = window.innerWidth;
    var vh = window.innerHeight;

    var left = rect.left + rect.width / 2 - box.width / 2;
    left = Math.max(12, Math.min(vw - box.width - 12, left));

    var top = rect.top - box.height - margin;
    if (top < 12) top = rect.bottom + margin;
    if (top + box.height > vh - 12) {
      top = Math.max(12, vh - box.height - 12);
    }

    pop.style.left = Math.round(left) + "px";
    pop.style.top = Math.round(top) + "px";
  }

  function openTerm(term, anchor) {
    clearTimeout(closeTimer);
    state.activeId = term.id;
    state.anchor = anchor || null;

    pop.querySelector(".xg-lex-pop__cat").textContent = categoryName(term.category);
    pop.querySelector(".xg-lex-pop__title").textContent = term.term;
    pop.querySelector(".xg-lex-pop__summary").textContent = term.summary;
    pop.querySelector(".xg-lex-pop__detail").textContent = term.detail;
    pop.querySelector(".xg-lex-pop__source").textContent = sourceText(term);

    var relatedWrap = pop.querySelector(".xg-lex-pop__related");
    relatedWrap.innerHTML = "";

    (term.related || []).forEach(function (id) {
      var related = termMap[id];
      if (!related) return;

      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "xg-lex-pop__chip";
      chip.textContent = related.term;
      chip.addEventListener("click", function (event) {
        event.stopPropagation();
        var target =
          cloud.querySelector('[data-id="' + id + '"]') ||
          indexWrap.querySelector('[data-id="' + id + '"]') ||
          anchor;
        openTerm(related, target);
      });
      relatedWrap.appendChild(chip);
    });

    pop.hidden = false;
    setActive(
      anchor &&
        (anchor.classList.contains("xg-cloud__word") ||
          anchor.classList.contains("xg-lex-item"))
        ? anchor
        : null
    );
    positionPop(anchor);
  }

  function cancelClose() {
    clearTimeout(closeTimer);
  }

  function scheduleClose() {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(closePop, 180);
  }

  function closePop() {
    clearTimeout(closeTimer);
    pop.hidden = true;
    state.activeId = null;
    state.anchor = null;
    setActive(null);
  }

  /* ========== 筛选 ========== */

  function renderFilters() {
    var items = [{ id: "all", name: "全部" }].concat(DATA.categories || []);

    items.forEach(function (cat) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "xg-lex-filter";
      button.dataset.filter = cat.id;
      button.textContent = cat.name;
      button.setAttribute("aria-pressed", cat.id === state.filter ? "true" : "false");

      if (cat.id === state.filter) button.classList.add("is-active");

      button.addEventListener("click", function () {
        if (state.filter === cat.id) return;
        state.filter = cat.id;
        Array.prototype.forEach.call(filterWrap.children, function (el) {
          var active = el === button;
          el.classList.toggle("is-active", active);
          el.setAttribute("aria-pressed", active ? "true" : "false");
        });
        layoutCloud();
      });

      filterWrap.appendChild(button);
    });
  }

  /* ========== 词条索引 ========== */

  function renderIndex() {
    if (!indexWrap) return;

    (DATA.categories || []).forEach(function (cat) {
      var groupTerms = terms.filter(function (term) {
        return term.category === cat.id;
      });
      if (!groupTerms.length) return;

      var group = document.createElement("div");
      group.className = "xg-lex-group";

      var title = document.createElement("h3");
      title.className = "xg-lex-group__title";
      title.textContent = cat.name;
      var count = document.createElement("span");
      count.textContent = groupTerms.length + " 条";
      title.appendChild(count);

      var list = document.createElement("div");
      list.className = "xg-lex-group__list";

      groupTerms.forEach(function (term) {
        var item = document.createElement("button");
        item.type = "button";
        item.className = "xg-lex-item";
        item.dataset.id = term.id;
        item.setAttribute("aria-haspopup", "dialog");

        var name = document.createElement("span");
        name.className = "xg-lex-item__term";
        name.textContent = term.term;

        var summary = document.createElement("span");
        summary.className = "xg-lex-item__summary";
        summary.textContent = term.summary;

        item.appendChild(name);
        item.appendChild(summary);

        item.addEventListener("focus", function () {
          openTerm(term, item);
        });
        item.addEventListener("click", function (event) {
          event.stopPropagation();
          openTerm(term, item);
        });

        list.appendChild(item);
      });

      group.appendChild(title);
      group.appendChild(list);
      indexWrap.appendChild(group);
    });
  }

  /* ========== 事件 ========== */

  pop.addEventListener("mouseenter", cancelClose);
  pop.addEventListener("mouseleave", scheduleClose);

  var closeButton = pop.querySelector(".xg-lex-pop__close");
  if (closeButton) closeButton.addEventListener("click", closePop);

  document.addEventListener("click", function (event) {
    if (pop.hidden) return;
    if (
      event.target.closest("#xg-lex-pop") ||
      event.target.closest(".xg-cloud__word") ||
      event.target.closest(".xg-lex-item")
    ) {
      return;
    }
    closePop();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closePop();
  });

  window.addEventListener(
    "scroll",
    function () {
      if (!pop.hidden) closePop();
    },
    { passive: true }
  );

  var resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layoutCloud, 160);
  });

  /* ========== 启动 ========== */

  if (updatedEl && DATA.updatedAt) {
    updatedEl.textContent = "更新于 " + DATA.updatedAt;
  }

  renderFilters();
  renderIndex();
  layoutCloud();

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      if (!cloud.classList.contains("is-flow")) layoutCloud();
    });
  }
})();
