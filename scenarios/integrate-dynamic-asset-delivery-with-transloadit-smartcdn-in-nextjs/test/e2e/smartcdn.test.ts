import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import fsp from 'node:fs/promises'
import net from 'node:net'
import path from 'node:path'
import { ensureTransloaditEnv } from '../../src/lib/transloadit-env'

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

describe('Smart CDN signing scenario', () => {
  let port = 0
  let baseUrl = ''
  let nextProc: ReturnType<typeof spawn> | null = null

  beforeAll(async () => {
    ensureTransloaditEnv()
    if (!process.env.TRANSLOADIT_KEY || !process.env.TRANSLOADIT_SECRET) {
      throw new Error('Missing TRANSLOADIT_KEY/TRANSLOADIT_SECRET (check ../../.env or CI secrets)')
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

    // Wait until the server responds OK.
    const url = `${baseUrl}/`
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
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })

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
      // Signature parameter name may evolve; check for a common one.
      expect(url.searchParams.has('sig') || url.searchParams.has('signature')).toBe(true)
    } finally {
      await page.close()
      await browser.close()
    }
  })
})

