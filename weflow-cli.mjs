#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
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

function toInt(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function readConfig() {
  const configPath = process.env.WEFLOW_CONFIG_PATH || path.resolve("config.local.json");
  if (!fs.existsSync(configPath)) {
    throw new Error(`Missing config: ${configPath}. Copy templates/config.local.template.json to config.local.json first.`);
  }
  const raw = fs.readFileSync(configPath, "utf8").replace(/^\uFEFF/, "");
  const config = JSON.parse(raw);
  if (!config.baseUrl) throw new Error("config.local.json missing baseUrl");
  if (!config.token) throw new Error("config.local.json missing token");
  return config;
}

function buildUrl(baseUrl, route, query = {}) {
  const url = new URL(route, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function apiGet(config, route, query = {}) {
  const url = buildUrl(config.baseUrl, route, query);
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.token}`,
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${route} -> ${res.status}: ${text}`);
  }
  return JSON.parse(text);
}

async function getSessions(config, { keyword = "", limit = 100 } = {}) {
  return apiGet(config, "/api/v1/sessions", { keyword, limit });
}

async function resolveTalker(config, args) {
  if (args.talker) return args.talker;
  if (!args.name) throw new Error("Missing --talker or --name");
  const sessions = await getSessions(config, { keyword: args.name, limit: 500 });
  const list = sessions.sessions || [];
  const exact = list.find((s) => s.displayName === args.name);
  if (exact) return exact.username;
  const partial = list.find((s) => (s.displayName || "").includes(args.name));
  if (partial) return partial.username;
  throw new Error(`Cannot resolve session from name: ${args.name}. Run: node weflow-cli.mjs sessions --keyword "keyword" --limit 50`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];

  if (!command || command === "help" || command === "--help") {
    console.log([
      "Usage:",
      "  node weflow-cli.mjs sessions [--keyword xxx] [--limit 20]",
      "  node weflow-cli.mjs group-members --name \"群名\" [--counts] [--refresh]",
      "  node weflow-cli.mjs messages --name \"群名\" --start YYYYMMDD --end YYYYMMDD --limit 10000 [--media]",
      "  node weflow-cli.mjs messages --talker xxx@chatroom --start YYYYMMDD --end YYYYMMDD --limit 10000 [--media]",
      "",
      "Config:",
      "  Copy templates/config.local.template.json to config.local.json, then fill baseUrl and token from WeFlow settings.",
    ].join("\n"));
    return;
  }

  const config = readConfig();
  if (command === "sessions") {
    const data = await getSessions(config, {
      keyword: args.keyword || "",
      limit: toInt(args.limit, 20),
    });
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (command === "group-members") {
    const talker = await resolveTalker(config, args);
    const data = await apiGet(config, "/api/v1/group-members", {
      talker,
      includeMessageCounts: args.counts ? 1 : 0,
      forceRefresh: args.refresh ? 1 : 0,
    });
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (command === "messages") {
    const talker = await resolveTalker(config, args);
    const data = await apiGet(config, "/api/v1/messages", {
      talker,
      limit: toInt(args.limit, 20),
      offset: toInt(args.offset, 0),
      start: args.start,
      end: args.end,
      keyword: args.keyword,
      media: args.media ? 1 : 0,
    });
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
