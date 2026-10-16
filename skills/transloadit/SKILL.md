---
name: transloadit
description: Main entry-point skill for Transloadit. Route to the right `integrate-*`, `transform-*`, or `docs-*` skill, and prefer executing via `npx -y @transloadit/node ...` (CLI) for deterministic behavior.
---

# Quick Routing

1. Need reference (robot params/examples, no API calls): `docs-transloadit-robots`
2. Need a one-off transform (download outputs locally): `transform-*`
3. Need an end-to-end code integration (real app integration steps): `integrate-*`

Approved Builtin outcomes:

| Outcome | Skill | Builtin |
| --- | --- | --- |
| Website-ready images | `transform-prepare-image-with-transloadit` | `prepare-image` |
| Video cover images | `transform-make-video-covers-with-transloadit` | `video-covers` |
| Recording transcripts/subtitle files | `transform-transcribe-audio-with-transloadit` | `transcribe` |
| Plain burned video captions | `transform-caption-video-with-transloadit` | `caption-video` |
| Text from PDFs, scans, photos and Office files | `transform-extract-text-with-transloadit` | `extract-text` |
| Web MP4/WebM | `transform-encode-video-with-transloadit` | `encode-video` |
| Webpage/HTML screenshots or PDF | `transform-capture-webpage-with-transloadit` | `capture-webpage` |
| Office, HTML, Markdown or text to PDF | `transform-convert-markdown-to-pdf-with-transloadit` | `convert-to-pdf` |
| Transparent photo cutouts | `transform-remove-background-with-transloadit` | `remove-background` |

Other entry points: `docs-transloadit-robots`, `transform-generate-image-with-transloadit`,
`transform-encode-hls-video-with-transloadit`, `transform-describe-image-with-transloadit`,
`transform-upscale-image-with-transloadit`, `transform-build-mosaic-collage-with-transloadit`,
`transform-build-polaroid-collage-with-transloadit`, `integrate-uppy-transloadit-s3-uploading-to-nextjs`,
and `integrate-asset-delivery-with-transloadit-smartcdn-in-nextjs`.

## Install companion skills

If the skills above are not available in your environment, install all of them at once:

```bash
npx -y skills add https://github.com/transloadit/skills --all
```

Or install a single skill:

```bash
npx -y skills add https://github.com/transloadit/skills/tree/main/skills/<skill-name>
```

Replace `<skill-name>` with a skill listed above. Individual outcome skills include their own CLI
workflow and do not require installing the whole catalog.

# CLI Baseline (Recommended)

Most skills in this repo prefer using the `@transloadit/node` CLI via:

```bash
npx -y @transloadit/node ...
```

If a command errors with "Unsupported option name" or a missing subcommand, update to a newer `@transloadit/node`.

The CLI resolves auth in this order:
1. Shell environment variables
2. The current working directory `.env`
3. `~/.transloadit/credentials`

Prefer `~/.transloadit/credentials` as the default fallback for user-level or agent-level setup.
The file uses dotenv syntax and can include `TRANSLOADIT_KEY`,
`TRANSLOADIT_SECRET`, `TRANSLOADIT_ENDPOINT`, and `TRANSLOADIT_AUTH_TOKEN`.
The `.env` lookup is cwd-only and takes precedence over `~/.transloadit/credentials`. If your
`.env` lives in a parent directory, export the variables into the shell.

## Builtin discovery and execution

Use the supported catalog path; JSON output is one object per line:

```bash
npx -y @transloadit/node templates list --include-builtin exclusively-latest --fields id,name,builtin_version,description,fields_schema --json
npx -y @transloadit/node templates get builtin/prepare-image@latest --json
```

Select the outcome's returned `id`; `--template <id>` sends API `template_id`. Use `@latest` for
the deployed alias or pin the returned version for reproducibility. Plain captions pin `@0.0.1`;
use `exclusively-all` when looking up a pinned version no longer listed as latest.

`fields_schema` is standalone draft-07 JSON Schema. Merge the Template's `content.fields` defaults
with caller fields before validating. Read supported fields, enums and limits from that contract;
do not maintain a second schema or copy Assembly Instructions into a skill. A null schema marks an
older undeclared contract, not unrestricted input. If the required Builtin/schema is missing, report
the deployment gap and stop that outcome. `x-transloadit-input-fidelity: conservative` means some
constraints are approximate; server validation remains authoritative, including cross-field rules.

`assemblies create --template … --field key=value --input … --output …` handles uploads, waiting and
downloads. Its `--field` values are strings: use it for string fields and numbers accepted as strings
by the catalog. For numbers without string coercion, booleans, arrays or objects, use the official
SDK with typed `params.fields`.
After installing `@transloadit/node` in the execution project and securely loading credentials into
the shell (the SDK does not perform the CLI's credential-file lookup), the same Builtin can run as:

```js
import { Transloadit } from '@transloadit/node';

const client = new Transloadit({
  authKey: process.env.TRANSLOADIT_KEY,
  authSecret: process.env.TRANSLOADIT_SECRET,
});
const assembly = await client.createAssembly({
  params: { template_id: 'builtin/prepare-image@latest', fields: { strip: false } },
  files: { input: '/ABS/PATH/photo.jpg' },
  waitForCompletion: true,
});
if (assembly.ok !== 'ASSEMBLY_COMPLETED') throw new Error(assembly.error ?? assembly.ok);
console.log(JSON.stringify({ assembly_id: assembly.assembly_id, results: assembly.results }));
```

Download each result's `ssl_url` to an explicit local path and inspect the actual output, including
warnings. Create directories with `mkdir -p` before CLI downloads of covers, captioned video plus
SRT, or other multiple results; a trailing slash alone does not select directory mode. For one
result per input, use explicit filenames with the output extension; generic directory downloads
can preserve the input extension.
Existing Robot/semantic intents can still serve other workflows; the approved outcomes use the
Builtin route so the server owns their steps and field contract.
