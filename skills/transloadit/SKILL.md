---
name: transloadit
description: Main entry-point skill for Transloadit. Route to the right `integrate-*`, `transform-*`, or `docs-*` skill, and prefer executing via `npx -y @transloadit/node ...` (CLI) for deterministic behavior.
---

# Quick Routing

1. Need reference (robot params/examples, no API calls): `docs-transloadit-robots`
2. Need a one-off transform (download outputs locally): `transform-*`
3. Need an end-to-end code integration (real app integration steps): `integrate-*`

Prefer routing by category and task shape rather than memorizing a fixed list of sub-skills.
Examples in this repo include `docs-transloadit-robots`, several `transform-*` skills, and several
`integrate-*` skills.

## Install companion skills

If the skills above are not available in your environment, install all of them at once:

```bash
npx -y skills add https://github.com/transloadit/skills --all
```

Or install a single skill:

```bash
npx -y skills add https://github.com/transloadit/skills/tree/main/skills/<skill-name>
```

Replace `<skill-name>` with the directory name of the desired skill under `skills/`.

# CLI Baseline (Recommended)

Most skills in this repo prefer using the `@transloadit/node` CLI via:

```bash
npx -y @transloadit/node ...
```

If a command errors with "Unsupported option name" or a missing subcommand, update to a newer `@transloadit/node`.

Builtin template discovery (token-efficient NDJSON):
```bash
npx -y @transloadit/node templates list --include-builtin exclusively-latest --fields id,name --json
```
