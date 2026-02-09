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

