/* personal-site · 极简脚本
   两件事：1) 首页「文章」列表渲染  2) 元素进入视口时淡入
   不依赖任何库。 */

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
