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

## 环境要求

- 任意现代浏览器（Chrome / Edge / Safari）
- 可选：Python 3（仅用于起本地服务）

## 部署（以后）

纯静态，可直接拖到 Vercel / Netlify / GitHub Pages。配置见 `web/vercel.json`。
