---
name: transform-remove-background-with-transloadit
description: Remove a local photo's background and download a transparent PNG using the remove-background Builtin and the official Transloadit CLI.
---

# Remove a photo background

Confirm the local image exists. Use an explicit sibling `.png` output unless the user gives a path.
Let the CLI resolve credentials from the shell, cwd `.env`, then `~/.transloadit/credentials`.

Discover the deployed contract before running; read its `fields_schema` and the selected Template's
`content.fields` defaults with `templates get <id> --json`:

```bash
npx -y @transloadit/node templates list --include-builtin exclusively-latest --fields id,description,fields_schema --json
```

Use the returned `builtin/remove-background@…` ID as `--template` (`template_id` in the API).
If it is absent or has no `fields_schema`, report the deployment gap before creating an Assembly.
Merge defaults with caller fields before validation; runtime cross-field checks remain authoritative.

```bash
npx -y @transloadit/node assemblies create \
  --template builtin/remove-background@latest \
  --field format=png --field select=foreground \
  --input /ABS/PATH/photo.jpg --output /ABS/PATH/cutout.png
```

Keep the Builtin's provider default. Automatic/cloud providers require PNG foreground output;
other selections need the provider allowed by the deployed contract. Do not copy Robot steps.
Confirm the output is non-empty, has transparency, and retains the subject's edges and hair.
Inspect failures with `npx -y @transloadit/node assemblies get <assemblyIdOrUrl> --json`.
