#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function ok(name, pass, detail = "") {
  return { name, ok: Boolean(pass), detail };
}

const checks = [];
const root = process.cwd();
const configPath = path.join(root, "config.local.json");
const templatePath = path.join(root, "templates", "config.local.template.json");

checks.push(ok("Node.js available", true, process.version));
checks.push(ok("config template exists", fs.existsSync(templatePath), templatePath));
checks.push(ok("config.local.json exists", fs.existsSync(configPath), configPath));
checks.push(ok("weflow-cli.mjs exists", fs.existsSync(path.join(root, "weflow-cli.mjs")), "root CLI"));
checks.push(ok("visual skill exists", fs.existsSync(path.join(root, "skills", "weflow-visual-daily", "SKILL.md")), "skills/weflow-visual-daily"));

if (fs.existsSync(configPath)) {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, "utf8").replace(/^\uFEFF/, ""));
    checks.push(ok("config has baseUrl", Boolean(config.baseUrl), config.baseUrl || ""));
    checks.push(ok("config has token", Boolean(config.token), config.token ? "present" : ""));
  } catch (error) {
    checks.push(ok("config JSON parse", false, error instanceof Error ? error.message : String(error)));
  }
}

const allOk = checks.every((item) => item.ok);
const wantsJson = process.argv.includes("--json");

if (wantsJson) {
  console.log(JSON.stringify({ ok: allOk, checks }, null, 2));
} else {
  console.log(allOk ? "OK: basic setup looks ready." : "NOT READY: finish the items marked [FAIL].");
  console.log("");
  for (const item of checks) {
    console.log(`${item.ok ? "[OK]  " : "[FAIL]"} ${item.name}${item.detail ? ` - ${item.detail}` : ""}`);
  }
  if (!allOk) {
    console.log("");
    console.log("Next step:");
    if (!fs.existsSync(configPath)) {
      console.log("  Copy templates/config.local.template.json to config.local.json, then fill baseUrl and token from WeFlow settings.");
    } else {
      console.log("  Open config.local.json and check baseUrl/token.");
    }
  }
}
process.exit(allOk ? 0 : 1);
