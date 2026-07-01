// Global content registry. Each content/<field>.js pushes its questions here.
window.QUIZ_CONTENT = window.QUIZ_CONTENT || {};

// Field metadata: order, label, emoji, accent color.
window.QUIZ_FIELDS = [
  { key: "anatomy",            label: "解剖学",         emoji: "🦴", color: "#e25555", desc: "骨・筋・関節・神経・内臓の名称と位置" },
  { key: "physiology",         label: "生理学",         emoji: "🫀", color: "#e2789b", desc: "代謝・循環・呼吸・神経・内分泌の働き" },
  { key: "functional_anatomy", label: "機能解剖学",     emoji: "💪", color: "#f0a73f", desc: "筋の起始停止・作用・運動連鎖" },
  { key: "nutrition",          label: "栄養学",         emoji: "🥗", color: "#4caf72", desc: "三大栄養素・ビタミン・水分・食事戦略" },
  { key: "biomechanics",       label: "バイオメカニクス", emoji: "📐", color: "#4f8ef0", desc: "力・モーメント・てこ・動作解析" },
  { key: "kinesiology",        label: "運動学・トレ理論", emoji: "🏋️", color: "#9b6ef0", desc: "トレーニング原理・適応・運動学習" },
  { key: "assessment",         label: "評価・触診",     emoji: "🔍", color: "#3fb6c0", desc: "整形外科テスト・姿勢評価・触診" },
  { key: "rehab",              label: "傷害・リハビリ", emoji: "🩹", color: "#c0703f", desc: "外傷・障害・回復過程・コンディショニング" },
  { key: "practice",           label: "現場・実務",     emoji: "🤝", color: "#2fb3a0", desc: "処方・コミュニケーション・リスク管理・倫理・連携" },
  { key: "toyo",               label: "東洋医学",       emoji: "☯️", color: "#b07d4a", desc: "経絡・経穴・気血・五行・四診・証" },
  { key: "exercise",           label: "エクササイズ技術", emoji: "🤸", color: "#7fae3f", desc: "種目のフォーム・キューイング・漸進と退行" },
  { key: "pain",               label: "疼痛科学",       emoji: "🧠", color: "#c75d8a", desc: "痛みの神経生理・慢性痛・生物心理社会モデル" },
  { key: "psych",              label: "スポーツ心理",   emoji: "🧩", color: "#7e6ad0", desc: "メンタルスキル・動機づけ・目標設定・継続" },
  { key: "special",            label: "特別対象・ライフ", emoji: "🧓", color: "#5a9bb0", desc: "高齢者・女性・小児・有疾患者への運動" },
  { key: "firstaid",           label: "救急・応急処置", emoji: "🚑", color: "#e8743c", desc: "BLS/CPR/AED・脳震盪・熱中症・EAP" },
  { key: "conditioning",       label: "コンディショニング", emoji: "🏃", color: "#9aa84a", desc: "SAQ・プライオ・リカバリー・負荷管理" },
  { key: "evo",                label: "進化・発生・発達", emoji: "🧬", color: "#8455c9", desc: "比較解剖・進化・発生学・運動発達から見るヒトの体" },
];

// Difficulty labels.
window.QUIZ_DIFF = { 1: "基礎", 2: "標準", 3: "応用" };
