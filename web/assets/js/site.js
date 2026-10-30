/* personal-site · 极简脚本
   三件事：1) 首页「文章」列表渲染  2) 元素进入视口时淡入  3) 顶栏「账户」入口
   不依赖任何库。 */

/* ---------- 0. 账户中心 ---------- */
/* 账户中心单独部署；上线后把 prod 改成正式域名即可。
   本机预览（localhost / 127.0.0.1）自动指向本地测试端口，方便联调。
   正式域名还没上线时，可把 prod 设为空串 ''，线上就不显示「账户」入口。 */
var PS_ACCOUNT = {
  // 账户中心已上线（2026-10-28）：线上显示「登录 / 我的」入口。
  prod: 'https://account.chesterlee.cn',
  pageLocal: 'http://localhost:18830',  // 本机：账户中心页面
  apiLocal: 'http://localhost:8942'     // 本机：账户中心接口
};

var AUTH_PRODUCT_ID = 'personal-site';
var authSdkReady = null;

function isLocalHost() {
  return /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
}

function accountWeb() {
  return isLocalHost() ? PS_ACCOUNT.pageLocal : PS_ACCOUNT.prod;
}

function accountApi() {
  return isLocalHost() ? PS_ACCOUNT.apiLocal : PS_ACCOUNT.prod;
}

/* 按需加载账户 SDK（ps-auth.js 与本文件同目录），加载失败不影响页面 */
function loadAuthSdk() {
  if (authSdkReady) return authSdkReady;

  authSdkReady = new Promise(function (resolve) {
    if (!accountWeb() || !accountApi()) {
      resolve(null);
      return;
    }

    var here = (document.currentScript && document.currentScript.src || 'assets/js/site.js')
      .replace(/site\.js.*$/, '');
    var script = document.createElement('script');
    script.src = here + 'ps-auth.js';
    script.onload = function () {
      if (!window.PSAuth) {
        resolve(null);
        return;
      }
      window.PSAuth.init({
        apiBase: accountApi(),
        // 本机页面与接口不同端口，登录页要单独指定；线上同域可省略
        loginUrl: accountWeb() + '/login.html',
        productId: AUTH_PRODUCT_ID
      });
      resolve(window.PSAuth);
    };
    script.onerror = function () {
      resolve(null);
    };
    document.head.appendChild(script);
  });

  return authSdkReady;
}

/* 顶栏加「登录 / 我的」入口：未登录跳登录页（登录后带票回本页），已登录直接看我的账户 */
function setupAccountEntry() {
  var links = document.querySelector('.ps-topbar__links');
  if (!links || links.querySelector('.ps-account') || !accountWeb()) return;

  var link = document.createElement('a');
  link.className = 'ps-account';
  link.href = accountWeb() + '/account.html';
  link.textContent = '账户';
  link.setAttribute('aria-label', '登录或查看我的账户');
  links.appendChild(link);

  var signedIn = false;

  link.addEventListener('click', function (event) {
    if (signedIn) return;
    event.preventDefault();
    loadAuthSdk().then(function (sdk) {
      if (sdk) sdk.requireLogin();
      else location.href = accountWeb() + '/login.html';
    });
  });

  loadAuthSdk().then(function (sdk) {
    if (!sdk) return null;
    return sdk.getUser().then(function (user) {
      signedIn = Boolean(user);
      link.textContent = '';
      link.classList.toggle('ps-account--avatar', signedIn);
      if (user) {
        // 已登录只留头像，不再显示文字
        if (user.avatar) {
          var avatar = document.createElement('img');
          avatar.className = 'ps-account-avatar';
          avatar.src = user.avatar;
          avatar.alt = '';
          link.appendChild(avatar);
        } else {
          link.textContent = '我';
        }
      } else {
        link.textContent = '登录';
      }
      link.setAttribute('aria-label', user ? '查看我的账户' : '登录账户');
      link.href = accountWeb() + (user ? '/account.html' : '/login.html');
    });
  }).catch(function () {
    /* 接口暂不可用时保持「账户」入口，不打扰阅读 */
  });
}

/* ---------- 1. 首页文章列表 ---------- */
function renderArticles() {
  var host = document.getElementById('ps-articles-list');
  var list = window.PS_ARTICLES;
  if (!host || !list || !list.length) return;

  var max = parseInt(host.getAttribute('data-limit'), 10);
  if (!max) max = 4;

  list.slice(0, max).forEach(function (item, i) {
    var li = document.createElement('li');
    li.className = 'ps-item' + (i === 0 ? ' ps-item--latest' : '');

    var row = document.createElement('a');
    row.className = 'ps-item__link ps-reveal';
    row.href = item.url;

    var tag = document.createElement('span');
    tag.className = 'ps-item__tag';
    tag.textContent = (item.tags && item.tags.length) ? item.tags.slice(0, 2).join(' · ') : '文章';

    var title = document.createElement('span');
    title.className = 'ps-item__title';
    title.textContent = item.title;

    var date = document.createElement('time');
    date.className = 'ps-item__date';
    date.dateTime = item.date;
    date.textContent = item.date;

    row.appendChild(tag);
    row.appendChild(title);
    row.appendChild(date);
    li.appendChild(row);
    host.appendChild(li);
  });
}

/* ---------- 2. 淡入 ---------- */
function setupReveal() {
  var targets = document.querySelectorAll('.ps-reveal');

  // 老浏览器或不支持时，直接全部显示，不留空白
  if (!('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(targets, function (el) {
      el.classList.add('is-in');
    });
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });

  Array.prototype.forEach.call(targets, function (el) {
    io.observe(el);
  });
}

renderArticles();
setupReveal();
setupAccountEntry();
