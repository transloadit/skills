import path from 'node:path'
import dotenv from 'dotenv'

let loaded = false

// In this experiment repo, we keep Transloadit keys in the parent repo's `.env`.
// For real apps, set env vars normally and avoid this fallback.
export function ensureTransloaditEnv(): void {
  if (loaded) return
  loaded = true

  if (process.env.TRANSLOADIT_KEY && process.env.TRANSLOADIT_SECRET) return

  dotenv.config({
    path: path.resolve(process.cwd(), '../../.env'),
  })
}

export function getRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return value
}

export function formatExpiresUtc(minutesFromNow = 30): string {
  const d = new Date(Date.now() + minutesFromNow * 60_000)
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mi = String(d.getUTCMinutes()).padStart(2, '0')
  const ss = String(d.getUTCSeconds()).padStart(2, '0')
  return `${yyyy}/${mm}/${dd} ${hh}:${mi}:${ss}+00:00`
}

