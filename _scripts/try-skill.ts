/* eslint-disable no-console */
const cp = require('node:child_process')
const fsSync = require('node:fs')
const fs = require('node:fs/promises')
const path = require('node:path')
const util = require('node:util')

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function usageAndExit(code) {
  console.error('Usage: node --experimental-strip-types _scripts/try-skill.ts --skill <name> --starter-project <name>')
  process.exit(code)
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

async function runStep({ ws, label, cwd, cmd, args, env }) {
  const start = Date.now()
  await appendMarker(ws, label)
  const exitCode = await spawnAndTee({ cwd, ws, cmd, args, env })
  const wallTimeMs = Date.now() - start
  return { exitCode, wallTimeMs }
}

async function loadAcceptance({ repoRoot, skill }) {
  const acceptancePath = path.join(repoRoot, '_scripts', 'acceptance', `${skill}.md`)
  if (!(await exists(acceptancePath))) return { acceptancePath: null, lines: [] }

  const content = await fs.readFile(acceptancePath, 'utf8')
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim() !== '')
  return { acceptancePath, lines }
}

async function main() {
  const parsed = util.parseArgs({
    args: process.argv.slice(2),
    options: {
      skill: { type: 'string' },
      'starter-project': { type: 'string' },
      help: { type: 'boolean' },
    },
    allowPositionals: true,
  })
  if (parsed.values.help) usageAndExit(0)

  const skill = parsed.values.skill
  const starter = parsed.values['starter-project']
  if (!skill || !starter) usageAndExit(2)

  const repoRoot = path.resolve(__dirname, '..')
  const starterDir = path.join(repoRoot, '_starter-projects', starter)
  if (!(await exists(starterDir))) {
    console.error(`Starter project not found: ${starterDir}`)
    process.exit(2)
  }

  const skillPathCandidates = [
    // Preferred: repo-local skill catalog layout (Cloudflare-style).
    path.join(repoRoot, 'skills', skill, 'SKILL.md'),
    // Legacy: skill folders at repo root.
    path.join(repoRoot, skill, 'SKILL.md'),
    // Also allow agent-local install dir (this repo symlinks `.codex/skills` -> `.ai/skills` -> `../skills`).
    path.join(repoRoot, '.ai', 'skills', skill, 'SKILL.md'),
  ]

  let skillPath = null
  for (const candidate of skillPathCandidates) {
    if (await exists(candidate)) {
      skillPath = candidate
      break
    }
  }
  if (!skillPath) {
    console.error(`Skill not found. Tried:\n${skillPathCandidates.map((p) => `- ${p}`).join('\n')}`)
    process.exit(2)
  }
  const skillBody = await fs.readFile(skillPath, 'utf8')

  const iso = new Date().toISOString().replace(/[:.]/g, '-')
  const startedAt = new Date().toISOString()
  const runRoot = path.join(repoRoot, '_starter-projects', '_runs', starter)
  const runDirName = `${iso}-${sanitizeSegment(skill)}`
  const runDir = path.join(runRoot, runDirName)

  await copyDir(starterDir, runDir)
  const envOverlay = await loadEnvOverlayFromRepoDotenv(repoRoot)
  const childEnv = { ...process.env, ...envOverlay.overlay }

  const transcriptPath = path.join(runDir, 'codex.transcript.jsonl')
  const lastMsgPath = path.join(runDir, 'codex.last-message.txt')
  const summaryPath = path.join(runDir, 'try-skill.summary.json')
  const diffStatPath = path.join(runDir, 'try-skill.diff.stat.txt')

  const acceptance = await loadAcceptance({ repoRoot, skill })

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
    ...(acceptance.lines.length > 0
      ? [
          '',
          'Skill-specific E2E acceptance criteria:',
          ...acceptance.lines,
          ...(acceptance.acceptancePath ? [`(source: ${path.relative(repoRoot, acceptance.acceptancePath)})`] : []),
        ]
      : []),
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

  const codex = await runStep({
    ws,
    label: 'CODEX START',
    cwd: repoRoot,
    cmd,
    args: cmdArgs,
    env: childEnv,
  })
  await appendMarker(ws, 'CODEX END')

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
  const npmCi = await runStep({
    ws,
    label: 'VALIDATE: npm ci',
    cwd: runDir,
    cmd: 'npm',
    args: ['ci', '--no-audit', '--no-fund'],
    env: {
      ...childEnv,
      NEXT_TELEMETRY_DISABLED: '1',
    },
  })

  const e2e = await runStep({
    ws,
    label: 'VALIDATE: npm run test:e2e',
    cwd: runDir,
    cmd: 'npm',
    args: ['run', 'test:e2e'],
    env: {
      ...childEnv,
      NEXT_TELEMETRY_DISABLED: '1',
    },
  })

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
    codex: { exitCode: codex.exitCode, wallTimeMs: codex.wallTimeMs },
    validate: {
      npmCi,
      e2e,
    },
  }
  await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2) + '\n', 'utf8')

  console.log(`Codex exit code: ${codex.exitCode}`)
  console.log(`Codex wall time (ms): ${codex.wallTimeMs}`)
  console.log(`npm ci exit code: ${npmCi.exitCode} (ms: ${npmCi.wallTimeMs})`)
  console.log(`npm run test:e2e exit code: ${e2e.exitCode} (ms: ${e2e.wallTimeMs})`)
  console.log(`Summary: ${summaryPath}`)
  if (summary.diffStatPath) console.log(`Diff stat: ${summary.diffStatPath}`)

  process.exit(codex.exitCode || npmCi.exitCode || e2e.exitCode ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
