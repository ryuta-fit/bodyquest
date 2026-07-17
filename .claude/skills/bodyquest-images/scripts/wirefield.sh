#!/bin/bash
# Convert generated <FIELD> PNGs -> webp into repo (www + root mirror), register CAT_IMG in both gen_images.js.
# Usage: wirefield.sh <FIELD>
set -e
export REPO="${REPO:-/Users/hayashiryuta/anatomy_app}"
export FIELD="$1"
export GEN="${GEN_ROOT:-${TMPDIR:-/tmp}/bodyquest-imggen}/$FIELD"
# Prefer the normalized array manifest genfield.sh wrote; else normalize on the fly.
export MAN="$GEN/_manifest.json"
if [ ! -f "$MAN" ]; then
  node -e 'const fs=require("fs");let m=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));m=Array.isArray(m)?m:(m.images||[]);fs.writeFileSync(process.argv[2],JSON.stringify(m))' "$REPO/www/content/image_manifest/$FIELD.json" "$MAN"
fi

for base in www root; do
  if [ "$base" = "www" ]; then OUT="$REPO/www/content/images/$FIELD"; GIFILE="$REPO/www/content/gen_images.js"; IMGROOT="$REPO/www/content/images";
  else OUT="$REPO/content/images/$FIELD"; GIFILE="$REPO/content/gen_images.js"; IMGROOT="$REPO/content/images"; fi
  mkdir -p "$OUT"
  node -e '
    const fs=require("fs");const man=JSON.parse(fs.readFileSync(process.env.MAN,"utf8"));
    for(const e of man){ if(fs.existsSync(process.env.GEN+"/"+e.imgId+".png")) console.log(e.imgId); }
  ' | while read imgId; do
    cwebp -q 90 -resize 1024 0 "$GEN/$imgId.png" -o "$OUT/$imgId.webp" >/dev/null 2>&1
  done
  echo "$base: $(ls -1 "$OUT"/*.webp 2>/dev/null | wc -l | tr -d ' ') webp in images/$FIELD"
  GIFILE="$GIFILE" IMGROOT="$IMGROOT" node -e '
    const fs=require("fs");const f=process.env.GIFILE;let s=fs.readFileSync(f,"utf8");
    const man=JSON.parse(fs.readFileSync(process.env.MAN,"utf8"));
    const m=s.match(/window\.CAT_IMG *= *(\{[\s\S]*?\});/);
    if(!m){console.error("CAT_IMG not found in "+f);process.exit(1);}
    const obj=JSON.parse(m[1]);let n=0;
    for(const e of man){ if(fs.existsSync(process.env.IMGROOT+"/"+e.filename)){ obj[process.env.FIELD+"|"+e.cat]=e.filename; n++; } }
    s=s.replace(/window\.CAT_IMG *= *\{[\s\S]*?\};/, "window.CAT_IMG = "+JSON.stringify(obj)+";");
    fs.writeFileSync(f,s);
    console.log("   CAT_IMG "+process.env.FIELD+" entries: "+Object.keys(obj).filter(k=>k.startsWith(process.env.FIELD+"|")).length+" (added "+n+")");
  '
done
echo "=== $FIELD wired (www + root) ==="
