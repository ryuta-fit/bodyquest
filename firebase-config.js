/* ============================================================
   BodyQuest — Firebase configuration
   ------------------------------------------------------------
   Firebase コンソール（プロジェクトの設定 ▸ マイアプリ ▸ ウェブアプリ）
   で発行される設定値をそのまま貼り付けてください。
   ここに書く値は公開前提のクライアント識別子です（秘密鍵ではありません）。
   アクセス制御は Firestore セキュリティルール（firestore.rules）で行います。

   設定手順は FIREBASE_SETUP.md を参照。
   ============================================================ */
window.BQ_FIREBASE = {
  apiKey: "AIzaSyCB8rTinElTlgLzIcLAeEAdSdC8xZwWcw8",
  authDomain: "bodyquest-rmg728.firebaseapp.com",
  projectId: "bodyquest-rmg728",
  storageBucket: "bodyquest-rmg728.firebasestorage.app",
  messagingSenderId: "732132022952",
  appId: "1:732132022952:web:5da24a19bb85035711c09d",
};

/* 有効にするログイン方法。Firebase コンソールの Authentication ▸ Sign-in method で
   同じプロバイダを有効化してから有効にしてください。

   値の意味:
     true    … 全プラットフォームで表示
     "ios"   … iOSネイティブアプリでのみ表示（Webでは非表示）
     false   … 無効

   Apple を "ios" にしているのは、審査ガイドライン4.8によりiOSアプリでは
   Appleログインの提供が必須である一方、Web(GitHub Pages)で提供するには
   Apple Developer の Services ID とキー発行が別途必要になるため。 */
window.BQ_AUTH_PROVIDERS = {
  google: true,
  apple: "ios",   // iOSアプリのみ。Webでも出すには Services ID/Key の設定が必要
  twitter: false, // X (Twitter) Developer アプリの API キーが必要
  facebook: false,
};
