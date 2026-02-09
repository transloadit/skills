# Transloadit Agent Skills Plan (Tight)

Goal: a small, reliable set of skills that map directly to the shipped CLI:

`npx -y @transloadit/node ...` (loads `TRANSLOADIT_KEY`/`TRANSLOADIT_SECRET` from `.env` automatically)

## Categories (Current)

- `docs-*`: offline reference lookups (no API calls)
- `transform-*`: one-off transforms (CLI driven, outputs downloaded via `-o`)
- `integrate-*`: real-world integration guides (validated via `_scenarios/` + E2E, but not requiring any test harness)

## Current Skill Set

- `transloadit` (index/router)
- `docs-transloadit-robots` (offline robot docs)
- `transform-generate-image-with-transloadit` (prompt -> image)
- `transform-encode-hls-video-with-transloadit` (mp4 -> HLS)
- `integrate-uppy-transloadit-s3-uploading-to-nextjs` (Next.js + Uppy + Transloadit, optional S3)
- `integrate-dynamic-asset-delivery-with-transloadit-smartcdn-in-nextjs` (Next.js + Smart CDN signing)

## Builtin Discovery

Builtin discovery (token-efficient NDJSON, good for agents):
```bash
npx -y @transloadit/node templates list --include-builtin exclusively-latest --fields id,name --json
```

Builtins versioning note:
- Skills/docs use `builtin/<name>@latest` as the stable contract.
- If `@latest` is not supported yet in API2, use the concrete builtin version returned by the list output (example: `@0.0.1`).
