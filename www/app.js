/* ============================================================
   BodyQuest — gamified learning engine for trainers/therapists
   Vanilla JS, no build. State persisted in localStorage.
   ============================================================ */
(function () {
  "use strict";

  const FIELDS = window.QUIZ_FIELDS;
  const CONTENT = window.QUIZ_CONTENT || {};
  const DIFF = window.QUIZ_DIFF;
  const SAVE_KEY = "bodyquest_v1";
  const DAILY_GOAL = 30; // XP target per day

  /* ---------- State ---------- */
  const defaultState = () => ({
    xp: 0, lv: 1, streak: 0, hearts: 5, heartsTs: Date.now(),
    lastPlay: null, dailyXp: 0, dailyDate: today(),
    totalAnswered: 0, totalCorrect: 0, perfectRuns: 0,
    bestCombo: 0,       // longest correct streak within a session
    fieldStats: {},     // key -> {seen:Set-ish obj, correct, answered}
    seen: {},           // questionId -> {n:timesSeen, c:timesCorrect, due:ts, ease}
    badges: {},         // badgeId -> earned timestamp
    title: null,        // equipped 称号 id (null = level rank)
    onboarded: false,   // first-run tutorial shown?
    weekXp: 0, weekKey: null, lastWeekRank: null, // weekly league
    settings: { sound: true, haptics: true, reduceMotion: false, dailyGoal: 30, fontScale: 1 },
  });

  let S = load();

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!raw) return defaultState();
      const d = Object.assign(defaultState(), raw);
      return d;
    } catch (e) { return defaultState(); }
  }
  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }

  /* ---------- Helpers ---------- */
  function today() { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function el(html) { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstChild; }
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }
  function xpForLv(lv) { return 50 + (lv - 1) * 40; } // XP needed to clear a level
  function allQuestions() { let out = []; FIELDS.forEach(f => { (CONTENT[f.key] || []).forEach(q => out.push(Object.assign({ field: f.key }, q))); }); return out; }
  function fieldQuestions(k) { return (CONTENT[k] || []).map(q => Object.assign({ field: k }, q)); }

  /* ============================================================
     TITLES & BADGES  (称号)
     ============================================================ */
  // Always-on rank derived from level (baseline title).
  const RANKS = [
    { lv: 1,  emoji: "🌱", label: "見習いトレーナー" },
    { lv: 3,  emoji: "🔰", label: "ルーキー" },
    { lv: 5,  emoji: "🧢", label: "フィールドコーチ" },
    { lv: 8,  emoji: "💼", label: "シニアトレーナー" },
    { lv: 12, emoji: "⭐", label: "エキスパート" },
    { lv: 17, emoji: "🥋", label: "スペシャリスト" },
    { lv: 22, emoji: "🏆", label: "マスター" },
    { lv: 28, emoji: "💎", label: "エリートマスター" },
    { lv: 35, emoji: "👑", label: "グランドマスター" },
    { lv: 45, emoji: "🌟", label: "レジェンド" },
  ];
  function currentRank() { let r = RANKS[0]; for (const x of RANKS) if (S.lv >= x.lv) r = x; return r; }
  function nextRank() { for (const x of RANKS) if (S.lv < x.lv) return x; return null; }

  // Rarity tiers — drive frame color, glow & sort order.
  const RARITY = {
    common:    { label: "コモン",       color: "#9aa3b2", order: 0 },
    rare:      { label: "レア",         color: "#4f8ef0", order: 1 },
    epic:      { label: "エピック",     color: "#b06ef0", order: 2 },
    legendary: { label: "レジェンダリー", color: "#ffb300", order: 3 },
    mythic:    { label: "ミシック",     color: "#ff5d8f", order: 4 },
  };

  // Earnable 称号. Each: {id, cat, emoji, label, desc, color?, earned()}
  const FIELD_TIERS = [
    { n: 10, t: "初級", e: "🥉" }, { n: 25, t: "中級", e: "🥈" },
    { n: 50, t: "上級", e: "🥇" }, { n: 80, t: "師範", e: "🎖️" },
  ];
  const TIER_RARITY = ["common", "rare", "epic", "legendary"]; // index by milestone position
  function buildBadges() {
    const list = [];
    // Level milestones
    [[5, "common"], [10, "rare"], [15, "rare"], [20, "epic"], [30, "legendary"], [45, "mythic"]].forEach(([lv, rar]) =>
      list.push({ id: "lv" + lv, cat: "レベル", emoji: "⭐", rar, label: "Lv." + lv + " 到達", desc: "レベル" + lv + "に到達する", earned: () => S.lv >= lv }));
    // Per-field mastery titles
    FIELDS.forEach(f => {
      FIELD_TIERS.forEach((ft, i) =>
        list.push({ id: f.key + "_" + ft.n, cat: f.label, emoji: ft.e, color: f.color, rar: TIER_RARITY[i],
          label: f.label + " " + ft.t, desc: f.label + "を" + ft.n + "問習得する",
          earned: () => fieldProgress(f.key).mastered >= ft.n }));
      list.push({ id: f.key + "_master", cat: f.label, emoji: "👑", color: f.color, rar: "legendary",
        label: f.label + " 達人", desc: f.label + "を全問習得する",
        earned: () => { const p = fieldProgress(f.key); return p.total > 0 && p.mastered >= p.total; } });
    });
    // Streak
    [[3, "common"], [7, "rare"], [14, "epic"], [30, "legendary"]].forEach(([d, rar]) =>
      list.push({ id: "streak" + d, cat: "継続", emoji: "🔥", rar, label: d + "日連続", desc: d + "日連続で学習する", earned: () => S.streak >= d }));
    // Volume
    [[100, "common"], [300, "rare"], [500, "epic"], [1000, "legendary"]].forEach(([n, rar]) =>
      list.push({ id: "ans" + n, cat: "回答数", emoji: "📚", rar, label: "回答 " + n, desc: "累計" + n + "問に回答する", earned: () => S.totalAnswered >= n }));
    // Combo
    [[5, "common"], [10, "rare"], [20, "epic"]].forEach(([n, rar]) =>
      list.push({ id: "combo" + n, cat: "コンボ", emoji: "⚡", rar, label: n + "コンボ", desc: "1回のクイズで" + n + "問連続正解する", earned: () => S.bestCombo >= n }));
    // Special
    list.push({ id: "perfect", cat: "特別", emoji: "💯", rar: "rare", label: "パーフェクト", desc: "10問テストで全問正解する", earned: () => S.perfectRuns > 0 });
    list.push({ id: "allround", cat: "特別", emoji: "🌈", rar: "epic", label: "オールラウンダー", desc: "全分野で10問以上習得する", earned: () => FIELDS.every(f => fieldProgress(f.key).mastered >= 10) });
    list.push({ id: "grandmaster", cat: "特別", emoji: "🏅", rar: "mythic", label: "全知の探究者", desc: "全分野を達人にする", earned: () => FIELDS.every(f => { const p = fieldProgress(f.key); return p.total > 0 && p.mastered >= p.total; }) });
    return list;
  }
  function badgeById(id) { return buildBadges().find(b => b.id === id); }

  // Award any newly-earned badges; returns array of newly earned badge objects.
  function checkBadges() {
    const newly = [];
    buildBadges().forEach(b => {
      if (!S.badges[b.id] && b.earned()) { S.badges[b.id] = Date.now(); newly.push(b); }
    });
    if (newly.length) save();
    return newly;
  }

  // The title to display (equipped 称号 if earned, else level rank).
  function equippedTitle() {
    if (S.title && S.badges[S.title]) { const b = badgeById(S.title); if (b) return { emoji: b.emoji, label: b.label, color: b.color }; }
    const r = currentRank(); return { emoji: r.emoji, label: r.label };
  }

  function regenDaily() {
    if (S.dailyDate !== today()) { S.dailyDate = today(); S.dailyXp = 0; }
  }
  function regenHearts() {
    if (S.hearts >= 5) { S.heartsTs = Date.now(); return; }
    const REGEN = 1000 * 60 * 20; // 20min per heart
    const gained = Math.floor((Date.now() - S.heartsTs) / REGEN);
    if (gained > 0) { S.hearts = Math.min(5, S.hearts + gained); S.heartsTs = Date.now(); }
  }

  /* ---------- Weekly league ---------- */
  function weekInfo() {
    const now = new Date();
    const d = new Date(now); const day = (d.getDay() + 6) % 7; // Mon=0
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day, 0, 0, 0);
    const end = start.getTime() + 7 * 86400000;
    const key = start.getFullYear() + "-" + (start.getMonth() + 1) + "-" + start.getDate();
    const frac = Math.min(1, Math.max(0.02, (now.getTime() - start.getTime()) / (end - start)));
    return { key, start: start.getTime(), end, frac };
  }
  function regenWeek() {
    const w = weekInfo();
    if (S.weekKey !== w.key) { S.weekKey = w.key; S.weekXp = 0; }
  }
  // Deterministic pseudo-random from a string seed.
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0); }
  const RIVAL_NAMES = ["カイ", "ミナ", "リョウ", "サキ", "ジン", "アオイ", "ハル", "ノア", "ユウ", "レン", "マコ", "エマ"];
  function leagueRivals() {
    const w = weekInfo();
    const rivals = [];
    const used = {};
    for (let i = 0; i < 7; i++) {
      const seed = hashStr(w.key + ":" + i);
      let ni = seed % RIVAL_NAMES.length; while (used[ni]) ni = (ni + 1) % RIVAL_NAMES.length; used[ni] = 1;
      const name = RIVAL_NAMES[ni];
      const pace = 120 + (seed % 380);              // weekly target XP
      const noise = ((seed >>> 5) % 25) / 100;      // per-rival progress jitter (unsigned!)
      const xp = Math.max(3, Math.round(pace * Math.min(1, w.frac * (0.7 + noise))));
      rivals.push({ name: name + "さん", xp, bot: true });
    }
    return rivals;
  }
  function leagueTier() {
    const lv = S.lv;
    if (lv >= 25) return { name: "ダイヤ", emoji: "💎", color: "#6fd3e6" };
    if (lv >= 17) return { name: "プラチナ", emoji: "🛡️", color: "#9fb4c8" };
    if (lv >= 10) return { name: "ゴールド", emoji: "🥇", color: "#ffd24a" };
    if (lv >= 5) return { name: "シルバー", emoji: "🥈", color: "#c8d0db" };
    return { name: "ブロンズ", emoji: "🥉", color: "#cd8b5b" };
  }

  /* ---------- XP / Level ---------- */
  function addXp(n) {
    regenWeek();
    S.xp += n; S.dailyXp += n; S.weekXp += n;
    let leveled = false;
    while (S.xp >= xpForLv(S.lv)) { S.xp -= xpForLv(S.lv); S.lv++; leveled = true; }
    return leveled;
  }

  /* ---------- Topbar ---------- */
  function renderTopbar() {
    regenDaily(); regenHearts(); regenWeek();
    $("#topbar").classList.remove("hidden");
    $("#nav").classList.remove("hidden");
    $("#tbStreak").textContent = `🔥 ${S.streak}`;
    $("#tbLv").textContent = `Lv.${S.lv}`;
    $("#tbHearts").textContent = `❤️ ${S.hearts}`;
    $("#tbXpFill").style.width = Math.min(100, (S.xp / xpForLv(S.lv)) * 100) + "%";
  }

  function toast(msg) {
    const t = el(`<div class="toast">${msg}</div>`);
    document.body.appendChild(t); setTimeout(() => t.remove(), 2400);
  }

  /* ============================================================
     FEEDBACK FX — sound, haptics, confetti, celebration overlay
     ============================================================ */
  function motionOK() { return !(S.settings && S.settings.reduceMotion) && !(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); }
  // Apply accessibility prefs (font scale, reduce-motion) to <body>.
  function applyA11y() {
    const fs = (S.settings && S.settings.fontScale) || 1;
    document.body.classList.toggle("fs-2", fs === 2);
    document.body.classList.toggle("fs-3", fs === 3);
    document.body.classList.toggle("reduce-motion", !!(S.settings && S.settings.reduceMotion));
  }
  let _actx = null;
  function audioCtx() { if (!_actx) { try { _actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { _actx = null; } } return _actx; }
  // Simple synth tones. kind: correct/wrong/level/badge/tap
  function sfx(kind) {
    if (!S.settings || !S.settings.sound) return;
    const ctx = audioCtx(); if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();
    const seq = {
      correct: [[660, 0, .09], [880, .08, .12]],
      wrong:   [[200, 0, .18]],
      level:   [[523, 0, .12], [659, .12, .12], [784, .24, .18]],
      badge:   [[784, 0, .1], [988, .1, .1], [1319, .2, .22]],
      tap:     [[440, 0, .04]],
    }[kind] || [];
    seq.forEach(([freq, t0, dur]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = kind === "wrong" ? "sawtooth" : "sine"; o.frequency.value = freq;
      const start = ctx.currentTime + t0;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(0.18, start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      o.connect(g); g.connect(ctx.destination); o.start(start); o.stop(start + dur + 0.02);
    });
  }
  function haptic(ms) { if (S.settings && S.settings.haptics && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } }

  function confettiBurst(colors) {
    if (!motionOK()) return;
    const layer = el(`<div class="confetti"></div>`);
    document.body.appendChild(layer);
    const cols = colors || ["#ffd24a", "#4f8ef0", "#4caf72", "#e25555", "#b06ef0", "#ff5d8f"];
    for (let i = 0; i < 46; i++) {
      const p = document.createElement("i");
      const left = Math.random() * 100, delay = Math.random() * 0.25, dur = 0.9 + Math.random() * 0.9;
      const size = 6 + Math.random() * 7, rot = Math.random() * 360;
      p.style.cssText = `left:${left}%;width:${size}px;height:${size * 1.4}px;background:${cols[i % cols.length]};` +
        `animation-delay:${delay}s;animation-duration:${dur}s;transform:rotate(${rot}deg)`;
      layer.appendChild(p);
    }
    setTimeout(() => layer.remove(), 2600);
  }

  // Full-screen celebration. opts: {emoji,title,sub,color,badges:[],rarity}
  function celebrate(opts) {
    return new Promise(resolve => {
      sfx(opts.sound || "badge"); haptic([0, 40, 30, 60]);
      confettiBurst(opts.colors);
      const rarCol = opts.rarity ? RARITY[opts.rarity].color : (opts.color || "#ffd24a");
      const badgesHtml = (opts.badges || []).map(b => `
        <div class="cel-badge rar-${b.rar || 'common'}">
          <span class="cel-badge-emoji">${b.emoji}</span>
          <div style="flex:1;text-align:left"><b>${b.label}</b>
            <div class="muted" style="font-size:11px">${b.desc}</div></div>
          <span class="rar-tag" style="background:${RARITY[b.rar || 'common'].color}22;color:${RARITY[b.rar || 'common'].color}">${RARITY[b.rar || 'common'].label}</span>
        </div>`).join("");
      const ov = el(`
        <div class="cel-overlay" role="dialog" aria-modal="true" aria-label="${opts.title || "お知らせ"}">
          <div class="cel-card" style="--rar:${rarCol}">
            <div class="cel-emoji">${opts.emoji || "🎉"}</div>
            <div class="cel-title" style="color:${rarCol}">${opts.title || ""}</div>
            ${opts.sub ? `<div class="cel-sub">${opts.sub}</div>` : ""}
            ${badgesHtml ? `<div class="cel-badges">${badgesHtml}</div>` : ""}
            <button class="btn lg" id="celOk">つづける</button>
          </div>
        </div>`);
      document.body.appendChild(ov);
      const okBtn = $("#celOk", ov); setTimeout(() => okBtn.focus(), 30);
      const close = () => { document.removeEventListener("keydown", onEsc); ov.remove(); resolve(); };
      function onEsc(e) { if (e.key === "Escape" || e.key === "Enter") { e.preventDefault(); close(); } }
      document.addEventListener("keydown", onEsc);
      okBtn.addEventListener("click", close);
      ov.addEventListener("click", e => { if (e.target === ov) close(); });
    });
  }

  /* ============================================================
     ROUTER
     ============================================================ */
  let route = "home";
  function go(r) {
    if (r !== "learn") cleanupLearn();
    route = r; save();
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.route === r));
    renderTopbar();
    const s = $("#screen"); s.scrollTop = 0;
    if (r === "home") renderHome(s);
    else if (r === "fields") renderFields(s);
    else if (r === "learn") renderLearn(s);
    else if (r === "review") renderReview(s);
    else if (r === "stats") renderStats(s);
  }
  document.querySelectorAll(".nav-btn").forEach(b => b.addEventListener("click", () => go(b.dataset.route)));

  /* ============================================================
     HOME
     ============================================================ */
  function weakestField() {
    let cand = null;
    FIELDS.forEach(f => {
      const fs = S.fieldStats[f.key];
      if (fs && fs.answered >= 3) { const a = fs.correct / fs.answered; if (!cand || a < cand.acc) cand = { f, acc: a }; }
    });
    if (cand) return cand;
    // nobody attempted enough → suggest least-progressed field
    let least = null;
    FIELDS.forEach(f => { const p = fieldProgress(f.key); const r = p.total ? p.mastered / p.total : 0; if (!least || r < least.r) least = { f, r }; });
    return least ? { f: least.f, acc: null } : null;
  }
  function heartTimerText() {
    if (S.hearts >= 5) return "満タン";
    const REGEN = 1000 * 60 * 20;
    const ms = REGEN - ((Date.now() - S.heartsTs) % REGEN);
    const m = Math.floor(ms / 60000), sec = Math.floor((ms % 60000) / 1000);
    return `次の❤️まで ${m}:${String(sec).padStart(2, "0")}`;
  }

  let _heartTimer = null;
  function renderHome(s) {
    if (_heartTimer) { clearInterval(_heartTimer); _heartTimer = null; }
    const goal = (S.settings && S.settings.dailyGoal) || DAILY_GOAL;
    const pct = Math.min(100, Math.round((S.dailyXp / goal) * 100));
    const r = 28, c = 2 * Math.PI * r, off = c * (1 - pct / 100);
    const totalQ = allQuestions().length;
    const acc = S.totalAnswered ? Math.round((S.totalCorrect / S.totalAnswered) * 100) : 0;
    const weak = weakestField();
    s.innerHTML = `
      <div class="hero">
        <h1>BodyQuest</h1>
        <button class="title-chip" id="homeTitle">${(function(){ const t = equippedTitle(); return `${t.emoji} ${t.label}`; })()} <span style="opacity:.6">▾</span></button>
        <p>トレーナー／セラピストのための知識クエスト。<br>1日5分、ゲーム感覚で現場の知識を積み上げよう。</p>
        <div class="daily">
          <div class="ring">
            <svg width="64" height="64"><circle cx="32" cy="32" r="${r}" stroke="#252b35" stroke-width="7" fill="none"/>
            <circle cx="32" cy="32" r="${r}" stroke="#ffb300" stroke-width="7" fill="none"
              stroke-dasharray="${c}" stroke-dashoffset="${off}" stroke-linecap="round"/></svg>
            <span class="ring-txt">${pct}%</span>
          </div>
          <div class="daily-info">
            <b>今日のゴール</b>
            <small>${S.dailyXp} / ${goal} XP ${pct >= 100 ? "・達成！🎉" : ""}</small>
            <small>🔥 ${S.streak}日連続　Lv.${S.lv}　<span id="heartLine">❤️ ${S.hearts}${S.hearts < 5 ? "・" + heartTimerText() : ""}</span></small>
          </div>
        </div>
      </div>

      <button class="btn lg" id="quickStart">⚡ おまかせ10問チャレンジ</button>
      <div style="height:10px"></div>
      <button class="btn ghost" id="goFields">📚 分野を選んで学ぶ</button>

      ${weak ? `<div class="section-title">${weak.acc != null ? "弱点を克服しよう" : "次はこの分野へ"}</div>
      <button class="card card-row suggest" id="weakCard" style="text-align:left;width:100%">
        <span style="font-size:30px">${weak.f.emoji}</span>
        <div style="flex:1"><b style="font-size:15px">${weak.f.label}</b>
          <div class="muted" style="font-size:12px">${weak.acc != null ? "正答率 " + Math.round(weak.acc * 100) + "% ・ ここを伸ばすと効果大" : "まだ伸びしろたっぷり。挑戦してみよう"}</div></div>
        <span style="color:${weak.f.color};font-weight:800">▶</span>
      </button>` : ""}

      <div class="section-title">クイック</div>
      <div class="kpi">
        <div class="k"><b>${totalQ}</b><small>収録問題数</small></div>
        <div class="k"><b>${acc}%</b><small>通算正答率</small></div>
        <div class="k"><b>${S.totalAnswered}</b><small>回答数</small></div>
        <div class="k"><b>${dueCount()}</b><small>復習待ち</small></div>
      </div>
    `;
    $("#quickStart", s).addEventListener("click", () => startQuiz(pickMixed(10), { title: "おまかせ" }));
    $("#goFields", s).addEventListener("click", () => go("fields"));
    $("#homeTitle", s).addEventListener("click", renderBadges);
    const wc = $("#weakCard", s);
    if (wc && weak) wc.addEventListener("click", () => startQuiz(shuffle(fieldQuestions(weak.f.key)).slice(0, 10), { title: weak.f.label, color: weak.f.color }));
    // live heart countdown
    if (S.hearts < 5) _heartTimer = setInterval(() => {
      regenHearts(); const hl = document.getElementById("heartLine");
      if (!hl) { clearInterval(_heartTimer); _heartTimer = null; return; }
      hl.textContent = `❤️ ${S.hearts}` + (S.hearts < 5 ? "・" + heartTimerText() : "");
      if (S.hearts >= 5) { clearInterval(_heartTimer); _heartTimer = null; renderTopbar(); }
    }, 1000);
  }

  function pickMixed(n) {
    // Bias toward due reviews + unseen, fill rest random.
    const all = allQuestions();
    const due = all.filter(q => S.seen[q.id] && S.seen[q.id].due <= Date.now());
    const unseen = all.filter(q => !S.seen[q.id]);
    let pool = shuffle(due).slice(0, Math.ceil(n / 2));
    pool = pool.concat(shuffle(unseen).slice(0, n - pool.length));
    if (pool.length < n) pool = pool.concat(shuffle(all).slice(0, n - pool.length));
    return shuffle(pool).slice(0, n);
  }

  /* ============================================================
     FIELDS
     ============================================================ */
  function fieldProgress(k) {
    const qs = fieldQuestions(k);
    let seen = 0, mastered = 0;
    qs.forEach(q => { const r = S.seen[q.id]; if (r) { seen++; if (r.c >= 2) mastered++; } });
    return { total: qs.length, seen, mastered };
  }
  function dueCount() { return allQuestions().filter(q => S.seen[q.id] && S.seen[q.id].due <= Date.now()).length; }

  function renderFields(s) {
    let cards = FIELDS.map(f => {
      const p = fieldProgress(f.key);
      const pct = p.total ? Math.round((p.mastered / p.total) * 100) : 0;
      return `
        <button class="field-card" data-f="${f.key}">
          <div class="field-accent" style="background:${f.color}"></div>
          <span class="fc-emoji">${f.emoji}</span>
          <div class="fc-label">${f.label}</div>
          <div class="fc-desc">${f.desc}</div>
          <div class="fc-bar"><div class="fc-fill" style="width:${pct}%;background:${f.color}"></div></div>
          <div class="fc-stat"><span>${p.total}問</span><span>習得 ${p.mastered}/${p.total}</span></div>
        </button>`;
    }).join("");
    s.innerHTML = `<h2 style="margin-bottom:14px">分野を選ぶ</h2><div class="grid">${cards}</div>`;
    s.querySelectorAll(".field-card").forEach(b => b.addEventListener("click", () => renderFieldDetail(b.dataset.f)));
  }

  function renderFieldDetail(k) {
    const f = FIELDS.find(x => x.key === k);
    const qs = fieldQuestions(k);
    const cats = {};
    qs.forEach(q => { (cats[q.cat] = cats[q.cat] || []).push(q); });
    const p = fieldProgress(k);
    const s = $("#screen"); s.scrollTop = 0;
    let catHtml = Object.keys(cats).map(cat => {
      const list = cats[cat];
      const mastered = list.filter(q => S.seen[q.id] && S.seen[q.id].c >= 2).length;
      const pct = Math.round((mastered / list.length) * 100);
      return `
        <button class="card card-row" data-cat="${encodeURIComponent(cat)}" style="text-align:left">
          <div style="flex:1">
            <b>${cat}</b>
            <div class="bar-track" style="margin-top:8px"><div class="bar-fill" style="width:${pct}%;background:${f.color}"></div></div>
          </div>
          <div style="color:var(--txt2);font-size:12px;white-space:nowrap">${mastered}/${list.length}</div>
        </button>`;
    }).join("");
    s.innerHTML = `
      <button class="btn-sm" id="back">← 分野一覧</button>
      <div class="hero" style="margin-top:12px;background:linear-gradient(135deg,${f.color}33,${f.color}11)">
        <h1>${f.emoji} ${f.label}</h1>
        <p>${f.desc}</p>
        <div class="daily-info" style="margin-top:10px">
          <small>収録 ${p.total}問　／　習得 ${p.mastered}　／　学習済 ${p.seen}</small>
        </div>
      </div>
      <button class="btn lg" id="startField" style="background:${f.color};box-shadow:0 4px 0 ${f.color}99">▶ ${f.label}を10問</button>
      <div style="height:8px"></div>
      <button class="btn ghost" id="startWeak">弱点だけ復習</button>
      <div class="section-title">カテゴリー別</div>
      ${catHtml || '<div class="empty">準備中…</div>'}
    `;
    $("#back", s).addEventListener("click", () => go("fields"));
    $("#startField", s).addEventListener("click", () => startQuiz(shuffle(qs).slice(0, 10), { title: f.label, color: f.color }));
    $("#startWeak", s).addEventListener("click", () => {
      const weak = qs.filter(q => { const r = S.seen[q.id]; return r && r.c < 2; });
      if (!weak.length) return toast("弱点はまだありません💪");
      startQuiz(shuffle(weak).slice(0, 10), { title: f.label + "・弱点", color: f.color });
    });
    s.querySelectorAll("[data-cat]").forEach(b => b.addEventListener("click", () => {
      const cat = decodeURIComponent(b.dataset.cat);
      startQuiz(shuffle(cats[cat]).slice(0, 10), { title: `${f.label}・${cat}`, color: f.color });
    }));
  }

  /* ============================================================
     REVIEW
     ============================================================ */
  function renderReview(s) {
    const due = allQuestions().filter(q => S.seen[q.id] && S.seen[q.id].due <= Date.now());
    const wrong = allQuestions().filter(q => { const r = S.seen[q.id]; return r && r.n > 0 && (r.c / r.n) < 0.5; });
    s.innerHTML = `
      <h2 style="margin-bottom:6px">復習</h2>
      <p class="muted" style="font-size:13px;margin:0 0 16px">間隔反復で記憶を定着。タイミングが来た問題を解こう。</p>
      <div class="kpi">
        <div class="k"><b>${due.length}</b><small>復習タイミング</small></div>
        <div class="k"><b>${wrong.length}</b><small>苦手（正答率50%未満）</small></div>
      </div>
      <button class="btn lg" id="startDue" ${due.length ? "" : "disabled"}>🔁 復習を始める（${Math.min(15, due.length)}問）</button>
      <div style="height:8px"></div>
      <button class="btn ghost" id="startWrong" ${wrong.length ? "" : "disabled"}>苦手を集中（${Math.min(15, wrong.length)}問）</button>
      ${due.length || wrong.length ? "" : '<div class="empty">まだ復習対象がありません。<br>まずは分野を学習しましょう📚</div>'}
    `;
    if (due.length) $("#startDue", s).addEventListener("click", () => startQuiz(shuffle(due).slice(0, 15), { title: "復習" }));
    if (wrong.length) $("#startWrong", s).addEventListener("click", () => startQuiz(shuffle(wrong).slice(0, 15), { title: "苦手集中" }));
  }

  /* ============================================================
     LEARN  (教材 — read-to-learn study material)
     ============================================================ */
  const LEARN = window.LEARN_CONTENT || {};
  let learnState = { field: null, cat: null };
  let learnObserver = null;     // IntersectionObserver tracking the active section
  let learnScroll = null;       // window scroll handler (progress bar + back-to-top)

  // Tear down learn-screen observers/listeners so they don't leak across routes.
  function cleanupLearn() {
    if (learnObserver) { learnObserver.disconnect(); learnObserver = null; }
    if (learnScroll) { window.removeEventListener("scroll", learnScroll); learnScroll = null; }
    const bar = $("#learnProgress"); if (bar) bar.remove();
    const fab = $("#learnTop"); if (fab) fab.remove();
  }

  // Deep-link entry: jump from a quiz/result straight into the relevant lesson.
  function openLearn(field, cat) {
    learnState = { field: field || null, cat: cat || null };
    const fb = $(".feedback"); if (fb) fb.remove();
    Q = null;
    go("learn");
  }
  window.openLearn = openLearn;

  function learnFieldDone(k) {
    // mastery % of the field, surfaced in the 教材 index for motivation
    const p = fieldProgress(k);
    return p.total ? Math.round((p.mastered / p.total) * 100) : 0;
  }

  // Flat, cached search index over every section of every field.
  let learnIndex = null;
  function buildLearnIndex() {
    if (learnIndex) return learnIndex;
    learnIndex = [];
    FIELDS.forEach(f => {
      const lc = LEARN[f.key]; if (!lc) return;
      lc.sections.forEach(sec => {
        const text = (sec.html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        learnIndex.push({ field: f.key, emoji: f.emoji, label: f.label, color: f.color,
          cat: sec.cat, title: sec.title || sec.cat, text, hay: (sec.title + " " + sec.cat + " " + text).toLowerCase() });
      });
    });
    return learnIndex;
  }

  function wireLearnSearch(s) {
    const input = $("#learnQ", s), results = $("#learnResults", s), grid = $("#learnGrid", s);
    if (!input) return;
    const run = () => {
      const q = input.value.trim().toLowerCase();
      if (q.length < 1) { results.innerHTML = ""; grid.style.display = ""; return; }
      grid.style.display = "none";
      const terms = q.split(/\s+/).filter(Boolean);
      const hits = buildLearnIndex().map(it => {
        let score = 0;
        terms.forEach(t => { if (it.hay.indexOf(t) >= 0) score++; if (it.title.toLowerCase().indexOf(t) >= 0) score += 2; });
        return { it, score };
      }).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 14);
      if (!hits.length) { results.innerHTML = `<div class="empty">「${input.value}」に一致する項目は見つかりませんでした。</div>`; return; }
      results.innerHTML = hits.map(({ it }) => {
        const pos = it.text.toLowerCase().indexOf(terms[0]);
        let snip = pos >= 0 ? it.text.slice(Math.max(0, pos - 18), pos + 50) : it.text.slice(0, 60);
        return `<button class="search-hit" data-f="${it.field}" data-c="${encodeURIComponent(it.cat)}">
          <div class="sh-top"><span class="sh-tag" style="background:${it.color}22;color:${it.color}">${it.emoji} ${it.label}</span><b>${it.title}</b></div>
          <div class="sh-snip">…${snip}…</div></button>`;
      }).join("");
      results.querySelectorAll(".search-hit").forEach(b => b.addEventListener("click", () =>
        openLearn(b.dataset.f, decodeURIComponent(b.dataset.c))));
    };
    input.addEventListener("input", run);
  }

  // ~500 Japanese chars/min reading pace → minutes for a field's material.
  function learnReadMin(lc) {
    const chars = lc.sections.reduce((a, sec) => a + (sec.html || "").replace(/<[^>]+>/g, "").length, 0);
    return Math.max(1, Math.round(chars / 500));
  }

  function renderLearn(s) {
    cleanupLearn();
    s.scrollTop = 0; window.scrollTo(0, 0);
    // ---- Index: pick a field ----
    if (!learnState.field || !LEARN[learnState.field]) {
      const cards = FIELDS.map(f => {
        const lc = LEARN[f.key];
        const n = lc ? lc.sections.length : 0;
        const pct = learnFieldDone(f.key);
        return `
          <button class="field-card" data-lf="${f.key}" ${lc ? "" : "disabled"}>
            <div class="field-accent" style="background:${f.color}"></div>
            <span class="fc-emoji">${f.emoji}</span>
            <div class="fc-label">${f.label}</div>
            <div class="fc-desc">${f.desc}</div>
            <div class="fc-bar"><div class="fc-fill" style="width:${pct}%;background:${f.color}"></div></div>
            <div class="fc-stat"><span>${lc ? n + "章 ・ 約" + learnReadMin(lc) + "分" : "準備中"}</span><span>${lc ? "読む ▸" : ""}</span></div>
          </button>`;
      }).join("");
      s.innerHTML = `
        <div class="hero">
          <h1>📖 教材で学ぶ</h1>
          <p>クイズで問われる知識を、体系立てた読み物でじっくり学べます。<br>クイズで間違えると、その分野の解説へここから直接ジャンプできます。</p>
        </div>
        <div class="learn-search"><input id="learnQ" type="search" placeholder="🔍 キーワードで全分野から探す（例: 棘上筋, ATP, ラックマン）" autocomplete="off" /></div>
        <div id="learnResults"></div>
        <div class="grid" id="learnGrid">${cards}</div>`;
      s.querySelectorAll("[data-lf]").forEach(b => b.addEventListener("click", () => {
        learnState = { field: b.dataset.lf, cat: null }; renderLearn(s);
      }));
      wireLearnSearch(s);
      return;
    }
    // ---- Article: one field's full material ----
    const f = FIELDS.find(x => x.key === learnState.field) || {};
    const lc = LEARN[learnState.field];
    const toc = lc.sections.map((sec, i) =>
      `<button class="toc-chip" data-go="sec-${i}" data-i="${i}">${sec.title || sec.cat}</button>`).join("");
    const figMap = (window.FIGURE_MAP && window.FIGURE_MAP[learnState.field]) || {};
    const figFor = (cat) => { const id = figMap[cat]; const svg = id && window.FIGURES && window.FIGURES[id]; const photo = (window.genImgHTML ? window.genImgHTML(learnState.field, cat, null, "lesson-photo") : ""); return photo + (svg ? `<div class="lesson-fig">${svg}</div>` : ""); };
    const body = lc.sections.map((sec, i) => `
      <article class="lesson" id="sec-${i}">
        <h3 class="lesson-h" style="border-color:${f.color}"><span class="lesson-num" style="color:${f.color}">${i + 1}</span>${sec.title || sec.cat}</h3>
        ${figFor(sec.cat)}
        <div class="lesson-body">${sec.html}</div>
        <button class="lesson-quiz" data-cat="${encodeURIComponent(sec.cat)}" style="color:${f.color};border-color:${f.color}55">このテーマを問題で確認 →</button>
      </article>`).join("");
    s.innerHTML = `
      <button class="btn-sm" id="lback">← 教材トップ</button>
      <div class="hero" style="margin-top:12px;background:linear-gradient(135deg,${f.color}33,${f.color}11)">
        <h1>${f.emoji} ${f.label}</h1>
        <div class="lesson-meta">全${lc.sections.length}章 ・ 約${learnReadMin(lc)}分で読めます</div>
        <div class="lesson-intro">${lc.intro || ""}</div>
      </div>
      <div class="toc-wrap"><div class="toc">${toc}</div></div>
      ${body}
      ${(function(){ var r = window.FIELD_REFS && window.FIELD_REFS[learnState.field]; return (r && r.length) ? `<div class="refs-card"><div class="refs-h">📚 参考・出典</div><ul>${r.map(x => `<li>${x}</li>`).join("")}</ul><div class="refs-note">※ より正確・詳細な情報は原典や最新のガイドラインをご確認ください。本アプリは学習補助を目的としています。</div></div>` : ""; })()}
      <div style="height:16px"></div>
      <button class="btn lg" id="lquiz" style="background:${f.color};box-shadow:0 4px 0 ${f.color}99">▶ ${f.label}を10問チャレンジ</button>
      <div style="height:8px"></div>
      <button class="btn ghost" id="ltop">⤴ 教材トップへ戻る</button>
    `;
    // Reading-progress bar (under topbar) + back-to-top FAB.
    const progress = el(`<div id="learnProgress" style="background:${f.color}"></div>`);
    document.body.appendChild(progress);
    const fab = el(`<button id="learnTop" title="トップへ" style="background:${f.color}">↑</button>`);
    document.body.appendChild(fab);
    fab.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

    $("#lback", s).addEventListener("click", () => { cleanupLearn(); learnState = { field: null, cat: null }; renderLearn(s); });
    $("#ltop", s).addEventListener("click", () => { cleanupLearn(); learnState = { field: null, cat: null }; renderLearn(s); });
    $("#lquiz", s).addEventListener("click", () => startQuiz(shuffle(fieldQuestions(f.key)).slice(0, 10), { title: f.label, color: f.color }));
    const tocChips = [].slice.call(s.querySelectorAll(".toc-chip"));
    tocChips.forEach(b => b.addEventListener("click", () => {
      const t = $("#" + b.dataset.go, s); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
    }));

    // Scroll: progress bar + back-to-top button + active-section TOC sync.
    // Pure getBoundingClientRect math (no innerHeight dependency) so it is
    // deterministic across browsers and headless test viewports.
    const lessons = [].slice.call(s.querySelectorAll(".lesson"));
    let activeI = -1;
    const ACTIVE_OFFSET = 120; // a section becomes "current" once its top passes this y
    learnScroll = function () {
      const de = document.documentElement;
      const h = de.scrollHeight - (window.innerHeight || de.clientHeight || 0);
      const p = h > 0 ? Math.min(100, Math.max(0, (window.scrollY / h) * 100)) : 0;
      progress.style.width = p + "%";
      fab.classList.toggle("show", window.scrollY > 600);
      let cur = 0;
      for (let i = 0; i < lessons.length; i++) {
        if (lessons[i].getBoundingClientRect().top <= ACTIVE_OFFSET) cur = i; else break;
      }
      if (cur !== activeI) {
        activeI = cur;
        tocChips.forEach((c, i) => c.classList.toggle("on", i === cur));
        if (tocChips[cur]) tocChips[cur].scrollIntoView({ block: "nearest", inline: "center" });
      }
    };
    window.addEventListener("scroll", learnScroll, { passive: true });
    learnScroll();
    s.querySelectorAll(".lesson-quiz").forEach(b => b.addEventListener("click", () => {
      const cat = decodeURIComponent(b.dataset.cat);
      const pool = fieldQuestions(f.key).filter(q => q.cat === cat);
      if (pool.length) startQuiz(shuffle(pool).slice(0, 10), { title: `${f.label}・${cat}`, color: f.color });
    }));
    // Deep-link: scroll to & highlight the section matching learnState.cat
    if (learnState.cat != null) {
      const idx = lc.sections.findIndex(sec => sec.cat === learnState.cat);
      const target = idx >= 0 ? $("#sec-" + idx, s) : null;
      if (target) setTimeout(() => {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        target.classList.add("flash");
        setTimeout(() => target.classList.remove("flash"), 2000);
      }, 80);
      learnState.cat = null;
    }
  }

  /* ============================================================
     QUIZ ENGINE
     ============================================================ */
  let Q = null;
  function startQuiz(questions, opts) {
    if (!questions || !questions.length) return toast("問題がありません");
    if (S.hearts <= 0) { regenHearts(); if (S.hearts <= 0) return toast("❤️が回復するまで待ってね（20分で1回復）"); }
    Q = { list: questions, i: 0, correct: 0, xp: 0, opts: opts || {}, answered: false, missed: [], combo: 0, maxCombo: 0 };
    drawQuestion();
  }

  function srUpdate(id, ok) {
    const r = S.seen[id] || { n: 0, c: 0, ease: 1, due: 0 };
    r.n++; if (ok) { r.c++; r.ease = Math.min(5, r.ease + 1); } else { r.c = Math.max(0, r.c); r.ease = 1; }
    const intervals = [0, 1, 3, 7, 16, 35]; // days by ease
    const days = ok ? intervals[Math.min(intervals.length - 1, r.ease)] : 0.01;
    r.due = Date.now() + days * 86400000;
    S.seen[id] = r;
  }

  function drawQuestion() {
    const q = Q.list[Q.i];
    Q.answered = false;
    const f = FIELDS.find(x => x.key === q.field) || {};
    const s = $("#screen"); s.scrollTop = 0;
    const prog = (Q.i / Q.list.length) * 100;
    const diffClass = "diff" + (q.diff || 1);

    let body = "";
    if (q.type === "fill") {
      body = `<input class="fill-input" id="fillIn" placeholder="ここに入力" autocomplete="off" autocapitalize="off" />
              <div style="height:14px"></div><button class="btn" id="submitFill">こたえる</button>`;
    } else {
      const choices = q._shuffled || (q._shuffled = buildChoices(q));
      body = `<div class="choices">` + choices.map((c, idx) =>
        `<button class="choice" data-idx="${idx}"><span class="ci">${"ABCD"[idx]}</span>${c.text}</button>`).join("") + `</div>`;
    }

    s.innerHTML = `
      <div class="quiz-top">
        <button class="quiz-x" id="quitQuiz">✕</button>
        <div class="qbar"><div class="qbar-fill" style="width:${prog}%"></div></div>
        <span class="tb-hearts">❤️${S.hearts}</span>
      </div>
      <div class="q-meta">
        <span class="chip">${f.emoji || ""} ${f.label || ""}</span>
        <span class="chip">${q.cat || ""}</span>
        <span class="chip ${diffClass}">${DIFF[q.diff || 1]}</span>
      </div>
      <div class="q-text">${q.q}</div>
      ${body}
    `;
    $("#quitQuiz", s).addEventListener("click", () => { if (confirm("クイズを終了しますか？")) { save(); go("home"); } });

    if (q.type === "fill") {
      const input = $("#fillIn", s); setTimeout(() => input.focus(), 100);
      const submit = () => answerFill(q, input.value);
      $("#submitFill", s).addEventListener("click", submit);
      input.addEventListener("keydown", e => { if (e.key === "Enter") submit(); });
    } else {
      s.querySelectorAll(".choice").forEach(btn => btn.addEventListener("click", () => {
        if (Q.answered) return;
        answerChoice(q, parseInt(btn.dataset.idx, 10));
      }));
    }
  }

  function buildChoices(q) {
    // Returns array of {text, correct}; for mc/tf shuffle while tracking correct.
    let arr;
    if (q.type === "tf") {
      arr = [{ text: q.choices ? q.choices[0] : "正しい", correct: q.answer === 0 },
             { text: q.choices ? q.choices[1] : "誤り", correct: q.answer === 1 }];
      return arr; // keep order for tf
    }
    arr = q.choices.map((t, i) => ({ text: t, correct: i === q.answer }));
    return shuffle(arr);
  }

  function answerChoice(q, idx) {
    Q.answered = true;
    const choices = q._shuffled;
    const ok = choices[idx].correct;
    document.querySelectorAll(".choice").forEach((btn, i) => {
      if (choices[i].correct) btn.classList.add("correct");
      else if (i === idx) btn.classList.add("wrong");
      btn.disabled = true;
    });
    finishAnswer(q, ok, choices.find(c => c.correct).text);
  }

  function answerFill(q, val) {
    if (Q.answered) return;
    Q.answered = true;
    const norm = x => (x || "").trim().replace(/\s/g, "").toLowerCase();
    const accepts = [q.answer].concat(q.accept || []).map(norm);
    const ok = accepts.includes(norm(val));
    const input = $("#fillIn"); if (input) { input.disabled = true; input.style.borderColor = ok ? "var(--good)" : "var(--bad)"; }
    const btn = $("#submitFill"); if (btn) btn.disabled = true;
    finishAnswer(q, ok, q.answer);
  }

  function finishAnswer(q, ok, correctText) {
    srUpdate(q.id, ok);
    S.totalAnswered++; if (ok) S.totalCorrect++;
    const fs = S.fieldStats[q.field] || { answered: 0, correct: 0 };
    fs.answered++; if (ok) fs.correct++; S.fieldStats[q.field] = fs;

    let comboBonus = 0;
    if (ok) {
      Q.combo++; Q.maxCombo = Math.max(Q.maxCombo, Q.combo);
      if (Q.combo >= 3) comboBonus = Math.min(10, Q.combo); // escalating combo bonus
      const gain = 8 + (q.diff || 1) * 2 + comboBonus;
      Q.correct++; Q.xp += gain; Q._lastGain = gain;
      sfx("correct"); haptic(20);
    } else {
      Q.combo = 0;
      Q.missed.push(q); S.hearts = Math.max(0, S.hearts - 1); S.heartsTs = S.heartsTs || Date.now();
      sfx("wrong"); haptic([0, 30, 20, 30]);
    }
    if (Q.maxCombo > S.bestCombo) S.bestCombo = Q.maxCombo;
    save();
    showFeedback(q, ok, correctText, comboBonus);
  }

  function showFeedback(q, ok, correctText, comboBonus) {
    const old = $(".feedback"); if (old) old.remove();
    const isLast = Q.i >= Q.list.length - 1;
    const gain = ok ? (Q._lastGain || (8 + (q.diff || 1) * 2)) : 0;
    const comboTag = (ok && Q.combo >= 3) ? `<span class="combo-tag">🔥${Q.combo}コンボ${comboBonus ? ` +${comboBonus}` : ""}</span>` : "";
    const fb = el(`
      <div class="feedback ${ok ? "ok" : "ng"}" role="status">
        <div class="fb-title">${ok ? "✓ 正解！" : "✗ 不正解"} ${ok ? `<span style="color:#ffd24a;font-size:14px">+${gain}XP</span>` : ""} ${comboTag}</div>
        ${!ok ? `<div class="fb-ans">こたえ： <b>${correctText}</b></div>` : ""}
        <div class="fb-exp">${q.exp || ""}</div>
        ${(window.genImgHTML ? window.genImgHTML(q.field, q.cat, q.id, "fb-photo") : "")}${(function(){ var m = window.FIGURE_MAP && window.FIGURE_MAP[q.field]; var id = m && m[q.cat]; var svg = id && window.FIGURES && window.FIGURES[id]; return svg ? `<div class="lesson-fig sm">${svg}</div>` : ""; })()}
        ${LEARN[q.field] ? `<button class="fb-learn" id="learnBtn">📖 この分野（${q.cat || ""}）を教材で詳しく学ぶ</button>` : ""}
        <div style="height:12px"></div>
        <button class="btn ${ok ? "good" : ""}" id="nextBtn">${isLast ? "結果を見る" : "つぎへ"}</button>
      </div>`);
    document.body.appendChild(fb);
    const lb = $("#learnBtn", fb);
    if (lb) lb.addEventListener("click", () => {
      if (!isLast && !confirm("教材へ移動するとこのクイズは終了します。よろしいですか？\n（ここまでの回答は記録されています）")) return;
      openLearn(q.field, q.cat);
    });
    const advance = () => {
      document.removeEventListener("keydown", onKey);
      fb.remove();
      if (isLast) finishQuiz();
      else { Q.i++; drawQuestion(); }
    };
    function onKey(e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); advance(); } }
    document.addEventListener("keydown", onKey);
    $("#nextBtn", fb).addEventListener("click", advance);
  }

  function finishQuiz() {
    const leveled = addXp(Q.xp);
    // streak: count a play day
    const t = today();
    if (S.lastPlay !== t) {
      const y = new Date(); y.setDate(y.getDate() - 1);
      const yk = `${y.getFullYear()}-${y.getMonth() + 1}-${y.getDate()}`;
      S.streak = (S.lastPlay === yk) ? S.streak + 1 : 1;
      S.lastPlay = t;
    }
    const pct = Math.round((Q.correct / Q.list.length) * 100);
    if (pct === 100) S.perfectRuns++;
    save();
    const newBadges = checkBadges();   // award & collect newly earned 称号
    if (newBadges.length) S.title = newBadges[newBadges.length - 1].id; // auto-equip latest
    save();
    renderTopbar();
    const s = $("#screen"); s.scrollTop = 0;
    const emoji = pct === 100 ? "🏆" : pct >= 70 ? "🎉" : pct >= 40 ? "💪" : "📖";
    s.innerHTML = `
      <div class="result-big">${emoji}</div>
      <h2 class="center">${pct === 100 ? "パーフェクト！" : pct >= 70 ? "ナイス！" : "おつかれさま"}</h2>
      <div class="stat-row">
        <div class="s"><b>${Q.correct}/${Q.list.length}</b><small>正解</small></div>
        <div class="s"><b>+${Q.xp}</b><small>獲得XP</small></div>
        <div class="s"><b>${pct}%</b><small>正答率</small></div>
      </div>
      ${leveled ? `<div class="card center"><span class="lvlup">🆙 レベルアップ！ Lv.${S.lv} になりました</span></div>` : ""}
      ${newBadges.length ? `<div class="card" style="border-color:#ffd24a55;background:#2a2716">
        <div style="font-weight:900;color:#ffd24a;margin-bottom:8px">🎉 称号を獲得！</div>
        ${newBadges.map(b => `<div class="card-row" style="margin-bottom:6px"><span style="font-size:26px">${b.emoji}</span>
          <div><b style="font-size:15px">${b.label}</b><div class="muted" style="font-size:12px">${b.desc}</div></div></div>`).join("")}
        <div class="muted" style="font-size:11px;margin-top:4px">最新の称号を自動装備しました。記録タブで変更できます。</div>
      </div>` : ""}
      ${Q.missed.length ? `<div class="section-title">まちがえた問題（${Q.missed.length}）— 教材で復習しよう</div>` +
        Q.missed.map(m => `<div class="card"><div style="font-weight:700;font-size:14px">${m.q}</div>
          <div class="fb-exp" style="margin-top:6px">${m.exp || ""}</div>
          ${LEARN[m.field] ? `<button class="learn-btn" data-lf="${m.field}" data-lc="${encodeURIComponent(m.cat || "")}">📖 ${m.cat || ""}を教材で学ぶ</button>` : ""}
          </div>`).join("") : ""}
      <div style="height:8px"></div>
      <button class="btn lg" id="again">もう10問</button>
      <div style="height:8px"></div>
      <button class="btn ghost" id="shareRes">📤 結果をシェア</button>
      <div style="height:8px"></div>
      <button class="btn ghost" id="home">ホームへ</button>
    `;
    const sr = $("#shareRes", s); if (sr) sr.addEventListener("click", () => shareResult(pct));
    s.querySelectorAll(".learn-btn").forEach(b => b.addEventListener("click", () =>
      openLearn(b.dataset.lf, decodeURIComponent(b.dataset.lc))));
    $("#again", s).addEventListener("click", () => startQuiz(pickMixed(10), { title: "おまかせ" }));
    $("#home", s).addEventListener("click", () => go("home"));

    // Celebration sequence: level-up first, then any new 称号.
    (async () => {
      if (leveled) {
        const r = currentRank();
        await celebrate({ emoji: r.emoji, title: `レベルアップ！ Lv.${S.lv}`, sub: `「${r.label}」`, sound: "level", colors: ["#ffd24a", "#ffb300", "#fff"] });
      } else if (pct === 100) { sfx("level"); confettiBurst(); haptic([0, 40, 30, 40]); }
      if (newBadges.length) {
        const top = newBadges.map(b => RARITY[b.rar || "common"].order).reduce((a, c) => Math.max(a, c), 0);
        const rarKey = Object.keys(RARITY).find(k => RARITY[k].order === top);
        await celebrate({ emoji: "🎖️", title: "称号を獲得！", badges: newBadges, rarity: rarKey, sound: "badge" });
      }
    })();
  }

  /* ============================================================
     STATS
     ============================================================ */
  function renderStats(s) {
    const acc = S.totalAnswered ? Math.round((S.totalCorrect / S.totalAnswered) * 100) : 0;
    const earnedCount = Object.keys(S.badges).length;
    const totalBadges = buildBadges().length;
    const t = equippedTitle();
    let bars = FIELDS.map(f => {
      const p = fieldProgress(f.key);
      const pct = p.total ? Math.round((p.mastered / p.total) * 100) : 0;
      return `<div class="bar-line"><div class="bl-top"><span>${f.emoji} ${f.label}</span><span>${p.mastered}/${p.total}</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${f.color}"></div></div></div>`;
    }).join("");
    s.innerHTML = `
      <div class="card-row" style="margin-bottom:14px"><h2 style="flex:1">学習記録</h2>
        <button class="icon-btn" id="openSettings" aria-label="設定">⚙️</button></div>
      <button class="card card-row" id="titleCard" style="text-align:left;width:100%">
        <span style="font-size:32px">${t.emoji}</span>
        <div style="flex:1">
          <div class="muted" style="font-size:11px">現在の称号</div>
          <b style="font-size:17px;color:${t.color || '#ffd24a'}">${t.label}</b>
        </div>
        <div style="text-align:right"><div style="font-weight:800">${earnedCount}/${totalBadges}</div><div class="muted" style="font-size:11px">称号 ▸</div></div>
      </button>
      <button class="card card-row" id="leagueCard" style="text-align:left;width:100%">
        <span style="font-size:32px">${leagueTier().emoji}</span>
        <div style="flex:1">
          <div class="muted" style="font-size:11px">週間リーグ</div>
          <b style="font-size:17px;color:${leagueTier().color}">${leagueTier().name}リーグ</b>
        </div>
        <div style="text-align:right"><div style="font-weight:800">${S.weekXp} XP</div><div class="muted" style="font-size:11px">今週 ▸</div></div>
      </button>
      <div class="kpi">
        <div class="k"><b>Lv.${S.lv}</b><small>レベル</small></div>
        <div class="k"><b>🔥${S.streak}</b><small>連続日数</small></div>
        <div class="k"><b>${S.totalAnswered}</b><small>累計回答</small></div>
        <div class="k"><b>${acc}%</b><small>通算正答率</small></div>
      </div>
      <div class="section-title">分野別マスタリー</div>
      ${bars}
      <div style="height:20px"></div>
      <button class="btn ghost" id="reset">データをリセット</button>
    `;
    $("#titleCard", s).addEventListener("click", renderBadges);
    $("#leagueCard", s).addEventListener("click", renderLeague);
    const og = $("#openSettings", s); if (og) og.addEventListener("click", renderSettings);
    $("#reset", s).addEventListener("click", () => {
      if (confirm("学習データを全て消去しますか？")) { localStorage.removeItem(SAVE_KEY); S = defaultState(); go("home"); toast("リセットしました"); }
    });
  }

  /* ============================================================
     SETTINGS
     ============================================================ */
  function renderSettings() {
    const s = $("#screen"); s.scrollTop = 0;
    const st = S.settings;
    const tgl = (id, on, label, desc) => `
      <div class="card card-row">
        <div style="flex:1"><b style="font-size:15px">${label}</b><div class="muted" style="font-size:12px">${desc}</div></div>
        <button class="switch ${on ? "on" : ""}" id="${id}" role="switch" aria-checked="${on}"><span></span></button>
      </div>`;
    s.innerHTML = `
      <button class="btn-sm" id="sback">← 記録へ</button>
      <h2 style="margin:14px 0">設定</h2>
      ${tgl("setSound", st.sound, "🔊 効果音", "正解・称号獲得などで音を鳴らす")}
      ${tgl("setHaptics", st.haptics, "📳 触覚フィードバック", "回答時に端末を振動させる（対応端末のみ）")}
      ${tgl("setMotion", st.reduceMotion, "🎬 アニメ軽減", "紙吹雪などの演出を控えめにする")}
      <div class="card">
        <b style="font-size:15px">🎯 1日の目標XP</b>
        <div class="muted" style="font-size:12px;margin-bottom:10px">毎日のゴールに必要なXP量</div>
        <div class="pill-select" id="goalPills">
          ${[20, 30, 50, 80].map(g => `<button class="pill ${st.dailyGoal === g ? "on" : ""}" data-g="${g}">${g} XP</button>`).join("")}
        </div>
      </div>
      <div class="card">
        <b style="font-size:15px">🔠 文字サイズ</b>
        <div class="muted" style="font-size:12px;margin-bottom:10px">読みやすい大きさに調整</div>
        <div class="pill-select" id="fsPills">
          ${[[1, "標準"], [2, "大"], [3, "特大"]].map(([v, l]) => `<button class="pill ${(st.fontScale || 1) === v ? "on" : ""}" data-fs="${v}">${l}</button>`).join("")}
        </div>
      </div>
      <button class="btn ghost" id="showTut">📘 チュートリアルをもう一度見る</button>
      <div style="height:10px"></div>
      <div class="muted center" style="font-size:11px">BodyQuest ・ オフラインで動作・進捗は端末内に保存</div>
    `;
    $("#sback", s).addEventListener("click", () => go("stats"));
    const flip = (key, id) => $("#" + id, s).addEventListener("click", () => {
      st[key] = !st[key]; save(); sfx("tap"); renderSettings();
    });
    flip("sound", "setSound"); flip("haptics", "setHaptics"); flip("reduceMotion", "setMotion");
    s.querySelectorAll("#goalPills .pill").forEach(b => b.addEventListener("click", () => {
      st.dailyGoal = parseInt(b.dataset.g, 10); save(); renderSettings();
    }));
    s.querySelectorAll("#fsPills .pill").forEach(b => b.addEventListener("click", () => {
      st.fontScale = parseInt(b.dataset.fs, 10); save(); applyA11y(); renderSettings();
    }));
    $("#showTut", s).addEventListener("click", () => { S.onboarded = false; save(); showOnboarding(); });
  }

  /* ============================================================
     ONBOARDING (first-run tutorial)
     ============================================================ */
  const TUT_SLIDES = [
    { emoji: "🩺", title: "BodyQuestへようこそ", body: "トレーナー／セラピストのための知識アプリ。8分野・約1000問を、ゲーム感覚で身につけよう。" },
    { emoji: "⚡", title: "解いて・間違えて・伸びる", body: "クイズに答えるとXPが貯まりレベルアップ。間違えた問題は教材へジャンプして深く学べます。" },
    { emoji: "🔁", title: "復習で記憶に定着", body: "間隔反復で最適なタイミングに復習が出題。連続正解のコンボでXPボーナスも！" },
    { emoji: "🏅", title: "称号を集めよう", body: "レベルや分野の習得で称号を獲得。レアリティ付きでコレクション性も抜群。さあ始めよう！" },
  ];
  function showOnboarding() {
    let i = 0;
    const ov = el(`<div class="cel-overlay tut"><div class="tut-card"></div></div>`);
    document.body.appendChild(ov);
    const card = $(".tut-card", ov);
    function draw() {
      const sl = TUT_SLIDES[i];
      card.innerHTML = `
        <div class="cel-emoji">${sl.emoji}</div>
        <div class="cel-title" style="color:#ffd24a">${sl.title}</div>
        <div class="cel-sub">${sl.body}</div>
        <div class="tut-dots">${TUT_SLIDES.map((_, j) => `<i class="${j === i ? "on" : ""}"></i>`).join("")}</div>
        <button class="btn lg" id="tutNext">${i < TUT_SLIDES.length - 1 ? "つぎへ" : "はじめる！"}</button>
        ${i < TUT_SLIDES.length - 1 ? '<button class="btn-sm" id="tutSkip" style="margin:10px auto 0;display:block">スキップ</button>' : ""}
      `;
      $("#tutNext", card).addEventListener("click", () => {
        sfx("tap");
        if (i < TUT_SLIDES.length - 1) { i++; draw(); }
        else finish();
      });
      const sk = $("#tutSkip", card); if (sk) sk.addEventListener("click", finish);
    }
    function finish() { S.onboarded = true; save(); ov.remove(); confettiBurst(); }
    draw();
  }

  /* ============================================================
     SHARE
     ============================================================ */
  function shareResult(pct) {
    const t = equippedTitle();
    const text = `BodyQuestで学習中📚\n今回のクイズ：${Q.correct}/${Q.list.length}正解（${pct}%）\nLv.${S.lv}・${t.emoji}${t.label}・🔥${S.streak}日連続\n#BodyQuest #トレーナー学習`;
    if (navigator.share) { navigator.share({ title: "BodyQuest", text }).catch(() => {}); return; }
    if (navigator.clipboard) { navigator.clipboard.writeText(text).then(() => toast("結果をコピーしました📋")).catch(() => toast("コピーできませんでした")); return; }
    toast("シェアに対応していません");
  }

  /* ============================================================
     WEEKLY LEAGUE  (週間リーグ)
     ============================================================ */
  function renderLeague() {
    const s = $("#screen"); s.scrollTop = 0;
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.route === "stats"));
    regenWeek();
    const w = weekInfo();
    const tier = leagueTier();
    const me = { name: "あなた", xp: S.weekXp, me: true };
    const board = leagueRivals().concat([me]).sort((a, b) => b.xp - a.xp);
    const myRank = board.findIndex(x => x.me) + 1;
    const daysLeft = Math.max(0, Math.ceil((w.end - Date.now()) / 86400000));
    const rows = board.map((x, i) => {
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `<span class="lg-rank">${i + 1}</span>`;
      return `<div class="lg-row ${x.me ? "me" : ""}">
        <div class="lg-pos">${medal}</div>
        <div class="lg-name">${x.me ? "🔵 " : ""}${x.name}</div>
        <div class="lg-xp">${x.xp} XP</div>
      </div>`;
    }).join("");
    s.innerHTML = `
      <button class="btn-sm" id="lgback">← 記録へ</button>
      <div class="hero" style="margin-top:12px;background:linear-gradient(135deg,${tier.color}33,#231d3a)">
        <div class="muted" style="font-size:11px">今週のリーグ</div>
        <h1 style="color:${tier.color}">${tier.emoji} ${tier.name}リーグ</h1>
        <p>今週の順位 <b>${myRank}位</b> / ${board.length}人　・　残り <b>${daysLeft}</b>日<br>XPを稼いで上位を目指そう（対戦相手はデモ）</p>
      </div>
      <div class="lg-board">${rows}</div>
      <div style="height:10px"></div>
      <button class="btn lg" id="lgplay">⚡ XPを稼ぐ（10問）</button>
    `;
    $("#lgback", s).addEventListener("click", () => go("stats"));
    $("#lgplay", s).addEventListener("click", () => startQuiz(pickMixed(10), { title: "リーグ" }));
  }

  /* ============================================================
     BADGES SCREEN  (称号コレクション)
     ============================================================ */
  function renderBadges() {
    const s = $("#screen"); s.scrollTop = 0;
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.route === "stats"));
    const all = buildBadges();
    const earned = all.filter(b => S.badges[b.id]).length;
    // group by category
    const cats = [];
    all.forEach(b => { let g = cats.find(c => c.name === b.cat); if (!g) { g = { name: b.cat, items: [] }; cats.push(g); } g.items.push(b); });
    const t = equippedTitle();
    let body = cats.map(g => {
      const items = g.items.slice().sort((a, b) => RARITY[b.rar || "common"].order - RARITY[a.rar || "common"].order).map(b => {
        const got = !!S.badges[b.id];
        const equipped = S.title === b.id;
        const rk = b.rar || "common";
        return `<button class="badge rar-${rk} ${got ? "got" : "lock"} ${equipped ? "equip" : ""}" data-bid="${b.id}" ${got ? "" : "disabled"}>
          <span class="rar-corner" style="background:${RARITY[rk].color}"></span>
          <span class="badge-emoji">${got ? b.emoji : "🔒"}</span>
          <span class="badge-label">${b.label}</span>
          <span class="badge-desc">${b.desc}</span>
          <span class="rar-tag" style="color:${RARITY[rk].color}">${RARITY[rk].label}</span>
          ${equipped ? '<span class="badge-equip">装備中</span>' : ""}
        </button>`;
      }).join("");
      return `<div class="section-title">${g.name}</div><div class="badge-grid">${items}</div>`;
    }).join("");
    const legend = Object.keys(RARITY).map(k => `<span class="leg"><i style="background:${RARITY[k].color}"></i>${RARITY[k].label}</span>`).join("");
    s.innerHTML = `
      <button class="btn-sm" id="bk">← 記録へ</button>
      <div class="hero" style="margin-top:12px;background:linear-gradient(135deg,#2a2716,#231d3a)">
        <div class="muted" style="font-size:11px">装備中の称号</div>
        <h1 style="color:${t.color || '#ffd24a'}">${t.emoji} ${t.label}</h1>
        <p>獲得した称号 <b>${earned}</b> / ${all.length}　・　タップで装備を変更</p>
        <div class="rar-legend">${legend}</div>
      </div>
      ${body}
    `;
    $("#bk", s).addEventListener("click", () => go("stats"));
    s.querySelectorAll(".badge.got").forEach(btn => btn.addEventListener("click", () => {
      const id = btn.dataset.bid;
      S.title = (S.title === id) ? null : id; // tap again to revert to level rank
      save(); renderBadges();
      toast(S.title ? "称号を装備しました" : "レベル称号に戻しました");
    }));
  }

  /* ---------- Boot ---------- */
  let _booted = false;
  function boot() {
    if (_booted) return; _booted = true;
    applyA11y(); checkBadges(); renderTopbar(); go("home");
    if (!S.onboarded) setTimeout(showOnboarding, 350);
  }
  window.addEventListener("load", boot);
  // In case load already fired
  if (document.readyState === "complete") boot();
})();
