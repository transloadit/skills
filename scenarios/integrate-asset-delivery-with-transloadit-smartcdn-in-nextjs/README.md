# integrate-asset-delivery-with-transloadit-smartcdn-in-nextjs

Integration scenario: Next.js (App Router) + Transloadit Smart CDN signing.

What it proves:
- Server-side signing of Smart CDN URLs (keeps `TRANSLOADIT_SECRET` off the client)
- A page that fetches the signed URL payload from a route handler
- A Playwright+Vitest E2E test that asserts the payload includes an `https:` signed URL

## Env vars

Required:
- `TRANSLOADIT_KEY`
- `TRANSLOADIT_SECRET`

Optional:
- `TRANSLOADIT_SMARTCDN_WORKSPACE`
- `TRANSLOADIT_SMARTCDN_TEMPLATE`
- `TRANSLOADIT_SMARTCDN_INPUT`

This scenario will load `../../.env` automatically as a local-only convenience. Real apps should use their own `.env.local` and normal Next.js env loading.

## Run

```bash
npm run dev
```

## E2E

```bash
npm run test:e2e
```
