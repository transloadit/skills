import path from 'node:path';
import dotenv from 'dotenv';

let loaded = false;

export function ensureTransloaditEnv(): void {
  if (loaded) return;
  loaded = true;

  dotenv.config({
    path: path.resolve(process.cwd(), '../../.env'),
    quiet: true,
  });
}

export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}
