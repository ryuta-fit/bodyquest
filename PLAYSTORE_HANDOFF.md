# BodyQuest — Google Play 提出 引き継ぎ

最終更新: 2026-07-14

## 🎯 いまの状況（一言で）

**Android の署名済みビルド（.aab）はローカルで生成済み。あとは Google Play Console に登録してアップロード・審査提出すればストアに出せる。**

- アプリ名: **BodyQuest**
- パッケージ名（applicationId）: **com.bodyquest.app**
- versionCode: **1** / versionName: **1.0**
- ビルド成果物（AAB）: `android/app/build/outputs/bundle/release/app-release.aab`
- 署名鍵（アップロードキー）: `android/keystore/bodyquest-upload.keystore`

---

## 🔑 署名鍵（超重要・絶対に無くさない）

Play へのアプリ更新には**同じアップロードキーでの署名が毎回必要**。これを失うと自力でアップデートを出せなくなる（Google に再設定申請は可能だが面倒）。

| 項目 | 値 |
|---|---|
| キーストア | `android/keystore/bodyquest-upload.keystore` |
| エイリアス | `bodyquest-upload` |
| ストアパスワード | **`android/keystore.properties` を参照**（この文書には書かない） |
| キーパスワード | 同上（ストアパスワードと同じ値） |
| 設定ファイル | `android/keystore.properties`（gitignore 済み） |

⚠️ **このキーストアとパスワードを、iCloud/Google ドライブ等に別途バックアップしておくこと。**
このリポジトリは **GitHub Pages で一般公開**されているため、キーストア本体・`keystore.properties`・
`android/` ディレクトリはすべて gitignore 済み。**パスワードをこの文書に書き戻さないこと。**
✅ Play App Signing（新規アプリは既定でオン）を使えば、配布用の署名鍵は Google が保管する。上記はあくまで「アップロード鍵」。

---

## ✅ 私（Claude）が終わらせたこと

- JDK 21 / Android SDK 36 のビルド環境構築
- Capacitor に Android プラットフォーム追加（`android/`）
- アプリアイコン・スプラッシュ生成（全解像度）
- アップロードキーストア作成＋ gradle 署名設定
- 署名済みリリース AAB のビルド
- Play 用グラフィック生成（下記）

### 生成済みストア素材
- 512px アイコン: `assets/playstore/icon-512.png`
- フィーチャーグラフィック(1024×500): `assets/playstore/feature-graphic-1024x500.png`

---

## 👤 あなたがやること（私にはできない：アカウント作成・支払い・公開操作）

### ステップ1: Google Play Console 登録（初回のみ・$25）
1. https://play.google.com/console にアクセス、884hashiru@gmail.com でログイン
2. デベロッパー登録（個人アカウント）→ **登録料 $25（一度きり）** を支払う
3. 本人確認（住所・電話番号。個人アカウントは D-U-N-S 不要）

⚠️ **重要 — 新規個人アカウントのテスト要件**: 2023年11月以降に作成した個人デベロッパーアカウントは、**本番公開の前に「クローズドテストを 12人以上のテスターで 14日間」実施**する必要がある。これは Google の仕様。BodyQuest も対象になる可能性が高い。
→ まず「内部テスト（Internal testing）」で自分の端末で動作確認し、次に「クローズドテスト」で知人12人を招待して14日回す、という流れになる。

### ステップ2: アプリ作成
- Play Console →「アプリを作成」
- アプリ名 **BodyQuest** / 言語 日本語 / 種別 **アプリ** / 無料

### ステップ3: AAB アップロード
- 左メニュー「テスト」→「内部テスト」→ 新しいリリースを作成
- `android/app/build/outputs/bundle/release/app-release.aab` をアップロード
- Play App Signing は「続行」で有効化（推奨）

### ステップ4: ストアの掲載情報（下の素材をコピペ）
### ステップ5: コンテンツのレーティング / データセーフティ / 対象年齢（下記カンペ）
### ステップ6: クローズドテスト14日 → 本番リリースに昇格 → 審査提出

---

## 📋 ストア掲載情報（コピペ用）

| 項目 | 値 |
|---|---|
| アプリ名（30字以内） | BodyQuest |
| カテゴリ | 教育（または メディカル） |
| メール | 884hashiru@gmail.com |

**短い説明（80字以内）**
```
全13分野・12,000問超をゲーム感覚で。トレーナー・セラピストの学習アプリ
```

**詳しい説明（4000字以内）**
```
BodyQuest（ボディクエスト）は、パーソナルトレーナー・セラピスト・運動指導者のための、ゲーム感覚で学べる知識学習アプリです。

■ 全13分野・12,000問以上
解剖学／生理学／機能解剖／栄養学／バイオメカニクス／運動学／評価／リハビリ／東洋医学／エクササイズ技術／疼痛科学／スポーツ心理／現場・実務。基礎から応用・鑑別まで段階的に収録。

■ 続く仕組み
・XPとレベルで成長を可視化
・連続学習ストリークとデイリーゴール
・分野別マスタリーと称号コレクション
・間隔反復で苦手を自動で復習
・コンボや演出で1問ごとに達成感

■ ただ解くだけじゃない
各問題に解説と、読み物として学べる教材を用意。間違えた問題から関連する教材へジャンプして、その場で理解を深められます。図解付き。

■ オフラインで完結
すべての問題がアプリ内に。通信不要・登録不要で、いつでもどこでも学べます。学習データは端末内にのみ保存されます。

スキマ時間を、現場で使える知識に。

―――
※本アプリは学習・知識確認を目的としたものであり、医学的な診断・治療・医療行為を目的とするものではありません。臨床判断は必ず有資格者の責任のもと、最新のガイドライン等に基づいて行ってください。
```

**必須グラフィック**
- アプリアイコン（512×512）→ `assets/playstore/icon-512.png`
- フィーチャーグラフィック（1024×500）→ `assets/playstore/feature-graphic-1024x500.png`
- スマホ用スクリーンショット（最低2枚・推奨4〜8枚）→ **作成済み**: `assets/playstore/screenshots/*.png`（5枚・1080×2160・24bit PNG・Play仕様準拠）

**必須URL（App Store と同じものが使える）**
- プライバシーポリシー → `https://ryuta-fit.github.io/bodyquest-legal/privacy.html`

---

## 🧭 各種アンケートのカンペ

**データセーフティ（Data safety）**
- データ収集・共有: **なし**（端末内 localStorage のみ・外部送信なし・アカウントなし）
- → 「データを収集または共有しません」で最短通過

**コンテンツのレーティング（IARC）**
- 暴力・性的表現・ギャンブル等: すべて「なし」
- → 全年齢（3+）〜 になる想定

**対象年齢とコンテンツ**
- 主な対象は成人（トレーナー・セラピスト）。子ども向けではない → 「13歳以上」等でOK

**広告**
- 広告は含まない → 「いいえ」

---

## 📸 スクリーンショット（作成済み）

`assets/playstore/screenshots/` に5枚用意済み（iPhone 6.9"のスクショを Play 仕様=1080×2160・24bit PNG・アルファなしに変換。縦横比2:1でPlayの上限内、切り取りなしでダーク背景パディング）:
- `01_home.png` ホーム（XP/レベル/ストリーク/収録問題数）
- `02_fields.png` 分野一覧
- `03_quiz.png` クイズ出題中
- `04_answer.png` 解説
- `05_progress.png` 記録・進捗

そのまま Play Console の「スマートフォンのスクリーンショット」にアップロードすればOK。

---

## 🔁 次にビルドし直す時（バージョンアップ手順）

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@21
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export PATH="$JAVA_HOME/bin:$PATH"
cd /Users/hayashiryuta/anatomy_app
# android/app/build.gradle の versionCode を +1、versionName を更新
npm run copyweb
npx cap sync android
cd android && ./gradlew bundleRelease --no-daemon
# → android/app/build/outputs/bundle/release/app-release.aab を Play にアップ
```
