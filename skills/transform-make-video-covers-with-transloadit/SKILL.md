---
name: transform-make-video-covers-with-transloadit
description: Make cover images from a local video, using regular frames, exact offsets or smart selection through the video-covers Builtin and the official Transloadit CLI.
---

# Make video cover images

Confirm the local video exists. Use an explicit output directory because one video can yield several
images. Let the CLI resolve credentials from the shell, cwd `.env`, then `~/.transloadit/credentials`.

Discover the deployed contract before running; read its `fields_schema` and the selected Template's
`content.fields` defaults with `templates get <id> --json`:

```bash
npx -y @transloadit/node templates list --include-builtin exclusively-latest --fields id,description,fields_schema --json
```

Use the returned `builtin/video-covers@…` ID as `--template` (`template_id` in the API).
If it is absent or has no `fields_schema`, report the deployment gap before creating an Assembly.
Merge defaults with caller fields before validation; runtime cross-field checks remain authoritative.

```bash
npx -y @transloadit/node assemblies create \
  --template builtin/video-covers@latest --field format=jpeg \
  --input /ABS/PATH/video.mp4 --output /ABS/PATH/covers/
```

The example uses the catalog's default count. For a custom count, send typed SDK `params.fields`,
for example `{ count: 3 }`; CLI `--field count=3` sends a string that this Builtin rejects.
For exact timestamps, send typed fields, for example
`{ offsets: [1, 2], smart: false }`. Smart selection uses `count` instead of offsets;
`{ count: 2, smart: true }` requests smart picks. CLI `--field` cannot carry typed numbers, booleans or arrays.
Read dimension limits, formats and candidate-pool options from the catalog; these differ from image
resize limits. Do not copy Robot steps.
Confirm the expected number of non-empty images, review the frames, and check Assembly warnings
for smart-selection fallback.
Inspect failures with `npx -y @transloadit/node assemblies get <assemblyIdOrUrl> --json`.
