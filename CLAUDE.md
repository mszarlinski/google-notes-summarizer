# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run lint     # ESLint via Next.js
npx vitest       # Run all tests
npx vitest run lib/process-watched-folders.test.ts  # Run a single test file
```

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:
- `NEXTAUTH_URL`, `NEXTAUTH_SECRET` — NextAuth config
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — from Google Cloud Console (OAuth 2.0, redirect URI: `http://localhost:3000/api/auth/callback/google`)
- `SCHEDULER_API_KEY` — auth key for the `/api/summaries/create` scheduler endpoint
- `GEMINI_API_KEY` — from [Google AI Studio](https://aistudio.google.com/app/apikey), used to generate meeting summaries

## Architecture

**Next.js 15 App Router** with NextAuth.js v5 (Auth.js) for Google OAuth.

### Auth & Token Flow

Authentication uses Google OAuth with full Drive scope (`drive` not `drive.readonly`). On sign-in, the refresh token is stored in `lib/token-store.ts` (in-memory, keyed by user email). The access token is passed through the JWT → session callback so client components can call Drive APIs directly. Route protection is handled in `middleware.ts` via the `authorized` callback.

### In-Memory Storage Pattern

Both `lib/token-store.ts` and `lib/watched-folders-repo.ts` use the same pattern: a singleton stored on `globalThis` to survive Next.js hot-reloads in dev. **Neither is persisted** — all data is lost on server restart. The Prisma schema (`prisma/schema.prisma`) defines a `WatchedFolder` model for a future PostgreSQL migration but is not currently wired up.

### AI Summary Generation

`lib/gemini.ts` exposes `getGeminiModel()` which returns a `gemini-2.0-flash` client (requires `GEMINI_API_KEY`).

For each newly copied file, `process-watched-folders.ts` attempts to:
1. Extract text content — Google Docs/Slides export as `text/plain`, Sheets as `text/csv`, plain `text/*` files download directly; all other MIME types are skipped silently
2. Call Gemini with a structured meeting summary prompt
3. Create a new Google Doc named `{fileName}-summary` in the Summaries folder

Summary generation is best-effort — a failure does not prevent the file copy from being recorded.

### Watched Folders & Scheduler

The core background logic lives in `lib/process-watched-folders.ts`:
1. Loads all watched folders from the in-memory repo
2. Groups by user, looks up each user's refresh token
3. For each user, finds or creates a `Summaries` folder at Drive root
4. Copies new files (filtered by `createdTime > lastProcessedAt`) into `Summaries/`, appending `-copy` to the name
5. Updates `lastProcessedAt` on success

This is triggered by `POST /api/summaries/create`. Note: the `SCHEDULER_API_KEY` auth check is currently commented out in that route handler.

### Path Alias

`@/` maps to the project root (configured in `vitest.config.ts` and `tsconfig.json`).
