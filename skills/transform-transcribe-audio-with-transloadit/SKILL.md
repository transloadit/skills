---
name: transform-transcribe-audio-with-transloadit
description: Transcribe local audio or video to text, timestamped JSON, SRT or WebVTT using the transcribe Builtin and the official Transloadit CLI.
---

# Transcribe a recording

Confirm the local recording exists. Default to a sibling `.txt`; match the extension to the requested
format. Let the CLI resolve credentials from the shell, cwd `.env`, then `~/.transloadit/credentials`.

Discover the deployed contract before running; read its `fields_schema` and the selected Template's
`content.fields` defaults with `templates get <id> --json`:

```bash
npx -y @transloadit/node templates list --include-builtin exclusively-latest --fields id,description,fields_schema --json
```

Use the returned `builtin/transcribe@…` ID as `--template` (`template_id` in the API).
If it is absent or has no `fields_schema`, report the deployment gap before creating an Assembly.
Merge defaults with caller fields before validation; runtime cross-field checks remain authoritative.

```bash
npx -y @transloadit/node assemblies create \
  --template builtin/transcribe@latest --field format=text \
  --input /ABS/PATH/recording.wav --output /ABS/PATH/recording.txt
```

Explicitly select text above; the Builtin's default format may differ. For subtitles, change `format`
and the output extension together, for example `format=srt` and `.srt`. For multiple recordings,
repeat `--input` and use an output directory. Keep provider selection and supported values in the
catalog. `source_language` describes spoken language for AWS/GCP; `target_language` is a Replicate
spoken-language hint, never a translation request. Use `--field source_language=fr-FR` or
`--field target_language=french` with the appropriate provider. Translation requires a separate
workflow after transcription.

Use the Builtin template route: the older `speech transcribe` intent constructs Robot steps.
Confirm each output is non-empty; read the transcript or check subtitle cues/timestamps against the
recording.
Inspect failures with `npx -y @transloadit/node assemblies get <assemblyIdOrUrl> --json`.
