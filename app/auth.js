/* ============================================================
   BodyQuest — Auth + Cloud (Firebase)
   ------------------------------------------------------------
   window.BQAuth  … ログイン状態とサインイン/アウト
   window.BQCloud … プロフィール同期とランキング取得

   Firebase JS SDK は CDN から動的 import する（ビルド不要を維持するため）。
   SDK が読めない/未設定のときは disabled 状態で起動し、
   アプリ側はローカルのみのデモモードにフォールバックする。
   ============================================================ */
(function () {
  "use strict";

  const SDK = "https://www.gstatic.com/firebasejs/10.12.2";
  const CACHE_KEY = "bodyquest_user_v1"; // 最後にログインしたユーザー（オフライン起動用）

  const cfg = window.BQ_FIREBASE || {};
  const providersOn = window.BQ_AUTH_PROVIDERS || {};
  const configured = !!(cfg.apiKey && cfg.projectId && cfg.appId);

  let fb = null;          // { app, auth, db, mod:{...} }
  let user = null;        // { uid, name, photo, provider }
  let status = "loading"; // loading | signed-in | signed-out | disabled
  let reason = "";        // disabled の理由（UI表示用）
  const listeners = [];
  let readyResolve;
  const readyPromise = new Promise(r => (readyResolve = r));

  function cachedUser() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || null; } catch (e) { return null; }
  }
  function cacheUser(u) {
    try {
      if (u) localStorage.setItem(CACHE_KEY, JSON.stringify(u));
      else localStorage.removeItem(CACHE_KEY);
    } catch (e) {}
  }
  function emit() { listeners.forEach(fn => { try { fn(user, status); } catch (e) {} }); }
  function setState(u, st) { user = u; status = st; cacheUser(u); emit(); }

  function isNative() {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  }
  function platform() {
    return (window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform()) || "web";
  }
  // Capacitor ネイティブでは WebView のポップアップ認証が使えないため、
  // @capacitor-firebase/authentication プラグインが入っていればそれを使う。
  function nativeAuthPlugin() {
    const p = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.FirebaseAuthentication;
    return (isNative() && p) ? p : null;
  }

  async function init() {
    if (!configured) {
      reason = "Firebase が未設定です（firebase-config.js）";
      setState(null, "disabled"); readyResolve({ user, status }); return;
    }
    try {
      const [appMod, authMod, dbMod] = await Promise.all([
        import(`${SDK}/firebase-app.js`),
        import(`${SDK}/firebase-auth.js`),
        import(`${SDK}/firebase-firestore.js`),
      ]);
      const app = appMod.initializeApp(cfg);
      const auth = authMod.getAuth(app);
      const db = dbMod.getFirestore(app);
      await authMod.setPersistence(auth, authMod.browserLocalPersistence).catch(() => {});
      fb = { app, auth, db, a: authMod, d: dbMod };

      // リダイレクト方式でサインインした場合の復帰処理
      authMod.getRedirectResult(auth).catch(() => {});

      authMod.onAuthStateChanged(auth, u => {
        if (u) setState({ uid: u.uid, name: u.displayName || "名無しトレーナー", photo: u.photoURL || "", provider: (u.providerData[0] || {}).providerId || "" }, "signed-in");
        else setState(null, "signed-out");
        readyResolve({ user, status });
      });
    } catch (e) {
      // ネットワーク不通など。前回ログインが残っていればオフライン継続を許可する。
      const c = cachedUser();
      reason = "オンライン接続を確認できませんでした";
      if (c) { user = c; status = "signed-in"; }
      else { user = null; status = "disabled"; }
      emit(); readyResolve({ user, status });
    }
  }

  const PROVIDER_META = {
    google:   { id: "google.com",   label: "Google でログイン",   emoji: "🔵" },
    apple:    { id: "apple.com",    label: "Apple でログイン",    emoji: "" },
    twitter:  { id: "twitter.com",  label: "X (Twitter) でログイン", emoji: "𝕏" },
    facebook: { id: "facebook.com", label: "Facebook でログイン", emoji: "📘" },
  };

  // providersOn の値: true=全環境 / "ios"|"android"|"web"=そのプラットフォームのみ / false=無効
  function enabledProviders() {
    const p = platform();
    return Object.keys(PROVIDER_META).filter(k => {
      const v = providersOn[k];
      if (v === true) return true;
      if (typeof v === "string") return v === p;
      return false;
    });
  }

  function buildProvider(key) {
    const a = fb.a;
    if (key === "google") return new a.GoogleAuthProvider();
    if (key === "apple") { const p = new a.OAuthProvider("apple.com"); p.addScope("email"); p.addScope("name"); return p; }
    if (key === "twitter") return new a.TwitterAuthProvider();
    if (key === "facebook") return new a.FacebookAuthProvider();
    throw new Error("unknown provider: " + key);
  }

  async function signIn(key) {
    const np = nativeAuthPlugin();
    if (np) {
      // ネイティブ側でサインイン（capacitor.config.json の skipNativeAuth:true により
      // プラグインは資格情報を返すだけ）→ それを JS SDK に引き渡して認証状態を確立する。
      // JS SDK 側にサインインしないと Firestore の書き込みがルールで弾かれる。
      if (!fb) throw new Error("ログイン機能を初期化できませんでした。通信環境をご確認ください。");
      const fn = { google: "signInWithGoogle", apple: "signInWithApple", twitter: "signInWithTwitter", facebook: "signInWithFacebook" }[key];
      if (!np[fn]) throw new Error("このプロバイダはこの端末では利用できません: " + key);
      const out = await np[fn]();
      const t = out && out.credential;
      if (!t) throw new Error("認証情報を取得できませんでした");
      const a = fb.a;
      let cred = null;
      if (key === "google") cred = a.GoogleAuthProvider.credential(t.idToken, t.accessToken);
      else if (key === "apple") cred = new a.OAuthProvider("apple.com").credential({ idToken: t.idToken, rawNonce: t.nonce });
      else if (key === "twitter") cred = a.TwitterAuthProvider.credential(t.accessToken, t.secret);
      else if (key === "facebook") cred = a.FacebookAuthProvider.credential(t.accessToken);
      if (!cred) throw new Error("認証情報を組み立てられませんでした: " + key);
      await a.signInWithCredential(fb.auth, cred);
      return;
    }
    if (!fb) throw new Error(reason || "ログイン機能を初期化できませんでした");
    const provider = buildProvider(key);
    try {
      await fb.a.signInWithPopup(fb.auth, provider);
    } catch (e) {
      // ポップアップがブロックされる環境（アプリ内ブラウザ等）ではリダイレクトへ
      const code = e && e.code || "";
      if (/popup-blocked|popup-closed-by-user|operation-not-supported/.test(code)) {
        await fb.a.signInWithRedirect(fb.auth, provider);
        return;
      }
      throw e;
    }
  }

  async function signOut() {
    const np = nativeAuthPlugin();
    if (np) { try { await np.signOut(); } catch (e) {} }
    if (fb) await fb.a.signOut(fb.auth);
    setState(null, "signed-out");
  }

  // アカウントを完全に削除する（ランキング上の記録 → 認証アカウントの順）。
  // App Store 審査ガイドライン 5.1.1(v) により、アカウント作成を提供するアプリは
  // アプリ内からのアカウント削除も提供する必要がある。
  async function deleteAccount() {
    if (!fb || !fb.auth.currentUser) throw new Error("ログインしていません");
    const uid = fb.auth.currentUser.uid;
    // 1. ランキングのドキュメントを先に消す（認証が切れると消せなくなるため）
    try {
      const { doc, deleteDoc } = fb.d;
      await deleteDoc(doc(fb.db, COL, uid));
    } catch (e) { /* 既に無い場合は無視 */ }
    // 2. 認証アカウントを削除。最終ログインから時間が経つと再認証が要求される
    try {
      await fb.a.deleteUser(fb.auth.currentUser);
    } catch (e) {
      if (e && e.code === "auth/requires-recent-login") {
        const err = new Error("セキュリティのため、いちど再ログインしてから削除してください");
        err.code = e.code;
        throw err;
      }
      throw e;
    }
    // 3. 端末に残る学習データも消す
    try {
      localStorage.removeItem("bodyquest_v1:" + uid);
      if (localStorage.getItem("bodyquest_owner_v1") === uid) {
        localStorage.removeItem("bodyquest_owner_v1");
        localStorage.removeItem("bodyquest_v1");
      }
    } catch (e) {}
    const np = nativeAuthPlugin();
    if (np) { try { await np.signOut(); } catch (e) {} }
    setState(null, "signed-out");
  }

  window.BQAuth = {
    ready: () => readyPromise,
    onChange(fn) { listeners.push(fn); if (status !== "loading") fn(user, status); },
    get user() { return user; },
    get status() { return status; },
    get reason() { return reason; },
    get configured() { return configured; },
    enabledProviders,
    providerMeta: PROVIDER_META,
    signIn, signOut, deleteAccount,
  };

  /* ============================================================
     CLOUD — プロフィール同期とランキング
     ============================================================ */
  const COL = "users";
  let lastPush = 0, pushTimer = null, pendingProfile = null;

  function online() { return !!(fb && user && status === "signed-in"); }

  // 自分のスコアを users/{uid} に upsert する（1.5秒デバウンス）
  function pushProfile(p) {
    pendingProfile = p;
    if (!online()) return;
    if (pushTimer) return;
    const wait = Math.max(0, 1500 - (Date.now() - lastPush));
    pushTimer = setTimeout(async () => {
      pushTimer = null; lastPush = Date.now();
      const data = pendingProfile; pendingProfile = null;
      if (!data || !online()) return;
      try {
        const { doc, setDoc, serverTimestamp } = fb.d;
        await setDoc(doc(fb.db, COL, user.uid), Object.assign({
          uid: user.uid,
          photo: user.photo || "",
          provider: user.provider || "",
          updatedAt: serverTimestamp(),
        }, data), { merge: true });
      } catch (e) { /* オフライン等は次回の更新でまとめて送られる */ }
    }, wait);
  }

  async function fetchLeaderboard(kind, weekKey, max) {
    if (!online()) return null;
    const { collection, query, orderBy, limit, where, getDocs } = fb.d;
    const base = collection(fb.db, COL);
    const q = kind === "week"
      ? query(base, where("weekKey", "==", weekKey), orderBy("weekXp", "desc"), limit(max || 50))
      : query(base, orderBy("totalXp", "desc"), limit(max || 50));
    const snap = await getDocs(q);
    const rows = [];
    snap.forEach(d => rows.push(d.data()));
    return rows;
  }

  async function fetchMyDoc() {
    if (!online()) return null;
    const { doc, getDoc } = fb.d;
    const snap = await getDoc(doc(fb.db, COL, user.uid));
    return snap.exists() ? snap.data() : null;
  }

  window.BQCloud = { get online() { return online(); }, pushProfile, fetchLeaderboard, fetchMyDoc };

  init();
})();
