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

function shouldRedactKey(k) {
  // Keep simple and conservative: redact anything ending in these tokens.
  return /(SECRET|TOKEN|PASSWORD|KEY)$/i.test(String(k))
}

async function loadEnvOverlayFromRepoDotenv(repoRoot) {
  const envPath = path.join(repoRoot, '.env')
  if (!(await exists(envPath))) {
    return { overlay: {}, redactValues: [], keys: [] }
  }

  const content = await fs.readFile(envPath, 'utf8')
  const env = parseDotenv(content)

  // Only forward the Transloadit-related variables into the trial processes
  // to reduce accidental secret exposure.
  const overlay = {}
  for (const [k, v] of Object.entries(env)) {
    if (!k.startsWith('TRANSLOADIT_')) continue
    if (v == null || v === '') continue
    overlay[k] = v
  }

  const keys = Object.keys(overlay).sort()
  const redactValues = []
  for (const k of keys) {
    if (!shouldRedactKey(k)) continue
    const v = overlay[k]
    if (typeof v === 'string' && v) redactValues.push(v)
  }

  return { overlay, redactValues, keys }
}

async function redactFileInPlace(filePath, redactValues) {
  if (!redactValues || redactValues.length === 0) return
  if (!(await exists(filePath))) return

  let content = await fs.readFile(filePath, 'utf8')
  for (const secret of redactValues) {
    if (!secret) continue
    // Exact-value replacement (fast + avoids accidental regex pitfalls).
    content = content.split(secret).join('REDACTED')
  }
  await fs.writeFile(filePath, content, 'utf8')
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
  const envOverlay = await loadEnvOverlayFromRepoDotenv(repoRoot)
  const childEnv = { ...process.env, ...envOverlay.overlay }

  const transcriptPath = path.join(runDir, 'codex.transcript.jsonl')
  const lastMsgPath = path.join(runDir, 'codex.last-message.txt')
  const summaryPath = path.join(runDir, 'try-skill.summary.json')
  const diffStatPath = path.join(runDir, 'try-skill.diff.stat.txt')

  const acceptance = []
  if (skill === 'integrate-dynamic-asset-delivery-with-transloadit-smartcdn-in-nextjs') {
    acceptance.push('- E2E must load `/smartcdn`, read `[data-testid="smartcdn-json"]`, parse JSON, and assert it contains a `url` string.')
    acceptance.push('- The `url` should look signed (do not snapshot secrets; just assert it contains signature-ish markers like `~` or query params).')
  }
  if (skill === 'integrate-uppy-transloadit-s3-uploading-to-nextjs') {
    acceptance.push('- E2E must actually upload a small PNG via the Uppy Dashboard file input and wait for at least one Transloadit result (no mocks).')
    acceptance.push('- Add a tiny fixture file at `test/fixtures/1x1.png` and upload it using Playwright `setInputFiles`.')
    acceptance.push('- Render Transloadit results JSON in `[data-testid="results-json"]` and assert the `resized` step exists (and optionally `exported` when configured).')
  }

  const prompt = [
    'You are operating inside a single Next.js project directory.',
    'Goal: apply the provided skill to this project.',
    'Internal harness requirement: make `npm run test:e2e` pass (the harness will run it after you finish).',
    'Constraints:',
    '- Do not run `git commit` and do not create new git history.',
    '- Only change files inside this project directory.',
    '- Prefer npm (not pnpm/yarn/bun).',
    envOverlay.keys.length > 0
      ? `Env: TRANSLOADIT_* env vars are set in the process environment (${envOverlay.keys.length} keys).`
      : 'Env: No TRANSLOADIT_* keys were loaded from repo root .env. If required, expect the harness environment to provide them.',
    'Security:',
    '- Do not print secrets or environment variables.',
    "- Do not `cat` `.env*` files or run `env`/`printenv`.",
    '',
    'Operational requirements:',
    '- Ensure `npm run test:e2e` exists and passes.',
    '- If Playwright is used, make sure the Chromium browser is installed (via `playwright install chromium`, a `pretest:e2e`, or similar).',
    '',
    'Internal E2E harness defaults (keep it minimal and portable):',
    '- Use Vitest + Playwright (Chromium).',
    '- Add `scripts.test:e2e` = `vitest run -c vitest.e2e.config.ts`.',
    '- Add a `pretest:e2e` that installs Chromium if needed: `playwright install chromium`.',
    '- Add `vitest.e2e.config.ts` with `testTimeout`/`hookTimeout` and `include: [\"test/e2e/**/*.test.ts\"]`.',
    '- Put tests under `test/e2e/` and start Next in the test (spawn `next dev` on a free port, wait for readiness, then drive via Playwright).',
    '- Read `TRANSLOADIT_*` from `process.env` (do not depend on `.env.local` or `dotenv` for the harness).',
    ...(acceptance.length > 0 ? ['','Skill-specific E2E acceptance criteria:', ...acceptance] : []),
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
    env: childEnv,
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
      ...childEnv,
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
      ...childEnv,
      NEXT_TELEMETRY_DISABLED: '1',
    },
  })
  const e2eMs = Date.now() - startE2e

  await new Promise((resolve) => ws.end(resolve))

  // Redact secrets from captured outputs (best-effort).
  await redactFileInPlace(transcriptPath, envOverlay.redactValues)
  await redactFileInPlace(lastMsgPath, envOverlay.redactValues)

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
