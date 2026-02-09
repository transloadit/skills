# add-uppy-transloadit-s3-uploading-to-nextjs

Integration experiment: Next.js (App Router) + Uppy + Transloadit.

What it proves:
- Browser upload via Uppy Dashboard
- Signed Assembly creation via a Next.js route
- Waiting for processing results (`/image/resize` fallback if no template is configured)
- A real E2E test that drives the browser and validates results

## Env vars

Required:
- `TRANSLOADIT_KEY`
- `TRANSLOADIT_SECRET`

Optional:
- `TRANSLOADIT_TEMPLATE_ID`
- `TRANSLOADIT_EXPECT_S3=1` (if your template includes an `/s3/store` step named `exported`)

This experiment will load `../../.env` automatically as a local-only convenience. Real apps should use their own `.env.local` and normal Next.js env loading.

## Run

```bash
npm run dev
```

## E2E

```bash
npm run test:e2e
```

## S3 Export (optional)

If you want results written to S3:
1. Create Template Credentials in your Transloadit account (name it, e.g. `my_s3`).
2. Update `transloadit/steps/resize-to-s3.json` and set `"credentials"` to that name.
3. Create a template and set `TRANSLOADIT_TEMPLATE_ID`:

```bash
npx -y @transloadit/node templates create uppy-nextjs-resize-to-s3 transloadit/steps/resize-to-s3.json -j
```

## Offline robot docs (local dev)

If your published `@transloadit/node` does not yet include `docs robots …`, you can run it from the monorepo:

```bash
node ~/code/node-sdk/packages/node/dist/cli.js docs robots list --search s3 --limit 10 -j
node ~/code/node-sdk/packages/node/dist/cli.js docs robots get /s3/store,/image/resize -j
```
