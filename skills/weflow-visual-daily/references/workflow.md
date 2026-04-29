# WeFlow Visual Daily Workflow

## Purpose

Produce finished community visual daily assets from WeFlow-backed WeChat group records.

Typical deliverables:

- community essence daily poster
- Top10/avatar poster
- SBTI/avatar illustrated portrait poster
- prompt pack and run manifest
- downloadable PNG copies

## Source Of Truth

Operational root:

```text
D:\weflow-tools
```

Current visual reports:

```text
reports\visual-daily
```

Known handoff:

```text
reports\visual-daily\HANDOFF_2026-04-28_weflow-sbti-avatar-poster.md
```

## Safe JSON Export

Always write JSON through Node:

```powershell
node scripts\weflow-json-to-file.mjs `
  --out "reports\raw\YYYYMMDD-slug\messages.json" `
  -- messages --name "群名" --start YYYYMMDD --end NEXT_YYYYMMDD --limit 10000 --media
```

Do not use:

```powershell
node .\weflow-cli.mjs messages ... | Tee-Object -FilePath messages.json
node .\weflow-cli.mjs messages ... > messages.json
```

Windows PowerShell may write UTF-16, which breaks later Node JSON readers.

## Avatar Preparation

Generate references:

```powershell
node scripts\prepare-sbti-avatar-references.mjs `
  --persona "reports\visual-daily\RUN\sbti-persona-data.json" `
  --members "reports\raw\RUN\members_counts.json" `
  --out-dir "reports\visual-daily\RUN\avatar-reference"
```

Inspect:

```powershell
node -e "const fs=require('fs'); const a=JSON.parse(fs.readFileSync('reports/visual-daily/RUN/avatar-reference/top10-avatar-reference.json','utf8')); console.log(a.map(x=>x.rank+':'+x.name+':'+x.avatarStatus).join('|'));"
```

Meaning:

- `ok`: usable avatar
- `missing`: no usable avatar
- `placeholder`: WeChat placeholder, not the person

Build the visual reference sheet:

```powershell
powershell -ExecutionPolicy Bypass `
  -File scripts\build-avatar-reference-sheet.ps1 `
  -AvatarDir "reports\visual-daily\RUN\avatar-reference" `
  -Out "reports\visual-daily\RUN\avatar-reference\top10-avatar-reference-sheet.png"
```

## Avatar Linkage Decision

Before generating an avatar illustrated poster, choose and record one path:

- `reference-image-conditioned`: the image model receives `top10-avatar-reference-sheet.png` or per-person reference images. Card N must use avatar reference N.
- `avatar-trait-linked`: the current image tool cannot attach reference images, so the prompt must explicitly describe each avatar's visual traits. Required traits include color palette, subject/object, pose, background, emotion, and any text/symbol.
- `deterministic-avatar-linked`: local renderer uses the real avatar files directly.
- `unlinked/rejected`: no avatar image input and no per-member trait descriptions. Do not deliver as final when avatar linkage was requested.

For `avatar-trait-linked`, write prompts like:

```text
头像参考：黑衣/兜帽人物，银色面具或银色头盔，手持杯子，画面偏灰绿，字幕感“平平淡淡才是真”。
插画要求：保留银色面具、黑衣、拿杯子、灰绿色温和背景，扩写成轻快友好的气氛组场景。
```

This is the stable fallback that reproduced the previous good effect when image attachment was unavailable.

## Generation Priority

The preferred visual poster path is the image generation model. Use it for:

- avatar poster visual style
- illustrated Top10 cards
- community essence poster when the user wants a designed poster
- style repair after user feedback

Use deterministic local rendering only as:

- urgent fallback
- text-heavy readable version
- hybrid text/layout layer when Chinese small text must be exact
- validation artifact when testing the skill

Do not present an HTML screenshot as the image-model result.
Do not present random generated faces as an avatar-linked poster.

## Prompt Pack

Preferred prompt-pack command:

```powershell
node scripts\build-weflow-visual-daily-image-pack.mjs `
  --messages "reports\raw\RUN\messages.json" `
  --members "reports\raw\RUN\members_counts.json" `
  --run-dir "reports\visual-daily\RUN" `
  --group "群名" `
  --date "YYYY-MM-DD"
```

SBTI/avatar prompt command:

```powershell
node scripts\build-gpt-image-sbti-poster-prompt.mjs `
  --persona "reports\visual-daily\RUN\sbti-persona-data.json" `
  --avatar-manifest "reports\visual-daily\RUN\avatar-reference\top10-avatar-reference.json" `
  --avatar-sheet "reports\visual-daily\RUN\avatar-reference\top10-avatar-reference-sheet.png" `
  --out "reports\visual-daily\RUN\image-model-pack\gpt-image-2-sbti-avatar-referenced-poster-prompt.md" `
  --group "群名" `
  --date "YYYY-MM-DD" `
  --interval "HH:mm-HH:mm"
```

If the current image tool cannot attach the sheet, manually or programmatically add avatar visual trait descriptions to the prompt before generation.

## Final Delivery

Final image-model files are first saved under Codex generated images. Copy them out immediately.

Use:

```powershell
powershell -ExecutionPolicy Bypass `
  -File "PATH\TO\skill\scripts\copy-generated-image.ps1" `
  -Source "PATH\\TO\\generated-image.png" `
  -RunDir "D:\weflow-tools\reports\visual-daily\RUN" `
  -Name "final-name.png" `
  -DownloadName "下载用中文名.png"
```

This must produce two copies:

```text
reports\visual-daily\RUN\generated\final-name.png
D:\weflow-tools\downloads\weflow-visual-daily-RUN\下载用中文名.png
```

The final response must surface both paths directly.

## Learning Community Avatar Portrait Daily

For a warm learning-community `高频发言 Top10 · 头像画像` style, do not stop at an avatar ranking poster.

Required card content:

- rank
- real avatar or avatar-derived visual
- member name
- count/percent
- classification pill
- keywords
- expanded interpretation
- `金句`

The upper 60% of each card is the enlarged avatar-derived visual. The lower 40% is text.

## Windows Encoding Rules

Encoding bugs are a known recurring failure mode.

- Use Node scripts to write JSON; never use PowerShell redirection, `Tee-Object`, or `Out-File` for JSON.
- For `.ps1` scripts containing Chinese text, save as UTF-8 with BOM for Windows PowerShell 5 compatibility.
- Prefer ASCII identifiers and syntax in scripts; keep Chinese inside strings only.
- Validate prompt files with Node, not `Get-Content`, because PowerShell display encoding can show mojibake even when the file is valid UTF-8.

## 2026-04-29 MagicAI Test Fixes

Observed during a real local test run:

- If WeFlow exits silently, inspect `ELECTRON_RUN_AS_NODE`. Clear it before launching the Electron app, otherwise `WeFlow.exe` may run as Node and never open the HTTP API.
- If API returns 401, verify `config.local.json` token against the desktop config without printing token values.
- Do not edit the large WeFlow desktop config with PowerShell regex or `ConvertTo-Json`; that caused a main-process JSON parse popup. Use Node `JSON.parse`/`JSON.stringify`, create a backup, and validate immediately.
- `members_counts.json.messageCount` can be all-time. Daily Top10 posters must compute counts from the selected day's `messages.json`.
- The deterministic fallback command is:

```powershell
powershell -ExecutionPolicy Bypass `
  -File scripts\build-weflow-visual-daily-png.ps1 `
  -Messages "reports\raw\RUN\messages.json" `
  -Members "reports\raw\RUN\members_counts.json" `
  -RunDir "reports\visual-daily\RUN" `
  -GroupName "群名" `
  -Date "YYYY-MM-DD"
```

Classify this output as `deterministic-avatar-linked`: it uses real avatar files directly and is downloadable, but it is not the image-model illustrated poster.
