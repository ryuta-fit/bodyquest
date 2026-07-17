#!/usr/bin/env bash
# ============================================================
# BodyQuest — Firebase 自動セットアップ
# ------------------------------------------------------------
#   bash scripts/firebase-setup.sh
#
# やること（自動）:
#   1. Firebase CLI のログイン（ブラウザが開きます）
#   2. Firebase プロジェクトの作成
#   3. ウェブアプリの登録 → firebase-config.js へ設定値を書き込み
#   4. Firestore データベースの作成（東京リージョン）
#   5. セキュリティルールと複合インデックスのデプロイ
#
# 自動化できないもの（最後に案内します）:
#   - Authentication で Google ログインを有効化（コンソールで2クリック）
#   - 承認済みドメインに GitHub Pages のドメインを追加
# ============================================================
set -uo pipefail
cd "$(dirname "$0")/.."

FB="npx --yes firebase-tools@15"
PROJECT_ID="${1:-}"
DISPLAY_NAME="BodyQuest"

say()  { printf "\n\033[1;36m▸ %s\033[0m\n" "$1"; }
ok()   { printf "\033[1;32m  ✓ %s\033[0m\n" "$1"; }
warn() { printf "\033[1;33m  ! %s\033[0m\n" "$1"; }
die()  { printf "\n\033[1;31m✖ %s\033[0m\n" "$1"; exit 1; }

# ---------- 1. ログイン ----------
say "Firebase にログインします（ブラウザが開きます）"
if $FB login:list 2>/dev/null | grep -q "Logged in as" && $FB projects:list >/dev/null 2>&1; then
  ok "ログイン済み: $($FB login:list 2>/dev/null | grep 'Logged in as' | head -1)"
else
  $FB login --reauth || die "ログインに失敗しました"
  $FB projects:list >/dev/null 2>&1 || die "ログインは通りましたがプロジェクト一覧を取得できません"
  ok "ログインしました"
fi

# ---------- 2. プロジェクト ----------
if [ -z "$PROJECT_ID" ]; then
  PROJECT_ID="bodyquest-$(LC_ALL=C tr -dc 'a-z0-9' </dev/urandom | head -c 6)"
fi

if $FB projects:list 2>/dev/null | grep -q " $PROJECT_ID "; then
  ok "既存プロジェクトを使います: $PROJECT_ID"
else
  say "プロジェクトを作成します: $PROJECT_ID"
  $FB projects:create "$PROJECT_ID" --display-name "$DISPLAY_NAME" \
    || die "プロジェクト作成に失敗しました。IDが使用済みかもしれません。引数で別IDを指定して再実行してください: bash scripts/firebase-setup.sh bodyquest-xxxx"
  ok "作成しました: $PROJECT_ID"
fi

# ---------- 3. ウェブアプリ ----------
say "ウェブアプリを登録して firebase-config.js を書き出します"
APP_ID=$($FB apps:list WEB --project "$PROJECT_ID" 2>/dev/null | grep -oE '1:[0-9]+:web:[a-z0-9]+' | head -1)
if [ -z "$APP_ID" ]; then
  $FB apps:create WEB "BodyQuest Web" --project "$PROJECT_ID" >/dev/null 2>&1
  APP_ID=$($FB apps:list WEB --project "$PROJECT_ID" 2>/dev/null | grep -oE '1:[0-9]+:web:[a-z0-9]+' | head -1)
fi
[ -n "$APP_ID" ] || die "ウェブアプリの作成に失敗しました"
ok "App ID: $APP_ID"

$FB apps:sdkconfig WEB "$APP_ID" --project "$PROJECT_ID" --json > /tmp/bq-sdkconfig.json 2>/dev/null \
  || die "SDK設定の取得に失敗しました"

node - <<'NODE' || die "firebase-config.js の書き込みに失敗しました"
const fs = require("fs");
const raw = JSON.parse(fs.readFileSync("/tmp/bq-sdkconfig.json", "utf8"));
const c = (raw.result && (raw.result.sdkConfig || raw.result)) || raw.sdkConfig || raw;
const need = ["apiKey", "authDomain", "projectId", "storageBucket", "messagingSenderId", "appId"];
for (const k of need) if (!c[k]) throw new Error("missing key in sdkconfig: " + k);

const path = "firebase-config.js";
let src = fs.readFileSync(path, "utf8");
const block = `window.BQ_FIREBASE = {\n` +
  need.map(k => `  ${k}: ${JSON.stringify(c[k])},`).join("\n") + `\n};`;
src = src.replace(/window\.BQ_FIREBASE\s*=\s*\{[\s\S]*?\n\};/, block);
fs.writeFileSync(path, src);
console.log("  ✓ firebase-config.js を更新しました (projectId: " + c.projectId + ")");
NODE
rm -f /tmp/bq-sdkconfig.json

# ---------- 4. Firestore ----------
say "Firestore データベースを作成します（asia-northeast1 / 東京）"
if $FB firestore:databases:list --project "$PROJECT_ID" 2>/dev/null | grep -q "(default)"; then
  ok "既にあります"
else
  $FB firestore:databases:create "(default)" --location=asia-northeast1 --project "$PROJECT_ID" 2>&1 \
    | grep -v "^$" | tail -3
  if $FB firestore:databases:list --project "$PROJECT_ID" 2>/dev/null | grep -q "(default)"; then
    ok "作成しました"
  else
    warn "自動作成できませんでした。コンソールで作成してください（本番モード / asia-northeast1）:"
    warn "  https://console.firebase.google.com/project/$PROJECT_ID/firestore"
  fi
fi

# ---------- 5. ルールとインデックス ----------
say "セキュリティルールと複合インデックスをデプロイします"
if $FB deploy --only firestore:rules,firestore:indexes --project "$PROJECT_ID" 2>&1 | tail -6; then
  ok "デプロイしました"
else
  warn "デプロイに失敗しました。Firestore の作成後にもう一度実行してください:"
  warn "  npx firebase-tools deploy --only firestore:rules,firestore:indexes --project $PROJECT_ID"
fi

# ---------- 残りの手動ステップ ----------
cat <<EOF

============================================================
 あと2つだけコンソールでの操作が残っています（3分ほど）
============================================================

 1) Google ログインを有効化
    https://console.firebase.google.com/project/$PROJECT_ID/authentication/providers
    → 「始める」→ Google を選ぶ → 有効にする → プロジェクトのサポートメールを選択 → 保存

 2) 承認済みドメインに GitHub Pages を追加
    https://console.firebase.google.com/project/$PROJECT_ID/authentication/settings
    → 承認済みドメイン → ドメインを追加 → ryuta-fit.github.io

 終わったらローカルで確認:
    python3 -m http.server 4174
    open "http://localhost:4174/index.html"

 ネイティブ配信（iOS/Android）を行う場合は FIREBASE_SETUP.md の最終章を参照。
============================================================
EOF
