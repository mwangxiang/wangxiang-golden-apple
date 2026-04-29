#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
}

function writeText(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, "utf8");
}

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").replace(/\uFFFD/g, "").trim();
}

function short(value, max) {
  const text = clean(value);
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

function avatarTrait(row) {
  return clean(row?.avatarTraits || row?.avatarVisualTraits || row?.visualTraits || row?.avatarDescription || "");
}

const personaPath = arg("persona");
const avatarManifestPath = arg("avatar-manifest");
const avatarSheetPath = arg("avatar-sheet");
const out = arg("out");
const groupName = arg("group");
const date = arg("date");
const interval = arg("interval", "全天");
const linkageMode = arg("linkage-mode", avatarSheetPath ? "reference-image-conditioned" : "avatar-trait-linked");

if (!personaPath || !out) {
  console.error("Usage: node build-gpt-image-sbti-poster-prompt.mjs --persona sbti-persona-data.json --out prompt.md --group 群名 --date YYYY-MM-DD [--interval 全天] [--avatar-manifest top10-avatar-reference.json] [--avatar-sheet top10-avatar-reference-sheet.png] [--linkage-mode reference-image-conditioned|avatar-trait-linked]");
  process.exit(2);
}

const data = readJson(personaPath);
const avatarRows = avatarManifestPath && fs.existsSync(avatarManifestPath) ? readJson(avatarManifestPath) : [];
const avatarByRank = new Map((Array.isArray(avatarRows) ? avatarRows : []).map((row) => [Number(row.rank), row]));
const people = (data.people || []).slice(0, 10);
const resolvedGroup = clean(groupName || data.groupName);
const resolvedDate = clean(date || data.date);
const totalMessages = Number(data.totalMessages || 0);
const resolvedInterval = clean(interval || data.interval || "全天");

const referenceBlock = linkageMode === "reference-image-conditioned"
  ? `【头像参考输入】
请把头像参考图和本提示词一起发送给图像生成模型：${avatarSheetPath || "avatar-reference/top10-avatar-reference-sheet.png"}

参考图已经按 1-10 编号排列。本海报的第 N 张卡片必须使用参考图编号 N 的头像作为身份、气质、颜色、表情和符号参考。不要把小头像直接贴进卡片，要扩写成场景化半身像或拟人角色。`
  : `【头像特征关联模式】
当前图像工具如果不能附带头像参考图，必须使用每张卡片里的“头像视觉特征”来生成。每个人都要保留头像的颜色、主体、姿态、背景、文字/符号和情绪价值。不要只写“参考第 N 个头像”，也不要生成随机人物。`;

const cards = people.map((person) => {
  const type = person.type || {};
  const terms = (person.terms || []).slice(0, 4).map((item) => clean(item.term)).filter(Boolean).join("、");
  const desc = short(clean(person.description), 92);
  const quote = clean(person.quote);
  const scene = clean(person.scene);
  const avatar = avatarByRank.get(Number(person.rank)) || {};
  const traits = avatarTrait(avatar);
  const avatarStatus = clean(avatar.avatarStatus || "unknown");
  const avatarLine = avatarStatus === "ok"
    ? traits
      ? `- 头像视觉特征：${traits}`
      : `- 头像视觉特征：需要从编号 ${person.rank} 的真实头像中提取并补齐；如果无法随提示词附图，必须先人工描述该头像，不要跳过。`
    : `- 头像视觉来源：${avatarStatus || "missing"}，不能当作真实头像；请按昵称、群内行为和聊天特征生成替代角色，并在成品说明里标注。`;

  return `第${person.rank}张：
- 姓名：${clean(person.name)}
- 发言数：${person.count}条（占比${person.percent}%）
- SBTI类型：${clean(type.code)} · ${clean(type.name)}
- 头像参考编号：${person.rank}
${avatarLine}
- 插画场景：${scene}
- 性格标签：${desc} 关键词：${terms}。金句：「${quote}」`;
}).join("\n\n");

const prompt = `${referenceBlock}

生成一张横版信息图海报，4096x2816 或最大可用高清分辨率，适合社交媒体分享。

【标题】
顶部居中大字：「${resolvedGroup} · 高频发言 Top10 · SBTI 头像画像」
副标题：「共 ${totalMessages} 条消息 | ${resolvedDate} | 统计区间：${resolvedInterval}」
右上角水印：「数据来源：WeFlow 本地聊天记录」

【整体风格】
- 浅米白色/奶油色温暖背景
- 顶部标题栏使用淡紫到淡蓝轻渐变
- 卡片式网格布局：5列 x 2行，共10张人物卡片
- 每张卡片：上部 60% 是头像参考扩写成的日系写实动漫/精致插画主视觉，下部 40% 是清晰中文信息区
- 不要硬核机甲、不要赛博朋克、不要随机帅哥美女
- 中文小字如果放不下，优先保证姓名、发言数、类型码、类型名和金句短语正确

【10张人物卡片】
${cards}

【卡片设计规范】
- 每张卡片：白色圆角矩形，轻微投影
- 上部 60%：头像关联主视觉，必须扩大并融入聊天行为场景
- 下部 40%：姓名、发言数、SBTI 彩色药丸标签、短描述、橙色金句
- 每张卡片的头像视觉不能互相串用

【底部标语】
一起学习，一起思考，一起把真实问题做成案例。

【负面约束】
- 不要只把头像小图贴在卡片上
- 不要忽略动物、卡通、面具、花、城堡、证件照、文字符号等原头像特征
- 不要生成与头像无关的随机人物
- 如果无法读取头像参考且没有头像视觉特征，停止并说明缺少头像依据，不要继续生成`;

writeText(out, prompt);
console.log(JSON.stringify({ ok: true, out, people: people.length, totalMessages, linkageMode }, null, 2));
