# 会话记录 — personal-site

> 格式：每个阶段一段摘要（固定 6 段）。详见 [可复制项目指南.md](./可复制项目指南.md) §5.1。
> 红线：不写密钥 / token / 隐私。

---

## 2026-10-01 会话条目：新项目「personal-site」骨架搭建（已完成）

- **目标**：新建个人网站项目（大图展示「生活方式」+「作品」），复用已有 AI 协作体系快速搭出结构与框架。
- **已做**：建目录骨架；从「AI协作规划库」复制 5 个技能与可复制项目指南；写项目级规则（general_rules + project_rules）；写 README / RPD / Running / session_log；做了一版可直接打开的响应式首页框架（`web/index.html` + `assets/css|js`）；新建独立工作区文件；登记进分发体系。
- **关键结论/决定**：站型定为**极简大图 + 响应式（手机优先）**，纯静态零构建零依赖；只做两大板块（生活方式 / 作品）；照片与个人信息须用户本人提供，不编造、不用假图。
- **产出物（文件/链接）**：`personal-site/README.md`、`.trae/rules/*`、`.trae/skills/*`、`web/index.html`、`web/assets/css/site.css`、`web/assets/js/site.js`、`plan/RPD_需求文档.md`、`usage/Running.md`、`personal-site.code-workspace`；登记见 `AI协作规划库/_分发清单.md`、`Coding.code-workspace`。
- **待办**：①用户提供名字/自我介绍/生活照/作品信息；②确认视觉方向出样张；③部署上线。
- **风险/注意事项**：隐私红线（不写住址电话）；生活照需压缩后入库；`.trae/` 为副本，改规则须改母本再同步。

---

## 2026-10-13 会话条目：文章列表与正文改版（参考 kanbenzhi.com，已完成）

- **目标**：按用户提供的参考图，重做文章**列表页**与**正文页**的版式。
- **已做**：① `site.css` 文章模块重写——列表改纯文字紧凑行（标签／标题／日期，桌面三列、手机两行），最新一篇浅底 + 点缀色高亮；正文页新增顶部小标签、衬线大标题、信息行、居中署名、上一篇／下一篇、返回文章，阅读区收窄 760px；新增 `--accent-soft`/`--hover-bg`/`--font-serif` 变量。② `tools/sync_articles.py` 模板与数据同步更新：新增 `count_words`/`reading_minutes`/`doc_tags`/`nav_html`，正文页写入序号、字数、时长、标签与相邻篇导航；列表页写总字数；`articles-data.js` 字段改为 `{title,date,tags,url}`。③ 首页「文章」板块容器改 `<ul>`、`site.js` 渲染同款紧凑行。④ 重新生成列表页与 25 篇正文（`python3 tools/sync_articles.py`）。⑤ RPD 升 v0.50、README 同步。
- **关键结论/决定**：① 按参考图**去掉列表缩略图与摘要**，改纯文字行（用户确认）；② 详情页四要素全上（小标签／信息行／署名／上下篇）；③ 首页一并改同款；④ 标题用**系统衬线**（`Georgia,"Songti SC",…`），不引外部字体，遵守零依赖；⑤ 左侧标签取 tags 前 2 个，正文信息行展示全部标签。
- **产出物（文件/链接）**：`web/assets/css/site.css`、`tools/sync_articles.py`、`web/assets/js/site.js`、`web/index.html`、`web/articles/index.html` 及 25 篇正文、`web/assets/js/articles-data.js`、`plan/RPD_需求文档.md`。
- **待办**：① 如需看效果，跑一次本地服务截图核对（本轮按「轻验证」只做了命令行核对）；② 仍偏大的文章插图建议在 Obsidian 换小图。
- **风险/注意事项**：详情页小标签「第 N 篇」随篇数变化（按发布时间排序的序号）；标签目前不做独立标签页（无死链，仅展示）；改版只动文章模块，其它板块样式未变。
