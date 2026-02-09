---
name: transloadit
description: Main entry-point skill for Transloadit. Route to the right `integrate-*`, `transform-*`, or `docs-*` skill, and prefer executing via `npx -y @transloadit/node ...` (CLI) for deterministic behavior.
---

# Quick Routing

1. Need reference (robot params/examples, no API calls): `docs-transloadit-robots`
2. Need a one-off transform (download outputs locally): `transform-*`
3. Need an end-to-end code integration (real app integration steps): `integrate-*`

Concrete entry points:
1. `docs-transloadit-robots`
2. `transform-generate-image-with-transloadit`
3. `transform-encode-hls-video-with-transloadit`
4. `integrate-uppy-transloadit-s3-uploading-to-nextjs`
5. `integrate-asset-delivery-with-transloadit-smartcdn-in-nextjs`

# CLI Baseline (Recommended)

Most skills in this repo prefer using the `@transloadit/node` CLI via:

```bash
npx -y @transloadit/node ...
```

If a command errors with "Unsupported option name" or a missing subcommand, update to a newer `@transloadit/node`.

Builtin template discovery (token-efficient NDJSON):
```bash
npx -y @transloadit/node templates list --include-builtin exclusively-latest --fields id,name --json
```
