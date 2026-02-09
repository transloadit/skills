# Scenarios

This folder is for integration scenarios that can later be distilled into agent skills.

Workflow (suggested):
1. Create an experiment folder named after the intended skill.
2. Research the current "golden path" (upstream docs, examples, and recent issues).
3. Build a minimal, working project using latest dependencies.
4. Prove it with an automated E2E test (real uploads, real processing).
5. Condense into a `SKILL.md` with a narrow scope, clear inputs/outputs, and a runnable checklist.

Conventions:
- Each experiment is self-contained (own `package.json`).
- Secrets are read from env vars. Do not commit `.env*` files.
- Prefer `npx -y @transloadit/node …` for any Transloadit-side operations (template creation, linting, robot docs).
