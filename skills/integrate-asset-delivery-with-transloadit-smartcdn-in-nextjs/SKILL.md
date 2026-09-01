---
name: integrate-asset-delivery-with-transloadit-smartcdn-in-nextjs
description: Add server-side Transloadit Smart CDN URL signing for an explicitly configured asset to a Next.js App Router project.
---

# Inputs

- Required env (server-only): `TRANSLOADIT_KEY`, `TRANSLOADIT_SECRET`,
  `TRANSLOADIT_SMARTCDN_WORKSPACE`, `TRANSLOADIT_SMARTCDN_TEMPLATE`, and
  `TRANSLOADIT_SMARTCDN_INPUT`

For local dev, put these in `.env.local`. Never expose `TRANSLOADIT_SECRET` to the browser.

Use a Template owned by `TRANSLOADIT_SMARTCDN_WORKSPACE` and give `TRANSLOADIT_SMARTCDN_INPUT` a
fixed asset or storage path. Do not use a shared Template that accepts an arbitrary origin URL. If
a workspace Template imports over HTTP, constrain its origin and path in the Template instead of
accepting an arbitrary URL from the request.

# Install

```bash
npm i @transloadit/utils
```

# Implement (App Router)

Pick the root:
- If your project has `src/app`, use `src/app/...`
- Else use `app/...`

## 1) Server route: sign Smart CDN URLs

Create `app/api/smartcdn/route.ts` (or `src/app/api/smartcdn/route.ts` if you use `src/`):

```ts
import { NextResponse } from 'next/server'
import { getSignedSmartCdnUrl } from '@transloadit/utils/node'

export const runtime = 'nodejs'

function getRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
}

export async function GET() {
  try {
    const authKey = getRequiredEnv('TRANSLOADIT_KEY')
    const authSecret = getRequiredEnv('TRANSLOADIT_SECRET')
    const workspace = getRequiredEnv('TRANSLOADIT_SMARTCDN_WORKSPACE')
    const template = getRequiredEnv('TRANSLOADIT_SMARTCDN_TEMPLATE')
    const input = getRequiredEnv('TRANSLOADIT_SMARTCDN_INPUT')

    const url = getSignedSmartCdnUrl({ workspace, template, input, authKey, authSecret })

    return NextResponse.json({ url, workspace, template, input })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

This route signs one server-configured public asset. Do not replace `workspace`, `template`, or
`input` with unchecked query/body values. For private assets, authenticate and authorize the caller
before returning a short-lived URL.

## 2) Optional: a tiny demo page

Create `app/smartcdn/page.tsx` (or `src/app/smartcdn/page.tsx`):

```tsx
import SmartCdnDemo from './smartcdn-demo'

export default function SmartCdnPage() {
  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 20, fontWeight: 600 }}>Smart CDN Signed URL</h1>
      <SmartCdnDemo />
    </main>
  )
}
```

Create `app/smartcdn/smartcdn-demo.tsx` (or `src/app/smartcdn/smartcdn-demo.tsx`):

```tsx
'use client'

import { useEffect, useState } from 'react'

export default function SmartCdnDemo() {
  const [payload, setPayload] = useState<unknown>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/smartcdn', { cache: 'no-store' })
      .then(async (res) => res.json())
      .then((json) => {
        if (!cancelled) setPayload(json)
      })
      .catch((err) => {
        if (!cancelled) setPayload({ error: String(err) })
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <pre data-testid="smartcdn-json">
      {payload ? JSON.stringify(payload, null, 2) : '(loading)'}
    </pre>
  )
}
```

# Quick Check

- Start dev server, then open `/smartcdn` or fetch `/api/smartcdn`.
- Expect JSON including a `url` and the configured `{ workspace, template, input }`.

# References (Internal)

- Working reference implementation: `https://github.com/transloadit/skills/tree/main/scenarios/integrate-asset-delivery-with-transloadit-smartcdn-in-nextjs`

Tested with (see the scenario lockfile for the exact versions):
- Next.js 16.1.6 (App Router)
- React 19.2.3
- @transloadit/utils 4.3.0 (Smart CDN signing)
