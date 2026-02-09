import { getSignedSmartCdnUrl } from '@transloadit/utils/node';
import { NextResponse } from 'next/server';
import { ensureTransloaditEnv, getRequiredEnv } from '@/lib/transloadit-env';

export const runtime = 'nodejs';

export async function GET() {
  try {
    ensureTransloaditEnv();
    const authKey = getRequiredEnv('TRANSLOADIT_KEY');
    const authSecret = getRequiredEnv('TRANSLOADIT_SECRET');

    // These values don't need to exist for signing, but real deployments should set them.
    const workspace = process.env.TRANSLOADIT_SMARTCDN_WORKSPACE || 'demo';
    const template = process.env.TRANSLOADIT_SMARTCDN_TEMPLATE || 'serve-preview';
    const input = process.env.TRANSLOADIT_SMARTCDN_INPUT || 'example.jpg';

    const url = getSignedSmartCdnUrl({
      workspace,
      template,
      input,
      authKey,
      authSecret,
    });

    return NextResponse.json({ url, workspace, template, input });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
