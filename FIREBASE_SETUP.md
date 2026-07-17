# BodyQuest — ログイン & ランキング セットアップ手順

ログイン（Google / Apple / X）とオンラインランキングは **Firebase Authentication + Cloud Firestore** で動いています。
サーバーの用意は不要です（無料の Spark プランで足ります）。

---

## ✅ セットアップは完了しています（2026-07-17）

| 項目 | 状態 |
|---|---|
| プロジェクト | **`bodyquest-rmg728`**（884hashiru@gmail.com / Spark プラン・無料） |
| `firebase-config.js` | 実際の設定値を書き込み済み |
| Google ログイン | 有効（公開名 `BodyQuest` / サポートメール設定済み） |
| Firestore | 作成済み（asia-northeast1 / 東京） |
| セキュリティルール | デプロイ済み（未認証アクセスの拒否を実地確認） |
| 週間ランキング用インデックス | デプロイ済み |
| 承認済みドメイン | `localhost` / `ryuta-fit.github.io` |

コンソール: https://console.firebase.google.com/project/bodyquest-rmg728

**そのまま使えます。** 以下は再構築・別プロジェクト作成・トラブル時のための資料です。

---

## ⚡ 作り直す場合：セットアップスクリプトを実行する

```bash
bash scripts/firebase-setup.sh
```

これ1本で以下が自動で終わります。

1. Firebase CLI のログイン（**ブラウザが開くので Google アカウントで承認してください** — ここだけ手作業）
2. Firebase プロジェクトの作成
3. ウェブアプリの登録 → `firebase-config.js` への設定値の書き込み
4. Firestore データベースの作成（asia-northeast1 / 東京）
5. セキュリティルールと週間ランキング用インデックスのデプロイ

終わると、残り2つのコンソール操作（**Google ログインの有効化**と**承認済みドメインの追加**、3分ほど）が URL 付きで表示されます。

> スクリプトが「プロジェクトIDが使用済み」で失敗したら、ID を指定して再実行してください:
> `bash scripts/firebase-setup.sh bodyquest-好きな名前`

以下は手動でやる場合の詳細です。

---

## 1. Firebase プロジェクトを作る

1. https://console.firebase.google.com/ を開く → 「プロジェクトを追加」
2. プロジェクト名は `bodyquest` など任意。Google アナリティクスは任意（オフでOK）

## 2. ウェブアプリを登録して設定値を貼る

1. プロジェクトのトップ → 「</>」（ウェブ）アイコンをクリック
2. アプリのニックネームに `BodyQuest Web` と入力して登録
3. 表示される `firebaseConfig` の値を **`firebase-config.js`** にコピーする

```js
window.BQ_FIREBASE = {
  apiKey: "AIza...",
  authDomain: "bodyquest-xxxx.firebaseapp.com",
  projectId: "bodyquest-xxxx",
  storageBucket: "bodyquest-xxxx.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef",
};
```

> この値は公開して問題ありません（秘密鍵ではなくプロジェクトの識別子）。
> 実際のアクセス制御は `firestore.rules` が行います。

## 3. ログイン方法を有効にする

Authentication ▸ 「始める」 ▸ Sign-in method タブ

| プロバイダ | 必要な準備 | `firebase-config.js` |
|---|---|---|
| **Google** | 有効化するだけ | `google: true` |
| **Apple** | Apple Developer Program（年 $99）＋ Sign in with Apple の Service ID / Key | `apple: true` |
| **X (Twitter)** | X Developer Portal で App 作成 → API Key / Secret | `twitter: true` |
| **Facebook** | Meta for Developers で App 作成 → App ID / Secret | `facebook: true` |

まず **Google だけ**を有効にして動かし、後から増やすのがおすすめです。
有効化したものだけ `window.BQ_AUTH_PROVIDERS` を `true` にしてください（ログイン画面のボタンが連動します）。

> **iOS アプリとして配信する場合、Apple ログインは必須**です（App Store 審査ガイドライン 4.8：他社SNSログインを提供するなら Sign in with Apple も提供すること）。

### 承認済みドメインの登録

Authentication ▸ Settings ▸ 承認済みドメイン に、公開先を追加します。

- GitHub Pages: `ryuta-fit.github.io`（あなたの Pages ドメイン）
- ローカル確認: `localhost`（初期状態で登録済み）

## 4. Firestore を作る

1. Firestore Database ▸ 「データベースの作成」
2. ロケーションは `asia-northeast1`（東京）
3. **本番環境モード**で開始
4. 「ルール」タブを開き、リポジトリの **`firestore.rules` の中身を丸ごと貼り付けて「公開」**

## 5. 週間ランキング用の複合インデックスを作る

週間ランキングは `weekKey == ○○ かつ weekXp 降順` で問い合わせるため、複合インデックスが要ります。

かんたんな方法：アプリを開いて「記録 ▸ 週間リーグ ▸ 今週」タブを表示 → ブラウザのコンソールに
`The query requires an index. You can create it here: https://...` というリンクが出るので、**それをクリックして「作成」**。
（数分で有効になります）

手動で作る場合：Firestore ▸ インデックス ▸ 複合 ▸ 「インデックスを作成」
- コレクション ID: `users`
- フィールド: `weekKey` 昇順, `weekXp` 降順
- クエリのスコープ: コレクション

---

## 動作確認

```bash
python3 -m http.server 4174     # もしくは .claude/launch.json の "bodyquest"
open "http://localhost:4174/index.html"
```

1. ログイン画面が出る → Google でログイン
2. クイズを10問解く
3. 記録 ▸ 週間リーグ → 自分が「あなた」バッジ付きで表示される
4. 別アカウント（別ブラウザ/シークレット）でも解くと、2人が並ぶ

---

## 実装メモ

| ファイル | 役割 |
|---|---|
| `firebase-config.js` | 設定値とプロバイダのオン/オフ（**ここだけ編集すればよい**） |
| `auth.js` | `window.BQAuth`（ログイン状態）と `window.BQCloud`（同期・ランキング取得） |
| `app.js` | ログインゲート（`renderLogin` / `boot`）、スコア同期（`syncCloud`）、ランキング画面（`renderLeague`） |
| `firestore.rules` | 本人だけが自分のスコアを書ける／全員が読める |

**データ構造**（`users/{uid}` 1件＝1ユーザー）

```
{ uid, name, photo, provider, lv, totalXp, weekXp, weekKey, streak, answered, accuracy, title, updatedAt }
```

- `totalXp` = 累計獲得XP（`lifetimeXp()` で算出）→ 総合ランキング
- `weekXp` / `weekKey` = 月曜始まりの週次XP → 週間ランキング
- 送信はクイズ終了時とランキング表示時のみ（1.5秒デバウンス）。無料枠で十分に収まります。

**進捗データの保存先**：`localStorage` の `bodyquest_v1:<uid>`。
アカウントごとに分離され、ログイン前の既存データは最初にログインしたアカウントへ引き継がれます。

**オフライン時**：直近のログインが残っていればアプリは通常どおり使え、ランキングだけデモ相手にフォールバックします。オンライン復帰後の次のクイズ終了時にスコアが同期されます。

---

## ネイティブアプリ（iOS / Android）— ✅ 対応済み（2026-07-17）

Capacitor の WebView ではポップアップ認証が動かないため、
[`@capacitor-firebase/authentication`](https://github.com/capawesome-team/capacitor-firebase) 8.3.0 を導入済みです。
`auth.js` は **プラグインがあれば自動でそちらを使い**（`nativeAuthPlugin()`）、
得た資格情報を JS SDK へ引き渡します（`signInWithCredential`）。

| 項目 | 状態 |
|---|---|
| プラグイン | `@capacitor-firebase/authentication@8.3.0` + `firebase@12` |
| `capacitor.config.json` | `skipNativeAuth: true` / `providers: ["google.com","apple.com"]` |
| iOS アプリ登録 | `1:732132022952:ios:21eebb300277800411c09d` |
| iOS `GoogleService-Info.plist` | 配置済み＋**Xcode の Resources ビルドフェーズに登録済み** |
| iOS URL スキーム | `Info.plist` に `REVERSED_CLIENT_ID` 登録済み |
| iOS Apple ログイン | `App.entitlements` 作成＋`CODE_SIGN_ENTITLEMENTS` 設定済み |
| Android アプリ登録 | `1:732132022952:android:c6be0ac76778044f11c09d` |
| Android `google-services.json` | 配置済み（**SHA-1 登録により `oauth_client` type 1 生成済み**） |
| Android SHA 登録 | アップロード鍵の SHA-1 / SHA-256 を登録済み |
| ビルド検証 | **Android `assembleDebug` / iOS Release とも成功** |

### ⚠️ `skipNativeAuth: true` は必須

このアプリは Firestore とランキングに **Firebase JS SDK** を使っています。
`skipNativeAuth` が `false`（既定）だとプラグインがネイティブ側だけでサインインし、
**JS SDK 側が未認証のまま**になるため、Firestore への書き込みがセキュリティルールで拒否されます。

### ⚠️ Apple ログインは iOS だけで表示している

`firebase-config.js` の `apple: "ios"` により、**iOS ネイティブでのみ** Apple ボタンを出します。

- iOS で必須な理由：審査ガイドライン **4.8**（他社SNSログインを提供するなら Apple ログインも提供すること）
- Web で出していない理由：Web の Apple ログインには Apple Developer の **Services ID とキー発行**が別途必要

Firebase コンソールでは Apple プロバイダを有効化済みです（ネイティブ iOS のみなら
「サービス ID」「OAuth コードフローの構成」は**入力不要**）。

### 🔜 ネイティブでリリースする前に必要なこと

1. **Apple Developer で App ID に「Sign In with Apple」を有効化**
   Xcode の自動署名が Archive 時に自動で有効化することが多いですが、失敗する場合は
   developer.apple.com ▸ Certificates, IDs & Profiles ▸ Identifiers ▸ `com.bodyquest.app`
   で Sign In with Apple にチェックして保存してください。
2. **Play App Signing の SHA-1 登録**（Google Play で配信する場合）
   Play にアップロードすると Google が**別の鍵で再署名**します。Play Console ▸ 設定 ▸
   アプリの署名 に表示される**アプリ署名鍵の SHA-1** も Firebase に追加登録しないと、
   ストア配信版の Google ログインだけが失敗します（開発版は通るので気づきにくい）。
   ```bash
   npx firebase-tools apps:android:sha:create 1:732132022952:android:c6be0ac76778044f11c09d <SHA1> --project bodyquest-rmg728
   npx firebase-tools apps:sdkconfig ANDROID 1:732132022952:android:c6be0ac76778044f11c09d --project bodyquest-rmg728 --out android/app/google-services.json
   ```
3. デバッグ実機で試す場合は `~/.android/debug.keystore` の SHA-1 も同様に登録。
