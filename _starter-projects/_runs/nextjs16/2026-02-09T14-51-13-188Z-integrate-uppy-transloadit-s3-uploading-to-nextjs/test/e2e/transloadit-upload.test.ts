import { afterAll, beforeAll, expect, test } from 'vitest'
import { chromium, type Browser } from 'playwright'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import net from 'node:net'
import path from 'node:path'

async function getFreePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const server = net.createServer()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      if (!addr || typeof addr === 'string') {
        server.close(() => reject(new Error('Failed to get free port')))
        return
      }
      const port = addr.port
      server.close((err) => (err ? reject(err) : resolve(port)))
    })
  })
}

async function waitForHttpOk(url: string, timeoutMs: number) {
  const start = Date.now()
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const res = await fetch(url, { method: 'GET' })
      if (res.ok) return
    } catch {
      // ignore until ready
    }
    if (Date.now() - start > timeoutMs) throw new Error(`Timed out waiting for server: ${url}`)
    await new Promise((r) => setTimeout(r, 250))
  }
}

function nextBin(): string {
  const bin = process.platform === 'win32' ? 'next.cmd' : 'next'
  return path.join(process.cwd(), 'node_modules', '.bin', bin)
}

let nextProc: ChildProcessWithoutNullStreams | null = null
let browser: Browser | null = null
let baseUrl = ''

beforeAll(async () => {
  const port = await getFreePort()
  baseUrl = `http://127.0.0.1:${port}`

  nextProc = spawn(nextBin(), ['dev', '-p', String(port), '-H', '127.0.0.1'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(port) },
    stdio: 'pipe',
  })

  // If Next exits early, surface it as a failure.
  nextProc.once('exit', (code) => {
    if (code && code !== 0) {
      // Keep this minimal; we don't want to dump env/secrets.
      // The test itself will time out if the server never comes up.
    }
  })

  await waitForHttpOk(`${baseUrl}/upload`, 60_000)
  browser = await chromium.launch()
})

afterAll(async () => {
  if (browser) await browser.close()
  if (nextProc) {
    nextProc.kill('SIGTERM')
    await new Promise((r) => nextProc?.once('exit', r))
  }
})

test('uploads PNG via Uppy Dashboard and receives Transloadit results', async () => {
  if (!browser) throw new Error('Browser not started')

  const ctx = await browser.newContext()
  const page = await ctx.newPage()

  await page.goto(`${baseUrl}/upload`, { waitUntil: 'domcontentloaded' })

  const input = page.locator('input.uppy-Dashboard-input[type="file"]').first()
  await input.waitFor({ state: 'attached', timeout: 30_000 })

  const fixture = path.join(process.cwd(), 'test', 'fixtures', '1x1.png')
  await input.setInputFiles(fixture)

  const resultsEl = page.getByTestId('results-json')
  await page.waitForFunction(
    () => {
      const el = document.querySelector('[data-testid="results-json"]')
      return !!el?.textContent?.includes('"resized"')
    },
    { timeout: 180_000 }
  )

  const txt = (await resultsEl.textContent()) ?? ''
  const parsed = JSON.parse(txt) as Record<string, unknown>

  expect(parsed.resized).toBeTruthy()
  expect(Array.isArray(parsed.resized)).toBe(true)
  expect((parsed.resized as unknown[]).length).toBeGreaterThan(0)

  if (Object.prototype.hasOwnProperty.call(parsed, 'exported')) {
    expect(Array.isArray(parsed.exported)).toBe(true)
    expect((parsed.exported as unknown[]).length).toBeGreaterThan(0)
  }

  await ctx.close()
})
