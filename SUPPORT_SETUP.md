# 開発者応援（応援課金）セットアップ手順

アプリ内の「💖 開発者を応援する」は **消耗型アプリ内課金（IAP）** で実装されています。
コード側は実装済みで、あとはストア側に商品を登録するだけで有効になります。
商品が未登録・読み込み失敗の間は、応援セクションはアプリに表示されません（審査対策）。

## 商品ID（iOS / Android 共通）

| 商品ID | 表示 | 目安価格 |
|---|---|---|
| `bq.support.juice` | 🧃 ジュース1本ぶん | ¥160 |
| `bq.support.small` | ☕ コーヒー1杯ぶん | ¥300 |
| `bq.support.protein` | 💪 プロテイン1杯ぶん | ¥500 |
| `bq.support.medium` | 🍱 ランチ1回ぶん | ¥800 |
| `bq.support.large` | 🚀 全力応援 | ¥2,000 |
| `bq.support.book` | 📚 専門書1冊ぶん | ¥3,000 |
| `bq.support.seminar` | 🎓 セミナー1回ぶん | ¥5,000 |
| `bq.support.legend` | 👑 レジェンド応援 | ¥10,000 |

すべて **消耗型（Consumable）**。何度でも購入でき、復元（Restore）は不要です。

お礼の称号（ミシック）は応援回数で段階アップ:
1回 💖 開発応援団 → 3回 📣 応援団長 → 10回 🏛️ 伝説のパトロン

## 実装の場所

- [support.js](support.js) — `window.BQSupport`。cordova-plugin-purchase のラッパー。
  - Web版で応援リンク（Stripe Payment Link 等）を使う場合は先頭の `WEB_URL` にURLを設定
  - localhost では実課金なしのシミュレートモードで動作確認できる
- [app.js](app.js) — `renderSupport()`（応援画面）、称号 `supporter`（💖 開発応援団・ミシック）、設定/記録画面の入口カード
- プラグイン: `cordova-plugin-purchase`（package.json に追加済み・`npx cap sync` 済み）

## App Store Connect（iOS）

1. **契約**: App Store Connect → 「契約」で有料アプリ（Paid Apps）契約に同意（銀行口座・税務情報を登録）
2. **商品作成**: 対象アプリ → 「収益化 > App内課金」→「＋」
   - タイプ: **消耗型**
   - 商品ID: 上記の3つ（`bq.support.small` など）※後から変更不可
   - 参照名: 「応援（小）」など任意
   - 価格: ¥300 / ¥800 / ¥2,000（近い価格ポイントを選択）
   - 表示名・説明（日本語）: 例「コーヒー1杯ぶんの応援」「開発者への応援チップです」
   - 審査用スクリーンショット: 応援画面のスクショを添付
3. **審査提出**: App内課金は**アプリの新バージョンと一緒に**提出する（バージョンページの「App内課金」欄で3商品を選択）
4. **テスト**: Sandboxテスターアカウント（App Store Connect → ユーザとアクセス → Sandbox）でTestFlightから購入テスト

## Google Play Console（Android）

1. **前提**: 署名済みAABを一度アップロードしてから（内部テストでOK）でないとIAP商品を作成できない
2. **商品作成**: 対象アプリ → 「収益化 > アプリ内アイテム」→「アイテムを作成」
   - 商品ID: 上記の3つ / 消耗はアプリ側で `finish()` 済みなので「管理対象アイテム」でOK
   - 名前・説明・価格を設定して「有効化」
3. **権限**: `com.android.vending.BILLING` はプラグインがマニフェストに自動追加
4. **テスト**: 「設定 > ライセンステスト」にテスターのGmailを追加 → 内部テスト版で購入テスト（テスターは課金されない）

## 動作の仕組み

- 購入成功 → ローカルの `S.support.count` を加算 → 称号「💖 開発応援団」（ミシック）を付与・自動装備 → お礼の演出
- レシート検証サーバは使わない（チップ用途のため `approved → finish` で完結）
- 購入途中でアプリが落ちた場合も、次回起動時にストアから届く取引を `onThanks` で拾って記録する

## 残タスク

- [ ] App Store Connect で3商品を作成し、次回バージョンと一緒に審査提出
- [ ] Play Console 登録（$25）→ AABアップロード → 3商品を作成
- [ ] （任意）Web版用に Stripe Payment Link を作成して `support.js` の `WEB_URL` に設定
