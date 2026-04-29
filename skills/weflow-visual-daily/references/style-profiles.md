# Style Profiles

## reference-style-learning-community

Use for a warm learning-community avatar portrait reference unless the user gives a newer reference.

Visual rules:

- warm cream or pale paper background
- friendly community learning mood
- Top10 card layout, usually 5x2 for avatar posters
- each card contains one avatar/character, display name, compact role label, and one short line
- bottom warm slogan or daily theme
- avoid dark sci-fi, battle, mecha, cyberpunk, or heavy armor unless explicitly requested

## daily-flow

Use for "今天日报流程" or "内容精华总结海报".

Content hierarchy:

- top: group name and date
- main: P0/P1/P2 or "重点 / 进展 / 待跟进"
- side or bottom: representative quotes, actions, risks
- end: next actions

Keep it report-like, not a marketing landing page.

## soft-community

Use when the user says the previous result is too hard-core.

Visual rules:

- soft lighting
- approachable character design
- warm classroom or study-room cues
- no weapon-like props
- no exaggerated combat stance

## Draft vs final

Full generated posters are drafts unless visually approved. Final shareable Chinese-text posters should be rendered deterministically.

## learning-community-avatar-portrait-daily

Use when the user asks for an avatar-linked daily poster and gives, mentions, or expects a warm learning-community `高频发言 Top10 · 头像画像` reference style.

This is not a plain ranking chart. Each Top10 card must be a small member portrait with stable content fields:

- real avatar or avatar-derived visual area
- rank number
- display name
- message count and percentage
- classification code and label, such as `RUSH · 冲锋者`, `SAGE · 智者`, `GLUE · 粘合剂`, `HYPE · 捧哏`, `MEME · 梗王`, `CTRL · 拿捏者`
- 3 to 4 keywords or topic chips extracted from that member's own messages
- one expanded interpretation sentence based on their messages
- one `金句` from the member or a faithful short paraphrase

Layout rules:

- landscape 16:9, usually 2400 x 1350 or similar
- warm paper or cream background
- large title line: `{群名} · 高频发言 Top10 · 头像画像`
- metadata line: total messages, date range, topic keywords
- 5 x 2 card grid
- card top: avatar/scene area plus topic chips
- card bottom: rank, name, count, class pill, interpretation, gold quote
- footer slogan, for example: `一起学习，一起思考，一起把真实问题做成案例。`
- The avatar or avatar-derived scene must be the card's main visual area, not a small pasted icon. Prefer a wide cover image occupying roughly the upper half of each card, with keywords floating on top.

Stability rules:

- The poster must read `sbti-persona-data.json` or equivalent persona data; do not invent generic labels after the fact.
- Long names, tags, descriptions, and quotes must be fitted or ellipsized inside the card.
- Do not let text overflow across cards.
- Do not use a small circular avatar plus a large text block; that is a ranking chart, not this portrait style.
- If the image model cannot receive reference images, use deterministic real-avatar rendering for the avatar-linked poster and label it as the stable avatar-linked output.
- If generating scene illustrations, keep real-avatar linkage as an explicit input or produce a separate rejected/unlinked draft.
- For SBTI illustrated portraits, upload `avatar-reference/top10-avatar-reference-sheet.png` with the prompt and bind card N to avatar reference N. The image model should expand the avatar into a scene portrait, not paste the avatar or ignore it.
