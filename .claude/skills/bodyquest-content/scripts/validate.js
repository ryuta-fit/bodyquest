#!/usr/bin/env node
/* BodyQuest content validator.
   Loads every content/*.js referenced by index.html (in order, skipping
   app.js and gen_images.js), then reports integrity across all fields.
   Usage:  node .claude/skills/bodyquest-content/scripts/validate.js
   Run from the project root (where index.html lives).            */
const fs = require("fs"), vm = require("vm"), path = require("path");
const ROOT = process.cwd();
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const order = [...html.matchAll(/src="([^"?]+\.js)(?:\?[^"]*)?"/g)].map(m => m[1])
  .filter(p => p !== "app.js" && p !== "content/gen_images.js");

const ctx = { window: {}, matchMedia: () => ({ matches: false }) };
vm.createContext(ctx);
let perr = 0, missing = 0;
for (const rel of order) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) { missing++; console.log("MISSING", rel); continue; }
  try { vm.runInContext(fs.readFileSync(abs, "utf8"), ctx); }
  catch (e) { perr++; console.log("PARSE ERR", rel, e.message.split("\n")[0]); }
}
const C = ctx.window.QUIZ_CONTENT || {};
const L = ctx.window.LEARN_CONTENT || {};
const fields = (ctx.window.QUIZ_FIELDS || []).map(f => f.key);
const norm = s => (s || "").replace(/[\s　。、，．,：:；;（）()「」『』\-ー･・]/g, "").toLowerCase();

let grand = 0, dup = 0, bad = 0, over = 0, stem = 0, learnMiss = 0;
const per = [];
for (const k of fields) {
  const arr = C[k] || []; grand += arr.length;
  const ids = new Set(), stems = {};
  for (const q of arr) {
    if (ids.has(q.id)) dup++; ids.add(q.id);
    const n = norm(q.q); stems[n] = (stems[n] || 0) + 1;
    if (!q.id || !q.q || !q.type || q.exp == null) bad++;
    if (q.type === "mc" && (!Array.isArray(q.choices) || q.choices.length !== 4 || q.answer < 0 || q.answer > 3)) bad++;
    if (q.type === "tf" && q.answer !== 0 && q.answer !== 1) bad++;
    if (q.type === "fill" && (typeof q.answer !== "string" || !q.answer)) bad++;
  }
  for (const n in stems) if (stems[n] > 1) stem += stems[n] - 1;
  if (arr.length >= 1000) over++;
  // learn cat alignment
  const lc = L[k]; if (lc && lc.sections) { const qc = new Set(arr.map(q => q.cat)); for (const s of lc.sections) if (!qc.has(s.cat)) learnMiss++; }
  per.push(k + "=" + arr.length);
}
console.log("--- BodyQuest validation ---");
console.log("fields:", fields.length, " total:", grand);
console.log("missing(404):", missing, " parseErr:", perr, " idDup:", dup,
  " schemaBad:", bad, " over1000:", over, " stemDup:", stem, " learnCatMiss:", learnMiss);
console.log(per.join("  "));
const okFlag = (missing + perr + dup + bad + over + stem + learnMiss) === 0;
console.log(okFlag ? "RESULT: OK ✅" : "RESULT: ISSUES ❌");
process.exit(okFlag ? 0 : 1);
