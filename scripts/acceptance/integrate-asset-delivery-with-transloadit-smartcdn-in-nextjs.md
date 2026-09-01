- E2E must load `/smartcdn`, read `[data-testid="smartcdn-json"]`, parse JSON, and assert it contains a `url` string.
- The URL host and path must contain the explicitly configured workspace, Template, and input. The
  implementation must not fall back to an implicit delivery contract.
- The `url` should look signed (do not snapshot secrets; just assert it contains signature-ish markers like `~` or query params).
