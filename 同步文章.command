#!/bin/bash
# 双击运行：把 Obsidian 里「已发布」的公众号文章，同步到网站
# 想只同步某几篇测试：在「终端」里执行  python3 tools/sync_articles.py 关键词

cd "$(dirname "$0")" || exit 1

echo "=== 同步文章：Obsidian → 网站 ==="
echo

if ! command -v python3 >/dev/null 2>&1; then
  echo "× 没找到 python3，请先安装 Python 3 后再试。"
  echo
  echo "按回车键关闭窗口。"
  read -r
  exit 1
fi

python3 tools/sync_articles.py "$@"
status=$?

echo
if [ "$status" -eq 0 ]; then
  echo "双击 web/index.html 或 web/articles/index.html 就能看到效果。"
  echo "（浏览器里按 Cmd+R 刷新即可）"
else
  echo "× 同步过程出错，请把上面的信息截图给我。"
fi
echo
echo "按回车键关闭窗口。"
read -r
