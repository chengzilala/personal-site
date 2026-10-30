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

## 和账户中心联调（登录 / 作品上报）

三个服务都要起（第三个就是上面的本站）：

```bash
# 终端 1：账户中心接口（验证码打印在这个终端）
cd ../account-center
node cloud/functions/accountCenter/dev-server.js      # 8942

# 终端 2：账户中心页面
cd ../account-center/web
python3 -m http.server 18830

# 终端 3：本站
python3 -m http.server 5181 --directory web
```

首次联调先在账户中心登记本站（登记后要重启终端 1 的 dev-server 才生效）：

```bash
cd ../account-center
node tools/register-product.js personal-site 个人网站 http://localhost:5181
```

然后打开 `http://localhost:5181`：

1. 顶栏显示「登录」→ 点它跳账户中心登录页
2. 邮箱登录 → 自动带票据回本站，顶栏变成「我的」
3. 点任意作品卡 → 进账户中心「我的账户 → 我的足迹」，能看到一条「打开作品」

注意：登记地址是 `http://localhost:5181`，所以联调请用 `localhost` 访问，别用 `127.0.0.1`（票据校验按域名严格比对）。上了正式域名后，把 `PS_ACCOUNT.prod` 改回 `https://account.chesterlee.cn`，并重新登记作品地址。

## 改东西看哪里

| 想改什么 | 改哪个文件 |
|---|---|
| 文字内容（名字、介绍、作品） | `web/index.html` |
| 颜色 / 字体 / 间距 / 响应式断点 | `web/assets/css/site.css` |
| 交互（切换、滚动效果） | `web/assets/js/site.js` |
| 顶栏「登录 / 我的」入口 / 账户中心地址 | `web/assets/js/site.js` 顶部的 `PS_ACCOUNT`（`prod` 为空串 = 线上不显示入口） |
| 账户 SDK | `web/assets/js/ps-auth.js`（复制自 `account-center/sdk/ps-auth.js`，要改先改母本再同步） |
| 照片 | 放进 `web/assets/img/photos/` |
| 作品图 | 放进 `web/assets/img/works/` |
| 名片（嵌到别的网站用） | `web/card.html` |

## 把名片嵌到别的网站

`web/card.html` 是一张「个人名片」独立页（深灰卡片：照片 + 姓名 + 一行简介，内容与首页首屏一致）。
别的网站只要**贴一段代码**就能引用它；以后你改 `web/card.html`，所有嵌了的地方**自动跟着更新**。

**第一步**：把名片页部署上去（跟着本站一起发布即可），访问地址是
`https://chesterlee.cn/card.html`（随本站一起 `rsync` 发布到腾讯云轻量 `/srv/chesterlee/site/`）。

**第二步**：把下面整段贴到对方网站要放名片的位置：

```html
<iframe id="ps-card"
        src="https://chesterlee.cn/card.html"
        title="Chester Lee 名片"
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

现在跑在**腾讯云轻量**（`43.136.92.125`）的 Caddy 静态站，站点根 `/srv/chesterlee/site`，源就在 `web/`，**改完直接覆盖即可，无需构建、无需重启**：

```bash
rsync -az -e "ssh -i ~/.ssh/chesterlee_web" web/ ubuntu@43.136.92.125:/srv/chesterlee/site/
```

只改单个文件时用 `scp` 也行。验证加缓存穿透参数：`curl -s "https://chesterlee.cn/路径?cb=$(date +%s)"`。域名 / 备案 / 落点以 [部署上线备案/README.md](../../部署上线备案/README.md) 台账为准。
