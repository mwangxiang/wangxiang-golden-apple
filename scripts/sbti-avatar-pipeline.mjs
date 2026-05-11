#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function readJson(file) {
  let text = fs.readFileSync(file, "utf8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  return JSON.parse(text);
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value.endsWith("\n") ? value : `${value}\n`, "utf8");
}

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function short(value, max = 90) {
  const text = clean(value);
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function relFromToolRoot(file) {
  const relative = path.relative(toolRoot, path.resolve(file)).replace(/\\/g, "/");
  return relative.startsWith("..") ? path.resolve(file) : relative;
}

function resolveFromToolRoot(value) {
  if (!value) return "";
  return path.isAbsolute(value) ? value : path.join(toolRoot, value);
}

function fail(message, extra = {}) {
  console.error(JSON.stringify({ ok: false, error: message, ...extra }, null, 2));
  process.exit(1);
}

function runNode(script, args) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: toolRoot,
    stdio: "inherit",
    shell: false,
  });
  if (result.status !== 0) {
    fail(`Command failed: node ${script}`, { status: result.status });
  }
}

function runPowerShell(script, args) {
  const result = spawnSync("powershell", ["-ExecutionPolicy", "Bypass", "-File", script, ...args], {
    cwd: toolRoot,
    stdio: "inherit",
    shell: false,
  });
  if (result.status !== 0) {
    fail(`Command failed: powershell -File ${script}`, { status: result.status });
  }
}

function copyFile(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function assertFile(file, label) {
  if (!fs.existsSync(file)) fail(`Missing ${label}: ${file}`);
}

function looksMojibake(value) {
  const text = clean(value);
  return /[\uFFFD\uE000-\uF8FF]/.test(text) || /(?:鐜|璐|绋|澶|儚|鍐|姤|鎬|鐢|诲|鍙|戣|█|||閮|椋|姊)/.test(text);
}

function assertNoMojibake(value, label) {
  if (looksMojibake(value)) fail(`Suspected mojibake in ${label}`, { value });
}

function normalizePercent(value) {
  const text = clean(value);
  return text.endsWith("%") ? text : `${text}%`;
}

function safeFileName(value) {
  return clean(value)
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80) || "weflow";
}

const SBTI_TYPES = {
  CTRL: { code: "CTRL", name: "拿捏者", hint: "掌控节奏，能把讨论拉回主线" },
  SAGE: { code: "SAGE", name: "智者", hint: "冷静判断，输出分析和标准" },
  NERD: { code: "NERD", name: "技术宅", hint: "深挖工具、模型、接口或技术细节" },
  CALC: { code: "CALC", name: "精算师", hint: "关注成本、价格、财税审和数字口径" },
  OPS: { code: "OPS", name: "流程官", hint: "擅长流程、自动化、总结和落地步骤" },
  QA: { code: "QA", name: "质检官", hint: "盯公式、错误、风险和边界条件" },
  ARCH: { code: "ARCH", name: "架构师", hint: "沉淀框架、方案和可复用结构" },
  GLUE: { code: "GLUE", name: "粘合剂", hint: "回应他人，连接话题和关系" },
  MEME: { code: "MEME", name: "梗王", hint: "用玩笑、表情和吐槽制造气氛" },
  MALO: { code: "MALO", name: "打工人", hint: "把职场现场和情绪说出来" },
  RUSH: { code: "RUSH", name: "冲锋者", hint: "信息灵通，第一时间响应" },
  HEAL: { code: "HEAL", name: "治愈者", hint: "语气温和，提供支持和稳定感" },
};

function textForType(person) {
  return [
    person.name,
    person.quote,
    person.description,
    person.scene,
    ...(person.terms || []).map((item) => item.term || item),
  ].map(clean).join(" ");
}

function typeCandidates(person) {
  const text = textForType(person);
  const candidates = [];
  function add(code, score) {
    candidates.push({ ...SBTI_TYPES[code], score });
  }
  if (/流程|工作流|自动化|总结|输出|步骤|落地|复盘/.test(text)) add("OPS", 9);
  if (/框架|方案|结构|复用|通用|定义|体系|架构/.test(text)) add("ARCH", 9);
  if (/公式|表格|列|错误|没对准|false|true|风险|边界|检查/.test(text)) add("QA", 9);
  if (/财|税|审|会计|发票|申报|成本|价格|股权|公司法|预算|数字/.test(text)) add("CALC", 8);
  if (/判断|分析|标准|评分|逻辑|解释|理解|性价比|观察/.test(text)) add("SAGE", 8);
  if (/AI|GPT|Claude|Kimi|API|模型|代码|接口|工具|token|提示词/i.test(text)) add("NERD", 7);
  if (/哈哈|笑|梗|吐槽|离谱|牛|91年|表情|666|可乐|裂开/.test(text)) add("MEME", 8);
  if (/上班|老板|打工|职场|工作|摸鱼|加班|同事|人情|关系/.test(text)) add("MALO", 7);
  if (/@|欢迎|大家|你们|收到|支持|一起|回复/.test(text)) add("GLUE", 6);
  if (/建议|组织|主线|节奏|推进|安排|决定/.test(text)) add("CTRL", 7);
  if (/第一时间|马上|现在|快|刚刚|渠道|消息/.test(text)) add("RUSH", 6);
  if (/稳|温和|关心|舒服|支持|鼓励|治愈/.test(text)) add("HEAL", 5);
  if (!candidates.length) {
    const original = clean(person.type?.code);
    if (SBTI_TYPES[original]) add(original, 5);
  }
  if (!candidates.length) add("SAGE", 1);
  return candidates.sort((a, b) => b.score - a.score);
}

function diversifyPeopleTypes(people) {
  const used = new Map();
  return people.map((person, index) => {
    const candidates = typeCandidates(person);
    const original = clean(person.type?.code);
    if (SBTI_TYPES[original] && !candidates.some((item) => item.code === original)) {
      candidates.push({ ...SBTI_TYPES[original], score: 4 });
    }
    const maxSame = people.length >= 8 ? 2 : 3;
    const picked = candidates.find((item) => (used.get(item.code) || 0) < maxSame) ||
      Object.values(SBTI_TYPES).find((item) => (used.get(item.code) || 0) === 0) ||
      candidates[0];
    used.set(picked.code, (used.get(picked.code) || 0) + 1);
    return {
      ...person,
      type: {
        code: picked.code,
        name: picked.name,
        fit: picked.hint,
        original: person.type || null,
      },
      typeDiversityNote: index === 0 ? "SBTI display types diversified by pipeline" : undefined,
    };
  });
}

function traitText(row) {
  const t = row?.avatarTraits || {};
  return [
    `subject: ${clean(t.subject)}`,
    `colors: ${clean(t.colors)}`,
    `pose/composition: ${clean(t.poseComposition)}`,
    `background: ${clean(t.background)}`,
    `symbols/accessories: ${clean(t.symbolsAccessories)}`,
    `emotion: ${clean(t.emotion)}`,
  ].join("; ");
}

function loadPeople(persona, traits) {
  const traitByRank = new Map((traits.people || []).map((item) => [Number(item.rank), item]));
  return (persona.people || []).slice(0, 10).map((person, index) => {
    const rank = Number(person.rank || index + 1);
    const trait = traitByRank.get(rank);
    if (!trait) fail(`Missing avatar traits for rank ${rank} ${person.name || ""}`);
    const t = trait.avatarTraits || {};
    const missing = ["subject", "colors", "poseComposition", "background", "symbolsAccessories", "emotion"].filter((key) => !clean(t[key]));
    if (missing.length) fail(`Incomplete avatar traits for rank ${rank}`, { missing });
    return { ...person, rank, avatarTrait: trait };
  });
}

function buildPrompt({ persona, traits, group, date, interval, people: suppliedPeople = null }) {
  const people = suppliedPeople || diversifyPeopleTypes(loadPeople(persona, traits));
  const cards = people.map((person) => {
    const type = person.type || {};
    const terms = (person.terms || []).slice(0, 4).map((item) => clean(item.term || item)).filter(Boolean).join("、") || "群内互动";
    return `第${person.rank}张：
- 姓名：${clean(person.name)}
- 发言数：${person.count}条（占比${normalizePercent(person.percent)}）
- SBTI类型：${clean(type.code)} · ${clean(type.name)}
- 头像视觉特征：真实头像显示 ${traitText(person.avatarTrait)}。必须保留这些身份线索并扩写成更精致的半身像或拟人角色，不要直接贴原头像。
- 插画场景：${clean(person.scene || `结合头像特征和 ${terms} 话题，生成温暖、专业、可分享的半身插画场景。`)}
- 性格标签：${short(person.description, 110)} 关键词：${terms}。金句：「${short(person.quote, 42)}」`;
  }).join("\n\n");

  return `生成一张横版信息图海报（4096x2816），高清细腻，适合微信群和社交媒体分享。

【标题】
顶部居中大字：「${group} · 高频发言 Top10 · SBTI 人物画像」
副标题：「共 ${persona.totalMessages || ""} 条消息 | ${date} | 统计区间：${interval}」
右上角水印：「数据来源：WeFlow 本地聊天记录」

【整体风格】
- 浅米白色/奶油色温暖背景，顶部淡紫到淡蓝轻渐变
- 卡片式网格布局：5列 x 2行，共10张人物卡片
- 每张卡片上部 60% 是头像特征二创插画，下部 40% 是清晰中文信息区
- 画风：日系写实动漫风、柔和光影、精细线条、专业但有人情味
- 必须体现每个真实头像的视觉差异，不要把多人画成同一模板
- SBTI 类型也必须多样：Top10 至少 5 种类型，同一类型最多出现 2 次；不要把多数人都标成 NERD 技术宅

【头像链路】
本提示词已经把真实微信头像识别为文字 traits。请根据每张卡片的“头像视觉特征”生成二创主视觉：
- 不要直接粘贴原头像
- 不要生成无关随机人物
- 不要忽略动物、面具、服装、道具、背景、颜色等原头像核心特征
- 如果某个头像是动物、风景、符号或物品，可以拟人化，但必须保留其原始视觉符号

【10张人物卡片】
${cards}

【卡片设计规范】
- 每张卡片：白色圆角矩形，轻微投影
- 第一行：姓名（黑色粗体）+ 发言数（灰色）
- 第二行：SBTI 类型标签（彩色圆角药丸背景）
- 第三行起：性格描述，必须包含金句精简版
- 中文字体：思源黑体 / Noto Sans SC；数字和英文可用 SF Pro

【底部标语】
「一起学习，一起思考，一起把真实问题做成案例。」

【负面约束】
- 不要本地简笔图感，不要扁平矢量头像，不要 HTML 截图感
- 不要把真实头像小图直接贴进卡片
- 不要漏掉 SBTI、金句、性格模型
- 不要出现乱码、双花括号占位变量或“需要补齐”等未完成文字
`;
}

function updateManifestForPrepare({ manifestPath, group, date, interval, runName, messages, members }) {
  const existing = fs.existsSync(manifestPath) ? readJson(manifestPath) : {};
  const manifest = {
    ...existing,
    generatedAt: existing.generatedAt || new Date().toISOString(),
    groupName: group,
    timezone: "Asia/Shanghai",
    window: {
      ...(existing.window || {}),
      text: interval,
    },
    source: {
      ...(existing.source || {}),
      messages: messages ? relFromToolRoot(messages) : existing.source?.messages,
      members: members ? relFromToolRoot(members) : existing.source?.members,
    },
    requiresAvatarRemix: true,
    requiresSbtiTemplate: true,
    intent: {
      ...(existing.intent || {}),
      avatarRemix: true,
      sbtiPoster: true,
      contentDaily: true,
    },
    posterType: "SBTI-avatar-portrait",
    outputMode: "awaiting-image-model",
    deliverableContract: {
      contentDaily: "separate local PNG generated during prepare",
      avatarPoster: "separate image-model PNG accepted only after finalize",
      combinedPosterAllowed: false,
    },
    finalGate: "blocked until imageModelFinal.sourceGeneratedImage points to .codex/generated_images",
    updatedAt: new Date().toISOString(),
  };
  delete manifest.imageModelFinal;
  if (manifest.imageModel && typeof manifest.imageModel === "object") delete manifest.imageModel.final;
  writeJson(manifestPath, manifest);
  return { manifest, runName, manifestPath };
}

function firstExisting(candidates) {
  for (const candidate of candidates.filter(Boolean)) {
    const resolved = resolveFromToolRoot(candidate);
    if (fs.existsSync(resolved)) return resolved;
  }
  return "";
}

function sourcePaths({ manifestPath }) {
  const manifest = fs.existsSync(manifestPath) ? readJson(manifestPath) : {};
  const messages = firstExisting([
    arg("messages"),
    manifest.source?.messages,
    path.join("reports", "raw", runName, "messages.json"),
  ]);
  const members = firstExisting([
    arg("members"),
    manifest.source?.members,
    path.join("reports", "raw", runName, "members_counts.json"),
  ]);
  return { messages, members };
}

function buildContentDaily({ manifestPath, group, interval }) {
  const { messages, members } = sourcePaths({ manifestPath });
  if (!messages || !members) {
    const needsPath = path.join(runDir, "image-model-pack", "NEEDS_CONTENT_DAILY_SOURCE.md");
    writeText(needsPath, `# NEEDS_CONTENT_DAILY_SOURCE

The independent content daily poster needs both source files:

- messages.json
- members_counts.json

Pass them explicitly:

\`\`\`powershell
node scripts\\sbti-avatar-pipeline.mjs prepare --run-dir "${relFromToolRoot(runDir)}" --group "${group}" --date "YYYY-MM-DD" --interval "${interval}" --messages "reports/raw/RUN/messages.json" --members "reports/raw/RUN/members_counts.json"
\`\`\`
`);
    fail("Missing source files for content daily", { next: relFromToolRoot(needsPath) });
  }

  const generatedDir = path.join(runDir, "generated");
  const projectFile = path.join(generatedDir, `${runName}_content_daily.png`);
  runPowerShell(path.join("scripts", "build-community-essence-daily-v2.ps1"), [
    "-Messages", messages,
    "-Members", members,
    "-Out", projectFile,
    "-GroupName", group,
    "-WindowText", interval,
  ]);

  const downloadDir = path.join(toolRoot, "downloads", `weflow-visual-daily-${runName}`);
  const downloadFile = path.join(downloadDir, `${safeFileName(group)}_${runName}_社群内容日报.png`);
  copyFile(projectFile, downloadFile);
  return {
    project: relFromToolRoot(projectFile),
    download: relFromToolRoot(downloadFile),
    messages,
    members,
  };
}

function prepare() {
  const group = clean(arg("group"));
  const date = clean(arg("date"));
  const interval = clean(arg("interval"));
  if (!group || !date || !interval) fail("prepare requires --group, --date, and --interval");
  assertNoMojibake(group, "group");

  assertFile(runDir, "run directory");
  const personaPath = path.join(runDir, "sbti-persona-data.json");
  const traitsPath = path.join(runDir, "avatar-reference", "avatar-traits.json");
  const avatarSheetPath = path.join(runDir, "avatar-reference", "top10-avatar-reference-sheet.png");
  const promptPath = path.join(runDir, "image-model-pack", "gpt-image-2-sbti-template-filled.md");
  const readyPath = path.join(runDir, "image-model-pack", "READY_FOR_IMAGE_GEN.md");
  const jobPath = path.join(runDir, "image-model-pack", "reference-conditioned-job.json");
  const manifestPath = path.join(runDir, "visual-daily-manifest.json");

  assertFile(personaPath, "sbti-persona-data.json");
  if (!fs.existsSync(avatarSheetPath)) {
    const needSheetPath = path.join(runDir, "image-model-pack", "NEEDS_AVATAR_REFERENCE_SHEET.md");
    writeText(needSheetPath, `# NEEDS_AVATAR_REFERENCE_SHEET

Missing:
${relFromToolRoot(avatarSheetPath)}

Build the real avatar reference sheet before preparing the image-model prompt.
Do not continue with nickname-only or random generated portraits.
`);
    fail("Missing top10-avatar-reference-sheet.png", { next: relFromToolRoot(needSheetPath) });
  }
  if (!fs.existsSync(traitsPath)) {
    const needTraitsPath = path.join(runDir, "avatar-reference", "NEEDS_AVATAR_TRAITS.md");
    writeText(needTraitsPath, `# NEEDS_AVATAR_TRAITS

Missing:
${relFromToolRoot(traitsPath)}

Inspect the real avatar sheet:
${relFromToolRoot(avatarSheetPath)}

Create avatar-traits.json with this shape:

\`\`\`json
{
  "source": "avatar-reference/top10-avatar-reference-sheet.png",
  "method": "manual visual inspection from real downloaded WeChat avatars",
  "people": [
    {
      "rank": 1,
      "name": "member name",
      "avatarTraits": {
        "subject": "what the real avatar shows",
        "colors": "dominant colors",
        "poseComposition": "pose and composition",
        "background": "background",
        "symbolsAccessories": "symbols and accessories",
        "emotion": "emotion or mood"
      }
    }
  ]
}
\`\`\`

Do not continue with local poster renderers as final output.
`);
    fail("Missing avatar-traits.json", { next: relFromToolRoot(needTraitsPath) });
  }

  const persona = readJson(personaPath);
  const traits = readJson(traitsPath);
  const people = diversifyPeopleTypes(loadPeople(persona, traits));
  for (const person of people) {
    assertNoMojibake(person.name, `person ${person.rank} name`);
    assertNoMojibake(person.type?.name || "", `person ${person.rank} SBTI type`);
  }

  const contentDaily = buildContentDaily({ manifestPath, group, interval });
  const prompt = buildPrompt({ persona, traits, group, date, interval, people });
  writeText(promptPath, prompt);
  writeJson(jobPath, {
    generatedAt: new Date().toISOString(),
    mode: "ready-for-image-model",
    groupName: group,
    date,
    interval,
    avatarSheet: relFromToolRoot(avatarSheetPath),
    avatarTraits: relFromToolRoot(traitsPath),
    promptPath: relFromToolRoot(promptPath),
    people: people.map((person) => ({
      rank: person.rank,
      name: person.name,
      count: person.count,
      percent: normalizePercent(person.percent),
      type: person.type,
      quote: person.quote,
      avatarTraits: person.avatarTrait.avatarTraits,
    })),
    nextRequiredStep: "Call image_gen or an image API with the canonical prompt. Do not run local renderers as final.",
  });
  writeText(readyPath, `# READY_FOR_IMAGE_GEN

Run directory:
${relFromToolRoot(runDir)}

Canonical prompt:
${relFromToolRoot(promptPath)}

Avatar reference sheet:
${relFromToolRoot(avatarSheetPath)}

Required next step:
Use the image model to generate the final SBTI/avatar poster from the canonical prompt.

Separate deliverables:
- Content daily poster already generated:
  - project: ${contentDaily.project}
  - download: ${contentDaily.download}
- Avatar/SBTI poster is still pending image-model generation and must be finalized as a different PNG.

Blocked actions:
- Do not use local PowerShell/HTML/vector renderers as the final avatar poster.
- Do not put the content daily report into the avatar/SBTI poster.
- Do not treat the content daily PNG as the avatar/SBTI final.
- Do not provide Downloads/project PNG paths as final until \`finalize\` and \`validate\` pass.

After image generation, run:

\`\`\`powershell
node scripts\\sbti-avatar-pipeline.mjs finalize --run-dir "${relFromToolRoot(runDir)}" --source-generated-image "C:\\Users\\YOU\\.codex\\generated_images\\...\\image.png" --name "final-sbti-avatar.png" --download-name "下载文件名.png"
node scripts\\sbti-avatar-pipeline.mjs validate --run-dir "${relFromToolRoot(runDir)}"
\`\`\`
`);

  const prepared = updateManifestForPrepare({
    manifestPath,
    group,
    date,
    interval,
    runName,
    messages: contentDaily.messages,
    members: contentDaily.members,
  });
  writeJson(manifestPath, {
    ...prepared.manifest,
    contentDaily: {
      project: contentDaily.project,
      download: contentDaily.download,
      generatedAt: new Date().toISOString(),
    },
    outputs: {
      project: [contentDaily.project],
      download: [contentDaily.download],
    },
    updatedAt: new Date().toISOString(),
  });

  console.log(JSON.stringify({
    ok: true,
    phase: "prepare",
    runDir: relFromToolRoot(runDir),
    contentDaily: {
      project: contentDaily.project,
      download: contentDaily.download,
    },
    avatarPoster: {
      status: "awaiting-image-model",
      requiredFinalizeSource: ".codex/generated_images PNG",
    },
    prompt: relFromToolRoot(promptPath),
    ready: relFromToolRoot(readyPath),
    avatarSheet: relFromToolRoot(avatarSheetPath),
    people: people.length,
    next: "Call image_gen with the canonical prompt, then run finalize.",
  }, null, 2));
}

function finalize() {
  const source = arg("source-generated-image");
  const name = clean(arg("name", "final-sbti-avatar.png"));
  const downloadName = clean(arg("download-name", name));
  const outputMode = clean(arg("output-mode", "avatar-trait-linked/final"));
  if (!source) fail("finalize requires --source-generated-image");
  const sourceFile = path.resolve(source);
  assertFile(sourceFile, "source generated image");
  if (!/[\\\/]\.codex[\\\/]generated_images[\\\/]/i.test(sourceFile)) {
    fail("source-generated-image must point to .codex/generated_images", { source: sourceFile });
  }
  if (!/^.+\.png$/i.test(name) || !/^.+\.png$/i.test(downloadName)) {
    fail("--name and --download-name must be PNG filenames");
  }
  if (!new Set(["avatar-trait-linked/final", "reference-image-conditioned/final"]).has(outputMode)) {
    fail("finalize output mode must be reference-image-conditioned/final or avatar-trait-linked/final", { outputMode });
  }

  const generatedDir = path.join(runDir, "generated");
  const projectFile = path.join(generatedDir, name);
  const downloadDir = path.join(toolRoot, "downloads", `weflow-visual-daily-${runName}`);
  const downloadFile = path.join(downloadDir, downloadName);
  copyFile(sourceFile, projectFile);
  copyFile(sourceFile, downloadFile);

  const manifestPath = path.join(runDir, "visual-daily-manifest.json");
  const manifest = fs.existsSync(manifestPath) ? readJson(manifestPath) : {};
  const projectRel = relFromToolRoot(projectFile);
  const downloadRel = relFromToolRoot(downloadFile);
  const projectOutputs = new Set([...(manifest.outputs?.project || []), projectRel]);
  const downloadOutputs = new Set([...(manifest.outputs?.download || []), downloadRel]);
  const updated = {
    ...manifest,
    requiresAvatarRemix: true,
    requiresSbtiTemplate: true,
    intent: {
      ...(manifest.intent || {}),
      avatarRemix: true,
      sbtiPoster: true,
    },
    posterType: "SBTI-avatar-portrait",
    outputMode,
    outputs: {
      ...(manifest.outputs || {}),
      project: [...projectOutputs],
      download: [...downloadOutputs],
    },
    imageModelFinal: {
      sourceGeneratedImage: sourceFile,
      project: projectRel,
      download: downloadRel,
      prompt: relFromToolRoot(path.join(runDir, "image-model-pack", "gpt-image-2-sbti-template-filled.md")),
      tool: "image_gen",
      finalizedAt: new Date().toISOString(),
    },
    updatedAt: new Date().toISOString(),
  };
  writeJson(manifestPath, updated);
  console.log(JSON.stringify({
    ok: true,
    phase: "finalize",
    project: projectRel,
    download: downloadRel,
    manifest: relFromToolRoot(manifestPath),
    next: "Run validate.",
  }, null, 2));
}

function validate() {
  runNode(path.join("scripts", "validate-run.mjs"), [
    "--run-dir",
    relFromToolRoot(runDir),
    "--require-download",
    "true",
  ]);
}

const phase = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : arg("phase", "help");
const runDirArg = arg("run-dir");
if (!["prepare", "finalize", "validate", "help"].includes(phase)) {
  fail(`Unknown phase: ${phase}`);
}
if (phase === "help" || hasFlag("help")) {
  console.log(`Usage:
  node scripts/sbti-avatar-pipeline.mjs prepare --run-dir reports/visual-daily/RUN --group "群名" --date YYYY-MM-DD --interval "HH:mm-HH:mm"
  node scripts/sbti-avatar-pipeline.mjs finalize --run-dir reports/visual-daily/RUN --source-generated-image C:\\Users\\...\\.codex\\generated_images\\...\\image.png --name final.png --download-name final.png
  node scripts/sbti-avatar-pipeline.mjs validate --run-dir reports/visual-daily/RUN

Rules:
  prepare never creates a final avatar poster.
  prepare creates a separate content daily PNG when message/member sources are available.
  avatar poster and content daily poster must be two different deliverables.
  finalize only accepts .codex/generated_images sources.
  validate must pass before final delivery.`);
  process.exit(0);
}
if (!runDirArg) fail(`${phase} requires --run-dir`);

const runDir = path.resolve(runDirArg);
const runName = path.basename(runDir);
const toolRoot = path.resolve(runDir, "..", "..", "..");

if (phase === "prepare") prepare();
if (phase === "finalize") finalize();
if (phase === "validate") validate();
