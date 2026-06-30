#!/usr/bin/env node
/* BodyQuest exact-duplicate question remover.
   Within each field, keeps the FIRST occurrence of an identical (normalized)
   question stem and removes later duplicates from their source files,
   rewriting only affected files in `concat([...])` + JSON form.
   Usage:  node .claude/skills/bodyquest-content/scripts/dedup.js
   Run from the project root. Safe to run repeatedly (idempotent).      */
const fs = require("fs"), vm = require("vm"), path = require("path");
const ROOT = process.cwd();
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const order = [...html.matchAll(/src="([^"?]+\.js)(?:\?[^"]*)?"/g)].map(m => m[1])
  .filter(p => p !== "app.js" && p !== "content/gen_images.js");

// 1) Global load to decide drops (keep first occurrence per field).
const ctx = { window: {}, matchMedia: () => ({ matches: false }) };
vm.createContext(ctx);
const fileOfId = {};
for (const rel of order) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) continue;
  const before = {};
  const C0 = ctx.window.QUIZ_CONTENT || {};
  for (const k of Object.keys(C0)) before[k] = C0[k].length;
  vm.runInContext(fs.readFileSync(abs, "utf8"), ctx);
  const C = ctx.window.QUIZ_CONTENT || {};
  for (const k of Object.keys(C)) {
    const start = before[k] || 0;
    for (let i = start; i < C[k].length; i++) if (!fileOfId[C[k][i].id]) fileOfId[C[k][i].id] = rel;
  }
}
const C = ctx.window.QUIZ_CONTENT;
const fields = (ctx.window.QUIZ_FIELDS || []).map(f => f.key);
const norm = s => (s || "").replace(/[\s　。、，．,：:；;（）()「」『』\-ー･・]/g, "").toLowerCase();

const dropIds = new Set();
for (const k of fields) {
  const seen = new Map();
  for (const q of (C[k] || [])) {
    const n = norm(q.q);
    if (seen.has(n)) dropIds.add(q.id); else seen.set(n, q.id);
  }
}
console.log("duplicate stems to drop:", dropIds.size);
if (dropIds.size === 0) { console.log("nothing to do"); process.exit(0); }

const filesToFix = new Set();
for (const id of dropIds) filesToFix.add(fileOfId[id]);

for (const rel of filesToFix) {
  const abs = path.join(ROOT, rel);
  const sctx = { window: { QUIZ_CONTENT: {} } };
  vm.createContext(sctx);
  vm.runInContext(fs.readFileSync(abs, "utf8"), sctx);
  const keys = Object.keys(sctx.window.QUIZ_CONTENT);
  if (keys.length !== 1) { console.log("SKIP (multi-key)", rel, keys); continue; }
  const key = keys[0];
  const arr = sctx.window.QUIZ_CONTENT[key];
  const kept = arr.filter(q => !dropIds.has(q.id));
  const body = "[\n" + kept.map(o => "  " + JSON.stringify(o)).join(",\n") + "\n]";
  const out = "window.QUIZ_CONTENT = window.QUIZ_CONTENT || {};\n"
    + "window.QUIZ_CONTENT." + key + " = (window.QUIZ_CONTENT." + key + " || []).concat(" + body + ");\n";
  fs.writeFileSync(abs, out);
  console.log("rewrote", rel, "removed", arr.length - kept.length, "kept", kept.length);
}
console.log("done");
