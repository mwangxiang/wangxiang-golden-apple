# Privacy Boundary

This repository is private by default, but it should be kept close to public-safe.

Do not commit:

- WeFlow tokens or decrypt keys
- raw chat exports
- local WeFlow desktop configuration
- original avatar caches
- private Codex/Claude memories or rollout logs
- machine-specific credentials
- real group names, member nicknames, original quotes, or avatar-derived posters

Allowed in this repository:

- redacted demo outputs
- run manifests after removing machine paths, chatroom IDs, real group names, and source message paths
- reusable scripts and skill instructions
- prompt templates and acceptance rules

Keep real finished PNGs in the local production workspace, not in Git.

Before making the repository public, run the privacy scan documented in `docs/privacy-checklist.md`.
