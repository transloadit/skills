---
name: transform-caption-video-with-transloadit
description: Add plain burned captions to a local video and download the captioned video plus SRT cues using the caption-video Builtin and the official Transloadit CLI.
---

# Add captions to a video

Confirm the local video exists. Use an explicit output directory: the Builtin returns both a
captioned video and an SRT file. Let the CLI resolve credentials from the shell, cwd `.env`, then
`~/.transloadit/credentials`.

Discover the deployed contract before running; read its `fields_schema` and the selected Template's
`content.fields` defaults with `templates get <id> --json`:

```bash
npx -y @transloadit/node templates list --include-builtin exclusively-all --fields id,description,fields_schema --json
```

Select `builtin/caption-video@0.0.1` from that catalog and use it as `--template` (API `template_id`).
If it is absent or has no `fields_schema`, report the deployment gap before creating an Assembly.
Merge defaults with caller fields before validation; runtime cross-field checks remain authoritative.

```bash
mkdir -p /ABS/PATH/captioned/
npx -y @transloadit/node assemblies create \
  --template builtin/caption-video@0.0.1 \
  --input /ABS/PATH/video.mp4 --output /ABS/PATH/captioned/
```

Pin the plain-caption version shown above. The video retains its input container. Customize plain
captions using the catalog's font size, position, font color and border color fields. Font size
requires a JSON number in SDK `params.fields`; CLI `--field` sends strings. Language
fields describe speech, never translation. Keep social/highlight styling gated until a deployed
Builtin schema supports it and its real output has been reviewed. Do not add subtitle Robot steps
or pass unsupported style fields.
Confirm both outputs are non-empty. Read SRT cues and watch frames at several cue times and a silent
gap to check readability and timing.
Inspect failures with `npx -y @transloadit/node assemblies get <assemblyIdOrUrl> --json`.
