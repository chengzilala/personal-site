#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
sync_talks.py —— 把 Obsidian 里的「课程」同步成网站的课程专栏

它做四件事：
  1. 扫描 个人课程/<课程名>/01_内容结构.md
  2. 用 course-html 的构建器生成放映版 deck.html（单文件、离线可放）
  3. 用 Chrome 无头模式把 deck.html 打印成 deck.pdf（同源导出，版式一致）
  4. 生成文字版详情页 web/talks/<slug>/index.html 与列表页 web/talks/index.html

用法（在项目根目录执行）：
    python3 tools/sync_talks.py              # 全部课程，含 PDF
    python3 tools/sync_talks.py --no-pdf     # 跳过 PDF（快）
    python3 tools/sync_talks.py 悦读         # 只同步文件夹名/标题含该词的课程

约定：01_内容结构.md 的 frontmatter 建议写
    ---
    课程: AI创作：什么是最重要的？
    slug: ai-creation          # 网址用，缺省会用哈希兜底
    日期: 2026-10-29
    地点: 深圳 · 读书分享       # 可选
    摘要: 一句话说明              # 可选，缺省取第一句大字
    标签: [AI, 协作]             # 可选
    ---
"""

import datetime
import hashlib
import os
import re
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

import sync_articles as arts          # 复用 frontmatter / 页面头尾 / 导航

# ---------------------------------------------------------------- 配置
TALKS_SRC = "/Users/Admin/Knowledge/ChesterObsidian/个人管理/个人课程"
TALKS_STRUCT = "01_内容结构.md"

SKILL_SCRIPTS = "/Users/Admin/Knowledge/ChesterObsidian/个人管理/.trae/skills/course-html/scripts"

WEB_DIR = os.path.join(PROJECT_ROOT, "web")
TALKS_DIR = os.path.join(WEB_DIR, "talks")

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

WARNINGS = []


def warn(msg):
    WARNINGS.append(msg)


# ---------------------------------------------------------------- 课程数据
def esc(t):
    return arts.html_lib.escape(str(t), quote=True)


def load_deck_builder():
    if SKILL_SCRIPTS not in sys.path:
        sys.path.insert(0, SKILL_SCRIPTS)
    import build_html as deck
    return deck


def make_slug(front, title):
    custom = front.get("slug")
    if isinstance(custom, str) and custom.strip():
        return re.sub(r"[^a-z0-9-]", "-", custom.strip().lower()).strip("-") or "talk"
    digest = hashlib.md5(title.encode("utf-8")).hexdigest()[:8]
    warn("《%s》没有写 slug，已用 talk-%s 兜底（建议在 frontmatter 补 slug）" % (title, digest))
    return "talk-" + digest


def find_latest_pptx(folder):
    """课程根/03_输出/ 里版本号最大的 pptx（v2 比 v10 小，按数字比）。"""
    out_dir = os.path.join(folder, "03_输出")
    if not os.path.isdir(out_dir):
        return None
    files = [f for f in os.listdir(out_dir)
             if f.lower().endswith(".pptx") and not f.startswith("~$")]
    if not files:
        return None

    def version(f):
        m = re.search(r"_v(\d+)", f)
        return int(m.group(1)) if m else 0

    return os.path.join(out_dir, max(files, key=version))


def one_line(text, limit=64):
    s = re.sub(r"\s+", " ", str(text)).strip()
    return s if len(s) <= limit else s[:limit] + "…"


def pick_summary(front, blocks, deck):
    s = front.get("摘要")
    if isinstance(s, str) and s.strip():
        return one_line(s)
    for b in blocks:
        if b["type"] == "statement" and deck.arg(b, 1):
            return one_line(deck.arg(b, 1))
    for b in blocks:
        if b["type"] == "quote":
            plain, _ = deck.body_items(b["body"])
            if plain:
                return one_line(plain[0])
    return ""


def pick_tags(front):
    raw = front.get("标签") or front.get("tags")
    if isinstance(raw, str):
        raw = re.split(r"[,，、]", raw)
    if not isinstance(raw, list):
        return []
    out = []
    for t in raw:
        t = str(t).strip().strip("[]【】").lstrip("#").strip()
        if t and t not in out:
            out.append(t)
    return out


def collect(keywords):
    if not os.path.isdir(TALKS_SRC):
        print("× 找不到课程源目录：%s" % TALKS_SRC)
        sys.exit(1)
    deck = load_deck_builder()
    talks = []
    for name in sorted(os.listdir(TALKS_SRC)):
        folder = os.path.join(TALKS_SRC, name)
        md = os.path.join(folder, TALKS_STRUCT)
        if not os.path.isfile(md):
            continue
        if keywords and not any(k in name or k in md for k in keywords):
            continue
        meta, blocks = deck.read_structure(md)
        title = (meta.get("课程") or name).strip()
        doc, pages, deck_warn = deck.render_html(meta, blocks, md)
        for w in deck_warn:
            warn("《%s》%s" % (title, w))
        date = arts.match_date(str(meta.get("日期", ""))) or ""
        # 没写日期时，用文件修改时间决定新旧顺序（但不把它当日期显示出来）
        stamp = datetime.date.fromtimestamp(os.path.getmtime(md)).isoformat()
        talks.append({
            "title": title,
            "slug": make_slug(meta, title),
            "date": date,
            "sort_key": date or stamp,
            "place": str(meta.get("地点", "")).strip(),
            "summary": pick_summary(meta, blocks, deck),
            "tags": pick_tags(meta),
            "pages": pages,
            "deck_html": doc,
            "blocks": blocks,
            "meta": meta,
            "pptx": find_latest_pptx(folder),
        })
    talks.sort(key=lambda d: (d["sort_key"], d["title"]), reverse=True)
    return talks


# ---------------------------------------------------------------- 文字版正文
def render_body(blocks, deck):
    """把六种页型渲染成可读、可被搜索引擎读到的正文。"""
    out = []
    for b in blocks:
        t = b["type"]
        if t == "section":
            label, title, sub = deck.arg(b, 0), deck.arg(b, 1), deck.arg(b, 2)
            if label:
                out.append('<p class="ps-talk__part-no">%s</p>' % esc(label))
            out.append('<h2 class="ps-talk__part">%s</h2>' % esc(title))
            if sub:
                out.append('<p class="ps-talk__lede">%s</p>' % esc(sub))
            continue

        plain, special = deck.body_items(b["body"])
        eyebrow, title = deck.arg(b, 0), deck.arg(b, 1)
        note = (special.get("注：") or [""])[0]

        if t == "statement":
            out.append('<p class="ps-talk__kicker">%s</p>' % esc(eyebrow))
            out.append('<p class="ps-talk__claim">%s</p>' % esc(title))
            subs = ([deck.arg(b, 2)] if deck.arg(b, 2) else []) + (special.get("副：") or [])
            for s in subs:
                out.append('<p class="ps-talk__sub">%s</p>' % esc(s))
            if note:
                out.append('<p class="ps-talk__note">%s</p>' % esc(note))
            continue

        if t == "quote":
            if eyebrow or title:
                out.append('<h3 class="ps-talk__h3">%s</h3>' % esc(title or eyebrow))
            body = "".join("<p>%s</p>" % esc(p) for p in plain)
            src = (special.get("出处：") or [""])[0]
            out.append("<blockquote>%s%s</blockquote>"
                       % (body, "<footer>%s</footer>" % esc(src) if src else ""))
            if note:
                out.append('<p class="ps-talk__note">%s</p>' % esc(note))
            continue

        if t == "list":
            if eyebrow or title:
                out.append('<h3 class="ps-talk__h3">%s</h3>' % esc(title or eyebrow))
            rows = []
            for ln in plain:
                parts = [p.strip() for p in ln.split("|")]
                label = parts[0]
                desc = " · ".join(p for p in parts[1:] if p)
                rows.append('<dt>%s</dt><dd>%s</dd>' % (esc(label), esc(desc)))
            out.append('<dl class="ps-talk__rows">%s</dl>' % "".join(rows))
            close = ((special.get("@") or special.get("注：")) or [""])[0]
            if close:
                out.append('<p class="ps-talk__note">%s</p>' % esc(close))
            continue

        if t == "cards":
            if eyebrow or title:
                out.append('<h3 class="ps-talk__h3">%s</h3>' % esc(title or eyebrow))
            items = []
            for ln in plain:
                parts = [p.strip() for p in ln.split("|") if p.strip()]
                if len(parts) >= 3 and re.fullmatch(r"\d{1,2}", parts[0]):
                    num, nm, ds = parts[0], parts[1], " · ".join(parts[2:])
                elif len(parts) >= 2:
                    num, nm, ds = "", parts[0], " · ".join(parts[1:])
                elif parts:
                    num, nm, ds = "", "", parts[0]
                else:
                    continue
                items.append('<li><b>%s</b><span>%s</span></li>'
                             % (esc(nm or ds), esc(ds if nm else "")))
            out.append('<ul class="ps-talk__cards">%s</ul>' % "".join(items))
            if note:
                out.append('<p class="ps-talk__note">%s</p>' % esc(note))
            continue

        if t == "timeline":
            if eyebrow or title:
                out.append('<h3 class="ps-talk__h3">%s</h3>' % esc(title or eyebrow))
            items = []
            for ln in plain:
                parts = [p.strip() for p in ln.split("|")]
                when = parts[0]
                ds = " · ".join(p for p in parts[1:] if p)
                items.append('<li><b>%s</b><span>%s</span></li>' % (esc(when), esc(ds)))
            out.append('<ol class="ps-talk__tl">%s</ol>' % "".join(items))
            close = ((special.get("@") or special.get("注：")) or [""])[0]
            if close:
                out.append('<p class="ps-talk__note">%s</p>' % esc(close))
            continue
    return "\n".join(out)


# ---------------------------------------------------------------- 导出 PDF
def export_pdf(deck_path, pdf_path):
    if not os.path.isfile(CHROME):
        warn("没找到 Chrome，跳过 PDF 导出：%s" % pdf_path)
        return False
    url = "file://" + deck_path.replace(" ", "%20")
    tmp = pdf_path + ".part"
    cmd = [CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
           "--virtual-time-budget=3000", "--print-to-pdf=" + tmp, url]
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                       timeout=180)
    except Exception as e:
        if os.path.exists(tmp):
            os.remove(tmp)
        warn("PDF 导出失败（%s）：%s" % (deck_path, e))
        return False
    if not os.path.isfile(tmp) or os.path.getsize(tmp) < 20000:
        if os.path.exists(tmp):
            os.remove(tmp)
        warn("PDF 导出结果异常，已丢弃：%s" % deck_path)
        return False
    os.replace(tmp, pdf_path)
    return True


# ---------------------------------------------------------------- 页面
LIST_TPL = """<main class="ps-list">
  <header class="ps-list__head">
    <p class="ps-list__sub">{sub}</p>
    <h1 class="ps-list__title">分享</h1>
    <p class="ps-list__intro">我把讲过的东西都放在这里：可以当场放映，也可以按 PPT / PDF / HTML 三种格式带走。</p>
  </header>
  <ul class="ps-talk-list">
{items}
  </ul>
</main>
"""

LIST_ITEM_TPL = """    <li class="ps-talk-item">
      <a class="ps-talk-item__link" href="{slug}/index.html">
        <span class="ps-talk-item__no">{no}</span>
        <span class="ps-talk-item__main">
          <span class="ps-talk-item__title">{title}</span>
          <span class="ps-talk-item__desc">{desc}</span>
          <span class="ps-talk-item__meta">{meta}</span>
        </span>
        <span class="ps-talk-item__go">进入 →</span>
      </a>
    </li>"""

DETAIL_TPL = """<article class="ps-post ps-talk">
  <header class="ps-post__head">
    <p class="ps-post__kicker">{kicker}</p>
    <h1 class="ps-post__title">{title}</h1>
    <p class="ps-post__meta">{meta}</p>
  </header>

  <div class="ps-talk__actions">
    <a class="ps-talk__btn ps-talk__btn--main" href="deck.html" target="_blank" rel="noopener">全屏放映</a>
    {ppt_btn}{pdf_btn}{html_btn}
  </div>

  <div class="ps-post__body ps-talk__body">
{body}
  </div>

  <nav class="ps-post__nav" aria-label="分享导航">
{prevnext}
  </nav>
  <p class="ps-post__back"><a href="../index.html">← 返回分享</a></p>
</article>
"""

GENERATED_MARK = "<!-- generated by tools/sync_talks.py -->"


def site_topbar(prefix, current):
    """分享页用的导航：与全站顺序一致（首页 / 关于我 / 作品 / 文章 / 分享）。"""
    def mark(key):
        return ' aria-current="page"' if key == current else ""
    return arts.TOPBAR_TPL.format(
        brand=esc(arts.SITE_BRAND),
        home=prefix + "index.html",
        about=prefix + "about.html",
        works=prefix + "works.html",
        articles=prefix + "articles/index.html",
        talks=prefix + "talks/index.html",
        cur_home=mark("home"),
        cur_works=mark("works"),
        cur_articles=mark("articles"),
        cur_talks=mark("talks"),
    )


def meta_line(t, extra=""):
    """日期 / 页数 / 地点 的元信息行：没有的项直接不出现，不编日期。"""
    bits = []
    if t["date"]:
        bits.append('<time datetime="%s">%s</time>' % (esc(t["date"]), esc(t["date"])))
    bits.append("<span>%d 页</span>" % t["pages"])
    if t["place"]:
        bits.append("<span>%s</span>" % esc(t["place"]))
    if extra:
        bits.append(extra)
    return '<span class="ps-post__meta-sep"> · </span>'.join(bits)


def write_list(talks):
    items = []
    for i, t in enumerate(talks, 1):
        items.append(LIST_ITEM_TPL.format(
            no="%02d" % (len(talks) - i + 1),
            slug=t["slug"],
            title=esc(t["title"]),
            desc=esc(t["summary"]),
            meta=esc(" · ".join(x for x in (t["date"], "%d 页" % t["pages"], t["place"]) if x)),
        ))
    sub = "%s · 共 %d 场" % (arts.AUTHOR_NAME, len(talks))
    html = (
        arts.page_head("分享 ｜ %s" % arts.SITE_NAME, "我讲过的分享：可放映、可下载、可阅读。",
                       "../assets/css/site.css")
        + site_topbar("../", "talks")
        + LIST_TPL.format(sub=esc(sub), items="\n".join(items)
                          or '    <li class="ps-talk-item"><p class="ps-talk-item__desc">还没有分享。</p></li>')
        + arts.page_foot("../assets/js/site.js")
        + "\n" + GENERATED_MARK + "\n"
    )
    os.makedirs(TALKS_DIR, exist_ok=True)
    with open(os.path.join(TALKS_DIR, "index.html"), "w", encoding="utf-8") as f:
        f.write(html)


def write_detail(t, ordinal, prev_t, next_t, with_pdf):
    d = os.path.join(TALKS_DIR, t["slug"])
    os.makedirs(d, exist_ok=True)

    with open(os.path.join(d, "deck.html"), "w", encoding="utf-8") as f:
        f.write(t["deck_html"])
    if with_pdf:
        export_pdf(os.path.join(d, "deck.html"), os.path.join(d, "deck.pdf"))

    pdf_btn = ""
    if os.path.isfile(os.path.join(d, "deck.pdf")):
        pdf_btn = ('<a class="ps-talk__btn" href="deck.pdf" download>下载 PDF</a>')
    ppt_btn = ""
    if t["pptx"] and os.path.isfile(t["pptx"]):
        ppt_name = os.path.basename(t["pptx"])
        dst = os.path.join(d, "deck.pptx")
        if not os.path.isfile(dst) or os.path.getsize(dst) != os.path.getsize(t["pptx"]):
            shutil.copy2(t["pptx"], dst)
        # 源文件是 600，网站要能被 Caddy 读到
        os.chmod(dst, 0o644)
        ppt_btn = ('<a class="ps-talk__btn" href="deck.pptx" download="%s">下载 PPT</a>'
                   % esc(ppt_name))
    else:
        warn("《%s》没找到 03_输出/*.pptx，页面上不会有 PPT 下载" % t["title"])

    html_btn = ('<a class="ps-talk__btn" href="deck.html" download="%s.html">下载 HTML</a>'
                % esc(t["title"]))

    tags_html = ""
    if t["tags"]:
        tags_html = ('<span class="ps-post__tags">'
                     + "".join("<span>#%s</span>" % esc(x) for x in t["tags"]) + "</span>")

    prevnext = ""
    if prev_t:
        prevnext += ('    <a class="ps-post__nav-item ps-post__nav-item--prev" href="../%s/index.html">'
                     '<span class="ps-post__nav-k">← 上一场</span><span class="ps-post__nav-t">%s</span></a>\n'
                     % (prev_t["slug"], esc(prev_t["title"])))
    else:
        prevnext += '    <span class="ps-post__nav-empty">（已是最新一场）</span>\n'
    if next_t:
        prevnext += ('    <a class="ps-post__nav-item ps-post__nav-item--next" href="../%s/index.html">'
                     '<span class="ps-post__nav-k">下一场 →</span><span class="ps-post__nav-t">%s</span></a>\n'
                     % (next_t["slug"], esc(next_t["title"])))
    else:
        prevnext += '    <span class="ps-post__nav-empty ps-post__nav-empty--next">（已是最早一场）</span>'

    body = render_body(t["blocks"], load_deck_builder())
    html = (
        arts.page_head("%s ｜ %s" % (t["title"], arts.SITE_NAME), t["summary"] or arts.SITE_TAGLINE,
                       "../../assets/css/site.css")
        + site_topbar("../../", "talks")
        + DETAIL_TPL.format(
            kicker=esc("分享 · 第 %02d 场" % ordinal),
            title=esc(t["title"]),
            meta=meta_line(t, tags_html),
            pdf_btn=pdf_btn,
            ppt_btn=ppt_btn,
            html_btn=html_btn,
            body=body,
            prevnext=prevnext,
        )
        + arts.page_foot("../../assets/js/site.js")
        + "\n" + GENERATED_MARK + "\n"
    )
    with open(os.path.join(d, "index.html"), "w", encoding="utf-8") as f:
        f.write(html)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    with_pdf = "--no-pdf" not in sys.argv

    print("读取课程源：%s" % TALKS_SRC)
    talks = collect(args)
    if not talks:
        print("× 没有找到含 %s 的课程文件夹。" % TALKS_STRUCT)
        return

    for i, t in enumerate(talks):
        prev_t = talks[i - 1] if i > 0 else None
        next_t = talks[i + 1] if i + 1 < len(talks) else None
        write_detail(t, len(talks) - i, prev_t, next_t, with_pdf)
        print("  ✓ %s  →  talks/%s/（%d 页）" % (t["title"], t["slug"], t["pages"]))

    write_list(talks)
    print("  ✓ 生成列表页 web/talks/index.html")

    if WARNINGS:
        print("\n提醒：")
        for w in WARNINGS:
            print("  ! %s" % w)
    print("\n完成。")


if __name__ == "__main__":
    main()
