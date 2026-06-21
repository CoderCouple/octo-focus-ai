# OctoFocusAI

The AI workspace for Humans and Agents. Notes + canvas + AI, built monochrome
on purpose.

This is a pnpm + Turborepo monorepo. Five workspaces:

| Path | What it is |
|---|---|
| `apps/web` | Next.js 15 + React 19 frontend. Marketing + workspace UI. Deployed to Vercel. |
| `services/api` | NestJS + Fastify backend (layered architecture, Drizzle + Postgres). Deployed to Railway. See `services/api/README.md`. |
| `packages/shared` | Zod schemas + ID helpers used by both apps/web and services/api. |
| `packages/diagrams` | Eraser-style DSL parser + layout (`A > B: label`). |
| `packages/ai` | AI agent infra (early). |

## Quick start

```bash
pnpm install
# Run the api
pnpm --filter @octofocus/api dev
# Run the web app
pnpm --filter @octofocus/web dev
```

Env: copy `.env.example` to `.env` at the repo root and fill in
Supabase / Resend / database credentials. The api auto-loads it on boot.

## Where the real docs live

- `services/api/README.md` — **api architecture**, layers, how to add a
  feature, conventions, the BaseResponse envelope, error handling, tests.
- `apps/web/` — no README yet; structure follows Next.js app-router conventions.
