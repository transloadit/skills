# Transloadit Agent Skills Plan (Focused)

The goal is a small set of narrow, reliable skills that map 1:1 to the shipped Transloadit CLI:

`npx -y @transloadit/node …` (runs the `transloadit` CLI, reads `.env` via `dotenv/config`)

This keeps skills deterministic: the agent decides "what to do", but execution is done by the CLI.

## Shared assumptions (all skills)

- Credentials come from `TRANSLOADIT_KEY` and `TRANSLOADIT_SECRET` (loaded from `.env` automatically).
- Prefer machine-readable output via `-j`/`--json` when the result is fed into other steps.
- Prefer linting before live runs when assembling new instructions.

## Skill 0: Robot Docs (Offline)

**Use when**
- The agent needs to pick the right Robot(s), or needs parameter docs/examples to draft steps.

**Key properties**
- Offline metadata (no API calls).
- `-j`/`--json` is token-efficient and stable to parse.

**Execution**
```bash
# Search/browse robots (summary index)
npx -y @transloadit/node docs robots list --search import --limit 10 -j

# Get full docs for one or more robots (comma-separated and/or variadic)
npx -y @transloadit/node docs robots get /http/import -j
npx -y @transloadit/node docs robots get /http/import,/image/resize -j
npx -y @transloadit/node docs robots get /http/import /image/resize -j
```

**JSON shapes**
- `docs robots list -j` prints: `{ robots: [{ name, title?, summary, category? }], nextCursor? }`
- `docs robots get -j` prints: `{ robots: [{ name, summary, requiredParams, optionalParams, examples? }], notFound: string[] }`

**Error handling contract**
- Exit code is `1` if anything is in `notFound`.
- Still returns partial JSON results so the agent can proceed with what was found and only fix missing names.

## Skill 1: Run An Assembly From Local Inputs

**Use when**
- The user has local files and wants output artifacts (conversions, thumbnails, encodes, etc).

**Agent inputs**
- Input paths or a directory.
- Either: a template (`template_id_or_name`) or a steps JSON file (`steps.json`).
- Any template fields / instruction fields to set.

**Execution**
```bash
# Template-driven
npx -y @transloadit/node assemblies create --template <template> --input <path> --watch --json

# Steps-driven (file or stdin)
npx -y @transloadit/node assemblies create --steps steps.json --input <path> --watch --json
```

**Output contract**
- The exact command used.
- The assembly URL/ID and the resulting URLs (from `--json` output).

## Skill 2: Lint (And Optionally Fix) Assembly Instructions

**Use when**
- The user (or agent) has drafted steps JSON and wants validation before running.

**Agent inputs**
- Steps JSON (path or stdin).
- Optional: `--fix` and desired strictness (`--fatal`).

**Execution**
```bash
# Lint local file
npx -y @transloadit/node assemblies lint --steps steps.json --json

# Auto-fix (writes back to file)
npx -y @transloadit/node assemblies lint --steps steps.json --fix --json
```

**Output contract**
- The lint result (issues list).
- If `--fix` was used: confirm whether the file changed and summarize what changed (high-level).

## Skill 3: Template CRUD + Sync

**Use when**
- The user wants reusable pipelines (templates), or wants to keep local JSON in sync with API2 templates.

**Agent inputs**
- Operation: `list|get|create|modify|delete|sync`.
- Local file(s) or directory (for `create/modify/sync`).

**Execution**
```bash
npx -y @transloadit/node templates list --json
npx -y @transloadit/node templates get <templateId> --json
npx -y @transloadit/node templates create <name> <file> --json
npx -y @transloadit/node templates modify <templateId> <file> --json
npx -y @transloadit/node templates sync <path> --recursive --json
```

**Output contract**
- For `create/modify/sync`: include the normalized steps JSON that was applied (from file content).
- For `list/get`: return the minimal fields the user asked for (avoid dumping huge payloads).

## Skill 4: Assembly Debugging (Get, List, Replay, Cancel)

**Use when**
- The user has an assembly URL/ID and needs diagnosis, reprocessing, or cancellation.

**Agent inputs**
- Assembly IDs/URLs.
- For replay: optional overrides (fields, steps, notify URL).

**Execution**
```bash
npx -y @transloadit/node assemblies get <assemblyIdOrUrl> --json
npx -y @transloadit/node assemblies list --keywords foo --json
npx -y @transloadit/node assemblies replay <assemblyIdOrUrl> --json
npx -y @transloadit/node assemblies delete <assemblyIdOrUrl> --json
```

**Output contract**
- Clear diagnosis summary: what failed, where, and the next actionable step.
- If replayed: confirm the replay request was accepted, then follow up with `assemblies get` to show the new state.

## Skill 5: Auth Utilities (Signature + Smart CDN)

**Use when**
- The user is integrating Transloadit and needs signatures or signed Smart CDN URLs.

**Agent inputs**
- The payload to sign (or Smart CDN URL parameters).

**Execution**
```bash
# Signature: reads JSON params from stdin (or empty stdin for a minimal payload)
printf '%s' '{"auth":{"expires":"2026/12/31 23:59:59+00:00"}}' | npx -y @transloadit/node auth signature

# Smart CDN: reads JSON params from stdin
printf '%s' '{"workspace":"<ws>","template":"<tpl>","input":"<file>"}' | npx -y @transloadit/node auth smart-cdn
```

**Output contract**
- Return the computed signature or signed URL, plus a minimal integration note (where to plug it in).

## Notes: Versioning / Fallback

If the published `@transloadit/node` version used by `npx` does not yet include `docs robots …`, use one of:
- Local dev (monorepo): `node ~/code/node-sdk/packages/node/dist/cli.js docs robots … -j`
- MCP fallback: `@transloadit/mcp-server` exposes `transloadit_list_robots` and `transloadit_get_robot_help`
