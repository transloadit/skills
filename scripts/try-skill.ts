/* eslint-disable no-console */
const cp = require('node:child_process')
const fsSync = require('node:fs')
const fs = require('node:fs/promises')
const path = require('node:path')

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith('--')) continue
    const key = a.slice(2)
    const next = argv[i + 1]
    if (next == null || next.startsWith('--')) {
      out[key] = true
    } else {
      out[key] = next
      i++
    }
  }
  return out
}

function sanitizeSegment(s) {
  return String(s).replace(/[^a-zA-Z0-9._-]+/g, '-')
}

async function exists(p) {
  try {
    await fs.stat(p)
    return true
  } catch {
    return false
  }
}

async function copyDir(src, dst) {
  await fs.mkdir(dst, { recursive: true })
  const excludeNames = new Set(['node_modules', '.next', 'dist', 'playwright-report', 'test-results', '.git'])

  await fs.cp(src, dst, {
    recursive: true,
    force: true,
    errorOnExist: false,
    filter: (p) => {
      const base = path.basename(p)
      if (excludeNames.has(base)) return false
      if (base === '.DS_Store') return false
      return true
    },
  })
}

function parseDotenv(content) {
  const env = {}
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const k = trimmed.slice(0, eq).trim()
    let v = trimmed.slice(eq + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    env[k] = v
  }
  return env
}

async function writeEnvLocal({ repoRoot, runDir }) {
  const envPath = path.join(repoRoot, '.env')
  if (!(await exists(envPath))) return { wrote: false, keys: [] }

  const content = await fs.readFile(envPath, 'utf8')
  const env = parseDotenv(content)
  const keys = [
    'TRANSLOADIT_KEY',
    'TRANSLOADIT_SECRET',
    'TRANSLOADIT_SMARTCDN_WORKSPACE',
    'TRANSLOADIT_SMARTCDN_TEMPLATE',
    'TRANSLOADIT_SMARTCDN_INPUT',
  ]

  const lines = []
  for (const k of keys) {
    if (env[k] != null && env[k] !== '') lines.push(`${k}=${env[k]}`)
  }
  if (lines.length === 0) return { wrote: false, keys: [] }

  await fs.writeFile(path.join(runDir, '.env.local'), lines.join('\n') + '\n', 'utf8')
  return { wrote: true, keys: lines.map((l) => l.split('=')[0]) }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const skill = args.skill
  const starter = args['starter-project']
  if (!skill || !starter) {
    console.error('Usage: node --experimental-strip-types scripts/try-skill.ts --skill <name> --starter-project <name>')
    process.exit(2)
  }

  const repoRoot = path.resolve(__dirname, '..')
  const starterDir = path.join(repoRoot, 'starter-projects', starter)
  if (!(await exists(starterDir))) {
    console.error(`Starter project not found: ${starterDir}`)
    process.exit(2)
  }

  const skillPath = path.join(repoRoot, skill, 'SKILL.md')
  if (!(await exists(skillPath))) {
    console.error(`Skill not found: ${skillPath}`)
    process.exit(2)
  }
  const skillBody = await fs.readFile(skillPath, 'utf8')

  const iso = new Date().toISOString().replace(/[:.]/g, '-')
  const runRoot = path.join(repoRoot, 'starter-projects', '_runs', starter)
  const runDirName = `${iso}-${sanitizeSegment(skill)}`
  const runDir = path.join(runRoot, runDirName)

  await copyDir(starterDir, runDir)
  const envWrite = await writeEnvLocal({ repoRoot, runDir })

  const transcriptPath = path.join(runDir, 'codex.transcript.jsonl')
  const lastMsgPath = path.join(runDir, 'codex.last-message.txt')

  const prompt = [
    'You are operating inside a single Next.js project directory.',
    'Goal: apply the provided skill to this project and make `npm run test:e2e` pass.',
    'Constraints:',
    '- Do not run `git commit` and do not create new git history.',
    '- Only change files inside this project directory.',
    '- Prefer npm (not pnpm/yarn/bun).',
    envWrite.wrote
      ? `Env: .env.local is present (keys: ${envWrite.keys.join(', ')}).`
      : 'Env: .env.local was not written (repo root .env missing or no keys found).',
    '',
    'Skill content follows. Use it as the primary playbook:',
    '```md',
    skillBody.trimEnd(),
    '```',
  ].join('\n')

  const cmd = 'codex'
  const cmdArgs = [
    '--dangerously-bypass-approvals-and-sandbox',
    'exec',
    '--skip-git-repo-check',
    '--json',
    '--color',
    'never',
    '-C',
    runDir,
    '-m',
    'gpt-5.3-codex',
    '--output-last-message',
    lastMsgPath,
    prompt,
  ]

  console.log(`Run dir: ${runDir}`)
  console.log(`Transcript: ${transcriptPath}`)

  const start = Date.now()
  const child = cp.spawn(cmd, cmdArgs, {
    cwd: repoRoot,
    env: { ...process.env },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  const ws = fsSync.createWriteStream(transcriptPath, { flags: 'a' })
  child.stdout.pipe(ws)
  child.stderr.pipe(ws)

  const code = await new Promise((resolve) => {
    child.on('close', (c) => resolve(c ?? 1))
  })

  ws.end()
  const durMs = Date.now() - start

  console.log(`Codex exit code: ${code}`)
  console.log(`Wall time (ms): ${durMs}`)
  console.log('Next steps (manual):')
  console.log(`  cd ${runDir}`)
  console.log('  npm ci')
  console.log('  npx playwright install chromium')
  console.log('  npm run test:e2e')

  process.exit(code)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
