# bgremove-oneoff

Minimal starter for validating one-off transform skills.

What is already present:
- input fixture at `input/source.jpg`
- external acceptance test at `test/e2e/assert-output.mjs`
- `npm run test:e2e` to validate the output contract

Expected outcome:
- create one or more PNG outputs under `out/` such as `out/result.png`
- at least one output PNG must contain transparency

This starter is intentionally not an app scaffold. It exists to verify that a transform skill can
drive a real Transloadit run from a local fixture to a local artifact.
