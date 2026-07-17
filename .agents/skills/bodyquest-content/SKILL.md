---
name: bodyquest-content
description: >-
  Add or expand quiz content for the BodyQuest learning app (this repo). Use when
  asked to add/increase questions for a field, expand a field toward ~1000, add a
  brand-new 分野 (field), generate learn material, or audit/validate/dedup BodyQuest
  content. Covers the full pipeline: diverse-lens generation → answer-correctness
  audit → duplicate removal → validation → index.html wiring → browser verify.
---

# BodyQuest コンテンツ作成・拡充スキル

BodyQuest（`/Users/hayashiryuta/anatomy_app`）は Vanilla JS のゲーム型学習アプリ。
各分野の問題は `window.QUIZ_CONTENT.<key>` に push、教材は `window.LEARN_CONTENT.<key>`。
このスキルは「問題の追加／分野の新設」を**再現性高く・正確に**行うための手順書。

## 大原則
- **各分野の上限は 1,000 問未満**（分野単位。カテゴリ単位ではない）。増量時の目標は **980**。
- 生成仕様は必ず `content/_GENSPEC.md` を読み厳守（スキーマ・型比率・文字列安全規則・`node --check`）。
- **過去問と似た問題を避け、多角的に**。下記6レンズを各バッチに割り当てる。
- 問題スキーマ: `{id,cat,diff(1-3),type(mc/tf/fill),q,choices,answer,exp,tags?,accept?}`。
  - tf規約: 正しい断定文=`answer:0` / 誤り=`answer:1`。
  - mcの選択肢はアプリ側 `buildChoices` が表示時シャッフルするので、データ上 answer が偏っても可。
- 文字列内に `"` やバックスラッシュを入れない（強調・引用は「」）。掛算「×」割算「÷」、角度「度」。

## 6つの出題レンズ（多角化・重複回避の要）
バッチ index `i` に `LENSES[i % 6]` を割り当てる:
1. 数値・基準値・分類の精密化（境界値・条件付き・例外・単位換算）
2. 現場/臨床ケースベース応用（短い場面設定→最適判断）
3. 鑑別・比較（類似する概念/筋/テスト/経穴/理論の見分け）
4. 例外・間違えやすい点・「正しくないものを選べ」型
5. 計算・推論・統合（複数概念の関連づけ／計算）
6. 用語・略語・定義の想起（fill多め40%以上）

## ID レンジ（衝突回避）
既存は分野ごとに 001(base)/201(ext)/301・451・601(b1/b2/b3)/801〜(x,y 拡張) 等を使用。
新バッチは未使用帯を選ぶ。慣例: `idStart = 801 + i*160`（バッチ毎に160間隔、各~120問で衝突しない）。
ファイル名は `content/<key>_<tag><n>.js`（例: `nutrition_x1.js`, `toyo_y3.js`）。各ファイルは
`window.QUIZ_CONTENT.<key> = (window.QUIZ_CONTENT.<key> || []).concat([ ... ]);` 形式。

## モードA: 既存分野を増量する
1. 現在数を確認: `node .Codex/skills/bodyquest-content/scripts/validate.js`
2. need = 980 − 現在数。バッチ数 = ceil(need/120)、1バッチ ~120問。
3. 各バッチを **ダイナミックワークフロー**（Workflow ツール）で「生成→監査」パイプライン実行するのが定石
   （`expand-fields-to-1000` / `expand-newfields-to-1000` の過去スクリプトを `scriptPath` で流用・改変可。
   保存先: セッションの workflows/scripts/）。ワークフロー未使用時は background Agent を並列起動でも可。
   - 生成agentプロンプト: `_GENSPEC.md`厳守＋分野KEY/prefix＋カテゴリ一覧(完全一致)＋レンズ＋
     「定番の焼き直しを避け新鮮に」＋（必要なら）スコープ厳守＋「ちょうどN問・超過厳禁」＋idStart＋
     Writeでファイル作成＋`node --check`。
   - 監査agentプロンプト: 各問を独立に解き直し answer 照合・事実正誤・正解の一意性・ヒント不整合・
     （スコープのある分野は）スコープ違反を確認し、高確信の誤りのみ Edit 修正＋`node --check`。
4. index.html にバッチの `<script>` を追記（base/ext/batch群の並びに合わせる）。
5. `node .Codex/skills/bodyquest-content/scripts/dedup.js`（完全重複設問を除去）。
6. `node .Codex/skills/bodyquest-content/scripts/validate.js`（idDup/schemaBad/over1000/stemDup=0 を確認）。
   スキーマ不正があれば該当問を特定し（5択→4択など）修正。1000以上になった分野は末尾IDをトリミング。
7. ブラウザ実機確認（下記）。

## モードB: 新分野を追加する
1. `content/index.js` の `QUIZ_FIELDS` に1行追加: `{ key, label, emoji, color, desc }`。
   `color` は既存と被らない hex。`content/index.js` はキャッシュされやすいので index.html の
   `<script src="content/index.js?v=...">` の v をbumpする。
2. カテゴリを11〜13個設計（各 cat 文字列は固定）。`scope`（医療スコープ）が要る分野は注記を用意
   （例: 東洋医学＝治ると断定しない/禁忌、疼痛＝確定診断せず受診勧奨、心理＝精神疾患は専門家紹介）。
3. 問題3バッチ（基礎001/応用201/鑑別401番台）＋教材1ファイルを生成（background Agent 並列）。
   - 教材agentは既存 `content/learn/rehab.js` を Read してHTML規約（p/h4/strong/em/ul/ol/li/table のみ、
     class/style無し、バッククォート文字列）を踏襲。`window.LEARN_CONTENT.<key>={intro,sections:[{cat,title,html}]}`。
     section の `cat` はクイズの cat と完全一致（教材⇄クイズのディープリンク連携）。
4. index.html に問題3スクリプトと `content/learn/<key>.js` を配線。
5. 監査 → dedup → validate → 実機確認（モードAの4〜7と同じ）。
   分野追加だけで称号(段位)・記録バー・リーグ等は data-driven で自動対応する（app.js変更不要）。

## ブラウザ実機確認（重要・キャッシュ注意）
- プレビューは `mcp__Claude_Preview__*`（port は `.Codex/launch.json` 参照）。`preview_start`→`preview_resize` mobile。
- **app.js / content/index.js / figures.js など既存ファイルを編集したら必ず `?v=` を bump**。
  プレビューのブラウザはこれらを強くキャッシュし、`index.html?v=Date.now()` だけでは本体が更新されない。
  新規ファイル（_x/_y バッチ等、初出ファイル名）はキャッシュされないので bump 不要。
  迷ったら `preview_start` で新サーバーを立てるとキャッシュなしで確実。
- 確認項目: `QUIZ_FIELDS.length`、総問題数（ホームの収録数）、`preview_console_logs level:error` が空、
  新分野/新バッチのクイズが1問描画される、を確認。クイズ自動周回で `#quitQuiz` は confirm() で
  ハングするので押さない。

## 完了の定義
`validate.js` が `RESULT: OK ✅`（missing/parseErr/idDup/schemaBad/over1000/stemDup/learnCatMiss すべて0）、
各分野 < 1000、実機でコンソールエラー0・クイズ動作OK。

## 参考: 主なファイル
- `content/_GENSPEC.md` … 生成仕様（最初に必ず読む）
- `content/index.js` … `QUIZ_FIELDS`（分野メタ）
- `content/<key>*.js` … 問題（concat形式）
- `content/learn/<key>.js` … 教材（`LEARN_CONTENT`）
- `content/figures.js` … スキーマSVG図解＋`FIGURE_MAP[field][cat]`
- `content/refs.js` … `FIELD_REFS[field]`（参考文献）
- `app.js` … エンジン（分野追加では通常さわらない）
