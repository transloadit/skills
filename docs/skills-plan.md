# Transloadit Agent Skills Plan

## Goals

- Provide a lightweight, skills-based way for agents to use Transloadit without bespoke MCP plumbing.
- Package repeatable, high-quality workflows and integration guidance as portable skills.
- Keep skills composable and low-context via progressive disclosure and optional resources.

## Principles

- Skills are local, human-in-the-loop, and repo-aware by default.
- Prefer running `npx @transloadit/node` for actual processing when the skill needs to execute work.
- Keep outputs short, copyable, and practical (JSON, code blocks, or a small checklist).
- Avoid long-lived servers unless explicitly requested; skills should be usable offline.

## Top 3 launch skills (high value)

These three skills maximize developer impact and showcase Transloadit clearly and fast.

### 1) Transloadit Media Processing Assistant

**What it does**
- Understands plain-language file processing requests and runs the right Transloadit pipeline.
- Handles common jobs: resize, reformat, thumbnails, watermarks, video encode, audio normalize, PDF preview.

**Why it matters**
- Immediate utility. A user can ask for a conversion or thumbnail set and get results without writing code.

**How it works**
- Converts intent into assembly instructions (or selects a built-in template).
- Runs processing via `npx @transloadit/node` and returns output URLs.
- Uses linting before running to catch obvious mistakes.

**Example prompts**
- "Convert this MOV to MP4 and generate a 500px thumbnail."
- "Resize this image to 800x600 and add a small watermark."

**Outputs**
- The assembly instructions used.
- Result URLs and a short summary.

---

### 2) Assembly Template Generator (Pipeline Builder)

**What it does**
- Turns plain-language requirements into assembly instructions JSON.
- Optionally proposes a template name and fields.

**Why it matters**
- Lowers the biggest onboarding hurdle: building the correct steps and parameters.

**How it works**
- Uses a curated reference of common pipelines and robot parameters.
- Produces JSON that can be pasted into Transloadit or used with SDKs.
- Validates instructions via linting.

**Example prompts**
- "Create a template that makes 3 JPEG sizes (200, 800, 1200) and exports to S3."
- "Build a pipeline that extracts the first page of a PDF and makes a preview PNG."

**Outputs**
- Assembly instructions JSON.
- A short explanation of steps and required fields.

---

### 3) Developer Q and A + Integrations Helper

**What it does**
- Answers common Transloadit questions with code snippets and checklists.
- Guides integration for Node, Uppy, webhooks, and general API usage.

**Why it matters**
- Removes documentation hunting and speeds up integration work.

**How it works**
- Uses curated references (docs and SDK readmes) from `references/`.
- Produces concise answers with example code blocks.

**Example prompts**
- "How do I verify webhook signatures in Node?"
- "Show me a minimal Uppy + Transloadit setup."

**Outputs**
- A short answer with a code block and a 2-3 step checklist.

## Initial reference assets

- Transloadit Node SDK README
- Uppy + Transloadit integration snippets
- Robot parameter docs for common tasks (image resize, video encode, document convert)
- Built-in template catalog (if available)
- Webhook signature verification examples

## Rollout plan

1) Create the three skill folders with tight `SKILL.md` instructions.
2) Add minimal `references/` for each skill to keep context small.
3) Validate the skills with real prompts and tighten output format.
4) Expand based on feedback into domain-specific skills.

## Future expansion

- Image processing specialization (face detection, background removal).
- Video workflows (HLS packaging, multi-bitrate presets).
- Ops and troubleshooting (auth, billing, cost estimation).

## Open questions

- Repo name and governance for public release.
- Versioning strategy for skills.
- How to keep references up-to-date without heavy maintenance.
