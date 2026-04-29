# 部署条件

这套流程不是单纯的脚本项目。要完整产出“社群日报海报”和“头像发言海报”，需要同时满足本地数据、命令行环境和生图模型三类条件。

## 必需条件

1. Windows 电脑
2. 微信 PC 版已安装并登录
3. WeFlow 桌面端已安装
4. WeFlow 设置页已开启 `HTTP API 服务`
5. 已拿到 WeFlow 的 `baseUrl` 和 `Access Token`
6. Node.js 20 或更新版本
7. PowerShell
8. 一个可用的生图模型

## 推荐条件

- 生图模型：优先使用 ChatGPT / GPT Image 2 或同等级的图像生成模型。
- 输入方式：最好支持上传头像参考图；如果不支持上传，就使用本仓库的 `avatar-trait-linked` 提示词方式。
- 路径：推荐把工作目录放在短路径，例如 `D:\weflow-tools` 或 `D:\golden-apple`。
- 数据目录：如果微信数据路径很长或有中文，推荐用 `scripts\setup-weflow-junction.ps1` 建一个 `D:\weflow_data` 别名。

## 为什么必须有生图模型

本项目的最终交付不是 HTML 截图，也不是普通表格，而是适合社群转发的海报。脚本负责：

- 读取 WeFlow 数据
- 统计高频发言成员
- 提取行为特征和金句
- 准备头像参考和提示词
- 验收最终 PNG

生图模型负责：

- 把头像特征扩写成更有情绪价值的人物视觉
- 生成统一风格的海报画面
- 让社群日报看起来像一张真正可分享的视觉作品

如果没有生图模型，只能得到提示词、数据包或确定性兜底图，不能算完整成品。

## 推荐部署路线

### 路线 A：个人本机使用

适合你自己在一台电脑上长期使用。

```text
微信 PC + WeFlow + 本仓库 + ChatGPT/GPT Image 2
```

优点：最简单，数据不离开本机，适合日常跑社群日报。

### 路线 B：给别人部署

适合把流程交给另一个人的电脑。

```text
对方电脑安装微信 PC 和 WeFlow
  -> 对方手动开启 WeFlow HTTP API
  -> Codex 按 docs/codex-operator-guide.md 执行
  -> 对方用自己的生图模型生成海报
```

重点：不要把你的 token、聊天记录、头像缓存或本机路径给对方。

### 路线 C：未来公开模板

适合整理成 public repo。

```text
只保留脚本、skill、模板、脱敏示例
删除真实成品图、真实群名、真实头像、真实聊天记录
```

重点：公开仓库不应该包含 `private-results/`、`reports/raw/`、`config.local.json`。

## 最小成功标准

完成部署后，至少要满足：

- `node scripts\doctor.mjs` 能通过。
- `node weflow-cli.mjs sessions --limit 5` 能返回 JSON。
- `messages.json` 和 `members_counts.json` 能导出。
- 能生成 `gpt-image-2-sbti-poster-prompt.md`。
- 生图模型能根据提示词生成 PNG。
- `copy-generated-image.ps1` 能把 PNG 放进 `generated/` 和 `downloads/`。
- `validate-run.mjs` 能通过。
