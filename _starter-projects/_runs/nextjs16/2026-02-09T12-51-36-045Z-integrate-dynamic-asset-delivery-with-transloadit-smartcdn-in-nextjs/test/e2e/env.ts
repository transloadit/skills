import path from 'node:path'
import dotenv from 'dotenv'

export function loadEnv(): void {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
}

