/* 循光践道官网 · 五版切换入口
 * 破晓版（根目录）/ 炸裂版（v5）/ 流光版（v2）/ 星汉版（v3）/ 天光版（v4）
 * 每一页右下角注入统一切换条，当前版本高亮，其余版本跳到同名页面
 */
(function () {
  "use strict";

  var VERSIONS = [
    { key: "dawn", name: "破晓版", note: "经典原版", dir: "classic/" },
    { key: "burst", name: "炸裂版", note: "光炸满屏", dir: "v5/" },
    { key: "flow", name: "流光版", note: "光影随行", dir: "v2/" },
    { key: "star", name: "星汉版", note: "星野银河", dir: "v3/" },
    { key: "sky", name: "天光版", note: "流星满空", dir: "" }
  ];

  var DIR_TO_KEY = { classic: "dawn", v2: "flow", v3: "star", v4: "sky", v5: "burst" };

  var path = window.location.pathname;
  var match = path.match(/\/(classic|v[0-9]+)\//);
  var depth = match ? 1 : 0;
  /* 根目录 = 天光版（默认展示） */
  var currentKey = match && DIR_TO_KEY[match[1]] ? DIR_TO_KEY[match[1]] : "sky";

  var file = path.split("/").pop() || "index.html";
  if (!/\.html$/.test(file)) file = "index.html";

  /* 清掉旧版单按钮入口，统一交给切换条 */
  var olds = document.querySelectorAll(".xg-vswitch, .xg-vswitch-group");
  for (var i = 0; i < olds.length; i++) {
    if (olds[i].parentNode) olds[i].parentNode.removeChild(olds[i]);
  }

  if (!document.querySelector('link[href$="version-switch.css"]')) {
    var css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = (depth ? "../" : "") + "assets/css/version-switch.css";
    document.head.appendChild(css);
  }

  var nav = document.createElement("nav");
  nav.className = "xg-vswitch-group";
  nav.setAttribute("aria-label", "官网版本切换");

  var prefix = depth ? "../" : "";

  VERSIONS.forEach(function (v) {
    var tag = v.key === currentKey ? "span" : "a";
    var el = document.createElement(tag);
    el.className = "xg-vswitch" + (v.key === "dawn" ? "" : " xg-vswitch--star");
    if (v.key === currentKey) {
      el.className += " xg-vswitch--current";
      el.setAttribute("aria-current", "page");
    } else {
      el.href = prefix + v.dir + file;
    }
    el.innerHTML =
      "<span>" +
      v.name +
      "</span><em>" +
      (v.key === currentKey ? "当前" : v.note) +
      "</em>";
    nav.appendChild(el);
  });

  document.body.appendChild(nav);
})();
