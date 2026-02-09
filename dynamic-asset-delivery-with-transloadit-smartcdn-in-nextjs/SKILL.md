---
name: dynamic-asset-delivery-with-transloadit-smartcdn-in-nextjs
description: Implement dynamic asset delivery in Next.js using Transloadit Smart CDN signed URLs, with a runnable Playwright+Vitest E2E proof. Use when adding server-side signing, integrating signed URLs into a Next.js UI, or debugging Smart CDN signature generation and caching behavior.
---

# Workflow

## Generate Signed Smart CDN URLs Server-Side

Use the scenario route handler as the baseline implementation:
- `scenarios/dynamic-asset-delivery-with-transloadit-smartcdn-in-nextjs/src/app/api/smartcdn/route.ts`

Notes:
- Keep signing on the server (never expose `TRANSLOADIT_SECRET` to the browser).
- Use `export const runtime = 'nodejs'` for the route handler.
- If you fetch the route from UI, prefer `cache: 'no-store'` while developing.

## Configure Inputs

This scenario reads:
- `TRANSLOADIT_KEY`, `TRANSLOADIT_SECRET`
- Optional:
  - `TRANSLOADIT_SMARTCDN_WORKSPACE`
  - `TRANSLOADIT_SMARTCDN_TEMPLATE`
  - `TRANSLOADIT_SMARTCDN_INPUT`

## Prove It With E2E

Run the scenario E2E:
```bash
cd scenarios/dynamic-asset-delivery-with-transloadit-smartcdn-in-nextjs
npm ci
npm run test:e2e
```

The E2E asserts the page renders a JSON payload that includes a signed `https:` URL.

## CLI Alternative (For Quick Checks)

Generate a signed Smart CDN URL from stdin:
```bash
printf '%s' '{"workspace":"<ws>","template":"<tpl>","input":"<file>"}' | npx -y @transloadit/node auth smart-cdn
```

