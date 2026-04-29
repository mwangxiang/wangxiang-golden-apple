# 王相的金苹果

这里不是一个只放单次项目的仓库，而是一个持续收集“可复用成果”的公开成果库。

我把那些经过真实任务打磨、能被复用、能继续生长的工作流、技能、脚本、模板和案例称为一个个“金苹果”。每个金苹果都应该尽量做到：

- 来自真实问题，而不是空想 demo
- 有可执行步骤，而不是只有想法
- 有隐私边界，不暴露真实聊天、账号、token 或本机路径
- 能被小白照着跑，也能让 Codex 接手继续做
- 后续可以继续迭代，而不是一次性截图留念

## 当前金苹果

### 01. WeFlow 社群视觉日报

把本地 WeFlow / 微信群聊记录转成可分享的社群视觉日报，包括：

- 社群精华日报
- 高频发言 Top10
- 头像关联画像海报
- SBTI 风格成员画像
- 生图模型提示词包
- 可验收的 PNG 交付流程

这个金苹果的核心目标是：把群聊里的高价值讨论、活跃成员和群体氛围，整理成一张能被转发、能被复盘、也能带来情绪价值的视觉海报。

## 快速开始

如果你只是想知道怎么部署和使用，按这个顺序看：

1. [部署条件](docs/deployment-requirements.md)
2. [小白上手指南](docs/getting-started.md)
3. [故障排查](docs/troubleshooting.md)
4. [给 Codex 的执行说明](docs/codex-operator-guide.md)

最小预检：

```powershell
node scripts\doctor.mjs
node weflow-cli.mjs help
```

## 仓库结构

```text
.
├─ docs/                         # 部署、上手、隐私、排错文档
├─ examples/                     # 脱敏示例
├─ scripts/                      # 可复用脚本
├─ skills/weflow-visual-daily/   # Codex skill
├─ templates/                    # 配置模板
├─ weflow-cli.mjs                # 最小 WeFlow HTTP API CLI
└─ package.json
```

## 依赖与致谢

当前这个金苹果建立在 [WeFlow](https://github.com/hicccc77/WeFlow) 之上。

WeFlow 提供本地微信聊天记录查看、分析、导出和 HTTP API 能力。本仓库基于这些本地数据能力，继续做社群日报、头像画像海报、提示词模板和验收流程。

感谢 WeFlow 作者和维护者把这么难做、又对隐私非常敏感的本地微信数据工具做成可用产品。没有 WeFlow 的本地 API 和数据导出能力，这套“社群视觉日报”流程不会这么快跑通。

## 生图模型要求

完整流程需要可用的生图模型。脚本负责：

- 读取 WeFlow 数据
- 统计高频发言成员
- 提取行为特征和金句
- 准备头像参考和提示词
- 验收最终 PNG

最终海报建议使用 ChatGPT / GPT Image 2 或同等级图像生成模型完成。

如果生图工具支持上传参考图，优先上传 `avatar-reference/top10-avatar-reference-sheet.png`。如果不支持上传参考图，就使用 `avatar-trait-linked` 方式：先检查头像表，再把每个人头像的颜色、主体、姿态、背景和符号写入提示词。

不能把随机人物图、HTML 截图或确定性兜底图当作“生图模型头像关联成品”。

## 隐私边界

这个公开仓库只保留可复用方法和脱敏示例，不保存真实生产数据。

不会提交：

- WeFlow token、解密 key、`WeFlow-config.json`
- 真实 raw 聊天记录 JSON
- 原始头像缓存和数据库
- Codex / Claude 私有记忆、会话日志、`generated_images` 原始目录
- 本机敏感配置和账号密钥
- 真实社群名、成员昵称、真实头像海报、含原话摘录的成品图

公开前检查见：[隐私排查清单](docs/privacy-checklist.md)。

## 本地成果与公开仓库的关系

真实运行出来的海报成品，应该保存在本地生产目录，例如 `weflow-tools/downloads/`。这些文件可以自己分享，但默认不提交到本公开仓库。

这个仓库保存的是可复用流程、脚本、技能和脱敏样例。后续新的金苹果也会按同样方式进入仓库：先跑通真实任务，再清理隐私，再沉淀成可复用资产。

## 后续计划

这个仓库会继续收集新的金苹果。每个新增成果至少应包含：

- 一份面向人的上手文档
- 一份面向 Codex 的执行说明
- 必要脚本或模板
- 脱敏示例
- 隐私边界
- 最小验收方式
