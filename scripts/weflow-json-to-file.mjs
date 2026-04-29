import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--") {
      args._.push(...argv.slice(i + 1));
      break;
    }
    if (!token.startsWith("--")) {
      args._.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.out || args._.length === 0) {
    console.error('Usage: node scripts/weflow-json-to-file.mjs --out file.json -- messages --name "群名" --start YYYYMMDD --end YYYYMMDD --limit 10000 --media');
    process.exit(1);
  }

  const cliPath = path.resolve("weflow-cli.mjs");
  const outPath = path.resolve(args.out);
  const stdout = execFileSync(process.execPath, [cliPath, ...args._], {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 200 * 1024 * 1024,
  });

  JSON.parse(stdout);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, stdout.endsWith("\n") ? stdout : `${stdout}\n`, "utf8");
  console.log(JSON.stringify({ success: true, out: outPath }, null, 2));
}

main();
