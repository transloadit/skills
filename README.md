# Transloadit Skills

This repo hosts agent skills for Transloadit.

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

## Notes

Codex treats a directory as a skill only if it contains a `SKILL.md` file (with the skill frontmatter). This is why `_starter-projects/` can live next to skill folders without being picked up as a skill.

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
11. Run the trial: `node --experimental-strip-types _scripts/try-skill.ts --skill integrate-dynamic-asset-delivery-with-transloadit-smartcdn-in-nextjs --starter-project nextjs16`
12. The script must validate automatically in the run dir by running `npm ci` and `npm run test:e2e`.
13. If tests fail, or the diff looks wrong, or the agent got stuck repeatedly, or runtime is too long: update the skill (dense + prescriptive), then rerun step 11.
14. If a high-level assumption was wrong (starter layout, test harness, env loading): update this section in `README.md`, then rerun step 11.

Important note (skills vs harness):
- Skills are written as real-world integration guides. They must not require any specific test harness (Vitest/Playwright/etc).
- E2E validation is an internal quality gate. The harness prompt can require “make `npm run test:e2e` pass” and let the agent add/adjust tests as needed, but that requirement must not live in the skills themselves.
