---
name: transform-convert-markdown-to-pdf-with-transloadit
description: Convert a local Markdown file to a sibling PDF via the Transloadit CLI. Use when the user wants a `.md` file rendered as a `.pdf`, especially from an agent session or local repo. Resolve `TRANSLOADIT_KEY` and `TRANSLOADIT_SECRET` from the current environment first, then from a nearby `.env` file if needed.
---

# Markdown to PDF with Transloadit

## Use this for

- One local Markdown file to one local PDF file
- Keeping the PDF next to the source Markdown file
- Agent workflows where credentials may already be in the shell or live in a `.env` file

## Inputs

- Absolute path to a local `.md` file
- Optional output path; default is the same path with `.pdf`

## Workflow

1. Confirm the Markdown input file exists and resolve it to an absolute path.
2. Derive the output path beside it unless the user gave a different `.pdf` target.
3. Resolve Transloadit credentials in this order:
   - Use `TRANSLOADIT_KEY` and `TRANSLOADIT_SECRET` if they already exist in the environment.
   - Otherwise search for a `.env` file to source, starting with the current working directory and then walking up toward the repo root.
   - Only source a `.env` file that contains both `TRANSLOADIT_KEY` and `TRANSLOADIT_SECRET`.
4. Run the conversion with the latest CLI:

```bash
set -a
source /ABS/PATH/TO/.env
set +a
npx -y transloadit@latest markdown pdf --input /ABS/PATH/file.md --out /ABS/PATH/file.pdf
```

If the credentials are already present in the shell, skip the `source` step and run:

```bash
npx -y transloadit@latest markdown pdf --input /ABS/PATH/file.md --out /ABS/PATH/file.pdf
```

## Notes

- Prefer `transloadit@latest` over bare `transloadit`; the unqualified package can resolve to an older CLI that does not expose `markdown pdf`.
- Keep the secret server-side or local-only; never move `TRANSLOADIT_SECRET` into browser code.
- After conversion, confirm the PDF exists at the expected output path.
