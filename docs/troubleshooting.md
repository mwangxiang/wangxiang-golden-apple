# 故障排查

先看错误像哪一类，再处理。

## `Missing config`

意思：仓库根目录没有 `config.local.json`。

处理：

```powershell
Copy-Item .\templates\config.local.template.json .\config.local.json
```

然后打开 `config.local.json`，填入 WeFlow 设置页里的 `baseUrl` 和 `Access Token`。

## `ECONNREFUSED`

意思：脚本连不上 WeFlow API。

按顺序检查：

1. 微信 PC 版是否已经登录。
2. WeFlow 是否已经打开。
3. WeFlow 是否加载完成。
4. WeFlow 设置页里的 `HTTP API 服务` 是否真的打开。
5. `baseUrl` 端口是否和设置页一致。

## `401` 或 `403`

意思：token 不对。

处理：

1. 回到 WeFlow 设置页。
2. 重新复制或重新生成 Access Token。
3. 粘贴到 `config.local.json` 的 `token` 字段。
4. 不要在聊天、截图、公开仓库里展示真实 token。

## 群名搜不到

先不要直接导出，先搜索：

```powershell
node weflow-cli.mjs sessions --keyword "关键词" --limit 50
```

如果群名太长，只搜其中两个字。找到后可以用准确群名，也可以用 `xxx@chatroom`：

```powershell
node weflow-cli.mjs messages --talker xxx@chatroom --start 20260429 --end 20260430 --limit 20
```

## JSON 读取失败

常见原因是用 PowerShell 重定向写出了 UTF-16 文件。

不要这样：

```powershell
node weflow-cli.mjs messages ... > messages.json
```

要这样：

```powershell
node scripts\weflow-json-to-file.mjs --out "messages.json" -- messages ...
```

## 头像海报不像头像

不要把随机人物图当作头像关联图。先检查：

```text
avatar-reference/top10-avatar-reference.json
avatar-reference/top10-avatar-reference-sheet.png
```

如果生图工具不能直接上传头像表，就必须把每个人头像的颜色、主体、姿态、背景、符号写进提示词。

## PowerShell 显示中文乱码

先用 Node 检查文件本身：

```powershell
node -e "console.log(require('fs').readFileSync('docs/getting-started.md','utf8').slice(0,120))"
```

如果 Node 输出正常，只是 PowerShell 显示问题，不要重写文件。
