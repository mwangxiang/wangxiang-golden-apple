#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const group = arg("group");
const date = arg("date");
const slug = arg("slug", `${date || "YYYYMMDD"}-visual-daily`);
const root = arg("root", process.cwd());

if (!group || !date) {
  console.error("Usage: node scripts/run-visual-daily.mjs --group \"群名\" --date YYYYMMDD [--slug run-slug] [--root weflow-tools]");
  process.exit(2);
}

const runDir = path.join(root, "reports", "visual-daily", slug);
const rawDir = path.join(root, "reports", "raw", slug);
const manifest = {
  layer: "candidate",
  group,
  date,
  slug,
  root,
  rawDir,
  runDir,
  generatedDir: path.join(runDir, "generated"),
  requiredChecks: [
    "export JSON with scripts/weflow-json-to-file.mjs",
    "inspect avatar-reference/top10-avatar-reference.json avatarStatus",
    "copy final PNGs into generated/",
    "run validate-run.mjs before delivery"
  ],
  createdAt: new Date().toISOString()
};

fs.mkdirSync(runDir, { recursive: true });
fs.mkdirSync(rawDir, { recursive: true });
fs.mkdirSync(manifest.generatedDir, { recursive: true });
fs.writeFileSync(path.join(runDir, "visual-daily-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(`Created manifest: ${path.join(runDir, "visual-daily-manifest.json")}`);
console.log("");
console.log("Next commands:");
console.log(`cd "${root}"`);
console.log(`node scripts\\weflow-json-to-file.mjs --out "${path.join(rawDir, "messages.json")}" -- messages --name "${group}" --start ${date} --end NEXT_YYYYMMDD --limit 10000 --media`);
console.log(`node scripts\\weflow-json-to-file.mjs --out "${path.join(rawDir, "members_counts.json")}" -- group-members --name "${group}" --counts`);
console.log(`node scripts\\build-sbti-image-prompt.mjs --group "${group}" --date ${date} --messages "${path.join(rawDir, "messages.json")}" --members "${path.join(rawDir, "members_counts.json")}" --out-dir "${runDir}"`);
console.log(`node scripts\\prepare-sbti-avatar-references.mjs --persona "${path.join(runDir, "sbti-persona-data.json")}" --members "${path.join(rawDir, "members_counts.json")}" --out-dir "${path.join(runDir, "avatar-reference")}"`);
