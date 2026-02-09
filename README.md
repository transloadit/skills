# Transloadit Skills

This repo hosts agent skills for Transloadit.

## Install / Use

This repo is compatible with the `skills` installer CLI (https://skills.sh/).

Browse what’s available:
```bash
npx -y skills add ./skills --list
```

Install into this project (or use `-g` for user-level):
```bash
npx -y skills add ./skills --all
```

Manual option (symlink the `skills/` catalog into your agent’s skill directory):
```bash
ln -s /ABS/PATH/TO/THIS/REPO/skills ~/.codex/skills
ln -s /ABS/PATH/TO/THIS/REPO/skills ~/.claude/skills
ln -s /ABS/PATH/TO/THIS/REPO/skills ~/.gemini/skills
```

Note: this repo also contains developer-only skills under `.ai/dev-skills/` for working on this repo. The public catalog lives under `skills/`.

## Scenarios

`_scenarios/` is for integration scenarios that can later be distilled into agent skills.

Workflow (suggested):
1. Create a scenario folder named after the intended skill.
2. Research the current "golden path" (upstream docs, examples, and recent issues).
3. Build a minimal, working project using latest dependencies.
4. Prove it with an automated E2E test (real uploads, real processing).
5. Condense into a `SKILL.md` with a narrow scope, clear inputs/outputs, and a runnable checklist.

Conventions:
- Each scenario is self-contained (own `package.json`).
- Secrets are read from env vars. Do not commit `.env*` files.
- Prefer `npx -y @transloadit/node ...` for any Transloadit-side operations (template creation, linting, robot docs).

## Add A Skill

1. Create `skills/<skill-name>/SKILL.md` with tight scope and a runnable checklist.
2. If it’s an integration, create a matching `_scenarios/<skill-name>/` reference implementation and validate it with an E2E test.
3. Keep test-harness specifics out of the skill. The skill should read like guidance for a normal production app.

## Skill Catalog

Categories:
- `docs-*`: offline reference lookups (no API calls)
- `transform-*`: one-off transforms (CLI driven, outputs downloaded via `-o`)
- `integrate-*`: real-world integration guides (validated via `_scenarios/` + E2E, but not requiring any test harness)

Current skills:
- `transloadit` (router)
- `docs-transloadit-robots`
- `transform-generate-image-with-transloadit`
- `transform-encode-hls-video-with-transloadit`
- `integrate-uppy-transloadit-s3-uploading-to-nextjs`
- `integrate-asset-delivery-with-transloadit-smartcdn-in-nextjs`

Builtin template discovery (token-efficient NDJSON, good for agents):
```bash
npx -y @transloadit/node templates list --include-builtin exclusively-latest --fields id,name --json
```

Builtins versioning note:
- Skills/docs use `builtin/<name>@latest` as the stable contract.
- If `@latest` is not supported yet in your API2, use the concrete builtin version returned by the list output (example: `@0.0.1`).

## Notes

Repository layout:
- `skills/`: skill catalog (`skills/<name>/SKILL.md`)
- `_scenarios/`: runnable reference implementations (E2E-validated)
- `_scripts/`: internal harness tooling (not a skill)
- `_starter-projects/`: starter templates used by the harness (not a skill)

Skill discovery is `SKILL.md`-based, so it’s fine for `_starter-projects/` and `_scenarios/` to be siblings of `skills/` without being interpreted as skills.

## Try-Skill Harness

1. Provision a modern Next.js starter project at `_starter-projects/nextjs16`.
2. Verify starter works: `cd _starter-projects/nextjs16`
3. Verify starter works: `npm ci`
4. Verify starter works: `npm run build`
5. Commit the starter project (no `node_modules/`, no `.next/`).
6. Implement `_scripts/try-skill.ts` with args `--skill <skill-name> --starter-project <name>`.
7. `_scripts/try-skill.ts` must copy the starter into an isolated run dir under `_starter-projects/_runs/...` (excluding `node_modules`, `.next`, `dist`, `playwright-report`, `test-results`).
8. `_scripts/try-skill.ts` must load repo root `.env` and pass secrets to child processes via process environment (do not write `.env.local` into run dirs).
9. `_scripts/try-skill.ts` must run Codex fully autonomously inside the run dir, inject the selected skill content into the prompt, and instruct “no commits, only file changes”. Use `--dangerously-bypass-approvals-and-sandbox` so the agent can actually write files and run `npm` on the host filesystem (Codex sandbox can be too restrictive outside trusted git repos).
10. `_scripts/try-skill.ts` must capture all agent output to a transcript file and record wall time, and it must redact any secret values found in `.env` from saved transcripts.
11. Run the trial: `node --experimental-strip-types _scripts/try-skill.ts --skill integrate-asset-delivery-with-transloadit-smartcdn-in-nextjs --starter-project nextjs16`
12. The script must validate automatically in the run dir by running `npm ci` and `npm run test:e2e`.
13. If tests fail, or the diff looks wrong, or the agent got stuck repeatedly, or runtime is too long: update the skill (dense + prescriptive), then rerun step 11.
14. If a high-level assumption was wrong (starter layout, test harness, env loading): update this section in `README.md`, then rerun step 11.

Important note (skills vs harness):
- Skills are written as real-world integration guides. They must not require any specific test harness (Vitest/Playwright/etc).
- E2E validation is an internal quality gate. The harness prompt can require “make `npm run test:e2e` pass” and let the agent add/adjust tests as needed, but that requirement must not live in the skills themselves.
