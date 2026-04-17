---
name: create-polaroid-collage
description: Short alias for one-off polaroid-stack photo collages. Use this when the user asks to arrange photos as tilted, overlapping polaroids on a canvas; route to `transform-build-polaroid-collage-with-transloadit` for the actual workflow.
---

# Create Polaroid Collage

Use `transform-build-polaroid-collage-with-transloadit` for the actual implementation.

Route there when the user wants:
- N local photos composited into one image
- an overlapping, scrapbook-ish layout (not a clean grid)
- a single output file on disk, not an app integration

Do not duplicate the workflow here; treat this as a discovery-friendly alias.
