import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import net from 'node:net'
import { afterAll, beforeAll, expect, test } from 'vitest'
import { chromium } from 'playwright'

async function getFreePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      if (!addr || typeof addr === 'string') {
        server.close()
        reject(new Error('Failed to acquire free port'))
        return
      }
      const { port } = addr
      server.close(() => resolve(port))
    })
  })
}

async function waitForHttp(url: string, timeoutMs: number): Promise<void> {
  const start = Date.now()
  // Node 18+ has global fetch; Node 25 does as well.
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { cache: 'no-store' })
      // Any response means the server is up; specific assertions are done in the test.
      if (res) return
    } catch {
      // ignore until timeout
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`Timed out waiting for server: ${url}`)
}

function startNextDev(port: number): ChildProcessWithoutNullStreams {
  const nextBin = require.resolve('next/dist/bin/next')
  const child = spawn(process.execPath, [nextBin, 'dev', '-p', String(port), '-H', '127.0.0.1'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: '1',
      CI: '1',
    },
  })
  return child
}

async function stopProcess(child: ChildProcessWithoutNullStreams | null): Promise<void> {
  if (!child) return
  if (child.exitCode !== null) return

  child.kill('SIGTERM')

  const exited = await new Promise<boolean>((resolve) => {
    const t = setTimeout(() => resolve(false), 10_000)
    child.once('exit', () => {
      clearTimeout(t)
      resolve(true)
    })
  })

  if (!exited && child.exitCode === null) {
    child.kill('SIGKILL')
  }
}

let port = 0
let nextProc: ChildProcessWithoutNullStreams | null = null

beforeAll(async () => {
  port = await getFreePort()
  nextProc = startNextDev(port)
  await waitForHttp(`http://127.0.0.1:${port}/`, 60_000)
})

afterAll(async () => {
  await stopProcess(nextProc)
})

test('renders SmartCDN payload with a signed url', async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage()

  try {
    await page.goto(`http://127.0.0.1:${port}/smartcdn`, { waitUntil: 'domcontentloaded' })
    const pre = page.locator('[data-testid="smartcdn-json"]')
    await pre.waitFor({ state: 'visible', timeout: 30_000 })
    expect(await pre.isVisible()).toBe(true)

    await page.waitForFunction(() => {
      const el = document.querySelector('[data-testid="smartcdn-json"]')
      return !!el && el.textContent && !el.textContent.includes('(loading)')
    })

    const txt = (await pre.textContent()) || ''
    const json = JSON.parse(txt)

    if (json && typeof json === 'object' && 'error' in (json as any)) {
      throw new Error(`API error: ${(json as any).error}`)
    }

    expect(typeof json.url).toBe('string')
    expect(json.url.length).toBeGreaterThan(0)
  } finally {
    await browser.close()
  }
})
