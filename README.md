# Google Notes Summarizer

A Next.js application that connects to your Google account and lets you browse your Google Drive files. Built as a foundation for AI-powered note summarization.

## Tech Stack

- **Next.js 15** (App Router) — React UI + API routes in one project
- **NextAuth.js v5** (Auth.js) — Google OAuth with Drive scopes
- **Google APIs** — Drive v3 client for file listing and copying
- **Tailwind CSS 4** — Styling
- **TypeScript** — Throughout

## Project Structure

```
app/
  layout.tsx              Root layout with SessionProvider
  page.tsx                Landing page (redirects to /login or /dashboard)
  login/page.tsx          Login page with Google sign-in
  dashboard/page.tsx      Authenticated dashboard showing Drive files
  api/
    auth/[...nextauth]/   NextAuth route handler
    drive/                API route: list Google Drive files
    watched-folders/      API route: CRUD for watched folders
    summaries/create/     API route: copy new files from watched folders
lib/
  auth.ts                 NextAuth config (Google provider, scopes, callbacks)
  google-drive.ts         Helper: create Drive API client from access/refresh token
  token-store.ts          In-memory refresh token store (userId → token)
  watched-folders-repo.ts In-memory watched folders repository
  process-watched-folders.ts  Service: process watched folders and copy new files
components/
  sign-in-button.tsx      Google sign-in button
  sign-out-button.tsx     Sign-out button
  drive-file-list.tsx     Component to display Drive files
middleware.ts             Protects /dashboard route
```

## Getting Started

### Prerequisites

- Node.js 18+
- A Google Cloud project with OAuth 2.0 credentials

### Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a project (or select an existing one)
3. Enable the **Google Drive API** under APIs & Services
4. Configure the **OAuth consent screen** (External is fine for testing)
5. Create an **OAuth 2.0 Client ID** (type: Web application)
   - Authorized JavaScript origin: `http://localhost:3000`
   - Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

### Installation

```bash
npm install
```

### Configuration

Copy the example env file and fill in your values:

```bash
cp .env.local.example .env.local
```

```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=          # generate with: openssl rand -base64 32
GOOGLE_CLIENT_ID=         # from Google Cloud Console
GOOGLE_CLIENT_SECRET=     # from Google Cloud Console
SCHEDULER_API_KEY=        # secret key for scheduler endpoint auth
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — click "Sign in with Google", authorize Drive access, and you'll see your files on the dashboard.

## License

MIT
