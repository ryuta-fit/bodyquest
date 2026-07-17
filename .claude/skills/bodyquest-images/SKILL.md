---
name: bodyquest-images
description: >-
  Generate and embed medically/technically accurate concept images into the
  BodyQuest learn materials (this repo), using the Codex CLI built-in image_gen
  tool (ChatGPT auth, no API key). Use when asked to add/increase images for a
  learn field (教材の画像を増やす), fill missing section images, or wire generated
  images into the app. Covers the full pipeline: manifest design → codex image
  generation → webp conversion → CAT_IMG wiring (www + root) → browser verify.
---

# BodyQuest 教材画像 生成・組み込みスキル

BodyQuest（`/Users/hayashiryuta/anatomy_app`）の**教材(LEARN_CONTENT)**の各セクションに、
医学・スポーツ科学的に正確な**概念図**を1枚ずつ入れる手順書。問題テキストの追加は別スキル
`bodyquest-content`。画像は **Codex CLI の組み込み `image_gen`** で生成する（ChatGPT認証・**APIキー不要**、
日本語ラベルも正確に描画される）。

## 表示の仕組み（重要）
- 教材は `app.js` の `renderLearn` → 各セクションで `window.genImgHTML(field, cat)` を呼ぶ。
- `genImgHTML` は `www/content/gen_images.js` の `window.CAT_IMG["<field>|<cat>"]` を引いて `<img>` を出す。
  キーは **`"分野key|セクションのcat文字列"`**（cat は教材の cat と**完全一致**が必須）。値は `"<field>/<imgId>.webp"`。
- 画像ファイルが無ければ `onerror` で自動非表示。だから「登録だけして未生成」でも壊れない。
- **リポジトリは root と www の二重管理**（root=GitHub Pages / www=Capacitor iOS webDir）。
  画像と CAT_IMG は **両方**（`content/` と `www/content/`）に反映すること。

## ファイル構成
- 設計図(マニフェスト): `www/content/image_manifest/<field>.json` … 配列 `[{imgId,title,cat,filename,prompt}]`
  - `imgId`: `<field>_img_<英語スラッグ>`（一意） / `filename`: `<field>/<imgId>.webp` / `cat`: 教材の cat と一字一句一致
- 生成PNG(一時): scratchpad の `gen/<field>/<imgId>.png`
- webp: `www/content/images/<field>/<imgId>.webp` ＋ root `content/images/<field>/<imgId>.webp`
- 進捗の目視: 生成PNGを Read で開き医学的正確性を確認（must_show/用語/化けが無いか）

## Codex 画像生成の要点（ハマりどころ回避）
- 実行: `codex exec -s workspace-write --skip-git-repo-check -C <gen_dir> "<プロンプト>"`
  - `--dangerously-bypass-approvals-and-sandbox` は Claude Code 自動モードで**拒否される**。`-s workspace-write` を使う。
  - `timeout` コマンドは macOS に無い。バックグラウンド実行＋ポーリング/監視で待つ。
  - 1枚 約2〜4分・codexトークン約50k。生成物は `~/.codex/generated_images/<uuid>/ig_*.png`。
- **並列生成は禁止（取り違えの原因）**: 複数の codex を同時に走らせ「最新PNGをコピー」させると、
  共有の `~/.codex/generated_images` で競合し、別セッションの画像を掴んで**同一ファイルになる**事故が起きる。
  → **必ず逐次(concurrency 1)** で生成する。md5 で重複チェックすること。
  - 検証済みの回避策の失敗例: セッション毎に隔離 `CODEX_HOME` を与えれば取り違えは防げるが、
    各 home がプラグインキャッシュを**再構築するコールドスタート**で1枚8分超に激遅化 → 割に合わない。逐次が最速で確実。
- **勝ちパターンのプロンプト共通ヘッダ**（全図を統一感のあるセットにする）:
  「白背景／最上部に濃紺帯＋白文字タイトル／要素を色分け＋矢印＋凡例／日本語ラベル正確に／
  最下部に『※図は模式的なものであり、実際はより複雑です。』注記／写実・裸体表現は避けフラットなベクター調／正方形」。
  各図の中身(prompt)は**教材の html から具体的な用語・数値・分類を拾って**指定する。
- **安全フィルタ**: 人体全身図は「ヌード/性的」と誤判定され拒否されることがある。プロンプトに
  「着衣シルエット/グレー輪郭で、裸体表現は不要」と明記する。

## 手順（分野=FIELD 単位）
1. **対象把握**: どのセクションが未表示か確認。
   `node -e '...'`（下記スニペット）で field ごとに sections vs 実表示画像を数える。
2. **マニフェスト作成**: `www/content/image_manifest/<field>.json` を作る。
   - 高品質にするため、各セクションの html を読んで概念に最適な図種(フロー/比較/グラフ/ベン図/経路図)と
     具体ラベルを prompt に書く。`image_manifest/pain.json` を完成例として倣う。
   - 複数分野をまとめて作るときは **Workflow ツールで分野ごとにエージェント並列ドラフト**が定石
     （1エージェント=1分野が learn を読んで manifest を Write）。
3. **生成（逐次）**: `scripts/genfield.sh <field>` をバックグラウンド実行。完了を監視。
4. **目視検証**: 生成PNGを Read で全枚確認。医学的誤り/化け/取り違え(md5重複)があれば当該PNGを削除して再生成。
5. **組み込み**: `scripts/wirefield.sh <field>` で webp化＋CAT_IMG登録を **www と root 両方**に実施。
6. **実機確認**: preview（`bodyquest-www` 構成で www を配信）→ 教材→該当分野→全セクション画像が
   `naturalWidth>0` でロードされることを確認。コンソールエラー無しを確認。
7. コミットはユーザー指示があるときのみ。

## 未表示セクション数え上げスニペット
```
node -e '
const fs=require("fs");const dir="www/content/learn";
global.window={LEARN_CONTENT:{},QUIZ_FIELDS:[]};
for(const f of fs.readdirSync(dir).filter(f=>f.endsWith(".js"))){try{eval(fs.readFileSync(dir+"/"+f,"utf8"))}catch(e){}}
eval(fs.readFileSync("www/content/index.js","utf8"));
const CAT=JSON.parse(fs.readFileSync("www/content/gen_images.js","utf8").match(/window\.CAT_IMG *= *(\{[\s\S]*?\});/)[1]);
for(const F of window.QUIZ_FIELDS){const k=F.key,L=window.LEARN_CONTENT[k];if(!L)continue;let need=0;
for(const s of L.sections){const f=CAT[k+"|"+s.cat];if(!(f&&fs.existsSync("www/content/images/"+f)))need++;}
if(need)console.log(k,F.label,"needs",need,"/",L.sections.length);}
'
```

## スケール感
- 全体で未生成は多数（例: 2026-07時点で12分野・約151セクション）。1枚約3〜4分の逐次なので、
  **分野ごとにバッチ**で進め、各分野を検証→組み込み→次分野、と回す。/loop や監視で長時間運用可。

関連メモリ: `bodyquest-image-gen-codex`（codexの画像生成の詳細）。関連スキル: `bodyquest-content`。
