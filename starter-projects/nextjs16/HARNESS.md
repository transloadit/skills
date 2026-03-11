This starter is a Next.js App Router project.

- Ensure `npm run test:e2e` exists and passes.
- If Playwright is used, make sure Chromium is installed (for example via `playwright install chromium`, a `pretest:e2e`, or similar).
- Keep the harness minimal and portable.
- Use Vitest + Playwright (Chromium).
- Add `scripts.test:e2e` = `vitest run -c vitest.e2e.config.ts`.
- Add a `pretest:e2e` that installs Chromium if needed: `playwright install chromium`.
- Add `vitest.e2e.config.ts` with `testTimeout`/`hookTimeout` and `include: ["test/e2e/**/*.test.ts"]`.
- Put tests under `test/e2e/` and start Next in the test (spawn `next dev` on a free port, wait for readiness, then drive via Playwright).
