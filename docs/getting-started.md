# 小白上手指南

这份文档给第一次使用的人看。你不需要先理解所有脚本，按顺序做就行。

## 最短路线

你要完成的是这条链：

```text
微信 PC 已登录
  -> 打开 WeFlow
  -> 在 WeFlow 里打开 HTTP API
  -> 把 baseUrl/token 填进 config.local.json
  -> 用 weflow-cli.mjs 读到群消息
  -> 生成提示词和头像引用材料
  -> 交给生图模型出海报
```

如果前一步没成功，不要跳到下一步。

## 你先理解 4 件事

1. [WeFlow](https://github.com/hicccc77/WeFlow) 是先安装、先打开的 Windows 桌面软件。
2. 正确顺序是：先打开微信 PC 版，再打开 WeFlow，等它加载完成。
3. 必须在 WeFlow 设置页里手动打开 `HTTP API 服务`，并复制真实的 `baseUrl` 和 `Access Token`。
4. 这个仓库负责把 WeFlow 导出的本地聊天数据继续加工成社群周报、头像发言海报和生图提示词。

## 第一步：准备软件

- Windows 电脑
- 微信 PC 版，并且已经登录
- WeFlow 桌面端
- Node.js 20 或更新版本
- PowerShell
- 生图模型账号或工具，例如 ChatGPT / GPT Image 2，或同等级的图像生成模型

完整部署条件见：[部署条件](deployment-requirements.md)。

## 第二步：打开 WeFlow API

1. 先打开微信 PC 版。
2. 再打开 WeFlow。
3. 等 WeFlow 完成加载。
4. 进入 WeFlow 设置页。
5. 打开 `HTTP API 服务`。
6. 复制 `baseUrl`，通常类似 `http://127.0.0.1:5031`。
7. 生成并复制 `Access Token`。

如果这一步没做，后面的脚本一定会失败。

成功标志：

- WeFlow 界面里能看到 HTTP API 已开启。
- 你手里有一个 `baseUrl`。
- 你手里有一个 `Access Token`。

## 第三步：填写配置

在仓库根目录复制模板：

```powershell
Copy-Item .\templates\config.local.template.json .\config.local.json
```

打开 `config.local.json`，填入 WeFlow 设置页里的值：

```json
{
  "baseUrl": "http://127.0.0.1:5031",
  "token": "PUT_YOUR_LOCAL_TOKEN_HERE",
  "timezone": "Asia/Shanghai"
}
```

不要把真实 token 发到聊天里，也不要提交到公开仓库。

## 第四步：预检

```powershell
node scripts\doctor.mjs
```

如果 `config.local.json exists`、`config has baseUrl`、`config has token` 都是 `true`，再继续。

如果看到 `NOT READY`，先按输出里的 `Next step` 做，不要继续跑导出命令。

## 第五步：确认能读到群

```powershell
node weflow-cli.mjs sessions --keyword "群名关键词" --limit 20
```

如果搜不到群，先用更短关键词搜索。找到准确群名或 `xxx@chatroom` 后再继续。

成功标志：终端输出 JSON，里面有 `sessions`，并且能看到目标群的名字。

## 第六步：导出群聊数据

示例：

```powershell
$run = "reports\raw\demo-run"
New-Item -ItemType Directory -Force -Path $run

node scripts\weflow-json-to-file.mjs --out "$run\messages.json" -- messages --name "目标群名" --start 20260429 --end 20260430 --limit 10000 --media
node scripts\weflow-json-to-file.mjs --out "$run\members_counts.json" -- group-members --name "目标群名" --counts
```

成功标志：

- `reports\raw\demo-run\messages.json` 存在。
- `reports\raw\demo-run\members_counts.json` 存在。
- 两个文件能用记事本打开，并且不是乱码。

## 第七步：生成头像画像提示词和引用材料

```powershell
$visual = "reports\visual-daily\demo-run"
New-Item -ItemType Directory -Force -Path $visual

node scripts\build-sbti-image-prompt.mjs --group "目标群名" --date 2026-04-29 --messages "reports\raw\demo-run\messages.json" --members "reports\raw\demo-run\members_counts.json" --out-dir $visual
node scripts\prepare-sbti-avatar-references.mjs --persona "$visual\sbti-persona-data.json" --members "reports\raw\demo-run\members_counts.json" --out-dir "$visual\avatar-reference"
```

然后把生成的提示词交给生图模型。最终 PNG 拿到后，用 `copy-generated-image.ps1` 复制到运行目录。

成功标志：

- `$visual\sbti-persona-data.json` 存在。
- `$visual\gpt-image-2-sbti-poster-prompt.md` 存在。
- `$visual\avatar-reference\top10-avatar-reference.json` 存在。
- `$visual\avatar-reference\top10-avatar-reference-sheet.png` 存在。

## 第八步：生图和保存

1. 打开生成的 `gpt-image-2-sbti-poster-prompt.md`。
2. 如果生图模型支持上传参考图，上传 `avatar-reference\top10-avatar-reference-sheet.png`。
3. 如果不能上传参考图，确认提示词里已经写入每个人的头像特征，这种模式叫 `avatar-trait-linked`。
4. 把提示词交给生图模型。
5. 等模型生成 PNG。
6. 检查图片：人物是否和头像特征有关联，文字和布局是否能看懂。
7. 把 PNG 文件复制到运行目录：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\copy-generated-image.ps1 `
  -Source "你的生成图.png" `
  -RunDir "$visual" `
  -Name "image-model-avatar-poster.png" `
  -DownloadName "社群头像发言海报.png"
```

8. 验收：

```powershell
node scripts\validate-run.mjs --run-dir "$visual" --require-download true
```

推荐：优先使用 ChatGPT / GPT Image 2 或同等级模型。不要把 HTML 截图或随机人物图当作最终生图成果。

## 常见卡点

- `ECONNREFUSED`：WeFlow API 没开，或 WeFlow 还没加载完。
- `401/403`：token 错了、过期了、没复制完整。
- 群名搜不到：先跑 `sessions --keyword`，必要时用 `--talker xxx@chatroom`。
- 中文长路径出问题：用 `scripts\setup-weflow-junction.ps1` 创建 `D:\weflow_data` 这种英文短路径别名。
- PowerShell 显示乱码：不要马上判断文件坏了，用 `node -e "console.log(require('fs').readFileSync('README.md','utf8').slice(0,100))"` 检查。

更多排查见：[故障排查](troubleshooting.md)。
