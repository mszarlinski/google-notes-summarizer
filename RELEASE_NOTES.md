# Release Notes

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
