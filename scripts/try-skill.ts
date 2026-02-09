/* eslint-disable no-console */
const cp = require('node:child_process')
const fsSync = require('node:fs')
const fs = require('node:fs/promises')
const path = require('node:path')

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

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

function spawnAndTee({ cwd, ws, cmd, args, env }) {
  return new Promise((resolve) => {
    const child = cp.spawn(cmd, args, {
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    child.stdout.pipe(ws, { end: false })
    child.stderr.pipe(ws, { end: false })
    child.on('close', (code) => resolve(code ?? 1))
  })
}

async function appendMarker(ws, text) {
  ws.write(`\n===== ${text} =====\n`)
  // Let piping flush so markers don't interleave with output too badly.
  await sleep(5)
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
  const startedAt = new Date().toISOString()
  const runRoot = path.join(repoRoot, 'starter-projects', '_runs', starter)
  const runDirName = `${iso}-${sanitizeSegment(skill)}`
  const runDir = path.join(runRoot, runDirName)

  await copyDir(starterDir, runDir)
  const envWrite = await writeEnvLocal({ repoRoot, runDir })

  const transcriptPath = path.join(runDir, 'codex.transcript.jsonl')
  const lastMsgPath = path.join(runDir, 'codex.last-message.txt')
  const summaryPath = path.join(runDir, 'try-skill.summary.json')
  const diffStatPath = path.join(runDir, 'try-skill.diff.stat.txt')

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
    'Operational requirements:',
    '- Ensure `npm run test:e2e` exists and passes.',
    '- If Playwright is used, make sure the Chromium browser is installed (via `playwright install chromium`, a `pretest:e2e`, or similar).',
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

  const ws = fsSync.createWriteStream(transcriptPath, { flags: 'a' })

  const startCodex = Date.now()
  await appendMarker(ws, 'CODEX START')
  const codexExitCode = await spawnAndTee({
    cwd: repoRoot,
    ws,
    cmd,
    args: cmdArgs,
    env: { ...process.env },
  })
  await appendMarker(ws, 'CODEX END')
  const codexMs = Date.now() - startCodex

  // Diff stat (best-effort). Do this before validation so `.next/` doesn't churn during diff.
  try {
    await appendMarker(ws, 'DIFF STAT (starter -> run)')
    const diffStat = cp.execFileSync('git', ['diff', '--no-index', '--stat', starterDir, runDir], {
      encoding: 'utf8',
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    await fs.writeFile(diffStatPath, diffStat, 'utf8')
    ws.write(diffStat + '\n')
  } catch {
    // ignore
  }

  // Validation (runs in the mutated project dir).
  const startCi = Date.now()
  await appendMarker(ws, 'VALIDATE: npm ci')
  const npmCiExitCode = await spawnAndTee({
    cwd: runDir,
    ws,
    cmd: 'npm',
    args: ['ci', '--no-audit', '--no-fund'],
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: '1',
    },
  })
  const npmCiMs = Date.now() - startCi

  const startE2e = Date.now()
  await appendMarker(ws, 'VALIDATE: npm run test:e2e')
  const e2eExitCode = await spawnAndTee({
    cwd: runDir,
    ws,
    cmd: 'npm',
    args: ['run', 'test:e2e'],
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: '1',
    },
  })
  const e2eMs = Date.now() - startE2e

  ws.end()

  const summary = {
    skill,
    starterProject: starter,
    runDir,
    transcriptPath,
    lastMsgPath,
    diffStatPath: (await exists(diffStatPath)) ? diffStatPath : null,
    startedAt,
    endedAt: new Date().toISOString(),
    codex: { exitCode: codexExitCode, wallTimeMs: codexMs },
    validate: {
      npmCi: { exitCode: npmCiExitCode, wallTimeMs: npmCiMs },
      e2e: { exitCode: e2eExitCode, wallTimeMs: e2eMs },
    },
  }
  await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2) + '\n', 'utf8')

  console.log(`Codex exit code: ${codexExitCode}`)
  console.log(`Codex wall time (ms): ${codexMs}`)
  console.log(`npm ci exit code: ${npmCiExitCode} (ms: ${npmCiMs})`)
  console.log(`npm run test:e2e exit code: ${e2eExitCode} (ms: ${e2eMs})`)
  console.log(`Summary: ${summaryPath}`)
  if (summary.diffStatPath) console.log(`Diff stat: ${summary.diffStatPath}`)

  process.exit(codexExitCode || npmCiExitCode || e2eExitCode ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
