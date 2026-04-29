# Acceptance Tests

## Trigger Tests

Should trigger:

- "给这个微信群做头像海报"
- "用 WeFlow 聊天记录生成社群精华日报海报"
- "示例学习社群今天的头像海报和内容总结图"
- "用今天日报流程做一张社群日报图"
- "把头像画像海报生成了并下载下来"

Should not trigger:

- "随便帮我生成一张头像"
- "只总结这段文字，不需要图"
- "给我做一个非微信群的产品海报"

## Edge Cases

- WeFlow API unavailable
- raw JSON is UTF-16
- no messages for the selected date
- avatar URL returns placeholder
- image tool cannot attach reference images
- user asks for downloadable finished PNG, not prompts
- generated poster visually ignores avatar identity

## Delivery Checks

Before final response:

- final PNG exists
- final PNG is in project `generated/`
- final PNG is also in `downloads/weflow-visual-daily-*` under the local WeFlow tools root.
- image-model generation was attempted; if the current tool cannot save a file, record that limitation and keep deterministic fallback separate`n- image-model PNGs are copied out of the generated-image folder when a local file is available
- source group and absolute date are clear
- `avatarStatus` has been checked if avatars are used
- placeholder avatars are not treated as real avatars
- generated variants are not silently overwritten
- unresolved visual approvals are stated

## Avatar Poster Checks

For any avatar poster:

- output is avatar-linked, not random faces
- every used avatar has `avatarStatus=ok`, or the replacement reason is explicit
- if deterministic: real avatar files are visibly used
- if image generated: the run is classified as `reference-image-conditioned` or `avatar-trait-linked`
- if `reference-image-conditioned`: the image model received `top10-avatar-reference-sheet.png` or per-person images
- if `avatar-trait-linked`: each card prompt includes concrete avatar traits, not only "use reference N"
- if neither condition is true, mark the output `unlinked/rejected` and do not call it final

## Qianqian/SBTI Portrait Checks

For `qianqian-avatar-portrait-daily` or SBTI portrait posters:

- layout is a 5 x 2 Top10 card grid
- each card has an enlarged avatar or avatar-derived visual as the main visual area
- each card has classification code plus Chinese label
- each card has member keywords/topic chips or a short behavior summary
- each card has an expanded interpretation sentence
- each card has a `金句`
- no long nickname, label, description, or quote crosses into another card
- `sbti-persona-data.json` or equivalent persona data was used

## Encoding Checks

- JSON exports were created by Node scripts, not PowerShell redirection
- Chinese `.ps1` scripts were saved as UTF-8 with BOM before running under Windows PowerShell 5
- prompt files were checked with Node for `\uFFFD` replacement characters
- PowerShell display mojibake is not treated as file corruption unless Node validation also fails

## Regression Tests From 2026-04-29

- WeFlow startup test must check `ELECTRON_RUN_AS_NODE`; clear it before launching the GUI app.
- `config.local.json` reader must tolerate UTF-8 BOM.
- Do not rewrite the desktop `WeFlow-config.json` with PowerShell JSON tools; if touched, validate with Node before launching WeFlow.
- Daily Top10 must use today's message counts from `messages.json`, not cumulative member counts.
- Final validation must include `visual-daily-manifest.json`, `generated/*.png`, and Downloads copies.

## Minimum Final Response

Include:

- Downloads PNG path
- project `generated/` PNG path
- validation status
- whether the image is `reference-image-conditioned`, `avatar-trait-linked`, deterministic fallback, or rejected
- any member/style issues still requiring approval
