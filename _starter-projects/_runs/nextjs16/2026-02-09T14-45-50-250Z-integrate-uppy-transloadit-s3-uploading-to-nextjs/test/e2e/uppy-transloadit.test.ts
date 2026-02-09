import { afterAll, beforeAll, expect, test } from 'vitest'
import { chromium, type Browser } from 'playwright'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import net from 'node:net'

async function getFreePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      if (!addr || typeof addr === 'string') return reject(new Error('Failed to allocate port'))
      const port = addr.port
      server.close((err) => (err ? reject(err) : resolve(port)))
    })
  })
}

async function waitForOk(url: string, timeoutMs: number) {
  const start = Date.now()
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const res = await fetch(url, { redirect: 'manual' })
      if (res.ok) return
    } catch {
      // ignore until timeout
    }
    if (Date.now() - start > timeoutMs) throw new Error(`Timed out waiting for ${url}`)
    await new Promise((r) => setTimeout(r, 250))
  }
}

let baseUrl = ''
let nextProc: ChildProcessWithoutNullStreams | null = null
let browser: Browser | null = null

beforeAll(async () => {
  const port = await getFreePort()
  baseUrl = `http://127.0.0.1:${port}`

  nextProc = spawn('npm', ['run', 'dev', '--', '-p', String(port)], {
    stdio: 'pipe',
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: '1',
    },
  })

  // Ensure the child doesn't keep the process alive if a test hangs.
  nextProc.unref()

  // Wait for app readiness by polling an actual page we need.
  await waitForOk(`${baseUrl}/upload`, 90_000)

  browser = await chromium.launch()
})

afterAll(async () => {
  try {
    await browser?.close()
  } finally {
    if (nextProc && !nextProc.killed) nextProc.kill('SIGTERM')
  }
})

test('upload page renders (no upload performed)', async () => {
  if (!browser) throw new Error('browser not started')
  const page = await browser.newPage()
  await page.goto(`${baseUrl}/upload`, { waitUntil: 'domcontentloaded' })

  await expect(page.getByRole('heading', { name: 'Upload demo' })).toBeVisible()
  await expect(page.getByText('0%')).toBeVisible()
})

test('server returns signed assembly options', async () => {
  const res = await fetch(`${baseUrl}/api/transloadit/assembly-options`, { method: 'POST' })
  expect(res.status).toBe(200)
  const data = (await res.json()) as { params?: unknown; signature?: unknown }
  expect(data).toHaveProperty('params')
  expect(typeof data.signature).toBe('string')
  expect((data.signature as string).length).toBeGreaterThan(10)
})

