import fs from "fs";

const src = fs.readFileSync("src/lib/translations.ts", "utf8");

function extractBlock(lang) {
  const start = src.indexOf(`  ${lang}: {`);
  let depth = 0;
  let i = start + lang.length + 4;
  for (; i < src.length; i++) {
    if (src[i] === "{") depth++;
    if (src[i] === "}") {
      depth--;
      if (depth === 0) break;
    }
  }
  return src.slice(start, i + 1);
}

function parseKV(block) {
  const o = {};
  const re = /^\s+([a-zA-Z][a-zA-Z0-9]*):\s*"((?:\\.|[^"\\])*)"/gm;
  let m;
  while ((m = re.exec(block))) {
    o[m[1]] = m[2].replace(/\\n/g, "\n").replace(/\\"/g, '"');
  }
  return o;
}

const en = parseKV(extractBlock("en"));
const fr = parseKV(extractBlock("fr"));
const missing = Object.keys(en).filter((k) => !fr[k]);
console.log("Missing count:", missing.length);
fs.writeFileSync("scripts/missing-fr-keys.json", JSON.stringify(missing, null, 2));
