# Avatar Portrait Template

## Intent

Use this template for avatar-linked Top10 daily posters in the style of:

`示例学习社群 · 高频发言 Top10 · 头像画像`

The deliverable is a member portrait daily, not a simple avatar ranking chart.

## Required Data

Each Top10 member card needs:

- `rank`
- `name`
- `count`
- `percent`
- `type.code`
- `type.name`
- `terms[]`
- `description`
- `quote`
- `avatarFile` with `avatarStatus=ok`

Preferred source:

```text
reports\visual-daily\RUN\sbti-persona-data.json
reports\visual-daily\RUN\avatar-reference\top10-avatar-reference.json
```

## Deterministic Render Prompt

Use the local renderer when exact Chinese text and avatar linkage matter:

```powershell
powershell -ExecutionPolicy Bypass `
  -File scripts\build-qianqian-avatar-portrait-poster.ps1 `
  -Persona "reports\visual-daily\RUN\sbti-persona-data.json" `
  -AvatarManifest "reports\visual-daily\RUN\avatar-reference\top10-avatar-reference.json" `
  -Out "reports\visual-daily\RUN\generated\GROUP_DATE_qianqian_style_avatar_portrait.png" `
  -GroupName "群名" `
  -Date "YYYY-MM-DD" `
  -Theme "主题1、主题2、主题3"
```

## Image Model Prompt Skeleton

Only use this for a final avatar-linked poster if the image model can receive avatar references.

Required companion reference image:

```text
reports\visual-daily\RUN\avatar-reference\top10-avatar-reference-sheet.png
```

The reference sheet must be uploaded together with the prompt. The sheet is numbered 1-10, and each generated card must use the matching reference avatar:

- card 1 uses avatar reference 1
- card 2 uses avatar reference 2
- card 3 uses avatar reference 3
- card 4 uses avatar reference 4
- card 5 uses avatar reference 5
- card 6 uses avatar reference 6
- card 7 uses avatar reference 7
- card 8 uses avatar reference 8
- card 9 uses avatar reference 9
- card 10 uses avatar reference 10

The model should preserve each avatar's identity cues, temperament, color tendency, and emotional value, then expand it into an illustrated half-body portrait. It must not paste small avatar images into the cards, and it must not invent unrelated random faces.

```text
Generate a warm horizontal 16:9 WeChat group daily poster in the style of
"示例学习社群 · 高频发言 Top10 · 头像画像".

Group: {groupName}
Date range: {dateRange}
Total messages: {totalMessages}
Topics: {topics}

Layout:
- cream paper background
- large title at top
- metadata line below title
- 5 x 2 Top10 card grid
- each card has avatar/scene area, rank, name, count/percentage, class pill, keyword chips, interpretation sentence, and gold quote
- avatar/scene area is the card's main visual, roughly the upper half of the card; do not render avatars as small detached icons
- bottom slogan: 一起学习，一起思考，一起把真实问题做成案例。

For every member, preserve the corresponding numbered avatar reference identity. Do not invent random faces. If avatar references are not available to the model, stop and ask for the reference sheet instead of generating an unlinked poster.

Members:
{rank}. {name} | {count} ({percent}%) | {type.code} · {type.name}
Keywords: {terms}
Interpretation: {description}
Gold quote: {quote}
Scene hint: {scene}
```

If the tool cannot take avatar references, save the image-model result as a draft or rejected unlinked variant. The final shareable avatar-linked poster should be deterministic.

## Encoding Contract

- This workflow often runs under Windows PowerShell 5.
- `.ps1` files with Chinese strings must be UTF-8 with BOM.
- Keep identifiers and syntax ASCII. Put Chinese only in strings.
- Use Node for JSON writing and Node checks for prompt validity.
