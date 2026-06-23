# @octofocus/cli

Command-line interface for the [OctoFocusAI](https://github.com/CoderCouple/octo-focus-ai) workspace.

Built so AI agents — and humans who like terminals — can read, edit, and publish
notes, canvases, and diagram-as-code from the shell.

```bash
npm i -g @octofocus/cli
octofocus login           # interactive (humans)
# or
OCTOFOCUS_TOKEN=… octofocus whoami   # headless (agents, CI, Claude skills)
```

## Why a CLI

OctoFocusAI's data lives behind a JSON API. The web app is the canvas-and-editor
surface; the CLI is the **agent surface**. Every command:

- Talks only to the public API. No direct database access.
- Returns JSON automatically when stdout is piped (`process.stdout.isTTY === false`).
  Pretty tables only when a human is watching. Override with `--pretty` or `--json`.
- Surfaces backend `errorCode` values verbatim (`NOT_FOUND`, `FORBIDDEN`, …) so
  callers can branch on them.
- Refuses to prompt for input when stdin isn't a TTY — agents get a clear
  `CliError` instead of a hung process.

## Install

```bash
npm i -g @octofocus/cli
```

Requires Node 20+.

## Auth

Two modes:

| Mode | Use for | How |
|---|---|---|
| Browser (default) | Humans on a laptop | `octofocus login` → browser opens to the web app's `/cli/connect` confirm page → you click Authorize → the CLI receives a long-lived token |
| Token | Agents, CI, Claude skills | Set `OCTOFOCUS_TOKEN=<token>` in the environment |

The browser flow has no email step, no Supabase rate limits, no redirect-URL
allowlist to configure. It works because your web session (cookie auth) on
`<webOrigin>` mints a CLI token directly via the OctoFocusAI API.

Additional tokens for CI / agents / other machines can be minted via
`octofocus auth token create` after you're logged in, or via the web app at
`<webOrigin>/settings/cli-tokens`.

Session and config live at `~/.octofocus/config.json` (mode `0600`). Override
the location with `OCTOFOCUS_CONFIG_DIR`. Env knobs:

- `OCTOFOCUS_API_URL` — defaults to `https://api.octofocus.ai`. Override for
  local dev with `--api-url http://localhost:4000`.
- `OCTOFOCUS_WEB_URL` — defaults to `https://www.octofocus.ai`. Where the
  browser bridge sends the user. Override for local dev with
  `--web-url http://localhost:3000`.
- `OCTOFOCUS_TOKEN` — bypass the config file entirely. Used by agents.

## Commands

```
octofocus
├── login | logout | whoami
├── workspace list | use <id>
├── project   list
├── page      list | pull <pageId> | push <file>
├── canvas    list | pull <canvasId> | push <file>
├── agent     run <prompt> | status [runId]
└── diagram   generate <prompt>
```

Every command supports `--json` (force JSON) and inherits the global
`--pretty` (force tables). `--workspace` overrides the active workspace
configured by `octofocus workspace use`.

### Notes round-trip

```bash
octofocus page pull pag_abc -o note.md
$EDITOR note.md
octofocus page push note.md
```

`page pull` writes YAML frontmatter (`octofocusPageId`, `title`, `updatedAt`)
so subsequent pushes don't need the id flag.

### Diagram-as-code round-trip

```bash
octofocus canvas pull cnv_abc -o flow.dsl
cat >> flow.dsl <<'EOF'
User > Browser
Browser > API: Bearer JWT
API > Postgres: SELECT
EOF
octofocus canvas push flow.dsl
```

`canvas push` fetch-merges your DSL into `canvases.diagramSchema.dsl` so
sibling fields (layout hints, AI metadata) survive.

### Agent runs

```bash
octofocus agent run "Summarize the Sandbox page" --project prj_…
octofocus agent status        # last 20 runs
octofocus agent status run_…  # single run
```

```bash
octofocus diagram generate "Login flow" --type sequence
```

Both queue rows in `ai_runs`. They sit in `PENDING` until the backend AI
worker is wired.

## Using this CLI from Claude Code

A Claude Code plugin is shipped from the same repo (see
`claude-plugin/`). Install:

```
/plugin marketplace add CoderCouple/octo-focus-ai
/plugin install octofocus@octo-focus-ai
```

Then Claude can invoke `octofocus` on your behalf for any workspace-editing
task. The skill body tells Claude to check `OCTOFOCUS_TOKEN` first and ask
you to run `octofocus login` if it's missing.

## Exit codes

| Code | Meaning |
|---|---|
| 0 | Success |
| 1 | Any `CliError` — message on stderr, hint on second line |

## Architecture

See the repo's [`docs/ARCHITECTURE.md`](https://github.com/CoderCouple/octo-focus-ai/blob/main/docs/ARCHITECTURE.md)
for the backend layout and
[`services/api/README.md`](https://github.com/CoderCouple/octo-focus-ai/blob/main/services/api/README.md)
for the api contract this CLI consumes.

## License

MIT
