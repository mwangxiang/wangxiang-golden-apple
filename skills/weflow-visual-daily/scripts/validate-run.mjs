#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const runDir = arg("run-dir");
const requireDownload = String(arg("require-download", "false")).toLowerCase() === "true";
if (!runDir) {
  console.error("Usage: node scripts/validate-run.mjs --run-dir <reports/visual-daily/RUN> [--require-download true]");
  process.exit(2);
}

const checks = [];
function check(name, ok, detail = "") {
  checks.push({ name, ok: Boolean(ok), detail });
}

const generatedDir = path.join(runDir, "generated");
const manifestPath = path.join(runDir, "visual-daily-manifest.json");
const avatarManifestPath = path.join(runDir, "avatar-reference", "top10-avatar-reference.json");
const resolvedRunDir = path.resolve(runDir);
const runName = path.basename(resolvedRunDir);
const toolRoot = path.resolve(resolvedRunDir, "..", "..", "..");
const downloadDir = path.join(toolRoot, "downloads", `weflow-visual-daily-${runName}`);

check("manifest exists", fs.existsSync(manifestPath), manifestPath);
check("generated dir exists", fs.existsSync(generatedDir), generatedDir);

let pngs = [];
if (fs.existsSync(generatedDir)) {
  pngs = fs.readdirSync(generatedDir).filter((name) => name.toLowerCase().endsWith(".png"));
}
check("generated png exists", pngs.length > 0, pngs.join(", "));

if (requireDownload) {
  let downloadPngs = [];
  if (fs.existsSync(downloadDir)) {
    downloadPngs = fs.readdirSync(downloadDir).filter((name) => name.toLowerCase().endsWith(".png"));
  }
  check("download dir exists", fs.existsSync(downloadDir), downloadDir);
  check("download png exists", downloadPngs.length > 0, downloadPngs.join(", "));
} else {
  check("download validation optional", true, downloadDir);
}

if (fs.existsSync(avatarManifestPath)) {
  const avatars = JSON.parse(fs.readFileSync(avatarManifestPath, "utf8"));
  const placeholders = avatars.filter((item) => item.avatarStatus === "placeholder");
  check("placeholder avatars inspected", true, `${placeholders.length} placeholder`);
  check("no placeholder avatars as real references", placeholders.length === 0, placeholders.map((item) => item.name).join(", "));
} else {
  check("avatar manifest optional or absent", true, avatarManifestPath);
}

const ok = checks.every((item) => item.ok);
console.log(JSON.stringify({ ok, checks }, null, 2));
process.exit(ok ? 0 : 1);
