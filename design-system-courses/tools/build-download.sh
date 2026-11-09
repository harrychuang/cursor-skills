#!/bin/sh
# 打包「下載講義」按鈕用的 zip：downloads/ai-design-system-handout.zip
#
# 只放講義會用到的檔案：index.html、assets/、images/web/。
# 不放 ref/（公司資料，不能外流）、images/illustration/（原始插圖，77 MB）、downloads/ 本身。
# 講義內容改過之後，記得重新執行一次，zip 才會是最新的：
#   sh tools/build-download.sh
set -eu

cd "$(dirname "$0")/.."
NAME=ai-design-system-handout
OUT="$PWD/downloads/$NAME.zip"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

mkdir -p "$WORK/$NAME/images" downloads
cp -R assets "$WORK/$NAME/assets"
cp -R images/web "$WORK/$NAME/images/web"
# 下載下來的那一份不放「下載講義」按鈕：它指向的 zip 不在 zip 裡面
sed '/data-download/d' index.html > "$WORK/$NAME/index.html"

cat > "$WORK/$NAME/README.txt" <<'TXT'
AI × 設計系統驅動產品開發｜課程講義

用瀏覽器打開 index.html 就能使用（Chrome、Safari、Edge 都可以），不用安裝任何東西。
沒有網路也能看；有網路時會多載入 Noto Sans TC 字型。
你的進度、測驗答案和筆記，只會存在這台電腦的瀏覽器裡。
TXT

rm -f "$OUT"
(cd "$WORK" && zip -rqX "$OUT" "$NAME" -x '*.DS_Store')
echo "已產生 downloads/$NAME.zip（$(du -h "$OUT" | cut -f1)）"
