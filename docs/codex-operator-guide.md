# 给 Codex 的执行说明

目标：在一台 Windows 电脑上，把本仓库跑成可用的 WeFlow 社群视觉日报工作流。

## 执行顺序

1. 不要先跑脚本。先确认微信 PC 版和 WeFlow 桌面端都已经打开。
2. 让用户在 WeFlow 设置页打开 `HTTP API 服务`。
3. 让用户提供或自己读取本地 `baseUrl` 和 token，但不要把 token 打印在回复里。
4. 创建 `config.local.json`。
5. 确认用户有可用生图模型。推荐 ChatGPT / GPT Image 2 或同等级模型。
6. 先跑 CLI 最小链路，再跑视觉日报链路。

## 配置

```powershell
Copy-Item .\templates\config.local.template.json .\config.local.json
```

写入：

```json
{
  "baseUrl": "http://127.0.0.1:5031",
  "token": "REAL_TOKEN_FROM_WEFLOW",
  "timezone": "Asia/Shanghai"
}
```

真实 token 不能提交。

## 最小链路

```powershell
node scripts\doctor.mjs
node weflow-cli.mjs sessions --limit 5
node weflow-cli.mjs sessions --keyword "目标群关键词" --limit 20
node weflow-cli.mjs group-members --name "目标群名" --counts
node weflow-cli.mjs messages --name "目标群名" --start 20260429 --end 20260430 --limit 20 --media
```

成功标准：

- `sessions` 返回 JSON
- `group-members` 返回成员列表
- `messages` 返回真实消息

## 视觉日报链路

```powershell
$slug = "YYYYMMDD-group-slug"
$raw = "reports\raw\$slug"
$visual = "reports\visual-daily\$slug"
New-Item -ItemType Directory -Force -Path $raw,$visual

node scripts\weflow-json-to-file.mjs --out "$raw\messages.json" -- messages --name "目标群名" --start YYYYMMDD --end NEXT_YYYYMMDD --limit 10000 --media
node scripts\weflow-json-to-file.mjs --out "$raw\members_counts.json" -- group-members --name "目标群名" --counts
node scripts\build-sbti-image-prompt.mjs --group "目标群名" --date YYYY-MM-DD --messages "$raw\messages.json" --members "$raw\members_counts.json" --out-dir "$visual"
node scripts\prepare-sbti-avatar-references.mjs --persona "$visual\sbti-persona-data.json" --members "$raw\members_counts.json" --out-dir "$visual\avatar-reference"
```

必须检查：

- `avatar-reference\top10-avatar-reference.json`
- `avatar-reference\top10-avatar-reference-sheet.png`
- `gpt-image-2-sbti-poster-prompt.md`

生图模型输出 PNG 后：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\copy-generated-image.ps1 -Source "生成图路径.png" -RunDir "$visual" -Name "image-model-avatar-poster.png" -DownloadName "可分享文件名.png"
node scripts\validate-run.mjs --run-dir "$visual" --require-download true
```

## 生图模型规则

- 完整成果必须尝试生图模型。
- 如果工具可以上传图片，优先把 `avatar-reference\top10-avatar-reference-sheet.png` 作为参考图传入。
- 如果工具不能上传图片，必须使用 `avatar-trait-linked`：把每位成员头像的主体、颜色、姿态、背景、符号写进提示词。
- deterministic fallback 可以作为兜底或测试图，但不能冒充生图模型成品。
- HTML 截图不是生图模型成果。

## 优先排查

- WeFlow 没开 API：先回到设置页，不要改脚本。
- token 失败：重新生成 token。
- 群名不准：用 `sessions --keyword` 找 `@chatroom`，再改用 `--talker`。
- 中文路径或长路径：优先创建英文 junction。
- 生图没有头像关联：检查头像引用表，不要把随机人物图称为成品。
