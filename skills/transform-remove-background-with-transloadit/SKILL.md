---
name: transform-remove-background-with-transloadit
description: One-off background removal (local image -> transparent PNG) using Transloadit via the `transloadit` CLI. Use a minimal `/image/bgremove` steps JSON and download the result to an explicit `.png` path via `-o`.
---

# Prepare Instructions

Required env:
- `TRANSLOADIT_KEY`
- `TRANSLOADIT_SECRET`

Create `steps.json` in the current working directory.

Important:
- For the current CLI, the file passed to `--steps` must be a flat object keyed by step name.
- Do not wrap the steps under a top-level `"steps"` key.

```json
{
  ":original": {
    "robot": "/upload/handle"
  },
  "background_removed": {
    "use": ":original",
    "robot": "/image/bgremove",
    "format": "png",
    "result": true
  }
}
```

# Run (Local Input Image)

```bash
npx -y @transloadit/node assemblies create \
  --steps ./steps.json \
  -i ./input/source.jpg \
  -o ./out/result.png
```

Replace `./input/source.jpg` with your real input image path when needed.

# Debug If It Fails

```bash
npx -y @transloadit/node assemblies get <assemblyIdOrUrl> -j
```

Notes:
- Keep `format: "png"` so the downloaded output preserves transparency.
- Prefer an explicit PNG filename like `./out/result.png`. With the current CLI, using a directory output for a single result may preserve the input path instead of giving you a `.png` filename.
- Prefer a clear foreground subject photo; background removal quality depends on the source image.
