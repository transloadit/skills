---
name: transform-generate-image-with-transloadit
description: One-off image generation (prompt -> image file) using Transloadit via the `transloadit` CLI. Prefer builtin templates (`builtin/generate-image@latest`) and download outputs locally via `-o`.
---

# Discover The Builtin Template ID

```bash
npx -y @transloadit/node templates list --include-builtin exclusively-latest --fields id,name --json
```

Pick the `builtin/generate-image@...` id from the output.

Versioning note:
- Use `builtin/generate-image@latest` in docs.
- If `@latest` is not supported yet in API2, use the concrete version returned by the list (example: `builtin/generate-image@0.0.1`).

# Run (No Input File)

Do not use `--watch` for inputless templates.

```bash
npx -y @transloadit/node assemblies create \
  --template builtin/generate-image@latest \
  -f prompt='A minimal product photo of a chameleon on white background' \
  -o ./out/ \
  -j
```

# Debug If It Fails

```bash
npx -y @transloadit/node assemblies get <assemblyIdOrUrl> -j
```

Notes:
- Some generator/AI robots can be account-gated; if the assembly fails with capability/availability errors, switch templates or confirm the feature is enabled for your account.
