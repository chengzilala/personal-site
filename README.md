# personal-site — 个人网站

> 用**大图**说话的极简个人网站：展示「我的生活方式」与「我的作品」。文字极少，手机/电脑都好看。
> **域名 / 备案 / 上线**：统一记在 [部署上线备案/README.md](../部署上线备案/README.md)（唯一台账），本文不重复。

---

## 这是什么

一个纯静态个人主页，四个部分：

1. **生活方式**（首页板块）—— 个人生活照（图片是主角）
2. **关于我**（独立页 [web/about.html](./web/about.html)）—— 数字亮点 + 完整自我介绍 + 个人微信 / 公众号二维码
3. **作品** —— 卡片式展示（简洁几何插画 + 标题 + 一行说明 + 链接；如「微信悦读」阅读产品、公众号、跑步看板）
4. **文章** —— 从 Obsidian 一键同步：列表页 + 每篇独立正文页，列表项 = 标签 + 标题 + 日期（纯文字紧凑行，版式参考 kanbenzhi.com）

设计原则：**简洁、简单、大图优先、响应式（手机优先）**。无构建、无依赖，双击 `web/index.html` 就能看。

## 现在能做什么

- 可直接打开的首页：[web/index.html](./web/index.html)（响应式：作品 + 最近文章 + 生活方式）
- 关于我页 [web/about.html](./web/about.html)（数字亮点 + 自我介绍 + 个人微信 / 公众号二维码）
- 作品页 [web/works.html](./web/works.html)、文章列表 [web/articles/index.html](./web/articles/index.html) 及每篇正文
- 顶栏「登录 / 我的」入口：已接统一账户中心 SDK（`web/assets/js/ps-auth.js`）。未登录点「登录」跳账户中心，登录后带一次性票据回本页；已登录显示「我的」，直接进账户中心。地址在 `web/assets/js/site.js` 顶部的 `PS_ACCOUNT`，本机预览自动指向本地测试端口
- 登录后点作品卡，会自动在账户中心「我的足迹」记一条「打开作品」（失败静默，不影响打开）
- 从 Obsidian 一键同步文章的脚本：双击项目根 **`同步文章.command`**
- 目录骨架 + AI 协作规则与技能（`.trae/`，项目级）已就位
- 需求文档、运行手册、会话记录已就位

## 目录结构

```
personal-site/
├── personal-site.code-workspace   # 单独打开本项目的工作区文件
├── 同步文章.command       # 🖱 双击 = 把 Obsidian 的已发布文章同步到网站
├── .trae/                # AI 协作配置（规则 + 5 个技能，项目级；不入库）
├── web/                  # 🖥 网站本体（无构建，直接打开）
│   ├── index.html
│   ├── about.html        # 关于我：数字亮点 + 自我介绍 + 个人微信 / 公众号二维码
│   ├── works.html        # 作品页
│   ├── articles/         # 文章：index.html（列表）+ <短名>.html（正文，脚本生成）
│   ├── talks/            # 课程：index.html（列表）+ <短名>/{index,deck}.html + deck.pdf
│   ├── xunguang/         # 「循光践道」官网副本（根 = 天光版；classic/ 破晓版；v2/v3/v5 变体）
│   └── assets/
│       ├── css/site.css
│       ├── js/
│       │   ├── site.js
│       │   ├── ps-auth.js          # 账户中心 SDK（从 account-center/sdk/ps-auth.js 复制，改动请两边同步）
│       │   └── articles-data.js   # 首页文章数据（脚本生成）
│       └── img/
│           ├── photos/   # 你的生活照放这里
│           ├── works/    # 作品截图放这里
│           └── articles/ # 文章插图（脚本生成）
├── tools/                # 🛠 工具：sync_articles.py（把 Obsidian md 转成网站）
├── plan/                 # 📋 规划：RPD 需求 / 版本
├── dev/                  # 🔧 开发：可复制项目指南 / 会话记录
├── test/                 # 🧪 验收测试清单
├── usage/                # 📖 使用：Running.md
├── screenshots/          # 截图素材
└── inbox/                # 📥 临时待归类（不入库）
```

## 怎么跑起来

两种都行，**不需要装任何东西**：

1. 双击 [web/index.html](./web/index.html)
2. 或起个本地服务：`python3 -m http.server 5181 --directory web`

## 文章怎么同步（Obsidian → 网站）

文章只维护一份，就在 Obsidian：`个人管理/文章输出/03_已发布/`。写好后把 frontmatter 的状态标为 `status: 已发布`，然后：

1. 双击项目根目录的 **`同步文章.command`**（内部调用 `tools/sync_articles.py`）
2. 脚本自动：读 md → 转成网页 → 复制并压缩插图 → 重新生成文章列表页与首页数据
3. 打开 `web/articles/index.html` 检查结果

- 只同步某几篇：`同步文章.command 深圳 跑步`（按文件名关键词过滤，此时不清理其它旧页）
- 只有 `status: 已发布` 的文章会被同步，其余自动跳过
- 公众号导出的噪声（点赞 / 在看 / 留言 / 二维码等）与内部信息（版本管理、题图 / Prompt 注脚）会自动过滤
- 文章插图一并复制进 `web/assets/img/articles/` 并压缩；日志里若提示某图「仍偏大」，建议在 Obsidian 里换一张更小的图

## 还需要你提供（关键）

| 项 | 说明 |
|---|---|
| 名字 / 网站标题 | 页面顶部显示的名字或昵称 |
| 自我介绍 | ✅ 已填（「关于我」页为完整版全文） |
| 生活照 | 放进 `web/assets/img/photos/`（建议 3–6 张） |
| 作品清单 | 名称 + 一行说明 + 链接（✅ 已填首个作品「微信悦读」；后续作品按同样格式追加） |

## 下一步

1. 确认视觉方向（先出一版首页样张给你看）
2. 把你的照片与作品信息填进去
3. 部署上线（腾讯云轻量 · Caddy 静态站，见 [Running.md](./usage/Running.md#部署以后)）

## 相关文档

- 工作法：[dev/可复制项目指南.md](./dev/可复制项目指南.md)
- 需求：[plan/RPD_需求文档.md](./plan/RPD_需求文档.md)
- 会话记录：[dev/session_log.md](./dev/session_log.md)
