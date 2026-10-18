---
name: admin-merge
description: Update a GitHub PR with latest main, resolve conflicts, follow CI with gh-run-watch.ts, fix related failures, and squash merge with --admin. Use when asked to admin-merge a PR; escalate if completion is unsuccessful. Reviewing whether a PR is needed or creating this skill does not invoke the merge workflow.
---

# Admin Merge

Complete the requested PR through a verified squash merge to `main`. Invoking this
workflow authorizes merging main into the PR, resolving conflicts, committing and
pushing relevant fixes, rerunning CI, and merging with `--admin`. Do not ask for a
second merge confirmation. Follow any narrower constraints in the current request.

## Update the PR

1. Resolve the PR and repository with `gh`. Read its description, diff, reviews,
   check results, and applicable repository instructions. Confirm it is open and
   targets `main`; if already merged, report that result. Escalate a closed,
   unmerged PR or a different base instead of reopening or retargeting it.
2. Preserve existing local work. Use an isolated worktree when necessary, fetch the
   current PR head and upstream `main`, and work on the PR branch. For a fork,
   distinguish the upstream base repository from the head repository and push to
   the correct head branch.
3. Merge the fetched upstream `main` into the PR branch. Resolve conflicts by
   understanding both changes and preserving the PR’s intended behavior alongside
   main’s newer behavior. Do not blanket-select ours/theirs. Review the resolved
   diff for lost changes and conflict markers; regenerate generated files through
   their source workflow. Escalate conflicts requiring a product decision that
   cannot be inferred from the PR or code.
4. Run the relevant local checks required by repository instructions, commit the
   merge and any necessary fixes, and push normally. Do not force-push or include
   unrelated local changes. Record the pushed head SHA.

## Follow CI and fix failures

Prerequisites: authenticated `gh` with permission to push and admin-merge the PR,
Node.js 24 or newer, and an existing `gh-run-watch.ts` with its dependencies
installed. The watcher is shared Transloadit tooling, not bundled with this skill.

Use the existing `gh-run-watch.ts`; do not substitute a new watcher. Locate it in
the target repository first, then in local shared tooling. In an API2 checkout it
lives at `core/alphalib/bin/gh-run-watch.ts`. Set `watcher_path` to its resolved
absolute path before running:

```sh
node "$watcher_path" --repo OWNER/REPO --pr NUMBER --timeout 3600
```

Run the watcher in a yielding terminal session so progress updates remain possible.
For a specific run, use `--run-id RUN_ID` in place of `--pr NUMBER`. If the helper
is missing, search local shared tooling; escalate if it cannot be found or run.

- After each push, confirm the expected CI runs belong to the pushed head SHA.
  Use `gh run list --repo OWNER/REPO --commit HEAD_SHA` and inspect run/check
  details as needed. Do not rely on checks from an earlier commit or a workflow’s
  latest run on another branch.
- Inspect actual conclusions with `gh pr checks` and `gh run view`. The watcher
  can return exit code zero after a timeout, and can classify skipped or
  action-required checks as complete. Its exit status alone is not proof of green
  CI. Missing, pending, cancelled, or unexpectedly skipped required checks need
  investigation; do not treat them as passing.
- On red, inspect failed logs and artifacts with `gh`, diagnose the cause, fix
  PR-related failures, run relevant local checks, commit, push, and watch again.
  Rerun failed jobs when evidence supports a transient failure. Do not weaken tests
  or disable checks just to make CI green.
- A failure may remain only when verified unrelated to the PR. Record the failing
  check/run URL and concrete evidence, such as the same failure on current main
  without the PR or logs establishing an independent infrastructure outage.
  A failure in an untouched file or an assumption of flakiness is insufficient.
  This verified exception permits the requested admin merge; do not claim all
  checks passed. Ensure the PR’s behavior still has appropriate validation.
- Continue while making progress. A watcher timeout with active CI means resume
  watching. Escalate missing permissions, inaccessible evidence, stalled CI, or
  the same blocker after two recovery attempts with no new evidence or progress.
  Do not enter an unbounded rerun loop.

## Merge and verify

1. Immediately before merging, refresh the PR head, upstream `main`, mergeability,
   and check results. Confirm the validated head contains the latest main. If
   either branch advanced, incorporate the changes and repeat relevant validation
   and CI monitoring. Account for every remaining failed check with the evidence
   above; otherwise escalate.
2. Squash merge the validated head with admin privileges:

   ```sh
   gh pr merge NUMBER --repo OWNER/REPO --squash --admin --match-head-commit HEAD_SHA
   ```

   Use the actual validated SHA. If GitHub rejects the merge, inspect the reason,
   recover within this workflow when possible, or escalate. Do not change branch
   protection, repository settings, or access permissions to force completion.
3. Verify with `gh pr view` that the PR is `MERGED` into `main`, and obtain the
   merge commit and URL. Report the result and any verified unrelated CI failures.
   Do not infer success solely from the merge command exiting successfully.

If unsuccessful, tell the user what remains blocked, the attempts made, relevant
PR/run links, and the specific decision or intervention needed. Keep useful work
on the PR branch and clearly state that the PR has not been merged.
