#!/bin/bash
# Generate BodyQuest learn images for a FIELD via codex CLI built-in image_gen (SEQUENTIAL — never parallel).
# Reads manifest at www/content/image_manifest/<FIELD>.json ; writes PNGs to $GEN_ROOT/<FIELD>/<imgId>.png
# Usage: genfield.sh <FIELD> [start_index] [count]
export PATH="$PATH:$HOME/.npm-global/bin"
# Resolve a WORKING codex binary. The npm-global binary sometimes loses its native
# vendor binary after an auto-update (spawn ... ENOENT); the Codex.app bundle is a reliable fallback.
CODEX_BIN="${CODEX_BIN:-}"
if [ -z "$CODEX_BIN" ]; then
  if codex --version >/dev/null 2>&1; then CODEX_BIN="codex";
  elif [ -x "/Applications/Codex.app/Contents/Resources/codex" ]; then CODEX_BIN="/Applications/Codex.app/Contents/Resources/codex";
  else CODEX_BIN="codex"; fi
fi
REPO="${REPO:-/Users/hayashiryuta/anatomy_app}"
FIELD="$1"
SRC="$REPO/www/content/image_manifest/$FIELD.json"
GEN="${GEN_ROOT:-${TMPDIR:-/tmp}/bodyquest-imggen}/$FIELD"
mkdir -p "$GEN"
# Normalize manifest to a top-level array (supports both [..] and {images:[..]} formats)
MAN="$GEN/_manifest.json"
node -e 'const fs=require("fs");let m=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));m=Array.isArray(m)?m:(m.images||[]);fs.writeFileSync(process.argv[2],JSON.stringify(m))' "$SRC" "$MAN"
START=${2:-0}
N=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$MAN','utf8')).length)")
COUNT=${3:-$N}

STYLE='新しい画像を1枚だけ生成してください。医学・スポーツ科学の教科書スタイルの清潔なインフォグラフィック図。共通仕様: 白背景。最上部に濃紺(ネイビー)の帯を置き白文字で中央にタイトルを記す。図の要素は用途ごとに色分けし、矢印で流れを示し、下部または右下に凡例(legend)を付ける。日本語ラベルを正確に美しく描く(誤字・文字化けのないように)。最下部に小さなグレー文字で「※図は模式的なものであり、実際はより複雑です。」と注記。過度な写実表現・裸体表現は避け、フラットで明快なベクター調。アスペクト比は正方形。'

for ((k=0;k<COUNT;k++)); do
  i=$((START+k))
  imgId=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$MAN','utf8'))[$i].imgId)")
  title=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$MAN','utf8'))[$i].title)")
  prompt=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$MAN','utf8'))[$i].prompt)")
  out="$GEN/$imgId.png"
  if [ -f "$out" ]; then echo "[$i] $imgId SKIP (png exists)"; continue; fi
  # Skip if the final webp is already wired into the repo (scratchpad PNGs may have been cleared between sessions)
  if [ -f "$REPO/www/content/images/$FIELD/$imgId.webp" ]; then echo "[$i] $imgId SKIP (webp already in repo)"; continue; fi
  full="$STYLE"$'\n\nタイトル: 「'"$title"'」\n\n内容: '"$prompt"$'\n\n生成が完了したら、~/.codex/generated_images 配下に出力された最新のPNGを、必ず '"$out"' にコピーしてください(cpコマンド実行)。SVGやプレースホルダーで代用しないこと。'
  echo "[$i] $imgId START $(date +%H:%M:%S)"
  "$CODEX_BIN" exec -s workspace-write --skip-git-repo-check -C "$GEN" "$full" > "$GEN/$imgId.log" 2>&1
  if [ -f "$out" ]; then echo "[$i] $imgId OK $(date +%H:%M:%S)"; else echo "[$i] $imgId MISSING (see $imgId.log)"; fi
done
echo "=== $FIELD ALL DONE $(date +%H:%M:%S) ==="
