---
name: transform-extract-text-with-transloadit
description: Extract readable text or JSON from local PDFs, scans, photos and Office documents using the extract-text Builtin and the official Transloadit CLI.
---

# Extract text from a document or photo

Confirm the local file exists. Use a sibling `.txt` for one plain-text result or an explicit output
directory for multiple results. Let the CLI resolve credentials from the shell, cwd `.env`, then
`~/.transloadit/credentials`.

Discover the deployed contract before running; read its `fields_schema` and the selected Template's
`content.fields` defaults with `templates get <id> --json`:

```bash
npx -y @transloadit/node templates list --include-builtin exclusively-latest --fields id,description,fields_schema --json
```

Use the returned `builtin/extract-text@…` ID as `--template` (`template_id` in the API).
If it is absent or has no `fields_schema`, report the deployment gap before creating an Assembly.
Merge defaults with caller fields before validation; runtime cross-field checks remain authoritative.

```bash
npx -y @transloadit/node assemblies create \
  --template builtin/extract-text@latest --field text_format=txt \
  --input /ABS/PATH/document.pdf --output /ABS/PATH/document.txt
```

The Builtin routes photos through OCR and converts supported Office files before extraction.
Documents try native text with OCR fallback. Preserve the catalog's explicit OCR-provider default.
For native PDF page selection, use `--field text_method=native --field page_range=2`; password and
per-page grouping also require native extraction. Per-page results need an output directory.
Read current formats, provider choices and cross-field constraints from the catalog; runtime
validation remains authoritative. Unsupported files can be skipped, so an empty result is not success.
Do not replace the Builtin with a compatibility OCR pipeline.
Confirm outputs are non-empty and compare extracted text with the source, including scanned pages.
Inspect failures with `npx -y @transloadit/node assemblies get <assemblyIdOrUrl> --json`.
