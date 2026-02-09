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

describe('Uppy + Transloadit (Next.js) E2E', () => {
  let port = 0
  let baseUrl = ''
  let nextProc: ReturnType<typeof spawn> | null = null
  let nextLogs = ''

  beforeAll(async () => {
    ensureTransloaditEnv()
    if (!process.env.TRANSLOADIT_KEY || !process.env.TRANSLOADIT_SECRET) {
      throw new Error('Missing TRANSLOADIT_KEY/TRANSLOADIT_SECRET (check ../../.env)')
    }

    port = await getFreePort()
    baseUrl = `http://127.0.0.1:${port}`

    // Clear any stale lock from a previous run that crashed mid-way.
    await fsp.rm(path.resolve(process.cwd(), '.next/dev/lock'), { force: true })

    try {
      nextProc = spawn(
        process.execPath,
        ['node_modules/next/dist/bin/next', 'dev', '-p', String(port), '-H', '127.0.0.1'],
        {
          cwd: process.cwd(),
          env: {
            ...process.env,
            NEXT_TELEMETRY_DISABLED: '1',
            // Make the test independent from any pre-provisioned template.
            TRANSLOADIT_TEMPLATE_ID: '',
          },
          // Avoid filling up stdio buffers and deadlocking the test runner.
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      )

      nextLogs = ''
      nextProc.stdout?.on('data', (buf: Buffer) => {
        nextLogs = (nextLogs + buf.toString('utf8')).slice(-20_000)
      })
      nextProc.stderr?.on('data', (buf: Buffer) => {
        nextLogs = (nextLogs + buf.toString('utf8')).slice(-20_000)
      })

      const url = `${baseUrl}/`
      const start = Date.now()
      // eslint-disable-next-line no-constant-condition
      while (true) {
        if (nextProc.exitCode != null) {
          throw new Error(`Next dev server exited early (${nextProc.exitCode}). Logs:\n${nextLogs}`)
        }
        try {
          const res = await fetch(url, { redirect: 'follow' })
          if (res.ok) break
        } catch {
          // ignore
        }
        if (Date.now() - start > 90_000) {
          throw new Error(`Timed out waiting for ${url}. Logs:\n${nextLogs}`)
        }
        await new Promise((r) => setTimeout(r, 250))
      }
    } catch (err) {
      nextProc?.kill('SIGTERM')
      nextProc = null
      throw err
    }
  })

  afterAll(async () => {
    if (nextProc) {
      nextProc.kill('SIGTERM')
      await Promise.race([
        new Promise<void>((resolve) => nextProc?.once('exit', () => resolve())),
        new Promise<void>((resolve) => setTimeout(resolve, 5_000)),
      ])
      nextProc = null
    }
  })

  it('uploads a file and receives resize results', async () => {
    const browser = await chromium.launch()
    const page = await browser.newPage()

    try {
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })

      const fixture = path.resolve(process.cwd(), 'test/fixtures/1x1.png')
      await page
        .locator('[data-testid="uppy-dashboard"] input[type="file"]')
        .first()
        .setInputFiles(fixture)

      // Ensure Uppy saw the file selection.
      await page.waitForFunction(() => document.body.innerText.includes('1x1.png'), undefined, {
        timeout: 10_000,
      })

      // Wait for at least one Transloadit result to show up.
      await page.waitForFunction(() => {
        const el = document.querySelector('[data-testid="results-json"]')
        if (!el) return false
        const text = (el.textContent || '').trim()
        return text !== '' && text !== '(none yet)'
      }, undefined, { timeout: 180_000 })

      const jsonText = await page.locator('[data-testid="results-json"]').textContent()
      expect(jsonText).toBeTruthy()
      const parsed = JSON.parse(jsonText as string) as Record<string, unknown>

      // Our fallback assembly uses a step named "resized".
      expect(Array.isArray(parsed.resized)).toBe(true)
      const first = (parsed.resized as unknown[])[0] as Record<string, unknown>
      expect(typeof first.ssl_url === 'string' || typeof first.url === 'string').toBe(true)
    } finally {
      await page.close()
      await browser.close()
    }
  })
})
