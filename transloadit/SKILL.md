---
name: transloadit
description: Main entry-point skill for Transloadit. Route to the right `integrate-*`, `transform-*`, or `docs-*` skill, and prefer executing via `npx -y @transloadit/node ...` (CLI) for deterministic behavior.
---

# Quick Routing

1. Need reference (robot params/examples, no API calls): `docs-transloadit-robots`
2. Need a one-off transform (download outputs locally): `transform-*`
3. Need an end-to-end code integration (scenario-grade, with E2E): `integrate-*`

Concrete entry points:
1. `docs-transloadit-robots`
2. `transform-generate-image-with-transloadit`
3. `transform-encode-hls-video-with-transloadit`
4. `integrate-uppy-transloadit-s3-uploading-to-nextjs`
5. `integrate-dynamic-asset-delivery-with-transloadit-smartcdn-in-nextjs`

# Baseline CLI (Recommended)

This repository assumes `@transloadit/node >= 4.7.0` for:
- `docs robots ...` (offline robot metadata)
- `templates list --include-builtin ...` (builtin template discovery)

Builtin template discovery (token-efficient NDJSON):
```bash
npx -y @transloadit/node@4.7.0 templates list --include-builtin exclusively-latest --fields id,name --json
```

Versioning note:
- Skills/docs use `builtin/<name>@latest` as the stable contract.
- If `@latest` is not supported yet in your API2, use the concrete builtin version shown by the list output (example: `builtin/generate-image@0.0.1`).
