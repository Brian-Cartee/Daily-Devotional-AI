# Shepherd's Path — Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Products

- **Shepherd's Path Web App** — `artifacts/shepherds-path/` (React + Vite, preview at `/`)
- **API Server** — `artifacts/api-server/` (Express 5, preview at `/api`)

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod, `drizzle-zod`
- **Frontend**: React + Vite + Tailwind CSS v3 + wouter
- **Build**: esbuild (API server), Vite (frontend)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Project Structure

```
artifacts/
  shepherds-path/     # React + Vite frontend (previewPath: /)
  api-server/         # Express backend (previewPath: /api)
  mockup-sandbox/     # Design mockups (previewPath: /__mockup/)
lib/
  db/                 # Shared Drizzle schema + PostgreSQL client
  api-spec/           # OpenAPI spec (lib/api-spec/openapi.yaml)
  api-client-react/   # Generated React hooks from OpenAPI
  api-zod/            # Generated Zod schemas from OpenAPI
.migration-backup/    # Original single-artifact app (do not modify)
```

## Important Notes

- The `@shared` alias in the frontend's vite.config.ts points to `artifacts/shepherds-path/src/shared/` — a frontend-safe copy of shared types (no DB imports)
- The API server routes use `registerRoutes(server, app)` directly — the legacy route function is called from `artifacts/api-server/src/index.ts`
- TTS cache: `server/tts-cache/` at workspace root
- Verse art cache: `server/verse-art-cache/` at workspace root
- Growth plan PDF: `scripts/shepherds-path-growth-plan.pdf` at workspace root

## External Services

- OpenAI (AI responses + TTS)
- Google Sheets (daily verse sync)
- Stripe (Pro subscriptions)
- Resend (email)
- Twilio (SMS)
- Web Push / VAPID (push notifications)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
