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

function readJson(file) {
  let text = fs.readFileSync(file, "utf8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  return JSON.parse(text);
}

function resolveFromToolRoot(value) {
  if (!value) return "";
  return path.isAbsolute(value) ? value : path.join(toolRoot, value);
}

const generatedDir = path.join(runDir, "generated");
const manifestPath = path.join(runDir, "visual-daily-manifest.json");
const avatarManifestPath = path.join(runDir, "avatar-reference", "top10-avatar-reference.json");
const referenceJobPath = path.join(runDir, "image-model-pack", "reference-conditioned-job.json");
const sbtiTemplateFilledPath = path.join(runDir, "image-model-pack", "gpt-image-2-sbti-template-filled.md");
const avatarTraitsPath = path.join(runDir, "avatar-reference", "avatar-traits.json");
const resolvedRunDir = path.resolve(runDir);
const runName = path.basename(resolvedRunDir);
const toolRoot = path.resolve(resolvedRunDir, "..", "..", "..");
const downloadDir = path.join(toolRoot, "downloads", `weflow-visual-daily-${runName}`);

check("manifest exists", fs.existsSync(manifestPath), manifestPath);
check("generated dir exists", fs.existsSync(generatedDir), generatedDir);

let manifest = null;
if (fs.existsSync(manifestPath)) {
  manifest = readJson(manifestPath);
  const mode = manifest.outputMode || "";
  const isSbtiOrAvatarPoster = Boolean(
    manifest.intent?.sbtiPoster ||
    /sbti|avatar|头像/i.test(String(manifest.reportType || "")) ||
    /sbti|avatar|头像/i.test(String(manifest.posterType || "")) ||
    /SBTI|头像画像|头像海报/i.test(String(manifest.title || ""))
  );
  const requiresAvatarRemix = Boolean(manifest.requiresAvatarRemix || manifest.intent?.avatarRemix);
  const requiresSbtiTemplate = Boolean(
    manifest.requiresSbtiTemplate ||
    manifest.intent?.sbtiPoster ||
    /sbti/i.test(String(manifest.reportType || "")) ||
    /sbti/i.test(String(manifest.posterType || "")) ||
    /SBTI/i.test(String(manifest.title || ""))
  );
  const acceptedModes = new Set([
    "reference-image-conditioned/final",
    "avatar-trait-linked/final",
    "awaiting-image-model",
    "deterministic-avatar-linked/fallback",
    "reference-image-conditioned",
    "avatar-trait-linked",
    "deterministic-avatar-linked"
  ]);
  check("outputMode recorded", Boolean(mode), mode || "missing outputMode");
  check("outputMode accepted", acceptedModes.has(mode), mode);
  check("deterministic output not mislabeled final", mode !== "deterministic-avatar-linked/final", mode);
  if (isSbtiOrAvatarPoster) {
    check("SBTI/avatar poster is not deterministic fallback final", !mode.startsWith("deterministic-avatar-linked"), mode);
  }
  if (requiresAvatarRemix) {
    const finalRemixModes = new Set(["reference-image-conditioned/final", "avatar-trait-linked/final"]);
    check("avatar remix mode is final", finalRemixModes.has(mode), mode);
    check("deterministic fallback blocked for avatar remix", !mode.startsWith("deterministic-avatar-linked"), mode);
  }
  if (mode === "avatar-trait-linked/final" || mode === "reference-image-conditioned/final") {
    check("reference-conditioned job exists", fs.existsSync(referenceJobPath), referenceJobPath);
  }
  if (mode === "avatar-trait-linked/final") {
    check("avatar traits exists", fs.existsSync(avatarTraitsPath), avatarTraitsPath);
    if (fs.existsSync(avatarTraitsPath)) {
      const traits = readJson(avatarTraitsPath);
      const rows = traits.people || [];
      const missing = rows.filter((item) => {
        const t = item.avatarTraits || {};
        return !t.subject || !t.colors || !t.poseComposition || !t.background || !t.symbolsAccessories || !t.emotion;
      });
      check("avatar traits concrete", rows.length > 0 && missing.length === 0, missing.map((item) => item.name || item.rank).join(", "));
    }
  }
  if (requiresSbtiTemplate) {
    check("SBTI template prompt exists", fs.existsSync(sbtiTemplateFilledPath), sbtiTemplateFilledPath);
    if (fs.existsSync(sbtiTemplateFilledPath)) {
      const prompt = fs.readFileSync(sbtiTemplateFilledPath, "utf8");
      const requiredTerms = ["SBTI", "金句", "插画场景", "性格标签", "发言数"];
      const missingTerms = requiredTerms.filter((term) => !prompt.includes(term));
      const unresolvedPatterns = [
        /{{[^}]+}}/,
        /需要从编号\s*\d+/,
        /提取并补齐/,
        /必须先人工描述/,
        /不要跳过/
      ];
      const unresolved = unresolvedPatterns.filter((pattern) => pattern.test(prompt)).map(String);
      const typeCodes = [...prompt.matchAll(/SBTI类型：([A-Z]{2,6})\s*·/g)].map((match) => match[1]);
      const typeCounts = new Map();
      for (const code of typeCodes) typeCounts.set(code, (typeCounts.get(code) || 0) + 1);
      const maxTypeCount = Math.max(0, ...typeCounts.values());
      check("SBTI template prompt has required sections", missingTerms.length === 0, missingTerms.join(", "));
      check("SBTI prompt is not an ad-hoc short prompt", prompt.length > 2500, `${prompt.length} chars`);
      check("SBTI prompt has no unresolved avatar placeholders", unresolved.length === 0, unresolved.join(", "));
      check("SBTI prompt has diverse types", typeCodes.length < 8 || (typeCounts.size >= 5 && maxTypeCount <= 2), JSON.stringify(Object.fromEntries(typeCounts)));
    }
  }
  if (mode === "style-draft/unlinked" || mode === "unlinked/rejected") {
    check("unlinked draft is not final", false, mode);
  }
  const projectOutputs = manifest.outputs?.project || [];
  const downloadOutputs = manifest.outputs?.download || [];
  const imageModelFinal = manifest.imageModelFinal || manifest.imageModel?.final || null;
  if (manifest.intent?.contentDaily || manifest.contentDaily) {
    const project = manifest.contentDaily?.project || "";
    const download = manifest.contentDaily?.download || "";
    check("content daily project output recorded", Boolean(project), "manifest.contentDaily.project missing");
    check("content daily download output recorded", Boolean(download), "manifest.contentDaily.download missing");
    if (project) check("content daily project output exists", fs.existsSync(resolveFromToolRoot(project)), project);
    if (download) check("content daily download output exists", fs.existsSync(resolveFromToolRoot(download)), download);
    if (project) check("content daily project listed in outputs", projectOutputs.includes(project), project);
    if (download) check("content daily download listed in outputs", downloadOutputs.includes(download), download);
    if (imageModelFinal) {
      const avatarProject = imageModelFinal.project || "";
      const avatarDownload = imageModelFinal.download || "";
      check("content daily and avatar poster are separate project PNGs", Boolean(project && avatarProject && project !== avatarProject), `${project} | ${avatarProject}`);
      check("content daily and avatar poster are separate download PNGs", Boolean(download && avatarDownload && download !== avatarDownload), `${download} | ${avatarDownload}`);
    }
  }
  if (manifest.intent?.contentDaily && (mode === "reference-image-conditioned/final" || mode === "avatar-trait-linked/final")) {
    check("final run records both separate deliverables", Boolean(manifest.contentDaily && imageModelFinal), "requires manifest.contentDaily and manifest.imageModelFinal");
  }
  if (isSbtiOrAvatarPoster && (mode === "reference-image-conditioned/final" || mode === "avatar-trait-linked/final")) {
    check("image-model final evidence recorded", Boolean(imageModelFinal), imageModelFinal ? "manifest.imageModelFinal present" : "manifest.imageModelFinal missing");
    if (imageModelFinal) {
      const source = imageModelFinal.sourceGeneratedImage || imageModelFinal.source || "";
      const project = imageModelFinal.project || "";
      const download = imageModelFinal.download || "";
      const sourceFile = source ? path.resolve(source) : "";
      const projectFile = resolveFromToolRoot(project);
      const downloadFile = resolveFromToolRoot(download);
      check("image-model source is Codex generated image", /[\\\/]\.codex[\\\/]generated_images[\\\/]/i.test(sourceFile), source || "missing sourceGeneratedImage");
      check("image-model source file exists", Boolean(sourceFile) && fs.existsSync(sourceFile), source || "missing sourceGeneratedImage");
      check("image-model project copy exists", Boolean(project) && fs.existsSync(projectFile), project || "missing project");
      check("image-model download copy exists", Boolean(download) && fs.existsSync(downloadFile), download || "missing download");
      check("image-model project copy listed in outputs", Boolean(project) && projectOutputs.includes(project), project || "not in outputs.project");
      check("image-model download copy listed in outputs", Boolean(download) && downloadOutputs.includes(download), download || "not in outputs.download");
    }
  }
  if (projectOutputs.length > 0) {
    const missingProject = projectOutputs.filter((item) => {
      const file = path.isAbsolute(item) ? item : path.join(toolRoot, item);
      return !fs.existsSync(file);
    });
    check("manifest project outputs exist", missingProject.length === 0, missingProject.join(", "));
  }
  if (requireDownload) {
    if (downloadOutputs.length > 0) {
      const missingDownload = downloadOutputs.filter((item) => {
        const file = path.isAbsolute(item) ? item : path.join(toolRoot, item);
        return !fs.existsSync(file);
      });
      check("manifest download outputs exist", missingDownload.length === 0, missingDownload.join(", "));
    }
  }
}

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
  const avatars = readJson(avatarManifestPath);
  const placeholders = avatars.filter((item) => item.avatarStatus === "placeholder");
  check("placeholder avatars inspected", true, `${placeholders.length} placeholder`);
  check("no placeholder avatars as real references", placeholders.length === 0, placeholders.map((item) => item.name).join(", "));
} else {
  check("avatar manifest optional or absent", true, avatarManifestPath);
}

const ok = checks.every((item) => item.ok);
console.log(JSON.stringify({ ok, checks }, null, 2));
process.exit(ok ? 0 : 1);
