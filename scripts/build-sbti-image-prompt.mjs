import fs from "node:fs";
import path from "node:path";

const SBTI_TYPES = [
  ["CTRL", "拿捏者", "群主/意见领袖，掌控话题节奏"],
  ["SAGE", "智者", "冷静分析，理性输出"],
  ["OWL", "夜枭", "深夜活跃，昼伏夜出"],
  ["COOK", "炸厨者", "美食话题主力，生活气息浓"],
  ["NERD", "技术宅", "专注技术细节，深挖问题"],
  ["HYPE", "捧哏", "气氛组担当，积极回应"],
  ["WILD", "野生者", "毒舌精准，语出惊人"],
  ["ZEN", "禅者", "佛系围观，偶尔金句"],
  ["SLTH", "树懒", "慵懒作息，低频高质量"],
  ["LURK", "潜水者", "长期潜水，偶尔冒泡"],
  ["FIRE", "喷火者", "激烈讨论，观点鲜明"],
  ["GLUE", "粘合剂", "串联话题，维系关系"],
  ["MEME", "梗王", "表情包/梗文化输出"],
  ["HEAL", "治愈者", "关心他人，温暖发言"],
  ["RUSH", "冲锋者", "第一时间响应，信息灵通"],
  ["DEAD", "死者", "已读不回，灵魂离线"],
  ["MALO", "吗喽", "自嘲打工人，苦中作乐"],
  ["DRUNK", "酒鬼", "深夜 emo，情绪化发言"],
];

const TYPE_BY_CODE = new Map(SBTI_TYPES.map(([code, name, fit]) => [code, { code, name, fit }]));
TYPE_BY_CODE.set("CALC", { code: "CALC", name: "精算师", fit: "围绕成本、价格和额度连续测算" });
TYPE_BY_CODE.set("META", { code: "META", name: "架构师", fit: "从系统结构和底层机制解释问题" });

const STOP_WORDS = new Set([
  "这个", "那个", "就是", "然后", "不是", "没有", "可以", "还是", "感觉", "已经",
  "一个", "一下", "这么", "怎么", "什么", "我们", "你们", "他们", "自己", "现在",
  "今天", "明天", "昨天", "哈哈", "哈哈哈", "因为", "所以", "但是", "如果", "可能",
]);

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
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

function decodeTextFile(file) {
  const buffer = fs.readFileSync(file);
  if (buffer.length >= 2) {
    if (buffer[0] === 0xff && buffer[1] === 0xfe) return buffer.toString("utf16le").replace(/^\uFEFF/, "");
    if (buffer[0] === 0xfe && buffer[1] === 0xff) {
      const swapped = Buffer.alloc(buffer.length - 2);
      for (let i = 2; i + 1 < buffer.length; i += 2) {
        swapped[i - 2] = buffer[i + 1];
        swapped[i - 1] = buffer[i];
      }
      return swapped.toString("utf16le");
    }
  }
  return buffer.toString("utf8").replace(/^\uFEFF/, "");
}

function readJson(file) {
  return JSON.parse(decodeTextFile(file));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function cleanText(value) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, "")
    .replace(/[\uD800-\uDFFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function displayNameFor(wxid, memberMap) {
  const member = memberMap.get(wxid);
  return cleanText(member?.displayName || member?.nickname || member?.remark || wxid) || wxid;
}

function formatDate(ts) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ts * 1000)).replaceAll("/", "-");
}

function formatHour(ts) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(ts * 1000));
}

function hourOf(ts) {
  return Number(new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    hourCycle: "h23",
  }).format(new Date(ts * 1000)));
}

function messageText(message) {
  const text = cleanText(message.parsedContent || message.content || "");
  if (!text) return "";
  if (/^\[(图片|语音|视频|动画表情|表情)\]/.test(text)) return "";
  return text;
}

function tokenize(text) {
  const ascii = text.match(/[A-Za-z][A-Za-z0-9+_.-]{1,}/g) || [];
  const chinese = text.match(/[\u4e00-\u9fa5]{2,}/g) || [];
  return [...ascii, ...chinese]
    .map((x) => x.trim())
    .filter((x) => x.length >= 2 && !STOP_WORDS.has(x));
}

function topTerms(messages, limit = 8) {
  const counts = new Map();
  for (const message of messages) {
    for (const token of tokenize(messageText(message))) {
      counts.set(token, (counts.get(token) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"))
    .slice(0, limit)
    .map(([term, count]) => ({ term, count }));
}

function pickQuote(messages) {
  const candidates = messages
    .map(messageText)
    .filter((text) => text.length >= 6 && text.length <= 120)
    .filter((text) => !/^(哈哈+|hh+|好的|是的|可以|不是|收到|OK)$/i.test(text));
  if (!candidates.length) return "在关键节点补充信息，让讨论继续往前走";
  return candidates.sort((a, b) => scoreQuote(b) - scoreQuote(a))[0];
}

function scoreQuote(text) {
  let score = Math.min(text.length, 80);
  if (/[？?！!。]/.test(text)) score += 8;
  if (/(我觉得|我感觉|本质|关键|问题|应该|直接|稳定|成本|模型|提示词|API|token|渠道|代码|github|cursor|claude|kimi|plus|pro)/i.test(text)) score += 14;
  return score;
}

function inferType(messages, rank, totalForMember) {
  const texts = messages.map(messageText).join(" ").toLowerCase();
  const hours = messages.map((m) => hourOf(m.createTime));
  const nightRatio = hours.filter((h) => h >= 23 || h <= 4).length / Math.max(1, hours.length);
  const mediaRatio = messages.filter((m) => [3, 34, 43, 47].includes(m.localType)).length / Math.max(1, messages.length);
  const avgLen = messages.reduce((sum, m) => sum + messageText(m).length, 0) / Math.max(1, messages.length);

  const score = new Map(SBTI_TYPES.map(([code]) => [code, 0]));
  score.set("CALC", 0);
  score.set("META", 0);
  const add = (code, value) => score.set(code, (score.get(code) || 0) + value);
  const hit = (regex) => (texts.match(regex) || []).length;

  add("OWL", nightRatio * 10);
  add("MEME", mediaRatio * 7);
  add("CTRL", Math.min(4, totalForMember / 30) + (rank <= 3 ? 1.2 : 0));
  add("RUSH", Math.max(0, 4 - rank * 0.45));
  add("SAGE", avgLen / 14);
  add("GLUE", 1.2);

  add("CALC", hit(/价格|成本|套餐|额度|倍率|收益|进货|出货|付费|token|渠道|账号|号池|贵|便宜|划算|pro|plus/gi) * 0.75);
  add("META", hit(/agent|架构|设计|系统|稳定性|底层|机制|框架|workflow|gateway|服务|产品/gi) * 1.1);
  add("NERD", hit(/api|代码|github|cursor|claude|kimi|codex|模型|代理|部署|接口|脚本|服务器|提示词|cli|new api/gi) * 0.55);
  add("MALO", hit(/哈哈|笑死|绷|表情|吗喽|打工|捂脸|牛逼|逆天|草/gi) * 0.8);
  add("WILD", hit(/大清|抵制|毒|离谱|先进生产力|无用|阴阳|垃圾|狠|炸/gi) * 1.0);
  add("FIRE", hit(/不行|喷|坏|扯|问题很大|别买|别用|必须|直接|干/gi) * 0.9);
  add("SAGE", hit(/本质|逻辑|判断|长期|方法论|理解|原因|洞见|表达|价值|经验/gi) * 1.0);
  add("CTRL", hit(/我建议|应该|关注|重点|结论|方案|控制|安排|你就|不要|多多/gi) * 0.85);
  add("HYPE", hit(/可以|好|支持|加油|冲|好用|赞|强/gi) * 0.45);
  add("HEAL", hit(/谢谢|辛苦|关心|安慰|舒服|温暖|别急|慢慢/gi) * 1.0);

  if (nightRatio < 0.25) add("OWL", -2);
  if (avgLen < 8) add("SAGE", -1.5);
  if (mediaRatio < 0.15) add("MEME", -1.5);

  return [...score.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 4)
    .map(([code, value]) => ({ ...TYPE_BY_CODE.get(code), score: Number(value.toFixed(2)) }));
}

function diversifyTypes(people) {
  const used = new Map();
  return people.map((person) => {
    const candidates = person.typeCandidates || [person.type];
    const chosen = candidates
      .map((candidate, index) => ({
        candidate,
        adjustedScore: (candidate.score || 0) - (used.get(candidate.code) || 0) * 8 - index * 0.15,
      }))
      .sort((a, b) => b.adjustedScore - a.adjustedScore)[0].candidate;
    used.set(chosen.code, (used.get(chosen.code) || 0) + 1);
    return { ...person, type: chosen };
  });
}

function buildFeatureSentence(person, terms) {
  const topic = terms.length ? terms.slice(0, 3).map((x) => x.term).join("、") : "群内主线";
  return `围绕「${topic}」持续输出，发言节奏${person.nightRatio > 0.35 ? "偏深夜" : "稳定"}，常在讨论里补充判断和现场反馈。代表性金句：「${person.quote}」。`;
}

function buildScene(person, terms) {
  const topicText = terms.map((x) => x.term).join("、") || "群聊讨论";
  const type = person.type.code;
  if (type === "NERD") return "一位专注的技术型成员坐在多屏工作台前，屏幕上有 API、代码、模型对比和终端日志，夜间蓝紫色电脑光照亮侧脸，日系写实动漫半身像";
  if (type === "CALC") return "一位冷静的计算型人物坐在桌前，面前摊开账本、计算器、价格表和套餐对比白板，暖色台灯照明，日系写实动漫半身像";
  if (type === "CTRL") return "一位掌控节奏的讨论组织者坐在会议桌前，身后是路线图白板和消息流大屏，姿态笃定，柔和晨光，日系写实动漫半身像";
  if (type === "SAGE") return "一位沉稳的分析者坐在书房或咖啡桌旁，墙上有模型关系图和便签，手边是茶杯和笔记本，柔和自然光，日系写实动漫半身像";
  if (type === "OWL") return "一位深夜活跃的夜行讨论者坐在窗边电脑前，城市夜景和凌晨时钟在背景中发光，屏幕映出聊天窗口，日系写实动漫半身像";
  if (type === "MALO") return "一位带点自嘲气质的打工人趴在电脑桌前，旁边有咖啡、表情包贴纸和凌乱便签，表情生动，暖色灯光，日系写实动漫半身像";
  if (type === "FIRE") return "一位观点鲜明的辩论者站在白板前，周围有醒目的红色批注、风险提示和争议话题气泡，强对比光影，日系写实动漫半身像";
  if (type === "MEME") return "一位表情包和梗文化输出者坐在电脑前，屏幕上漂浮着表情包、弹幕和聊天气泡，色彩轻快，日系写实动漫半身像";
  if (type === "HYPE") return "一位积极回应的气氛组成员坐在群聊屏幕前，周围有点赞、笑脸和回应气泡，明亮轻快的光线，日系写实动漫半身像";
  return `一位把话题串联起来的社群成员坐在温暖工作间里，周围有聊天气泡、便签和主题连线，背景暗示「${topicText}」，柔和光影，日系写实动漫半身像`;
}

function buildPrompt({ groupName, date, interval, total, people }) {
  const cardBlocks = people.map((person, index) => {
    const suffix = index === 0 ? "（左上角）" : index === 9 ? "（右下角）" : "";
    return `第${index + 1}张${suffix}：
- 姓名：${person.name}
- 发言数：${person.count}条（占比${person.percent}%）
- SBTI类型：${person.type.code} · ${person.type.name}
- 插画场景：${person.scene}
- 性格标签：${person.description}`;
  }).join("\n\n");

  return `生成一张横版信息图海报（4096x2816），高清细腻，适合社交媒体分享。

【标题】
顶部居中大字：「${groupName} · 高频发言 Top10 · SBTI 人物画像」
副标题：「共 ${total} 条消息 | ${date} | 统计区间：${interval}」

【整体风格】
- 浅米白色/奶油色温暖背景
- 卡片式网格布局：优先 5列 x 2行；如果不足10人，则使用均衡卡片布局
- 每张卡片包含：头像符号变体插画 + 文字信息区
- 画风：高质量半写实动漫信息图，柔和光影，精细线条
- 输出分辨率 4096x2816，如受限则使用最大可用分辨率
- 每张卡片配色和场景要有差异，避免单调

【人物卡片】

${cardBlocks}

【卡片设计规范】
- 每张卡片：白色圆角矩形，轻微投影
- 上部 58%：人物插画区，保留真实头像的核心视觉符号，再结合 SBTI 场景做变化
- 下部 42%：文字信息区
  - 第一行：姓名（黑色粗体 18pt）+ 发言数（灰色 12pt）
  - 第二行：SBTI类型标签（彩色圆角药丸背景，白色文字）
  - 第三行：简短总结（深灰色 10pt，最多2行）
  - 第四行：金句（浅色引用框，最多1-2行）

【页面设计规范】
- 顶部标题栏：横跨全宽，浅色渐变底色（淡紫到淡蓝）
- 卡片间距均匀，整体留白舒适
- 右上角水印：「数据来源：WeFlow / wechat-cli 本地数据」灰色小字
- 中文字体：思源黑体（Noto Sans SC）；英文/数字：SF Pro 或等宽字体
- 整体色调：干净、温暖、高对比度文字，缩放后仍清晰
- 必须保证中文不乱码，不要把姓名、发言数、SBTI 标签或金句写成随机符号
`;
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.messages || !args.members) {
    console.error('Usage: node scripts/build-sbti-image-prompt.mjs --group "群名" --date YYYYMMDD --messages file.json --members members.json [--out-dir dir]');
    process.exit(1);
  }

  const messagesPath = path.resolve(args.messages);
  const membersPath = path.resolve(args.members);
  const groupName = cleanText(args.group || args.name || "微信群");
  const messagesJson = readJson(messagesPath);
  const membersJson = readJson(membersPath);
  const messages = (messagesJson.messages || []).filter((m) => m && m.senderUsername);
  const members = membersJson.members || [];
  const memberMap = new Map(members.map((m) => [m.wxid, m]));

  if (!messages.length) {
    throw new Error(`No messages found in ${messagesPath}`);
  }

  const sorted = [...messages].sort((a, b) => a.createTime - b.createTime);
  const total = messages.length;
  const date = args.date
    ? String(args.date).replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3")
    : formatDate(sorted[0].createTime);
  const interval = args.interval || `${formatHour(sorted[0].createTime)}-${formatHour(sorted[sorted.length - 1].createTime)}`;

  const groups = new Map();
  for (const message of messages) {
    const list = groups.get(message.senderUsername) || [];
    list.push(message);
    groups.set(message.senderUsername, list);
  }

  let people = [...groups.entries()]
    .sort((a, b) => b[1].length - a[1].length || displayNameFor(a[0], memberMap).localeCompare(displayNameFor(b[0], memberMap), "zh-CN"))
    .slice(0, 10)
    .map(([wxid, userMessages], index) => {
      const terms = topTerms(userMessages);
      const quote = pickQuote(userMessages);
      const typeCandidates = inferType(userMessages, index + 1, userMessages.length);
      const nightRatio = userMessages.filter((m) => {
        const h = hourOf(m.createTime);
        return h >= 23 || h <= 4;
      }).length / Math.max(1, userMessages.length);
      const person = {
        rank: index + 1,
        wxid,
        name: displayNameFor(wxid, memberMap),
        count: userMessages.length,
        percent: ((userMessages.length / total) * 100).toFixed(1),
        type: typeCandidates[0],
        typeCandidates,
        terms,
        quote,
        nightRatio,
        samples: userMessages.map(messageText).filter(Boolean).slice(0, 20),
      };
      person.description = buildFeatureSentence(person, terms);
      person.scene = buildScene(person, terms);
      return person;
    });

  people = diversifyTypes(people).map((person) => ({
    ...person,
    description: buildFeatureSentence(person, person.terms),
    scene: buildScene(person, person.terms),
  }));

  const prompt = buildPrompt({ groupName, date, interval, total, people });
  const outDir = path.resolve(args["out-dir"] || path.join("reports", "visual-daily", `${date.replaceAll("-", "")}-${groupName}-sbti-prompt`));
  ensureDir(outDir);

  const personaPath = path.join(outDir, "sbti-persona-data.json");
  const promptPath = path.join(outDir, "gpt-image-2-sbti-poster-prompt.md");
  fs.writeFileSync(personaPath, `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    groupName,
    date,
    interval,
    totalMessages: total,
    sourceMessages: messagesPath,
    sourceMembers: membersPath,
    people,
  }, null, 2)}\n`, "utf8");
  fs.writeFileSync(promptPath, prompt, "utf8");

  console.log(JSON.stringify({
    success: true,
    promptPath,
    personaPath,
    topCount: people.length,
  }, null, 2));
}

main();
