---
name: integrate-uppy-transloadit-s3-uploading-to-nextjs
description: Add Uppy Dashboard + Transloadit uploads to a Next.js (App Router) app, with server-side signature generation, optional S3 export, and a runnable Playwright+Vitest E2E proof. Use when implementing or debugging browser uploads, Transloadit Assembly creation/signing, progress reporting, and end-to-end verification for Next.js.
---

# Workflow

## Use Offline Robot Docs (No API Calls)

1. Search robots:
```bash
npx -y @transloadit/node docs robots list --search import --limit 10 -j
```

2. Fetch details/examples for chosen robots:
```bash
npx -y @transloadit/node docs robots get /http/import,/image/resize,/s3/store -j
```

## Build Assembly Steps

- Start from the proven step JSONs in:
  - `scenarios/integrate-uppy-transloadit-s3-uploading-to-nextjs/transloadit/steps/resize-only.json`
  - `scenarios/integrate-uppy-transloadit-s3-uploading-to-nextjs/transloadit/steps/resize-to-s3.json`

Lint before running:
```bash
npx -y @transloadit/node assemblies lint --steps scenarios/integrate-uppy-transloadit-s3-uploading-to-nextjs/transloadit/steps/resize-only.json --json
```

## Implement Next.js Integration (Golden Path)

Use the scenario code as the reference implementation:

- Server route that returns Uppy-compatible `assemblyOptions`:
  - `scenarios/integrate-uppy-transloadit-s3-uploading-to-nextjs/src/app/api/transloadit/assembly-options/route.ts`
  - Pitfall: `calcSignature()` returns `{ params: string, signature: string }`. Uppy expects `params` to be that serialized string.

- Client-side uploader:
  - `scenarios/integrate-uppy-transloadit-s3-uploading-to-nextjs/src/app/upload-demo.tsx`
  - Pitfall: with current Uppy packages, mount Dashboard via `@uppy/dashboard` plugin (do not rely on `@uppy/react` exporting `Dashboard`).

- CSS imports:
  - `scenarios/integrate-uppy-transloadit-s3-uploading-to-nextjs/src/app/layout.tsx`
  - Pitfall: use `@uppy/*/css/style.min.css` export paths.

## Optional: S3 Export

1. Create Template Credentials in Transloadit (recommended). Use the credential name in `/s3/store` as `"credentials"`.
2. Create a template from the provided steps JSON:
```bash
npx -y @transloadit/node templates create uppy-nextjs-resize-to-s3 scenarios/integrate-uppy-transloadit-s3-uploading-to-nextjs/transloadit/steps/resize-to-s3.json -j
```
3. Configure env:
- `TRANSLOADIT_TEMPLATE_ID=<template id>`
- `TRANSLOADIT_EXPECT_S3=1` (E2E will assert step `exported` exists)

## Prove It With E2E

This skill is validated by the scenario’s E2E:
```bash
cd scenarios/integrate-uppy-transloadit-s3-uploading-to-nextjs
npm ci
npm run test:e2e
```

If E2E fails, start by checking:
- `TRANSLOADIT_KEY` / `TRANSLOADIT_SECRET` are set.
- The route handler returns `{ params: string, signature: string }`.
- The Transloadit plugin is configured with `waitForEncoding: true` when you expect results.
