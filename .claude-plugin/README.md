# OctoFocusAI — Claude Code plugin

A Claude Code plugin that lets Claude read, edit, and publish content in
your OctoFocusAI workspace via the `octofocus` CLI.

## Install

In any Claude Code session:

```
/plugin marketplace add suniltiwari/octo-focus-ai
/plugin install octofocus@octo-focus-ai
/reload-plugins
```

That registers the `octofocus` skill. Claude will surface it whenever the user's
request matches phrases like *"pull a page from OctoFocus"*, *"push notes"*,
*"edit a diagram"*, *"run an OctoFocus agent"*, etc. See `skills/octofocus/SKILL.md`
for the full description.

## Prerequisites

1. **Node 20+** and the CLI installed globally:
   ```
   npm i -g @octofocus/cli
   ```
2. **Auth.** Two paths:
   - **Token (recommended).** On a machine with a TTY, run `octofocus login`,
     then `octofocus auth token create "claude-skill"`. Save the printed
     `oft_…` line — it's shown exactly once. Then export it in your shell:
     ```
     export OCTOFOCUS_TOKEN=oft_xxx
     ```
   - **Shared config.** Run `octofocus login` on the same machine you use
     Claude Code on; the session cache at `~/.octofocus/config.json` is
     auto-picked up.

The skill will tell Claude to do a `whoami` preflight on first use and prompt
you to install / authenticate if needed. It will never try to run `login`
itself — that's interactive-only.

## What the plugin contains

```
.claude-plugin/
├── plugin.json          plugin manifest
├── marketplace.json     marketplace catalog (so /plugin marketplace add … finds the plugin)
└── README.md            this file
skills/
└── octofocus/
    └── SKILL.md         the skill body
```

That's it. No hooks, no MCP servers, no agents, no bundled binaries — the CLI is
shipped via npm and the skill is just a thin instruction layer over it.

## What the skill does NOT do

- It does not query the OctoFocusAI database directly. All access goes through
  the `octofocus` CLI, which goes through the OctoFocusAI HTTP API, which
  enforces workspace permissions and writes audit rows.
- It does not call OpenAI / Anthropic directly. AI runs are queued via
  `octofocus agent run` and processed by the OctoFocusAI backend worker.
- It does not store secrets. The `OCTOFOCUS_TOKEN` env var is read by the CLI
  and never logged.
