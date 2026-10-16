---
name: transform-prepare-image-with-transloadit
description: Prepare local images for a website with orientation correction, resizing, compression and format conversion using the prepare-image Builtin and the official Transloadit CLI.
---

# Prepare images for a website

Confirm the local image exists. Choose an explicit output path matching the requested image format.
Let the CLI resolve credentials from the shell, cwd `.env`, then `~/.transloadit/credentials`.

Discover the deployed contract before running; read its `fields_schema` and the selected Template's
`content.fields` defaults with `templates get <id> --json`:

```bash
npx -y @transloadit/node templates list --include-builtin exclusively-latest --fields id,description,fields_schema --json
```

Use the returned `builtin/prepare-image@…` ID as `--template` (`template_id` in the API).
If it is absent or has no `fields_schema`, report the deployment gap before creating an Assembly.
Merge defaults with caller fields before validation; runtime cross-field checks remain authoritative.

```bash
npx -y @transloadit/node assemblies create \
  --template builtin/prepare-image@latest \
  --field w=1280 --field h=1280 --field f=webp \
  --input /ABS/PATH/photo.jpg --output /ABS/PATH/prepared.webp
```

The Builtin auto-orients and fits without enlarging small images. Read supported format, quality,
fit and background choices from the catalog. JPEG needs an opaque background, for example
`--field f=jpg --field 'bg=#ffffff'` with a `.jpg` output.
To retain metadata, send `strip: false` as a JSON boolean in SDK `params.fields`;
CLI `--field strip=false` sends a string. Do not copy Robot steps.
Confirm the file is non-empty and review orientation, dimensions, transparency and image quality.
Inspect failures with `npx -y @transloadit/node assemblies get <assemblyIdOrUrl> --json`.
