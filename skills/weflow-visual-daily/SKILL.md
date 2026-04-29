---
name: weflow-visual-daily
description: Use when the user wants to turn WeFlow or WeChat group records into finished visual daily-report assets, including community essence posters, Top10/avatar posters, SBTI-style group member posters, downloadable PNG outputs, or asks in Chinese like "微信群日报海报", "社群精华日报", "头像海报", "用今天日报流程做图". This skill is for WeFlow-backed visual production, not generic image generation.
---

# WeFlow Visual Daily

## Layer

Candidate backstage skill. It may produce finished files, but prompt styles and visual templates remain candidates until repeated user approval.

## Contract

The deliverable is finished shareable PNGs, not only prompts.

- Prefer the image generation model for illustrated posters when image references can be provided.
- A run is incomplete if no image-generation-model output is attempted for the visual poster. If the image tool cannot attach local references, use `avatar-trait-linked` prompting and keep deterministic rendering only as the downloadable/readable fallback.
- Every final PNG must be copied to both:
  - `reports/visual-daily/RUN/generated/`
  - `downloads/weflow-visual-daily-RUN/` under the local WeFlow tools root.
- Never call random generated faces an avatar-linked poster.

## Workflow

1. Resolve group, absolute Asia/Shanghai date, and run slug.
2. Work from the local WeFlow tools root. Prefer a short ASCII path such as `D:\weflow-tools` for shareable setups.
3. Confirm WeFlow API health. If `5031` is not listening, clear `ELECTRON_RUN_AS_NODE` before starting `WeFlow.exe`.
4. Export JSON only through Node scripts:
   - `scripts/weflow-json-to-file.mjs`
   - never PowerShell `>`, `Out-File`, or `Tee-Object` for JSON.
5. Generate daily data, Top10/persona data, avatar references, prompt pack, deterministic fallback PNGs, and manifest.
6. Inspect `avatar-reference/top10-avatar-reference-sheet.png` before final avatar delivery.
7. Copy final PNGs with `scripts/copy-generated-image.ps1`.
8. Run `scripts/validate-run.mjs --require-download true`.

## Avatar Linkage

Avatar posters must be one of:

- `reference-image-conditioned`: the image model received the avatar sheet or per-person reference images.
- `avatar-trait-linked`: the prompt contains concrete per-avatar traits: subject/object, colors, pose, background, symbols, emotion.
- `deterministic-avatar-linked`: the local renderer directly uses the real avatar files.

Reject:

- plain random portraits
- a prompt that only says "use reference N" without attached images or trait descriptions
- WeChat placeholder avatars treated as real avatars

## Stability Rules

- In test/fix mode, repair scripts and skill rules first, then rerun before claiming success.
- In urgent delivery mode, produce the fastest usable PNG first, then record and fix workflow defects.
- `members_counts.json.messageCount` may be all-time. For a daily poster, Top10 must be counted from that day's `messages.json`.
- WeFlow desktop config is sensitive. Do not expose tokens or decrypt keys.
- If `httpApiToken` is stored as `safe:...`, do not edit the big config with PowerShell regex. If token repair is unavoidable, use Node `JSON.parse`/`JSON.stringify`, make a backup, and validate JSON immediately.
- Chinese `.ps1` scripts should be UTF-8 with BOM for Windows PowerShell 5.
- Validate UTF-8 files with Node and reject files containing `\uFFFD`.

## References

- `references/workflow.md`: command sequence and pitfalls
- `references/acceptance-tests.md`: final checks
- `references/style-profiles.md`: visual style profiles
- `references/member-overrides.md`: member-specific visual fixes

## Output Shape

Return:

- Downloads PNG paths
- project `generated/` PNG paths
- source group and absolute date
- validation result
- output mode: `reference-image-conditioned`, `avatar-trait-linked`, or `deterministic-avatar-linked`
- unresolved visual issues requiring approval
