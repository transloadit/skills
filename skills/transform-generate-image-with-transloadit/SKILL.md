---
name: transform-generate-image-with-transloadit
description: One-off image generation (prompt -> image file) using Transloadit via the `transloadit` CLI. Prefer `image generate` for text-only and input-guided generation, and use `--output` when you need a deterministic path.
when_to_use: |
  Triggers when the user asks to generate an image, create an image from a prompt, make an AI image, render a picture from text, or guide image generation with reference photos. Choose this for prompt-driven or prompt+input-guided generation of a local image file. Prefer this over the collage skills when the input is a text prompt rather than N existing photos to composite.
---

# Run

Use the `image generate` intent with Images 2.5 Flare for quick image generation from a prompt.
Pass the model explicitly so an older installed CLI does not select its previous default.

```bash
npx -y @transloadit/node image generate \
  --model openai/gpt-image-2.5-flare \
  --prompt 'A minimal product photo of a chameleon on white background' \
  --output ./out.png
```

# Run With Images 2.5 Sunburst

Use Sunburst when the user asks for it or prioritizes precision over latency. Keep Flare as the
default for everyday generation. Preserve any explicitly requested older model instead of
silently substituting a newer one.

```bash
npx -y @transloadit/node image generate \
  --model openai/gpt-image-2.5-sunburst \
  --width 1024 \
  --height 1024 \
  --prompt 'A ceramic coffee mug on a white seamless studio background' \
  --output ./out.png
```

# Run With Input Images

You can also guide generation with one or more input images. Prefer meaningful filenames and refer
to them in the prompt.

```bash
npx -y @transloadit/node image generate \
  --model openai/gpt-image-2.5-flare \
  --input ./person1.jpg \
  --input ./person2.jpg \
  --input ./background.jpg \
  --prompt 'Place person1.jpg feeding person2.jpg in front of background.jpg' \
  --output ./out.png
```

Notes:

- Use `--model openai/gpt-image-2.5-flare` by default, or `--model openai/gpt-image-2.5-sunburst`
  for precision-focused work.
- Explicit `--model openai/gpt-image-2` and Google Nano Banana selections remain supported. The
  older `gpt-image-2` spelling still selects GPT Image 2, not Images 2.5.
- Repeated `--input` values are bundled into a single `/image/generate` assembly.
- Prompt-only generation still works without any `--input`.
- Without `--output`, prompt-only and multi-input runs default to the current working directory.

# Debug If It Fails

```bash
npx -y @transloadit/node assemblies get <assemblyIdOrUrl> -j
```

Notes:

- Images 2.5 requires the matching API2 backend rollout. If a model is unavailable or account-gated,
  report that limitation and confirm an alternative with the user; do not silently change an
  explicit model choice or retry indefinitely.
