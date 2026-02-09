---
name: integrate-dynamic-asset-delivery-with-transloadit-smartcdn-in-nextjs
description: Add Transloadit Smart CDN signing to a Next.js App Router project (server-side signing route + client demo page), plus a runnable Vitest+Playwright E2E that proves the URL is signed.
---

# Inputs

- Required env (server-only): `TRANSLOADIT_KEY`, `TRANSLOADIT_SECRET`
- Optional env: `TRANSLOADIT_SMARTCDN_WORKSPACE`, `TRANSLOADIT_SMARTCDN_TEMPLATE`, `TRANSLOADIT_SMARTCDN_INPUT`

Put these in `.env.local` (do not expose `TRANSLOADIT_SECRET` to the browser).

# Definition Of Done

- `npm run test:e2e` exists and passes.
- `package.json` includes `dependencies.@transloadit/node`.
- `package.json` includes `devDependencies.vitest`, `devDependencies.playwright`, `devDependencies.dotenv`.
- `package.json` includes `scripts.test:e2e` set to `vitest run -c vitest.e2e.config.ts`.
- App Router file exists: `src/app/api/smartcdn/route.ts` (or `app/api/smartcdn/route.ts`).
- App Router files exist: `src/app/smartcdn/page.tsx` and `src/app/smartcdn/smartcdn-demo.tsx` (or `app/...`).
- E2E file exists: `vitest.e2e.config.ts`.
- E2E file exists: `test/e2e/env.ts`.
- E2E file exists: `test/e2e/smartcdn.test.ts`.

# Install

```bash
npm i @transloadit/node
npm i -D vitest playwright dotenv
```

# Implement (App Router)

Pick the root:
- If your project has `src/app`, use `src/app/...`
- Else use `app/...`

1) Add route `app/api/smartcdn/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { Transloadit } from '@transloadit/node'

export const runtime = 'nodejs'

function reqEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required env var: ${name}`)
  return v
}

export async function GET() {
  try {
    const authKey = reqEnv('TRANSLOADIT_KEY')
    const authSecret = reqEnv('TRANSLOADIT_SECRET')

    const workspace = process.env.TRANSLOADIT_SMARTCDN_WORKSPACE || 'demo'
    const template = process.env.TRANSLOADIT_SMARTCDN_TEMPLATE || 'serve-preview'
    const input = process.env.TRANSLOADIT_SMARTCDN_INPUT || 'example.jpg'

    const tl = new Transloadit({ authKey, authSecret })
    const url = tl.getSignedSmartCDNUrl({ workspace, template, input })

    return NextResponse.json({ url, workspace, template, input })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

2) Add page `app/smartcdn/page.tsx`:
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

3) Add client component `app/smartcdn/smartcdn-demo.tsx`:
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

# Prove It (Vitest + Playwright E2E)

1) Add scripts:
- `test:e2e`: `vitest run -c vitest.e2e.config.ts`

2) Add `vitest.e2e.config.ts`:
```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/e2e/**/*.test.ts'],
    testTimeout: 120_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
})
```

3) Add `test/e2e/env.ts` (loads `.env.local` for Vitest):
```ts
import path from 'node:path'
import dotenv from 'dotenv'

export function loadEnv(): void {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
}
```

4) Add `test/e2e/smartcdn.test.ts`:
```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import fsp from 'node:fs/promises'
import net from 'node:net'
import path from 'node:path'
import { loadEnv } from './env'

const getFreePort = async (): Promise<number> =>
  await new Promise((resolve, reject) => {
    const server = net.createServer()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      if (!addr || typeof addr === 'string') return reject(new Error('Failed to bind port'))
      const port = addr.port
      server.close(() => resolve(port))
    })
  })

describe('Smart CDN signing', () => {
  let port = 0
  let baseUrl = ''
  let nextProc: ReturnType<typeof spawn> | null = null

  beforeAll(async () => {
    loadEnv()
    if (!process.env.TRANSLOADIT_KEY || !process.env.TRANSLOADIT_SECRET) {
      throw new Error('Missing TRANSLOADIT_KEY/TRANSLOADIT_SECRET (set .env.local)')
    }

    port = await getFreePort()
    baseUrl = `http://127.0.0.1:${port}`

    await fsp.rm(path.resolve(process.cwd(), '.next/dev/lock'), { force: true })

    nextProc = spawn(
      process.execPath,
      ['node_modules/next/dist/bin/next', 'dev', '-p', String(port), '-H', '127.0.0.1'],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          NEXT_TELEMETRY_DISABLED: '1',
        },
        stdio: 'ignore',
      },
    )

    const url = `${baseUrl}/smartcdn`
    const start = Date.now()
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        const res = await fetch(url, { redirect: 'follow' })
        if (res.ok) break
      } catch {
        // ignore
      }
      if (Date.now() - start > 90_000) throw new Error(`Timed out waiting for ${url}`)
      await new Promise((r) => setTimeout(r, 250))
    }
  })

  afterAll(async () => {
    if (nextProc) {
      nextProc.kill('SIGTERM')
      nextProc = null
    }
  })

  it('renders a signed url payload', async () => {
    const browser = await chromium.launch()
    const page = await browser.newPage()
    try {
      await page.goto(`${baseUrl}/smartcdn`, { waitUntil: 'domcontentloaded' })

      await page.waitForFunction(() => {
        const el = document.querySelector('[data-testid="smartcdn-json"]')
        const text = el?.textContent || ''
        return text.trim() !== '' && !text.includes('(loading)')
      })

      const text = await page.locator('[data-testid="smartcdn-json"]').textContent()
      expect(text).toBeTruthy()
      const payload = JSON.parse(text as string) as Record<string, unknown>

      expect(typeof payload.url).toBe('string')
      const url = new URL(payload.url as string)
      expect(url.protocol).toBe('https:')
      expect(url.searchParams.has('sig') || url.searchParams.has('signature')).toBe(true)
    } finally {
      await page.close()
      await browser.close()
    }
  })
})
```

5) Install Playwright browsers once:
```bash
npx playwright install chromium
```

Run:
```bash
npm run test:e2e
```

# CLI Quick Check (Optional)

```bash
printf '%s' '{"workspace":"<ws>","template":"<tpl>","input":"<file>"}' | npx -y @transloadit/node@4.7.0 auth smart-cdn
```
