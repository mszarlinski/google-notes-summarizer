# Release Notes

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
