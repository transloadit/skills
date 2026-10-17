---
name: transform-encode-video-with-transloadit
description: Encode a local video for web playback as MP4 or WebM using the encode-video Builtin and the official Transloadit CLI.
---

# Encode a video for the web

Confirm the local video exists. Choose an explicit output filename matching the requested preset.
Let the CLI resolve credentials from the shell, cwd `.env`, then `~/.transloadit/credentials`.

Discover the deployed contract before running; read its `fields_schema` and the selected Template's
`content.fields` defaults with `templates get <id> --json`:

```bash
npx -y @transloadit/node templates list --include-builtin exclusively-latest --fields id,description,fields_schema --json
```

Use the returned `builtin/encode-video@…` ID as `--template` (`template_id` in the API).
If it is absent or has no `fields_schema`, report the deployment gap before creating an Assembly.
Merge defaults with caller fields before validation; runtime cross-field checks remain authoritative.

```bash
npx -y @transloadit/node assemblies create \
  --template builtin/encode-video@latest --field preset=web/mp4/720p \
  --input /ABS/PATH/video.mov --output /ABS/PATH/encoded.mp4
```

Choose other presets from the catalog, for example `--field preset=web/webm/720p` with a `.webm`
output. Existing `ipad` and `webm` presets remain available. Each supplied width/height overrides
that preset axis; an omitted axis retains its preset value. Send dimensions as JSON numbers through
SDK `params.fields`; read limits from the catalog. For `turbo: false`, use a JSON boolean there too;
CLI `--field` sends strings that these fields reject.
File size depends on the source and preset; do not promise a strict byte limit or copy encoding steps.
Confirm the output is non-empty and decodes; review orientation, dimensions, audio and playback.
Inspect failures with `npx -y @transloadit/node assemblies get <assemblyIdOrUrl> --json`.
