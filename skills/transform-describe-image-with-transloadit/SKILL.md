---
name: transform-describe-image-with-transloadit
description: One-off image description using Transloadit via the `transloadit` CLI. Use `image describe --fields labels` for object-style labels, or `image describe --for wordpress` for structured alt text, title, caption, and description JSON.
---

# Run

Use the Transloadit Node CLI directly.

Labels / object-style description:

```bash
npx -y @transloadit/node image describe \
  --input ./input.jpg \
  --fields labels \
  --out ./labels.json
```

WordPress-ready fields:

```bash
npx -y @transloadit/node image describe \
  --input ./input.jpg \
  --for wordpress \
  --out ./fields.json
```

Custom field selection:

```bash
npx -y @transloadit/node image describe \
  --input ./input.jpg \
  --fields altText,title,caption,description \
  --out ./fields.json
```

# Output Shapes

`--fields labels` returns a JSON array of labels.

`--for wordpress` and authored `--fields ...` return a JSON object with requested string fields, for example:

```json
{
  "altText": "...",
  "title": "...",
  "caption": "...",
  "description": "..."
}
```

# Notes

- Prefer `--for wordpress` when you want publishable CMS fields.
- Prefer `--fields labels` when you want recognizer-style tags instead of authored copy.
- `--model` only matters for authored fields, not for `labels`.

# Debug If It Fails

```bash
npx -y @transloadit/node assemblies get <assemblyIdOrUrl> -j
```
