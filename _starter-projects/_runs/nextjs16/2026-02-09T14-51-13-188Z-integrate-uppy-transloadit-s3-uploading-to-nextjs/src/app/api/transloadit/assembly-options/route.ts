import { NextResponse } from 'next/server'
import { Transloadit } from '@transloadit/node'

export const runtime = 'nodejs'

function reqEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required env var: ${name}`)
  return v
}

function formatExpiresUtc(minutesFromNow: number): string {
  const ms = Date.now() + minutesFromNow * 60_000
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z')
}

export async function POST() {
  try {
    const authKey = reqEnv('TRANSLOADIT_KEY')
    const authSecret = reqEnv('TRANSLOADIT_SECRET')
    const templateId = process.env.TRANSLOADIT_TEMPLATE_ID

    const params: Record<string, unknown> = {
      auth: { key: authKey, expires: formatExpiresUtc(30) },
    }

    if (templateId) {
      params.template_id = templateId
    } else {
      params.steps = {
        resized: {
          robot: '/image/resize',
          use: ':original',
          width: 320,
        },
      }
    }

    const tl = new Transloadit({ authKey, authSecret })
    const signed = tl.calcSignature(params)

    return NextResponse.json({ params: signed.params, signature: signed.signature })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

