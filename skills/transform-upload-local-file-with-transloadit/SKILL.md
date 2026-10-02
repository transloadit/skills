---
name: transform-upload-local-file-with-transloadit
description: Process a file that exists only locally or in an agent sandbox (Claude.ai code execution, Claude Code, Codex) with Transloadit. With the Transloadit MCP server connected, create the Assembly with `expected_uploads`, run each returned `upload_instructions` curl command where the file lives, then call `transloadit_wait_for_assembly`. Without an MCP server, use the `@transloadit/node` CLI instead. Use when the host cannot hand the file to a tool (no file params) and base64 would be too large.
---

# Upload a local or sandbox file to Transloadit

## Use this for

- A file that only exists on disk where you run commands: an uploaded chat attachment in the
  Claude.ai code-execution sandbox, a file in a Claude Code or Codex workspace
- Hosts that do not pass attachments to connector tools (Claude.ai has no equivalent of ChatGPT's
  file params), where base64 in tool arguments is impractical beyond tiny files

If the file is already at a public URL, pass it to `transloadit_create_assembly` under `files`
(`kind: "url"`) instead; if the host attaches files to tools (ChatGPT), use `attachments`.

## Requirements

- A bash shell with `curl`, `wc`, `basename` and `base64` where the file lives
- Outbound HTTPS from that shell to Transloadit (the upload goes to the Assembly's `tus_url` on
  `api2.transloadit.com` or a regional host). On Claude.ai, Settings → code execution network access
  must allow it.

## Workflow with the Transloadit MCP server

1. Create the Assembly and announce how many files you will upload yourself:

   ```json
   {
     "instructions": {
       "steps": {
         ":original": { "robot": "/upload/handle" },
         "resized": { "robot": "/image/resize", "use": ":original", "width": 200, "result": true }
       }
     },
     "expected_uploads": 1
   }
   ```

   Call `transloadit_create_assembly` with these arguments (any Template or Steps that read
   `:original` work). It returns right away, even with `wait_for_completion: true`, because the
   Assembly now waits for your uploads.

2. The result has one `upload_instructions` entry per expected file:

   - `fieldname`: `file_1`, `file_2`, …
   - `tus_endpoint`: the Assembly's tus endpoint
   - `metadata`: the tus metadata (`assembly_url`, `fieldname`); the command adds `filename`
   - `curl`: a ready-to-run command

   Set `FILE` to the file's path in the first line of `curl` and run it in bash, once per file:

   ```bash
   FILE='/mnt/user-data/uploads/photo.jpg'
   curl -sS -o /dev/null -w '%{http_code}\n' -X POST 'https://api2.transloadit.com/resumable/files/' \
     -H 'Tus-Resumable: 1.0.0' \
     -H "Upload-Length: $(wc -c < "$FILE" | tr -d ' ')" \
     -H "Upload-Metadata: assembly_url …,fieldname …,filename $(basename "$FILE" | tr -d '\n' | base64 | tr -d '\n')" \
     -H 'Content-Type: application/offset+octet-stream' \
     --data-binary @"$FILE"
   ```

   Run the command exactly as returned (only replace the `FILE` value); its `Upload-Metadata`
   values are specific to this Assembly. It prints `201` when the file is uploaded.

3. Call `transloadit_wait_for_assembly` with the Assembly's `assembly_ssl_url`, then use the result
   files' `ssl_url` values (download them with `curl -o` if the user wants local copies).

## Without an MCP server: the `@transloadit/node` CLI

With Transloadit credentials in the shell environment, the current directory `.env` or
`~/.transloadit/credentials`, the CLI uploads local files itself:

```bash
npx -y @transloadit/node assemblies create --steps steps.json -i /ABS/PATH/photo.jpg -o /ABS/PATH/out/
```

To add a local file to an Assembly that already waits for uploads (for example one created through
MCP when `curl` is unavailable), point the CLI at its `tus_url` and `assembly_ssl_url`:

```bash
npx -y @transloadit/node upload /ABS/PATH/photo.jpg \
  --create-upload-endpoint 'https://api2.transloadit.com/resumable/files/' \
  --assembly 'https://api2.transloadit.com/assemblies/ASSEMBLY_ID' \
  --field file_1
```

## Notes

- The upload commands contain no credentials. The Assembly URL is the only capability: it lets the
  holder add files to that one Assembly while it waits for uploads, so do not share it further.
- Anything other than `201` means the upload did not finish: a connection error usually means the
  sandbox may not reach Transloadit (check the network access setting); `4xx` means the Assembly no
  longer accepts uploads, so create a new one.
- Use one `upload_instructions` entry per file; the Assembly starts once all expected uploads
  arrived.
- Never paste `TRANSLOADIT_SECRET` or bearer tokens into sandbox commands; the MCP server keeps them.
