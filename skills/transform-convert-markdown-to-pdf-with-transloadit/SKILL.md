---
name: transform-convert-markdown-to-pdf-with-transloadit
description: Convert a local Office document, HTML, Markdown or text file to PDF using the convert-to-pdf Builtin and the official Transloadit CLI. Includes the existing Markdown-to-PDF workflow.
---

# Convert a document to PDF

Confirm the local document exists. Default to a sibling `.pdf` unless the user gives an output path.
Let the CLI resolve credentials from the shell, cwd `.env`, then `~/.transloadit/credentials`.

Discover the deployed contract before running; read its `fields_schema` and the selected Template's
`content.fields` defaults with `templates get <id> --json`:

```bash
npx -y @transloadit/node templates list --include-builtin exclusively-latest --fields id,description,fields_schema --json
```

Use the returned `builtin/convert-to-pdf@…` ID as `--template` (`template_id` in the API).
If it is absent or has no `fields_schema`, report the deployment gap before creating an Assembly.
Merge defaults with caller fields before validation; runtime cross-field checks remain authoritative.

```bash
npx -y @transloadit/node assemblies create \
  --template builtin/convert-to-pdf@latest \
  --input /ABS/PATH/document.md --output /ABS/PATH/document.pdf
```

Replace the input with an Office, HTML or text file for the same outcome. For HTML/Markdown,
customize fields from the catalog, for example `--field pdf_format=A4`. Paper size, margins and
background printing apply to HTML/Markdown; Office and text retain the converter's layout.
Keep Markdown format/theme choices in the catalog. For typed fields such as background printing,
use JSON `params.fields` through the official SDK; CLI `--field` values are strings.

Use the Builtin template route: the older `markdown pdf` intent constructs Robot steps.
Confirm the PDF is non-empty, read its text, and render its pages to check pagination and clipping.
Inspect failures with `npx -y @transloadit/node assemblies get <assemblyIdOrUrl> --json`.
