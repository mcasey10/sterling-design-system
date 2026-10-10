#!/usr/bin/env node
// Reports WCAG 2.x contrast ratios for every text/background pair defined in
// tokens/tokens.json (contrast.rules), in every Color mode.
// Exits 1 if any enforced pair falls below its threshold.
//
// Usage: node scripts/contrast-check.mjs [--failures-only] [path/to/tokens.json]

import { resolve } from "node:path";
import { loadTokens, evaluateContrast, DEFAULT_TOKENS_PATH } from "./lib/tokens.mjs";

const args = process.argv.slice(2);
const failuresOnly = args.includes("--failures-only");
const tokensPath = resolve(args.find((a) => !a.startsWith("--")) ?? DEFAULT_TOKENS_PATH);
const tokens = loadTokens(tokensPath);
const results = evaluateContrast(tokens);
const pad = (s, n) => String(s).padEnd(n);

for (const mode of tokens.color.$modes) {
  console.log(`\n=== Mode: ${mode} ===`);
  for (const rule of tokens.contrast.rules) {
    const lines = results
      .filter((r) => r.mode === mode && r.rule === rule.name && (!failuresOnly || !r.pass))
      .map((r) => {
        const status = r.exempt ? "info" : r.pass ? "PASS" : "FAIL";
        return `  ${pad(status, 5)} ${r.ratio.toFixed(2).padStart(5)}:1  ${pad(r.fg, 24)} ${pad(r.fgHex, 8)} on ${pad(r.bg, 24)} ${r.bgHex}`;
      });
    if (lines.length) {
      const min = results.find((r) => r.rule === rule.name).min;
      const req = min === null ? "reported only" : `min ${min}:1`;
      console.log(`\n${rule.name}  [${rule.level}, ${req}]`);
      lines.forEach((l) => console.log(l));
    }
  }
}

const failures = results.filter((r) => !r.pass).length;
console.log(`\n${results.length} pairs checked across ${tokens.color.$modes.length} modes — ${failures} failure(s).`);
process.exit(failures ? 1 : 0);
