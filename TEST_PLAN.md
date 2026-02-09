# Skill Trial Harness (Try-Skill) Test Plan

1. Provision a modern Next.js starter project at `starter-projects/nextjs16`.
2. Verify starter works: `cd starter-projects/nextjs16`
3. Verify starter works: `npm ci`
4. Verify starter works: `npm run build`
5. Commit the starter project (no `node_modules/`, no `.next/`).
6. Implement `scripts/try-skill.ts` with args `--skill <skill-name> --starter-project <name>`.
7. `scripts/try-skill.ts` must copy the starter into an isolated run dir under `starter-projects/_runs/...` (excluding `node_modules`, `.next`, `dist`, `playwright-report`, `test-results`).
8. `scripts/try-skill.ts` must load repo root `.env` and pass secrets to child processes via process environment (do not write `.env.local` into run dirs).
9. `scripts/try-skill.ts` must run Codex fully autonomously inside the run dir, inject the selected skill content into the prompt, and instruct “no commits, only file changes”. Use `--dangerously-bypass-approvals-and-sandbox` so the agent can actually write files and run `npm` on the host filesystem (Codex sandbox can be too restrictive outside trusted git repos).
10. `scripts/try-skill.ts` must capture all agent output to a transcript file and record wall time, and it must redact any secret values found in `.env` from saved transcripts.
11. Run the trial: `node --experimental-strip-types scripts/try-skill.ts --skill integrate-dynamic-asset-delivery-with-transloadit-smartcdn-in-nextjs --starter-project nextjs16`
12. The script must validate automatically in the run dir by running `npm ci` and `npm run test:e2e`.
13. If tests fail, or the diff looks wrong, or the agent got stuck repeatedly, or runtime is too long: update the skill (dense + prescriptive), then rerun step 11.
14. If a high-level assumption was wrong (starter layout, test harness, env loading): update this `TEST_PLAN.md`, then rerun step 11.

## Important Note: Skills vs Harness

- Skills are written as real-world integration guides. They must not require any specific test harness (Vitest/Playwright/etc).
- E2E validation is an internal quality gate. The harness prompt can require “make `npm run test:e2e` pass” and let the agent add/adjust tests as needed, but that requirement must not live in the skills themselves.
