---
name: create-mosaic-collage
description: Short alias for one-off justified mosaic photo collages. Use this when the user asks to tile photos edge-to-edge on a canvas with every photo kept fully visible; route to `transform-build-mosaic-collage-with-transloadit` for the actual workflow.
---

# Create Mosaic Collage

Use `transform-build-mosaic-collage-with-transloadit` for the actual implementation.

Route there when the user wants:
- N local photos composited into one image
- a clean, editorial tiled layout that respects each photo's aspect ratio
- a single output file on disk, not an app integration

Do not duplicate the workflow here; treat this as a discovery-friendly alias.
