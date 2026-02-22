# Release Notes

## v0.3.0 — Scheduler: Copy New Files from Watched Folders (2026-02-22)

Process watched folders on a schedule: find files created since the last run and copy them to a root-level "Summaries" Drive folder.

### Features

- **Summaries endpoint** — `POST /api/summaries/create` copies new files from watched folders into a "Summaries" Drive folder with a `-copy` suffix
- **Token persistence** — In-memory token store saves Google refresh tokens so the scheduler can act on behalf of users without an active session
- **Incremental processing** — `lastProcessedAt` timestamp on each watched folder prevents duplicate copies on re-runs
- **Full Drive scope** — OAuth scope upgraded from `drive.readonly` to `drive` to enable file copying

### Technical Details

- `lib/token-store.ts` — HMR-safe in-memory store mapping userId to refresh token
- `lib/process-watched-folders.ts` — Service layer: groups folders by user, finds/creates "Summaries" folder, copies new files, updates timestamps
- `lib/google-drive.ts` — New `getDriveClientWithRefresh()` creates a Drive client from refresh token + client credentials
- `lib/watched-folders-repo.ts` — Added `lastProcessedAt` field and `updateLastProcessed()` method
- Route handler is a thin wrapper delegating to the service

## v0.2.0 — Watch Folders (2026-02-22)

Add the ability to watch Google Drive folders for future summarization.

### Features

- **Watch/unwatch folders** — Clock icon on folder rows toggles watched state
- **Watched folders API** — CRUD endpoints at `/api/watched-folders` with auth
- **Scheduler endpoint** — `/api/scheduler/watched-folders` lists all watched folders (API-key protected)
- **In-memory storage** — Repository-pattern store replaces Prisma/PostgreSQL so the app runs with zero infrastructure
- **Session email** — `session.userEmail` now available for per-user data scoping

### Technical Details

- `WatchedFoldersRepo` interface with `InMemoryWatchedFoldersRepo` implementation
- Singleton attached to `globalThis` to survive HMR in dev
- Prisma and PostgreSQL dependencies removed; `prisma/schema.prisma` kept as reference
- Drive file list fetches watched state in parallel on mount

## v0.1.0 — Skeleton App (2026-02-22)

First milestone: project scaffolding with Google OAuth and Drive integration.

### Features

- **Google OAuth login** — Sign in with your Google account via NextAuth.js v5
- **Google Drive file listing** — Browse your Drive files (name, MIME type) on the dashboard
- **Protected routes** — Middleware redirects unauthenticated users to the login page
- **Login page** — Dedicated `/login` page with Google sign-in button and branding
- **Dashboard** — Displays user email and a list of Drive files

### Technical Details

- Next.js 15 App Router with TypeScript
- NextAuth.js v5 (beta) with Google provider and `drive.readonly` scope
- JWT callbacks persist Google access and refresh tokens
- Drive API route with error handling
- Tailwind CSS 4 for styling
- Route protection via `authorized` callback in middleware
