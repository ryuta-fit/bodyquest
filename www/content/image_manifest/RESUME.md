# 教材画像 生成ループ 引き継ぎ書（別セッション再開用）

## 目的
クイズアプリ BodyQuest の学習教材に、ChatGPT(GPT Image)で生成した医学的に正確な概念画像を埋め込む。
ユーザーのChromeを操作してChatGPT Plusで生成→ダウンロード→プロジェクトに保存→アプリが自動表示。

## 現在の進捗
- 生成済み: **53/257枚**（目視で医学的正確性を確認済み）。anatomy 36枚完了→functional_anatomy(fa_001〜017)完了。endocrineは安全フィルター回避で再生成成功。
- 注1: レート制限が断続的に出る。長め(12分)のクールダウンで回復。プロンプトは\u escapeでなく直接漢字で書く(腎→腰/腱→腰/踵→蹵の誤用防止)。
- 注2: 生成が6分超で詰まる図あり(fa_010インナーユニット)→プロンプトを簡素化(矢状断・冠状断併記→1枚に)で高速生成成功。
- 注3: DL後は必ず`stat -f%m`で作成時刻age<60sを確認。古いDownloads内ChatGPT画像を誤取得する事故あり。
- 注4: サイドバー表示時は画像中心が(693〜735,360〜530)、ライトボックスDLアイコンは(1421,28)。クリックでライトボックス開→DLアイコン。
- ⚠️ セッション後半でChatGPTが連続レート制限を発動(ほぼ毎操作)。数分待てば解除されるが、自動操作ペースを大幅に落とす必要あり。再開時は1サイクルごとに十分待機すること。
- **レート制限注意**: 操作が速すぎると「リクエストが多すぎます」ダイアログが出る。出たら「了解」(座標約1006,448)で閉じ、操作間に2〜5秒待機を入れてペースを落とす(生成自体は完了しているのでダウンロードは継続可能)。
- **教訓: プロンプトは\u escapeでなく直接漢字で書くこと**(腎→腰腰・腱→腰腰・橈→桕・踵→蹵蹵 等の符号誤用を防ぐ)。ただしChatGPTは軽微な誤字なら正しく解釈して正確にラベルする(surface_landmarksで実証)。
  - 1〜9: spine / atlas_axis / thorax / skull / upper_bones / carpal_tunnel / humerus_nerves / lower_bones / pelvis
  - 10〜31(本セッション): femur_neck_fx / joint_types / joint_structure / knee / back_muscles / trunk_muscles / upper_muscles / rotator_cuff / serratus / lower_muscles / glutes_gait / calf_achilles / nervous_overview / cranial_autonomic / spinal_cord / heart / circulation / respiratory / alveolus / digestive_tract / digestive_glands / urinary
- 次の未生成: `content/image_manifest/_worklist.json` の先頭から未生成のものを順に。
  確認コマンド:
  `node -e 'const fs=require("fs");const l=JSON.parse(fs.readFileSync("content/image_manifest/_worklist.json","utf8"));const d=l.filter(x=>fs.existsSync("content/images/"+x.filename));console.log(d.length+"/"+l.length);console.log(l.filter(x=>!fs.existsSync("content/images/"+x.filename)).slice(0,5).map(x=>x.imgId).join(","))'`

## ファイル構成
- 設計図（画像仕様）: `content/image_manifest/<field>.json` … 各画像 {imgId,title,cat,covers:[qid],must_show:[],prompt,filename}
- 生成ワークリスト（高価値順）: `content/image_manifest/_worklist.json`（257件、field優先順）
- 進捗: `content/image_manifest/_progress.json`
- 保存先: `content/images/<field>/<imgId>.png`
- アプリ統合: `content/gen_images.js`（QUESTION_IMG/CAT_IMG/FIELD_DEF_IMG + window.genImgHTML）。
  app.js の renderLearn（figFor内）と showFeedback に `window.genImgHTML(field,cat,qid)` を追加済み。
  index.html に `<script src="content/gen_images.js?v=...">` を app.js の前に読込。未生成画像は onerror で自動非表示。
- 完了条件: 全4,092問が概念画像にマッピング済み（gen_images.js）。生成が進むほど表示が充実。全257枚生成で完了。

## 確立した生成手順（重要・ハマりどころ回避）
ChatGPTタブ（例 tabId は list_connected_browsers / tabs_context で確認。本作業では新規タブを使用）。

1. **新規チャットにする**: navigate `https://chatgpt.com/` → 3〜4秒待つ（ProseMirror読込）。
2. **プロンプト入力は必ずJS挿入**（computerのtypeは日本語漢字が化ける: 橈→桕/顎→顔/腱→腰/腋→腥/腿→腰/脛→趵/腓→腕/踵→蹵）:
   ```js
   var ed=document.querySelector('div.ProseMirror'); ed.focus();
   document.execCommand('selectAll',false,null); document.execCommand('delete',false,null);
   document.execCommand('insertText',false, "新しい画像を作成してください。"+<manifestのprompt>);
   ```
   挿入後 innerText に化け（腰骨/趵/腕骨/蹵/桕）が無いか確認。
3. **送信はJSでボタンclick**（Returnと座標クリックは不安定。背面タブだと特に効かない）:
   ```js
   (document.querySelector('button[data-testid="send-button"]')||
    document.querySelector('button[aria-label="プロンプトを送信する"]')).click();
   ```
4. **生成待ち**: 1枚あたり約1〜3分（最大6分超もあり）。「生成中/お待ちください/Thought for」やグレー/ドットのプレースホルダー表示中は待つ。
5. **取得（ダウンロード）**: ※2026-06-29時点でChatGPTはインライン画像を**圧縮1024px JPEG(約126KB)**で配信するようになり、旧来のJS-blob法(blob>400000)では本番画像が取れない(全部20万未満になる)。**ライトボックス経由でフルサイズPNGをDLすること**:
   1) チャット内の生成画像を `computer left_click`（中央付近）でクリック→全画面ビューアが開く。
   2) ビューア右上の**ダウンロードアイコン(↓, 座標 約1421,28)**を `left_click`。
   3) `~/Downloads/ChatGPT Image YYYY年M月D日 HH_MM_SS.png`（約1.4〜1.7MB PNG）が落ちる。
   4) `mv "$(ls -t ~/Downloads/ChatGPT\ Image*.png | head -1)" content/images/<field>/<imgId>.png`。
   - ビューアを閉じるのは `Escape`。
   - 生成完了の判定: チャット内画像コンテナに「編集」ボタンが出る／`button[data-testid="stop-button"]`が消える（generating:false）。
   - 注意: クリック位置がボタン中心でないとDLされない。落ちなければ `ls -t ~/Downloads` で新規pngが無いことを確認し座標を直して再クリック。
6. **必ず目視検証**: 保存画像を Read で開き、設計図の must_show と一致するか・無関係画像でないか・漢字化け由来の構造誤り（例: 下肢なのに腕の骨）が無いか確認。NGなら削除して再生成。
7. 失敗（「画像生成に失敗」明示）や6分超の停滞は、新規チャットで作り直して再送。
8. **安全フィルター誤判定**: 全身図(裸体)はChatGPTが「ヌード/性的表現」と誤判定して拒否することがある(例: 内分泌系全身図)。本文に「思考を停止しました」+「ヌード/性的表現/安全基準に違反」が出たら、プロンプトに『着衣の人体シルエット(またはグレーの輪郭のみ)の上に臓器を配置した模式図。裸体表現は不要』と明記して新規チャットで再送すると通る。検出regex: `/ヌード|性的|ポルノ|安全基準に違反/`。

## 高速化（推奨）
- ChatGPTタブを**2〜3個並行**にし、各タブで1枚ずつ同時生成。1サイクル（ScheduleWakeup ~150s）で複数枚回収→複数枚投入。
- 各タブ「1画像=1新規チャット」にすると状態管理がシンプル（per-tab pending を _progress.json に保持）。

## 再開コマンド例（/loop dynamic）
`/loop` で上記手順を回す。停止はユーザー指示か全257枚完了で。
