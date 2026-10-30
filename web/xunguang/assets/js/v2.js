/* 循光践道官网 · v2 页面共用脚本
 * 在光影版每一页右下角注入「返回经典版」入口，并指向同名页面。
 */
(function () {
  "use strict";

  if (!document.querySelector('link[href$="version-switch.css"]')) {
    var css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "../assets/css/version-switch.css";
    document.head.appendChild(css);
  }

  if (document.querySelector(".xg-vswitch")) return;

  var file = window.location.pathname.split("/").pop() || "index.html";

  var link = document.createElement("a");
  link.className = "xg-vswitch";
  link.href = "../" + file + window.location.search + window.location.hash;
  link.setAttribute("aria-label", "返回经典版官网");
  link.innerHTML = "<span>经典版</span><em>返回</em>";

  document.body.appendChild(link);
})();
