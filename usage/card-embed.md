<!--
  这份文件本身就是一段「可以整份复制、直接发给对方网站 AI」的说明。
  维护备注（发布时不用发）：名片页 = web/card.html，改完重新发布即全站生效；
  更详细的自用说明见同目录 Running.md「把名片嵌到别的网站」。
-->

【需求】在页面里嵌入一张「张诚 · Chester」个人名片

我们想在站内某处放一张个人名片区块。名片页已经部署在我们的个人网站上，地址是：

https://personalsite-32km31c.maozi.io/card.html

它是一张深灰圆角卡片：左边照片、右边「张诚 · Chester + 一句话 + 一行关键词」。
请在本站页面里用 iframe 引用它，把下面整段贴到要放名片的位置（放进页面正文的某个容器里即可）：

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

实现要点（请按这些来，别改动行为）：

1. 跨域 iframe，名片页是完全自包含的（样式内联、零外部依赖），不会引入第三方 JS/CSS，也不会和本站样式互相影响。
2. 高度自适应：名片页会通过 postMessage 把自身高度发过来，消息格式是
   { type: 'ps-card-height', height: 数字 }
   上面那段 script 收到后把 iframe 的高度设成这个值。所以别给 iframe 写死固定高度或 aspect-ratio；
   代码里的 height:360px 只是「脚本没生效时」的兜底高度，不是最终高度。
3. 宽度自适应：iframe 用 width:100%，宽度小于 560px 时名片会自动切换成「照片在上、文字在下」的竖版。
   请给外层容器一个正常宽度（>= 300px 即可），不要额外缩放。
4. 点击整张名片会整页跳转到我们的个人网站 https://personalsite-32km31c.maozi.io/
   （名片内部用的是 target="_top" 跳出 iframe）。
   因此请【不要】给这个 iframe 加 sandbox 属性，否则跳转会被浏览器拦截。
5. 建议在名片外面留一点间距（例如 margin: 24px 0），不要紧贴其它内容或容器边缘。
6. 如果本站设置了 CSP（Content-Security-Policy），需要在 frame-src（或 child-src）里放行：
   https://personalsite-32km31c.maozi.io
7. 无需任何依赖或构建步骤，纯 HTML。

另外：以后名片的文案/样式要调整，改我们这边一处、重新发布即可，本站代码不需要再动。
