/* ============================================================
   BodyQuest — 開発者応援（tip jar）
   ------------------------------------------------------------
   window.BQSupport … 応援課金（消耗型IAP）の薄いラッパー

   ・ネイティブ(iOS/Android): cordova-plugin-purchase (CdvPurchase)
     を使う。App Store 審査ガイドライン 3.2.1(vii) により、開発者への
     チップはIAP（消耗型）で提供する必要がある。
   ・Web: WEB_URL に決済リンク（Stripe Payment Link 等）を設定した
     ときだけ外部リンクとして表示。未設定なら非表示。
   ・localhost 開発時: ストア無しで購入フローをシミュレートできる。

   ストア側の商品登録手順は SUPPORT_SETUP.md を参照。
   ============================================================ */
(function () {
  "use strict";

  // Web版で応援リンク（Stripe Payment Link / Buy Me a Coffee 等）を
  // 使う場合はここにURLを設定する。空ならWeb版では非表示。
  const WEB_URL = "";

  // ストアに登録する消耗型プロダクト（iOS/Android 共通ID）。
  // 価格はストア側で設定し、取得できたら表示を差し替える。
  const TIERS = [
    { id: "bq.support.juice",   emoji: "🧃", label: "ジュース1本ぶん",   desc: "休憩のおともに",             price: "¥160" },
    { id: "bq.support.small",   emoji: "☕", label: "コーヒー1杯ぶん",   desc: "ちょっとした差し入れに",     price: "¥300" },
    { id: "bq.support.protein", emoji: "💪", label: "プロテイン1杯ぶん", desc: "開発の筋肉に栄養補給",       price: "¥500" },
    { id: "bq.support.medium",  emoji: "🍱", label: "ランチ1回ぶん",     desc: "しっかり応援したい方に",     price: "¥800" },
    { id: "bq.support.large",   emoji: "🚀", label: "全力応援",           desc: "開発がとても加速します",     price: "¥2,000" },
    { id: "bq.support.book",    emoji: "📚", label: "専門書1冊ぶん",     desc: "新しい問題・教材の源に",     price: "¥3,000" },
    { id: "bq.support.seminar", emoji: "🎓", label: "セミナー1回ぶん",   desc: "大応援！頭が上がりません",   price: "¥5,000" },
    { id: "bq.support.legend",  emoji: "👑", label: "レジェンド応援",     desc: "殿堂入りの応援。一生忘れません", price: "¥10,000" },
  ];

  let mode = "none";      // none | store | web | dev
  let storeReady = false; // store.initialize 完了済みか
  const pending = {};     // productId -> {resolve, reject}（購入完了待ち）
  let thanksCb = null;    // 待ち受けの無い finished 取引（再起動後の復元など）

  function isNative() { return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); }
  function isLocalhost() { return /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname); }
  function err(code, msg) { const e = new Error(msg || code); e.code = code; return e; }

  function initStore() {
    mode = "store";
    const CP = window.CdvPurchase;
    const platform = (window.Capacitor.getPlatform() === "ios")
      ? CP.Platform.APPLE_APPSTORE : CP.Platform.GOOGLE_PLAY;
    CP.store.register(TIERS.map(t => ({ id: t.id, type: CP.ProductType.CONSUMABLE, platform })));
    CP.store.when()
      .approved(tx => tx.finish()) // チップなのでレシート検証サーバは使わない
      .finished(tx => {
        (tx.products || []).forEach(p => {
          const w = pending[p.id];
          if (w) { delete pending[p.id]; w.resolve({ ok: true }); }
          else if (thanksCb) { try { thanksCb(p.id); } catch (e) {} } // 中断後の復元ぶん
        });
      });
    CP.store.initialize([platform])
      .then(() => { storeReady = true; })
      .catch(() => { storeReady = false; });
  }

  function init() {
    if (isNative()) { if (window.CdvPurchase) initStore(); return; }
    if (WEB_URL) { mode = "web"; return; }
    if (isLocalhost()) { mode = "dev"; return; }
  }

  // 応援セクションを表示してよいか。ストア初期化に失敗している間は
  // 非表示にして、壊れた購入ボタンをユーザー（と審査員）に見せない。
  function visible() {
    if (mode === "store") return storeReady && TIERS.some(t => !!liveProduct(t.id));
    return mode === "web" || mode === "dev";
  }

  function liveProduct(id) {
    try {
      const p = window.CdvPurchase && CdvPurchase.store.get(id);
      return (p && p.getOffer()) ? p : null;
    } catch (e) { return null; }
  }

  // 表示用ティア一覧（ストアから取れた実価格で上書き）
  function tiers() {
    return TIERS.map(t => {
      let price = t.price;
      if (mode === "store") {
        const p = liveProduct(t.id);
        if (p && p.pricing && p.pricing.price) price = p.pricing.price;
      }
      return { id: t.id, emoji: t.emoji, label: t.label, desc: t.desc, price };
    });
  }

  // 購入。成功で resolve({ok:true})。
  // 失敗は e.code: cancelled（ユーザー都合）/ external（外部リンクへ誘導）/ unavailable / failed
  async function buy(id) {
    if (mode === "dev") {
      await new Promise(r => setTimeout(r, 400));
      if (!confirm("【開発モード】購入をシミュレートしますか？\n（実際の課金は発生しません）")) throw err("cancelled");
      return { ok: true, simulated: true };
    }
    if (mode === "web") {
      window.open(WEB_URL, "_blank", "noopener");
      throw err("external"); // 決済完了はアプリからは検知できない
    }
    if (mode !== "store" || !storeReady) throw err("unavailable");
    const product = liveProduct(id);
    const offer = product && product.getOffer();
    if (!offer) throw err("unavailable");
    return new Promise((resolve, reject) => {
      pending[id] = { resolve, reject };
      offer.order().then(e => {
        // order() はエラー時のみ値を返す。成功時は approved→finished で解決される。
        if (e) {
          delete pending[id];
          const cancelled = window.CdvPurchase && e.code === CdvPurchase.ErrorCode.PAYMENT_CANCELLED;
          reject(err(cancelled ? "cancelled" : "failed", e.message));
        }
      }).catch(x => { delete pending[id]; reject(err("failed", x && x.message)); });
    });
  }

  window.BQSupport = {
    get mode() { return mode; },
    visible, tiers, buy,
    onThanks(fn) { thanksCb = fn; },
  };

  if (document.readyState === "complete" || document.readyState === "interactive") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
