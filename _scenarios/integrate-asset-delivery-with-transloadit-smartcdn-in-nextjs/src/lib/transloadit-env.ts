import path from 'node:path';
import dotenv from 'dotenv';

let loaded = false;

export function ensureTransloaditEnv(): void {
  if (loaded) return;
  loaded = true;

  if (process.env.TRANSLOADIT_KEY && process.env.TRANSLOADIT_SECRET) return;

  dotenv.config({
    path: path.resolve(process.cwd(), '../../.env'),
  });
}

export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}
