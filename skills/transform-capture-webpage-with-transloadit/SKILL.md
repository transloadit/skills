---
name: transform-capture-webpage-with-transloadit
description: Capture a public webpage or local HTML as an image or PDF using the capture-webpage Builtin and the official Transloadit CLI.
---

# Capture a webpage

Choose a public HTTP(S) URL or confirm a local HTML input exists. Use an explicit output filename
matching the requested format. Let the CLI resolve credentials from the shell, cwd `.env`, then
`~/.transloadit/credentials`.

Discover the deployed contract before running; read its `fields_schema` and the selected Template's
`content.fields` defaults with `templates get <id> --json`:

```bash
npx -y @transloadit/node templates list --include-builtin exclusively-latest --fields id,description,fields_schema --json
```

Use the returned `builtin/capture-webpage@…` ID as `--template` (`template_id` in the API).
If it is absent or has no `fields_schema`, report the deployment gap before creating an Assembly.
Merge defaults with caller fields before validation; runtime cross-field checks remain authoritative.

```bash
npx -y @transloadit/node assemblies create \
  --template builtin/capture-webpage@latest \
  --field url=https://example.com --field format=png \
  --output /ABS/PATH/page.png
```

URL capture requires no upload. For uploaded HTML, omit `url` and add `--input /ABS/PATH/page.html`;
a URL takes precedence over uploads. For PDF, set `--field format=pdf` and use a `.pdf` output.
Read viewport, delay and page-load options from the catalog. Send numeric options as JSON numbers in
SDK `params.fields`; for a fixed viewport, also send `fullpage: false` as a JSON boolean.
CLI `--field` sends strings that these fields reject. The Builtin supports public captures without
custom headers, actions or credentials.
Do not copy renderer steps.
Confirm the output is non-empty and review the image or rendered PDF pages for complete, readable
content.
Inspect failures with `npx -y @transloadit/node assemblies get <assemblyIdOrUrl> --json`.
