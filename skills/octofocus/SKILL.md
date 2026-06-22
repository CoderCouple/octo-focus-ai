---
name: octofocus
description: This skill should be used when the user asks to "pull a page from OctoFocus", "push notes to OctoFocus", "edit a diagram in OctoFocus", "list my OctoFocusAI projects", "generate a diagram in OctoFocus", "run an OctoFocus agent task", or otherwise read or mutate content in their OctoFocusAI workspace. Invokes the `octofocus` CLI.
---

# OctoFocusAI workspace via CLI

OctoFocusAI is a notes + canvas + diagram-as-code workspace. This skill drives the `octofocus` CLI to read and edit that workspace from the shell.

## Preflight

Before the first invocation in a session:

1. Check the binary exists: run `command -v octofocus`. If not found, ask the user to install it:
   ```
   npm i -g @octofocus/cli
   ```
2. Check auth: run `octofocus whoami --json` once. If it exits non-zero with `Not logged in`, ask the user to either:
   - Set `OCTOFOCUS_TOKEN=<oft_…>` in their shell (recommended for agents).
     They can mint one with `octofocus auth token create "claude-skill"` after running `octofocus login`.
   - Or run `octofocus login` interactively themselves (not something you can do for them — it requires a 6-digit code from their email).

   Do NOT try to run `octofocus login` yourself. It is blocked on non-TTY and will return a clear `CliError`.

## Output contract

- The CLI auto-emits JSON when stdout is piped (which it always is when you invoke it). Parse the JSON directly; do not assume table output.
- Errors land on stderr in the form `Error: <message>` and `Hint: <…>`. Exit code 1.
- Successful mutations write a short stderr line (e.g. "Pushed. Updated at 2026-06-22 01:07.") and the resource JSON on stdout.

## Capability map

| User intent | Command |
|---|---|
| "What workspaces / projects do I have?" | `octofocus whoami` then `octofocus project list` |
| "Show me my pages" | `octofocus page list` (or `--project prj_…`) |
| "Show me my canvases" | `octofocus canvas list` |
| "Open / read page X" | `octofocus page pull <pageId> -o /tmp/<slug>.md` then `Read` the file |
| "Edit / replace page X" | Edit the local `.md`, then `octofocus page push /tmp/<slug>.md` |
| "Append / summarize on page X" | Pull → modify via `Edit`/`Write` → push |
| "Generate / draft a new diagram" | Write DSL to a file → `octofocus canvas push <file> --id cnv_…` |
| "Convert this prose into a diagram" | Use the DSL syntax below, write to file, push, OR queue: `octofocus diagram generate "<prompt>" --type sequence` |
| "Queue an AI run on Y" | `octofocus agent run "<prompt>" --project prj_… --page pag_…` |
| "Status of run R" | `octofocus agent status <runId>` |

## DSL cheat sheet (for canvas push)

```
# comments
Node A
Node B
Node A > Node B
Node A > Node B: edge label
```

That's the whole grammar. Source: `packages/diagrams/src/dsl.ts`.

## Workspace selection

If the user has more than one workspace, the CLI requires `--workspace <wsp_…>` on workspace-scoped commands, OR a previously-set default via `octofocus workspace use <wsp_…>`. Pick a workspace by asking the user; never guess.

## Patterns that work well

- **Pull → edit → push.** Always pull a fresh copy before editing. Frontmatter
  carries `octofocusPageId` / `octofocusCanvasId` so the subsequent push doesn't
  need an `--id` flag.

- **One mutation per intent.** Don't batch unrelated edits across pages — every
  push writes an audit row in `change_events`; smaller commits make the history
  legible.

- **Use `--json` explicitly** when you need to extract a single field
  (e.g. `octofocus project list --json | jq '.[0].id'`). Auto-JSON also kicks in
  when stdout is piped, but explicit is safer.

## Patterns to avoid

- Do not query the OctoFocusAI database directly. The backend owns permissions
  and audit; bypass it and AGENT-attribution gets lost.
- Do not call the HTTP API yourself with curl. The CLI handles BaseResponse
  unwrapping, error codes, and token refresh.
- Do not assume `agent run` and `diagram generate` produce output immediately.
  They queue `ai_runs` rows that stay `PENDING` until the backend worker (not yet
  shipped) picks them up. Tell the user the run id and stop polling.

## When the CLI refuses

The CLI's error messages already include a `Hint:` line. Relay both lines to the
user verbatim — don't reword them. Common ones:

- `[NOT_FOUND] Page not found.` — bad id; ask the user for the right one.
- `[FORBIDDEN] Not a member of this workspace.` — wrong `--workspace` flag.
- `Invalid CLI token.` — `OCTOFOCUS_TOKEN` is stale; user must re-mint.
- `CLI token has expired.` — same, user mints a new one.

## Reference

- CLI source: [packages/cli](https://github.com/CoderCouple/octo-focus-ai/tree/main/packages/cli)
- API contract: [services/api/README.md](https://github.com/CoderCouple/octo-focus-ai/blob/main/services/api/README.md)
- Architecture: [docs/ARCHITECTURE.md](https://github.com/CoderCouple/octo-focus-ai/blob/main/docs/ARCHITECTURE.md)
