import { NextResponse } from 'next/server'
import { Transloadit } from '@transloadit/node'
import { ensureTransloaditEnv, formatExpiresUtc, getRequiredEnv } from '@/lib/transloadit-env'

export const runtime = 'nodejs'

export async function POST() {
  try {
    ensureTransloaditEnv()

    const authKey = getRequiredEnv('TRANSLOADIT_KEY')
    const authSecret = getRequiredEnv('TRANSLOADIT_SECRET')

    const templateId = process.env.TRANSLOADIT_TEMPLATE_ID
    const expires = formatExpiresUtc(30)

    const params: Record<string, unknown> = {
      auth: {
        key: authKey,
        expires,
      },
    }

    if (templateId) {
      params.template_id = templateId
    } else {
      // Minimal "known good" steps so the demo works without pre-provisioning a template.
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

    // Uppy expects `{ params: <string|object>, signature: <string> }`.
    return NextResponse.json({ params: signed.params, signature: signed.signature })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
