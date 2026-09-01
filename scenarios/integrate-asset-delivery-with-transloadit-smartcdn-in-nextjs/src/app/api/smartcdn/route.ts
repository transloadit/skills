import { getSignedSmartCdnUrl } from '@transloadit/utils/node';
import { NextResponse } from 'next/server';
import { ensureTransloaditEnv, getRequiredEnv } from '@/lib/transloadit-env';

export const runtime = 'nodejs';

export async function GET() {
  try {
    ensureTransloaditEnv();
    const authKey = getRequiredEnv('TRANSLOADIT_KEY');
    const authSecret = getRequiredEnv('TRANSLOADIT_SECRET');

    const workspace = getRequiredEnv('TRANSLOADIT_SMARTCDN_WORKSPACE');
    const template = getRequiredEnv('TRANSLOADIT_SMARTCDN_TEMPLATE');
    const input = getRequiredEnv('TRANSLOADIT_SMARTCDN_INPUT');

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
