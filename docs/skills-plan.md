# Transloadit Agent Skills Plan (Tight)

Goal: a small, reliable set of skills that map directly to the shipped CLI:

`npx -y @transloadit/node ...` (loads `TRANSLOADIT_KEY`/`TRANSLOADIT_SECRET` from `.env` automatically)

## Categories (Current)

- `docs-*`: offline reference lookups (no API calls)
- `transform-*`: one-off transforms (CLI driven, outputs downloaded via `-o`)
- `integrate-*`: runnable, end-to-end integrations (scenarios + Playwright/Vitest E2E)

## Current Skill Set

- `transloadit` (index/router)
- `docs-transloadit-robots` (offline robot docs)
- `transform-generate-image-with-transloadit` (prompt -> image)
- `transform-encode-hls-video-with-transloadit` (mp4 -> HLS)
- `integrate-uppy-transloadit-s3-uploading-to-nextjs` (Next.js + Uppy + Transloadit, optional S3)
- `integrate-dynamic-asset-delivery-with-transloadit-smartcdn-in-nextjs` (Next.js + Smart CDN signing)

## Version Baseline

Use `@transloadit/node >= 4.7.0` for:
- `docs robots ...`
- `templates list --include-builtin ...`

Builtin discovery (token-efficient NDJSON):
```bash
npx -y @transloadit/node@4.7.0 templates list --include-builtin exclusively-latest --fields id,name --json
```

Builtins versioning note:
- Skills/docs use `builtin/<name>@latest` as the stable contract.
- If `@latest` is not supported yet in API2, use the concrete builtin version returned by the list output (example: `@0.0.1`).
