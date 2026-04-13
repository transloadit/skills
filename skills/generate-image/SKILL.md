---
name: generate-image
description: Short alias for one-off image generation. Use this when the user asks to generate an image file from a prompt; route to `transform-generate-image-with-transloadit` for the actual workflow.
---

# Generate Image

Use `transform-generate-image-with-transloadit` for the actual implementation.

Route there when the user wants:
- a prompt turned into one or more image files
- a local output image file
- a one-off generation, not an app integration

Do not duplicate the workflow here; treat this as a discovery-friendly alias.
