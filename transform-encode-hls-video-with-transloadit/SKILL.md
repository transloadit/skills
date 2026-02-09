---
name: transform-encode-hls-video-with-transloadit
description: One-off HLS encoding (local video -> HLS renditions + playlist) using Transloadit via the `transloadit` CLI. Prefer builtin templates (`builtin/encode-hls-video@latest`) and download outputs locally via `-o`.
---

# Discover The Builtin Template ID

```bash
npx -y @transloadit/node templates list --include-builtin exclusively-latest --fields id,name --json
```

Pick the `builtin/encode-hls-video@...` id from the output.

Versioning note:
- Use `builtin/encode-hls-video@latest` in docs.
- If `@latest` is not supported yet in API2, use the concrete version returned by the list (example: `builtin/encode-hls-video@0.0.1`).

# Run (Local Input Video)

```bash
npx -y @transloadit/node assemblies create \
  --template builtin/encode-hls-video@latest \
  -i ./input.mp4 \
  -o ./out/ \
  -j
```

# Debug If It Fails

```bash
npx -y @transloadit/node assemblies get <assemblyIdOrUrl> -j
```
