#!/bin/bash
# 双击运行：把 Obsidian 里的「课程」（个人课程/*/01_内容结构.md）同步到网站
#   只同步某几场测试：在「终端」里执行  python3 tools/sync_talks.py 关键词
#   跳过 PDF 导出（更快）：python3 tools/sync_talks.py --no-pdf

cd "$(dirname "$0")" || exit 1

echo "=== 同步课程：Obsidian → 网站 ==="
echo

if ! command -v python3 >/dev/null 2>&1; then
  echo "× 没找到 python3，请先安装 Python 3 后再试。"
  echo
  echo "按回车键关闭窗口。"
  read -r
  exit 1
fi

python3 tools/sync_talks.py "$@"
status=$?

echo
if [ "$status" -eq 0 ]; then
  echo "双击 web/talks/index.html 就能看到课程列表。"
  echo "（浏览器里按 Cmd+R 刷新即可）"
else
  echo "× 同步过程出错，请把上面的信息截图给我。"
fi
echo
echo "按回车键关闭窗口。"
read -r
