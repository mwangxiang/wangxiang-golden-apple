#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeText(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, "utf8");
}

function cleanText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/\uFFFD/g, "")
    .trim();
}

function displayName(member) {
  return cleanText(member?.displayName || member?.groupNickname || member?.nickname || member?.wxid || "未命名");
}

function localTime(ts) {
  if (!ts) return "";
  return new Date(ts * 1000).toLocaleTimeString("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit"
  });
}

function roleFor(name, sample) {
  const text = `${name} ${sample}`;
  if (/尹星|接客|打佬/.test(text)) return "破冰带动者";
  if (/白开水|劳务派遣|人力资源|申报/.test(text)) return "实务追问者";
  if (/毒药|考勤|迟到|早退/.test(text)) return "职场现场派";
  if (/^C$|据实申报|陈局/.test(text)) return "据实申报梗王";
  if (/风中梧桐|有趣/.test(text)) return "温和捧哏者";
  if (/睿睿|无票收入/.test(text)) return "问题提出者";
  if (/米饭|工资/.test(text)) return "薪酬补刀手";
  if (/小罗|税局/.test(text)) return "税务关键词补充";
  return "关键节点补充者";
}

function short(value, max = 34) {
  const text = cleanText(value);
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

const messagesPath = arg("messages");
const membersPath = arg("members");
const runDir = arg("run-dir");
const groupName = arg("group", "微信群");
const date = arg("date", "2026-04-28");

if (!messagesPath || !membersPath || !runDir) {
  console.error("Usage: node scripts/build-weflow-visual-daily-image-pack.mjs --messages messages.json --members members_counts.json --run-dir reports/visual-daily/RUN --group \"群名\" --date YYYY-MM-DD");
  process.exit(2);
}

const messagesRoot = readJson(messagesPath);
const membersRoot = readJson(membersPath);
const rawMessages = messagesRoot.messages || [];
const members = membersRoot.members || [];
const memberByWxid = new Map(members.map((member) => [member.wxid, member]));
const messages = rawMessages.filter((message) => {
  const content = cleanText(message.content || message.parsedContent || "");
  return message.senderUsername && content && !content.includes("邀请你加入了群聊");
});
const textMessages = messages.filter((message) => cleanText(message.content || message.parsedContent) !== "[动画表情]");
const samplesByWxid = new Map();
for (const message of textMessages) {
  if (!samplesByWxid.has(message.senderUsername)) {
    samplesByWxid.set(message.senderUsername, cleanText(message.content || message.parsedContent));
  }
}

const top = members
  .filter((member) => Number(member.messageCount || 0) > 0)
  .sort((a, b) => Number(b.messageCount || 0) - Number(a.messageCount || 0))
  .slice(0, 10)
  .map((member, index) => {
    const name = displayName(member);
    const sample = samplesByWxid.get(member.wxid) || "关键节点补充信息，让讨论继续往前走";
    return {
      rank: index + 1,
      wxid: member.wxid,
      name,
      count: Number(member.messageCount || 0),
      role: roleFor(name, sample),
      sample: short(sample, 40)
    };
  });

const sorted = rawMessages.filter((m) => m.createTime).sort((a, b) => a.createTime - b.createTime);
const stats = {
  groupName,
  date,
  interval: `${localTime(sorted[0]?.createTime)}-${localTime(sorted.at(-1)?.createTime)}`,
  totalMessages: messages.length,
  textMessages: textMessages.length,
  emojiMessages: messages.length - textMessages.length,
  activeMembers: top.length
};

const quotes = textMessages
  .map((message) => cleanText(message.content || message.parsedContent))
  .filter((text) => text.length > 1)
  .slice(0, 8);

const essencePoints = [
  "新群启动后，主要是入群破冰、招呼和表情互动。",
  "财税实务讨论集中在税局编外人员、劳务派遣、人力资源公司申报。",
  "明确业务问题：无票收入每个月销售多少合理。",
  "职场现场内容包括考勤、迟到、早退、下班时间和据实申报。",
  "整体氛围轻松，适合后续引导成固定答疑和案例复盘节奏。"
];

const avatarPrompt = `请生成一张横版微信群头像海报，主题是「${groupName}」。

画面规格：横版 16:9，高清，适合社群分享。
核心要求：这是用生图模型生成的正式视觉海报，不是网页截图。风格要像温暖、清爽、专业的财税学习社群海报。

版式：
- 标题：${groupName}
- 副标题：2026-04-28 活跃群友头像海报
- 采用 5 x 2 的 Top10 卡片阵列。
- 每张卡片包含：一个友好头像插画、成员昵称、角色标签、发言数。
- 背景使用浅米白、淡青绿、浅金色，专业但不沉闷。
- 不要赛博朋克，不要机甲，不要战斗风，不要过硬核。

Top10 内容：
${top.map((p) => `${p.rank}. ${p.name}｜${p.role}｜${p.count}条｜参考语气：${p.sample}`).join("\n")}

特殊约束：
- 风中梧桐必须画成温和、友好、带一点导师气质的捧哏者，不要机甲，不要奥特曼，不要硬核。
- 中文文字尽量清晰，若无法保证小字，优先保证标题、昵称和角色标签清楚。
- 人物要多样化，像真实社群里的财会、税务、审计、AI 学习者。
`;

const essencePrompt = `请生成一张竖版社群精华日报海报，主题是「${groupName}」。

画面规格：竖版 3:4 或 4:5，高清，适合微信社群转发。
核心要求：这是用生图模型生成的正式视觉海报，不是网页截图。风格是专业财税学习社群的温暖日报。

标题：${groupName}
副标题：社群精华日报｜2026-04-28｜${stats.interval}
关键数据：消息 ${stats.totalMessages} 条｜文本 ${stats.textMessages} 条｜表情 ${stats.emojiMessages} 条｜活跃 ${stats.activeMembers} 人

今日重点：
${essencePoints.map((point, index) => `${index + 1}. ${point}`).join("\n")}

原话摘录可选使用：
${quotes.slice(0, 5).map((quote) => `- ${quote}`).join("\n")}

设计要求：
- 浅米白背景，搭配青绿和浅金色信息块。
- 上半部分是标题和数据概览，中间是今日重点，底部是下一步观察。
- 有财会、税务、审计、AI 的视觉符号：账本、计算器、税票、审计勾选、AI 节点，但不要堆太满。
- 氛围专业、清爽、可信，不要营销海报感过强。
- 中文尽量清晰，尤其是标题、今日重点和关键数据。
`;

const outDir = path.join(runDir, "image-model-pack");
const pack = {
  generatedAt: new Date().toISOString(),
  stats,
  top,
  quotes,
  essencePoints,
  avatarPromptPath: path.join(outDir, "avatar-poster-image-model-prompt.md"),
  essencePromptPath: path.join(outDir, "essence-daily-image-model-prompt.md")
};

writeText(pack.avatarPromptPath, avatarPrompt);
writeText(pack.essencePromptPath, essencePrompt);
writeText(path.join(outDir, "image-model-pack.json"), `${JSON.stringify(pack, null, 2)}\n`);
console.log(JSON.stringify(pack, null, 2));
