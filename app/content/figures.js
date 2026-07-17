/* ============================================================
   FIGURES — reusable schematic SVG diagrams (theme-aware).
   window.FIGURES[id] = "<svg>…</svg>"
   window.FIGURE_MAP[field][cat] = figId  (drives where they appear)
   Strokes use currentColor-ish light tones for dark UI.
   ============================================================ */
(function () {
  const C = { line: "#cdd6e4", sub: "#7c8698", bone: "#e8edf5", accent: "#4f8ef0", warm: "#f0a73f", good: "#4caf72", bad: "#e25555", purple: "#b06ef0" };

  const F = {};

  // 1) Three anatomical planes
  F.planes = `<svg viewBox="0 0 240 160" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="運動の3面（矢状面・前額面・水平面）">
    <ellipse cx="120" cy="28" rx="13" ry="14" fill="none" stroke="${C.bone}" stroke-width="2"/>
    <rect x="107" y="42" width="26" height="50" rx="9" fill="none" stroke="${C.bone}" stroke-width="2"/>
    <line x1="120" y1="92" x2="110" y2="135" stroke="${C.bone}" stroke-width="2"/>
    <line x1="120" y1="92" x2="130" y2="135" stroke="${C.bone}" stroke-width="2"/>
    <line x1="108" y1="55" x2="92" y2="80" stroke="${C.bone}" stroke-width="2"/>
    <line x1="132" y1="55" x2="148" y2="80" stroke="${C.bone}" stroke-width="2"/>
    <rect x="118" y="6" width="4" height="140" fill="${C.accent}" opacity=".55"/>
    <text x="126" y="16" fill="${C.accent}" font-size="9">矢状面</text>
    <rect x="78" y="20" width="84" height="4" fill="${C.warm}" opacity=".55" transform="skewX(-20)"/>
    <text x="158" y="36" fill="${C.warm}" font-size="9">前額面</text>
    <ellipse cx="120" cy="70" rx="56" ry="13" fill="none" stroke="${C.good}" stroke-width="3" opacity=".6"/>
    <text x="6" y="74" fill="${C.good}" font-size="9">水平面</text>
  </svg>`;

  // 2) Three classes of levers
  F.levers = `<svg viewBox="0 0 240 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="てこの3種類">
    <g font-size="9" fill="${C.sub}">
      <!-- class 1 -->
      <line x1="20" y1="35" x2="120" y2="35" stroke="${C.bone}" stroke-width="3"/>
      <polygon points="70,35 64,48 76,48" fill="${C.line}"/>
      <line x1="20" y1="35" x2="20" y2="20" stroke="${C.bad}" stroke-width="3"/><text x="6" y="16" fill="${C.bad}">力</text>
      <line x1="120" y1="35" x2="120" y2="50" stroke="${C.accent}" stroke-width="3"/><text x="124" y="50" fill="${C.accent}">抵抗</text>
      <text x="150" y="39" fill="${C.line}">第1種：支点が中央（頭の前後傾）</text>
      <!-- class 2 -->
      <line x1="20" y1="95" x2="120" y2="95" stroke="${C.bone}" stroke-width="3"/>
      <polygon points="20,95 14,108 26,108" fill="${C.line}"/>
      <line x1="80" y1="95" x2="80" y2="110" stroke="${C.accent}" stroke-width="3"/><text x="68" y="123" fill="${C.accent}">抵抗</text>
      <line x1="120" y1="95" x2="120" y2="80" stroke="${C.bad}" stroke-width="3"/><text x="116" y="76" fill="${C.bad}">力</text>
      <text x="150" y="99" fill="${C.line}">第2種：抵抗が中央（つま先立ち）</text>
      <!-- class 3 -->
      <line x1="20" y1="160" x2="120" y2="160" stroke="${C.bone}" stroke-width="3"/>
      <polygon points="20,160 14,173 26,173" fill="${C.line}"/>
      <line x1="60" y1="160" x2="60" y2="145" stroke="${C.bad}" stroke-width="3"/><text x="48" y="141" fill="${C.bad}">力</text>
      <line x1="120" y1="160" x2="120" y2="175" stroke="${C.accent}" stroke-width="3"/><text x="108" y="188" fill="${C.accent}">抵抗</text>
      <text x="150" y="164" fill="${C.line}">第3種：力点が中央（肘屈曲）</text>
    </g>
  </svg>`;

  // 3) F = m × a
  F.fma = `<svg viewBox="0 0 240 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="ニュートンの運動方程式 力=質量かける加速度">
    <rect x="30" y="50" width="44" height="44" rx="6" fill="none" stroke="${C.bone}" stroke-width="2"/>
    <text x="52" y="78" fill="${C.bone}" font-size="13" text-anchor="middle">m</text>
    <line x1="78" y1="72" x2="160" y2="72" stroke="${C.bad}" stroke-width="4"/>
    <polygon points="160,72 150,66 150,78" fill="${C.bad}"/>
    <text x="120" y="62" fill="${C.bad}" font-size="11" text-anchor="middle">a</text>
    <text x="120" y="34" fill="${C.accent}" font-size="16" text-anchor="middle" font-weight="bold">F = m × a</text>
    <text x="120" y="110" fill="${C.sub}" font-size="9" text-anchor="middle">力（N）＝ 質量（kg）× 加速度（m/s²）</text>
  </svg>`;

  // 4) Spine curves & vertebra counts
  F.spine = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="脊柱の彎曲と椎骨の数">
    <path d="M100 14 C 86 34 86 52 100 70 C 116 92 116 120 100 142 C 88 160 92 178 104 192" fill="none" stroke="${C.bone}" stroke-width="3"/>
    <g font-size="10">
      <circle cx="92" cy="40" r="3" fill="${C.accent}"/><text x="110" y="44" fill="${C.accent}">頸椎 7</text>
      <circle cx="108" cy="92" r="3" fill="${C.warm}"/><text x="120" y="96" fill="${C.warm}">胸椎 12</text>
      <circle cx="100" cy="142" r="3" fill="${C.good}"/><text x="116" y="146" fill="${C.good}">腰椎 5</text>
      <circle cx="104" cy="186" r="3" fill="${C.purple}"/><text x="116" y="190" fill="${C.purple}">仙骨・尾骨</text>
    </g>
  </svg>`;

  // 5) Center of mass over base of support
  F.com_bos = `<svg viewBox="0 0 240 160" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="重心と支持基底面">
    <circle cx="100" cy="30" r="11" fill="none" stroke="${C.bone}" stroke-width="2"/>
    <line x1="100" y1="41" x2="100" y2="95" stroke="${C.bone}" stroke-width="2"/>
    <line x1="100" y1="60" x2="78" y2="80" stroke="${C.bone}" stroke-width="2"/>
    <line x1="100" y1="60" x2="122" y2="80" stroke="${C.bone}" stroke-width="2"/>
    <line x1="100" y1="95" x2="84" y2="128" stroke="${C.bone}" stroke-width="2"/>
    <line x1="100" y1="95" x2="116" y2="128" stroke="${C.bone}" stroke-width="2"/>
    <circle cx="100" cy="78" r="5" fill="${C.bad}"/><text x="108" y="76" fill="${C.bad}" font-size="9">重心(COM)</text>
    <line x1="100" y1="78" x2="100" y2="140" stroke="${C.bad}" stroke-dasharray="3 3" stroke-width="1.5"/>
    <rect x="74" y="138" width="52" height="8" rx="3" fill="${C.good}" opacity=".4"/>
    <text x="100" y="156" fill="${C.good}" font-size="9" text-anchor="middle">支持基底面(BOS)</text>
  </svg>`;

  // 6) Energy systems timeline
  F.energy = `<svg viewBox="0 0 240 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="3つのエネルギー供給系と運動時間">
    <line x1="20" y1="92" x2="225" y2="92" stroke="${C.sub}" stroke-width="1.5"/>
    <rect x="20" y="40" width="36" height="52" fill="${C.bad}" opacity=".7"/><text x="38" y="105" fill="${C.bad}" font-size="8" text-anchor="middle">〜10秒</text>
    <rect x="56" y="55" width="74" height="37" fill="${C.warm}" opacity=".7"/><text x="93" y="105" fill="${C.warm}" font-size="8" text-anchor="middle">〜2分</text>
    <rect x="130" y="68" width="95" height="24" fill="${C.good}" opacity=".7"/><text x="178" y="105" fill="${C.good}" font-size="8" text-anchor="middle">それ以上</text>
    <text x="38" y="34" fill="${C.bad}" font-size="8" text-anchor="middle">ATP-PCr</text>
    <text x="93" y="50" fill="${C.warm}" font-size="8" text-anchor="middle">解糖系</text>
    <text x="178" y="62" fill="${C.good}" font-size="8" text-anchor="middle">有酸素系</text>
  </svg>`;

  // 7) Macronutrient kcal per gram
  F.macros = `<svg viewBox="0 0 240 130" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="三大栄養素の1gあたりエネルギー">
    <g font-size="10" text-anchor="middle">
      <rect x="30" y="74" width="40" height="40" fill="${C.good}" opacity=".8"/><text x="50" y="68" fill="${C.good}">4 kcal</text><text x="50" y="126" fill="${C.sub}">糖質</text>
      <rect x="100" y="24" width="40" height="90" fill="${C.warm}" opacity=".8"/><text x="120" y="18" fill="${C.warm}">9 kcal</text><text x="120" y="126" fill="${C.sub}">脂質</text>
      <rect x="170" y="74" width="40" height="40" fill="${C.accent}" opacity=".8"/><text x="190" y="68" fill="${C.accent}">4 kcal</text><text x="190" y="126" fill="${C.sub}">たんぱく質</text>
    </g>
  </svg>`;

  // 8) Tissue healing phases
  F.healing = `<svg viewBox="0 0 240 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="組織治癒の3相">
    <line x1="16" y1="80" x2="228" y2="80" stroke="${C.sub}" stroke-width="1.5"/>
    <rect x="16" y="55" width="44" height="25" fill="${C.bad}" opacity=".7"/><text x="38" y="50" fill="${C.bad}" font-size="8" text-anchor="middle">炎症期</text><text x="38" y="95" fill="${C.sub}" font-size="7" text-anchor="middle">〜数日</text>
    <rect x="60" y="55" width="86" height="25" fill="${C.warm}" opacity=".7"/><text x="103" y="50" fill="${C.warm}" font-size="8" text-anchor="middle">増殖期</text><text x="103" y="95" fill="${C.sub}" font-size="7" text-anchor="middle">数日〜数週</text>
    <rect x="146" y="55" width="82" height="25" fill="${C.good}" opacity=".7"/><text x="187" y="50" fill="${C.good}" font-size="8" text-anchor="middle">成熟・リモデリング期</text><text x="187" y="95" fill="${C.sub}" font-size="7" text-anchor="middle">数週〜1年</text>
  </svg>`;

  // 9) Goniometer (knee ROM)
  F.rom = `<svg viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="関節可動域の測定">
    <line x1="40" y1="120" x2="160" y2="120" stroke="${C.bone}" stroke-width="3"/>
    <line x1="100" y1="120" x2="150" y2="44" stroke="${C.bone}" stroke-width="3"/>
    <circle cx="100" cy="120" r="5" fill="${C.accent}"/>
    <path d="M140 120 A 40 40 0 0 0 124 86" fill="none" stroke="${C.warm}" stroke-width="2"/>
    <text x="150" y="104" fill="${C.warm}" font-size="11">角度</text>
    <text x="100" y="142" fill="${C.sub}" font-size="9" text-anchor="middle">基本軸・移動軸・運動軸で測定</text>
  </svg>`;

  // 10) MMT 0-5 scale
  F.mmt = `<svg viewBox="0 0 240 110" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="徒手筋力テストの段階">
    <g font-size="9">
      ${[0, 1, 2, 3, 4, 5].map((n, i) => {
        const colors = [C.bad, C.bad, C.warm, C.warm, C.good, C.good];
        const x = 16 + i * 36; const h = 14 + n * 13;
        return `<rect x="${x}" y="${96 - h}" width="26" height="${h}" fill="${colors[i]}" opacity=".8"/><text x="${x + 13}" y="108" fill="${C.sub}" text-anchor="middle">${n}</text>`;
      }).join("")}
    </g>
    <text x="120" y="14" fill="${C.line}" font-size="9" text-anchor="middle">0=収縮なし … 3=重力に抗す … 5=正常</text>
  </svg>`;

  // 11) Muscle origin / belly / insertion
  F.muscle = `<svg viewBox="0 0 240 130" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="筋の起始・筋腹・停止">
    <rect x="20" y="30" width="40" height="10" rx="3" fill="${C.bone}"/>
    <rect x="180" y="90" width="40" height="10" rx="3" fill="${C.bone}"/>
    <path d="M55 40 C 110 55 130 75 185 92" stroke="${C.bad}" stroke-width="10" fill="none" stroke-linecap="round" opacity=".75"/>
    <circle cx="58" cy="40" r="4" fill="${C.accent}"/><text x="14" y="24" fill="${C.accent}" font-size="9">起始（動かない側）</text>
    <circle cx="183" cy="92" r="4" fill="${C.warm}"/><text x="150" y="118" fill="${C.warm}" font-size="9">停止（動く側）</text>
    <text x="120" y="92" fill="${C.bad}" font-size="9" text-anchor="middle">筋腹</text>
  </svg>`;

  // 12) Posture plumb line
  F.posture = `<svg viewBox="0 0 160 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="姿勢の重心線とランドマーク">
    <line x1="86" y1="10" x2="86" y2="190" stroke="${C.bad}" stroke-dasharray="4 3" stroke-width="1.5"/>
    <circle cx="80" cy="28" r="12" fill="none" stroke="${C.bone}" stroke-width="2"/>
    <line x1="82" y1="40" x2="86" y2="110" stroke="${C.bone}" stroke-width="2"/>
    <line x1="86" y1="110" x2="84" y2="150" stroke="${C.bone}" stroke-width="2"/>
    <line x1="84" y1="150" x2="88" y2="186" stroke="${C.bone}" stroke-width="2"/>
    <g font-size="8" fill="${C.accent}">
      <circle cx="86" cy="34" r="2.5" fill="${C.accent}"/><text x="96" y="36">耳垂</text>
      <circle cx="85" cy="62" r="2.5" fill="${C.accent}"/><text x="96" y="64">肩峰</text>
      <circle cx="86" cy="110" r="2.5" fill="${C.accent}"/><text x="96" y="112">大転子</text>
      <circle cx="85" cy="150" r="2.5" fill="${C.accent}"/><text x="96" y="152">膝前部</text>
      <circle cx="88" cy="184" r="2.5" fill="${C.accent}"/><text x="96" y="186">外果前方</text>
    </g>
  </svg>`;

  // 13) Heart: 4 chambers + flow
  F.heart = `<svg viewBox="0 0 220 170" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="心臓の4つの部屋と血液の流れ">
    <rect x="55" y="30" width="50" height="44" rx="8" fill="none" stroke="${C.accent}" stroke-width="2"/>
    <rect x="115" y="30" width="50" height="44" rx="8" fill="none" stroke="${C.bad}" stroke-width="2"/>
    <rect x="55" y="80" width="50" height="60" rx="8" fill="none" stroke="${C.accent}" stroke-width="2"/>
    <rect x="115" y="80" width="50" height="60" rx="8" fill="none" stroke="${C.bad}" stroke-width="2"/>
    <g font-size="9" text-anchor="middle">
      <text x="80" y="55" fill="${C.accent}">右房</text><text x="140" y="55" fill="${C.bad}">左房</text>
      <text x="80" y="112" fill="${C.accent}">右室</text><text x="140" y="112" fill="${C.bad}">左室</text>
    </g>
    <text x="80" y="20" fill="${C.accent}" font-size="8" text-anchor="middle">全身→（静脈血）</text>
    <text x="142" y="20" fill="${C.bad}" font-size="8" text-anchor="middle">（動脈血）→全身</text>
    <text x="110" y="158" fill="${C.sub}" font-size="8" text-anchor="middle">右=肺へ／左=全身へ送り出す</text>
  </svg>`;

  // 14) Action potential graph
  F.neuron = `<svg viewBox="0 0 240 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="活動電位の経過">
    <line x1="30" y1="120" x2="225" y2="120" stroke="${C.sub}" stroke-width="1"/>
    <line x1="30" y1="20" x2="30" y2="135" stroke="${C.sub}" stroke-width="1"/>
    <line x1="30" y1="95" x2="225" y2="95" stroke="${C.sub}" stroke-dasharray="2 3" stroke-width="1"/>
    <path d="M30 95 L70 95 L82 30 L96 118 L110 100 L130 95 L225 95" fill="none" stroke="${C.warm}" stroke-width="2.5"/>
    <text x="86" y="26" fill="${C.warm}" font-size="9">脱分極(+30mV)</text>
    <text x="118" y="132" fill="${C.accent}" font-size="9">過分極</text>
    <text x="6" y="98" fill="${C.sub}" font-size="8">-70</text>
    <text x="150" y="90" fill="${C.sub}" font-size="8">静止膜電位</text>
  </svg>`;

  // 15) Alveolus gas exchange
  F.gas = `<svg viewBox="0 0 220 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="肺胞でのガス交換">
    <circle cx="75" cy="75" r="42" fill="none" stroke="${C.bone}" stroke-width="2"/>
    <text x="75" y="78" fill="${C.bone}" font-size="10" text-anchor="middle">肺胞</text>
    <path d="M150 45 C 170 60 170 90 150 105" fill="none" stroke="${C.bad}" stroke-width="6" opacity=".5"/>
    <line x1="118" y1="62" x2="150" y2="62" stroke="${C.bad}" stroke-width="3"/><polygon points="150,62 142,57 142,67" fill="${C.bad}"/>
    <text x="120" y="54" fill="${C.bad}" font-size="9">O₂</text>
    <line x1="150" y1="92" x2="118" y2="92" stroke="${C.accent}" stroke-width="3"/><polygon points="118,92 126,87 126,97" fill="${C.accent}"/>
    <text x="120" y="108" fill="${C.accent}" font-size="9">CO₂</text>
    <text x="158" y="78" fill="${C.sub}" font-size="9">毛細血管</text>
    <text x="110" y="138" fill="${C.sub}" font-size="8" text-anchor="middle">分圧差による拡散で交換</text>
  </svg>`;

  // 16) Supercompensation curve
  F.supercomp = `<svg viewBox="0 0 240 140" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="超回復の曲線">
    <line x1="20" y1="95" x2="228" y2="95" stroke="${C.sub}" stroke-width="1"/>
    <line x1="20" y1="95" x2="20" y2="100" stroke="${C.sub}"/>
    <path d="M20 70 L60 70 L85 110 L140 55 L200 70 L228 70" fill="none" stroke="${C.good}" stroke-width="2.5"/>
    <line x1="20" y1="70" x2="228" y2="70" stroke="${C.sub}" stroke-dasharray="2 3" stroke-width="1"/>
    <text x="60" y="64" fill="${C.sub}" font-size="8">運動</text>
    <text x="85" y="124" fill="${C.bad}" font-size="8" text-anchor="middle">疲労</text>
    <text x="140" y="48" fill="${C.good}" font-size="9" text-anchor="middle">超回復</text>
    <text x="150" y="66" fill="${C.sub}" font-size="8">元のレベル</text>
  </svg>`;

  // 17) Force-velocity relationship
  F.fv = `<svg viewBox="0 0 220 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="筋の力-速度関係">
    <line x1="35" y1="120" x2="210" y2="120" stroke="${C.sub}" stroke-width="1"/>
    <line x1="35" y1="20" x2="35" y2="120" stroke="${C.sub}" stroke-width="1"/>
    <path d="M35 35 C 80 55 120 100 200 112" fill="none" stroke="${C.accent}" stroke-width="2.5"/>
    <text x="10" y="40" fill="${C.sub}" font-size="8">力</text>
    <text x="150" y="135" fill="${C.sub}" font-size="8">短縮速度</text>
    <text x="60" y="40" fill="${C.accent}" font-size="8">遅い＝大きな力</text>
    <text x="120" y="98" fill="${C.accent}" font-size="8">速い＝小さな力</text>
  </svg>`;

  // 18) Gait cycle
  F.gait = `<svg viewBox="0 0 240 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="歩行周期">
    <rect x="20" y="50" width="135" height="22" fill="${C.accent}" opacity=".55"/>
    <rect x="155" y="50" width="65" height="22" fill="${C.warm}" opacity=".55"/>
    <text x="87" y="65" fill="#fff" font-size="9" text-anchor="middle">立脚期 約60%</text>
    <text x="187" y="65" fill="#fff" font-size="9" text-anchor="middle">遊脚期 40%</text>
    <text x="20" y="44" fill="${C.sub}" font-size="8">踵接地</text>
    <text x="135" y="44" fill="${C.sub}" font-size="8">爪先離地</text>
    <text x="120" y="92" fill="${C.sub}" font-size="8" text-anchor="middle">1歩行周期＝同じ足の踵接地から次の踵接地まで</text>
  </svg>`;

  // 19) Sprain grades
  F.sprain = `<svg viewBox="0 0 240 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="捻挫の重症度分類">
    <g font-size="9" text-anchor="middle">
      <line x1="30" y1="40" x2="30" y2="80" stroke="${C.bone}" stroke-width="3"/><line x1="70" y1="40" x2="70" y2="80" stroke="${C.bone}" stroke-width="3"/>
      <path d="M30 60 H70" stroke="${C.good}" stroke-width="3"/><text x="50" y="100" fill="${C.good}">I度 微小損傷</text>
      <line x1="105" y1="40" x2="105" y2="80" stroke="${C.bone}" stroke-width="3"/><line x1="145" y1="40" x2="145" y2="80" stroke="${C.bone}" stroke-width="3"/>
      <path d="M105 60 H123 M133 60 H145" stroke="${C.warm}" stroke-width="3"/><text x="125" y="100" fill="${C.warm}">II度 部分断裂</text>
      <line x1="180" y1="40" x2="180" y2="80" stroke="${C.bone}" stroke-width="3"/><line x1="220" y1="40" x2="220" y2="80" stroke="${C.bone}" stroke-width="3"/>
      <path d="M180 60 H192 M208 60 H220" stroke="${C.bad}" stroke-width="3" stroke-dasharray="2 4"/><text x="200" y="100" fill="${C.bad}">III度 完全断裂</text>
    </g>
  </svg>`;

  // 20) Synovial joint types
  F.joints = `<svg viewBox="0 0 240 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="関節の種類">
    <g font-size="9" text-anchor="middle">
      <rect x="24" y="35" width="20" height="20" fill="${C.bone}"/><path d="M24 60 h20" stroke="${C.accent}" stroke-width="3"/><rect x="24" y="62" width="20" height="14" fill="${C.bone}"/>
      <text x="34" y="96" fill="${C.sub}">蝶番(肘膝)</text>
      <circle cx="120" cy="48" r="13" fill="${C.bone}"/><path d="M104 62 a16 8 0 0 0 32 0" fill="none" stroke="${C.accent}" stroke-width="3"/>
      <text x="120" y="96" fill="${C.sub}">球(肩股)</text>
      <line x1="205" y1="34" x2="205" y2="76" stroke="${C.bone}" stroke-width="4"/><circle cx="205" cy="55" r="11" fill="none" stroke="${C.accent}" stroke-width="3"/>
      <text x="205" y="96" fill="${C.sub}">車軸(環軸)</text>
    </g>
  </svg>`;

  window.FIGURES = F;

  // Where each figure appears in 教材 / quiz feedback (field -> cat -> figureId)
  window.FIGURE_MAP = {
    anatomy: { "関節": "joints", "骨格・体幹": "spine", "循環器": "heart", "呼吸器": "gas", "神経系": "neuron" },
    physiology: { "エネルギー代謝": "energy", "循環・心臓": "heart", "呼吸・ガス交換": "gas", "神経生理": "neuron", "シナプス伝達": "neuron" },
    functional_anatomy: { "関節運動（面と軸）": "planes", "筋の起始停止": "muscle", "筋の作用": "muscle" },
    nutrition: { "エネルギー代謝": "macros", "糖質": "macros", "脂質": "macros", "タンパク質": "macros" },
    biomechanics: { "てこ(レバー)": "levers", "ニュートンの法則": "fma", "重心・安定性": "com_bos", "筋の力学(力-長さ/力-速度)": "fv", "歩行・走行力学": "gait" },
    kinesiology: { "エネルギー供給系とトレーニング": "energy", "回復・超回復": "supercomp" },
    assessment: { "関節可動域(ROM)": "rom", "徒手筋力テスト(MMT)": "mmt", "姿勢評価": "posture" },
    rehab: { "組織治癒過程": "healing", "捻挫": "sprain" },
  };
})();
