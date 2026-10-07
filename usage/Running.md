# Running — 安装启动全流程

> 本站**零依赖、零构建**，不需要安装任何东西。

## 最快方式

双击打开 [../web/index.html](../web/index.html) 即可。改完代码刷新浏览器就看到效果。

## 推荐方式（本地服务，行为更接近真实网站）

```bash
# 在项目根目录执行
python3 -m http.server 5181 --directory web
# 然后浏览器打开 http://localhost:5181
```

## 改东西看哪里

| 想改什么 | 改哪个文件 |
|---|---|
| 文字内容（名字、介绍、作品） | `web/index.html` |
| 颜色 / 字体 / 间距 / 响应式断点 | `web/assets/css/site.css` |
| 交互（切换、滚动效果） | `web/assets/js/site.js` |
| 照片 | 放进 `web/assets/img/photos/` |
| 作品图 | 放进 `web/assets/img/works/` |
| 名片（嵌到别的网站用） | `web/card.html` |

## 把名片嵌到别的网站

`web/card.html` 是一张「个人名片」独立页（深灰卡片：照片 + 名字 + 一句话 + 一行关键词）。
别的网站只要**贴一段代码**就能引用它；以后你改 `web/card.html`，所有嵌了的地方**自动跟着更新**。

**第一步**：把名片页部署上去（跟着本站一起发布即可），访问地址是
`https://personalsite-32km31c.maozi.io/card.html`。

**第二步**：把下面整段贴到对方网站要放名片的位置：

```html
<iframe id="ps-card"
        src="https://personalsite-32km31c.maozi.io/card.html"
        title="张诚 · Chester 名片"
        style="width:100%;border:0;display:block;height:360px"
        loading="lazy"></iframe>
<script>
(function () {
  var box = document.getElementById('ps-card');
  window.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'ps-card-height' && box) {
      box.style.height = e.data.height + 'px';
    }
  });
})();
</script>
```

- `width:100%`：名片宽度跟着对方容器走，窄了就自动变成「照片在上、文字在下」的竖版。
- 那段 `<script>`：名片会把自己的高度报回来，iframe 自动长高 / 变矮（对方网站不允许脚本时，就用 `height:360px` 这个兜底高度，不会破版）。
- 本地想先看效果：打开 `demo/card-preview.html`（这个目录不会上线）。
- **要发给对方网站的人 / AI**：直接把 [card-embed.md](card-embed.md) 整份复制发过去即可（里面是完整的嵌入说明）。

## 环境要求

- 任意现代浏览器（Chrome / Edge / Safari）
- 可选：Python 3（仅用于起本地服务）

## 部署（以后）

纯静态，可直接拖到 Vercel / Netlify / GitHub Pages。配置见 `web/vercel.json`。
