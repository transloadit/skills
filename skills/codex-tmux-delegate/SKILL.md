---
name: codex-tmux-delegate
description: Launch and steer a sibling Codex agent in a new tmux pane using the same or explicitly requested model, reasoning effort, sandbox, approval policy, and working directory. Use when the user asks to open a new tmux pane/window, start another Codex, delegate a bounded task to it, communicate with that Codex, monitor it, or make future parallel Codex handoffs smoother. Also use when the user mentions ACP for local Codex-to-Codex coordination but tmux interaction is sufficient or more reliable.
---

# Codex tmux Delegate

## Overview

Use tmux to start a sibling interactive Codex process, give it a narrowly scoped task, then monitor and relay status. Prefer direct tmux control unless the user explicitly requires another transport and it is already available locally.

## Workflow

1. Confirm the delegation target:
   - Determine the target working directory from the user request.
   - Verify it exists before starting Codex.
   - If no directory is given, use the current repository only when that is clearly intended.

2. Mirror the current Codex configuration:
   - Inspect `~/.codex/config.toml` for `model`, `model_reasoning_effort`, `approval_policy`, and `sandbox_mode`.
   - Use explicit CLI flags when the user asked for the same model/permissions or when reproducibility matters:

```bash
codex -m gpt-5.5 --sandbox danger-full-access \
  -c approval_policy=\"never\" \
  -c model_reasoning_effort=\"xhigh\"
```

3. Start a sibling pane:
   - If already inside tmux, use `split-window` and capture the pane id.
   - If not inside tmux, create a detached session and report the session name.

```bash
pane=$(tmux split-window -h -c /absolute/workdir -P -F '#{pane_id}' \
  'codex -m gpt-5.5 --sandbox danger-full-access -c approval_policy=\"never\" -c model_reasoning_effort=\"xhigh\"')
```

4. Wait briefly and capture the pane to confirm Codex started with the expected directory, model, and permissions:

```bash
tmux capture-pane -pt "$pane" -S -80
```

5. Send a complete task prompt with `tmux send-keys -l`, followed by Enter:

```bash
tmux send-keys -t "$pane" -l "$prompt"
tmux send-keys -t "$pane" Enter
```

## Prompt Shape

Give the sibling agent enough context to act without drifting:

- Start with `Task from <human name>:` when the user is delegating.
- Name the exact repository/path and the exact target issue, PR, CI run, or branch.
- State the first action and success criteria.
- State explicit exclusions, especially work the human or another agent is already handling.
- Include safety rails:
  - Do not contact customers by email, Intercom, Slack, or other channels unless the human explicitly asked.
  - Do not start dev servers unless the human explicitly asked or repository instructions require it.
  - Check `git status --short` before edits.
  - Preserve unrelated worktree changes.
  - Avoid code edits unless the delegated task clearly requires them.
- Ask for a concise final report: what was done, current status, links/ids, blockers, and next smallest action.

Example prompt skeleton:

```text
Task from Kevin: handle <one bounded target> only. In <absolute path>, triage <exact run/PR/issue>.
First <specific first action>. If <success condition>, report that. If <failure condition>, inspect logs/context and summarize root cause plus the smallest next action.
Do not work on <excluded work>; <owner> is handling that elsewhere.
Do not contact customers or use Intercom/Slack/email. Do not start dev servers.
Avoid code edits unless the root cause clearly requires a small scoped fix; preserve unrelated worktree changes.
```

## Monitoring

- Capture the pane after sending the prompt to verify it is working.
- Poll with `tmux capture-pane -pt "$pane" -S -200` while the task runs.
- Give the user short status updates about meaningful transitions: started, verified clean worktree, rerun triggered, CI queued/running, failure found, done.
- Do not micromanage the sibling agent unless it is blocked, drifting, or violating scope.
- If redirecting the task, send a concise corrective prompt with `tmux send-keys`.

## Reporting

Report:

- pane id or tmux session/window
- working directory
- model/reasoning/sandbox/approval mode used
- exact delegated target
- current status and any action already taken

Leave the pane open by default so the user can inspect or continue it. Close it only if the user asks, the process exits cleanly and no inspection is needed, or it is clearly stuck in an unusable state.

## ACP

Do not search for or set up ACP by default. If the user mentions ACP, first check whether local Codex tooling already exposes a supported ACP/app-server workflow. If it is not obvious and tmux can satisfy the request, use tmux and say ACP was not needed. Search online only when the user explicitly asks for ACP details or local help output/configuration is insufficient for a required ACP setup.
