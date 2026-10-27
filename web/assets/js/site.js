/* personal-site · 极简脚本
   三件事：1) 首页「文章」列表渲染  2) 元素进入视口时淡入  3) 顶栏「账户」入口
   不依赖任何库。 */

/* ---------- 0. 账户中心地址 ---------- */
/* 账户中心单独部署；上线后把 prod 改成正式域名即可。
   本机预览（localhost / 127.0.0.1）自动指向本地测试端口，方便联调。
   正式域名还没上线时，可把 prod 设为空串 ''，线上就不显示「账户」入口。 */
var PS_ACCOUNT = {
  prod: 'https://account.chesterlee.cn',
  local: 'http://localhost:18830'
};

function accountWeb() {
  var isLocal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  return isLocal ? PS_ACCOUNT.local : PS_ACCOUNT.prod;
}

/* 顶栏加「账户」入口：未登录会自动跳到登录页，已登录直接看我的账户 */
function setupAccountEntry() {
  var links = document.querySelector('.ps-topbar__links');
  if (!links || links.querySelector('.ps-account') || !accountWeb()) return;

  var link = document.createElement('a');
  link.className = 'ps-account';
  link.href = accountWeb() + '/account.html';
  link.textContent = '账户';
  link.setAttribute('aria-label', '登录或查看我的账户');
  links.appendChild(link);
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
