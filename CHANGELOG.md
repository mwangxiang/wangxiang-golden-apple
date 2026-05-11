# Changelog

## 0.2.2 - 2026-05-11

- Reject non-final SBTI/avatar output modes during validation so `reference-image-conditioned` and `avatar-trait-linked` drafts cannot pass as final deliverables.
- Require SBTI/avatar final validation to include `imageModelFinal` evidence from `.codex/generated_images`.
- Reject path-like `finalize --name` and `--download-name` values so generated/download copies cannot escape their intended folders.

## 0.2.1 - 2026-05-11

- Allow `sbti-avatar-pipeline.mjs prepare` to run in `reference-image-conditioned` mode without `avatar-traits.json` when the avatar reference sheet will be uploaded to the image model.
- Record the selected avatar linkage mode in the manifest and image-model job metadata.
- Infer the matching final output mode during `finalize` from the prepared linkage mode.

## 0.2.0 - 2026-05-11

- Add the SBTI/avatar pipeline entrypoint for prepare, finalize, and validate.
- Add a separate community content daily renderer for avatar-plus-daily runs.
- Strengthen validation so SBTI/avatar finals require `.codex/generated_images` evidence.
- Reject combined avatar/daily deliverables when two separate PNGs are required.
- Add the canonical GPT Image 2 SBTI prompt template and stricter acceptance checks.

## 0.1.0 - 2026-04-29

- Initial public reusable WeFlow visual daily workflow, scripts, skill, docs, and redacted example manifest.
