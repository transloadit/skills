---
name: transform-describe-image-with-transloadit
description: One-off image description using the official `@transloadit/node` CLI. Use `image describe --fields labels` for object-style labels, or `image describe --for wordpress` for structured alt text, title, caption, and description JSON.
---

# Inputs

- Absolute path to a local input image
- Explicit `.json` output path

# Prepare

Resolve credentials in this order:
- Use `TRANSLOADIT_KEY` and `TRANSLOADIT_SECRET` if they already exist in the environment.
- Otherwise source a nearby `.env` file that contains both variables.

# Run

Use the official Transloadit Node CLI directly.

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

After the command finishes, confirm the JSON file exists at the expected output path.

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
