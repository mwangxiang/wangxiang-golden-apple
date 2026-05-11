# Workflow

1. Export WeFlow messages into JSON in the private production workspace.
2. Build persona data and avatar reference data.
3. Run `sbti-avatar-pipeline.mjs prepare` to generate the canonical prompt pack and the separate content daily PNG.
4. Use the image generation model for the final SBTI/avatar portrait poster.
5. Run `sbti-avatar-pipeline.mjs finalize` to copy the image-model PNG into the run `generated/` folder and the downloads folder.
6. Run `validate-run.mjs`.
7. Keep `contentDaily` and `imageModelFinal` as two separate outputs when both are requested.
8. Copy only selected redacted artifacts into this repository.

This repository is for storing the reusable method and selected results. It is not the live WeFlow data workspace.
