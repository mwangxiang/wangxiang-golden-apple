import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import crypto from "node:crypto";

const PLACEHOLDER_HASHES = new Set([
  // WeChat "temporarily unavailable" default avatar returned by expired/hidden qlogo URLs.
  "4c54b206f7c1ad5e0bb61bbef79fdbe3a0d5386f3953abaf3d4ecac4ac6c2411",
  "1b8214ac4449461450d94a808d42e658d6aaac13581554e6776a8e2b83d75125",
]);

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) args[key] = true;
    else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
}

function safeName(value) {
  return String(value || "unknown").replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_");
}

function fileSha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function isPlaceholderAvatar(file) {
  if (!file || !fs.existsSync(file)) return false;
  return PLACEHOLDER_HASHES.has(fileSha256(file));
}

function download(url, file) {
  return new Promise((resolve) => {
    if (!url) return resolve(false);
    const out = fs.createWriteStream(file);
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        out.close();
        fs.unlink(file, () => resolve(false));
        return;
      }
      res.pipe(out);
      out.on("finish", () => out.close(() => resolve(true)));
    }).on("error", () => {
      out.close();
      fs.unlink(file, () => resolve(false));
    });
  });
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.persona || !args.members || !args["out-dir"]) {
    console.error("Usage: node scripts/prepare-sbti-avatar-references.mjs --persona persona.json --members members.json --out-dir avatar-reference");
    process.exit(1);
  }

  const persona = readJson(args.persona);
  const members = readJson(args.members);
  const memberMap = new Map((members.members || []).map((m) => [m.wxid, m]));
  const outDir = path.resolve(args["out-dir"]);
  fs.mkdirSync(outDir, { recursive: true });

  const rows = [];
  for (const person of persona.people || []) {
    const member = memberMap.get(person.wxid) || {};
    const file = path.join(outDir, `${String(person.rank).padStart(2, "0")}_${safeName(person.name)}.jpg`);
    const ok = await download(member.avatarUrl, file);
    const isPlaceholder = ok && isPlaceholderAvatar(file);
    rows.push({
      rank: person.rank,
      wxid: person.wxid,
      name: person.name,
      type: person.type,
      avatarUrl: member.avatarUrl || "",
      avatarFile: ok && !isPlaceholder ? file : "",
      avatarStatus: !ok ? "missing" : isPlaceholder ? "placeholder" : "ok",
      avatarNote: isPlaceholder ? "Downloaded qlogo is WeChat temporary unavailable placeholder, not the member's real avatar." : "",
      scene: person.scene,
      quote: person.quote,
    });
  }

  const manifest = path.join(outDir, "top10-avatar-reference.json");
  fs.writeFileSync(manifest, JSON.stringify(rows, null, 2), "utf8");
  console.log(JSON.stringify({ success: true, outDir, manifest, count: rows.length }, null, 2));
}

main();
