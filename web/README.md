# langsync.xyz Dashboard

Self-hostable translation management dashboard.

## Setup

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

## Environment

```
NEXT_PUBLIC_POCKETBASE_URL=http://127.0.0.1:8090
OPENAI_API_KEY=sk-...
```

## Stack

- Next.js 15 (App Router)
- PocketBase (auth + database)
- Tailwind CSS
- TypeScript

## Routes

- `/dashboard` - Main app
- `/login`, `/sign-up` - Auth
- `/api/v1/*` - Public API for NPM packages

## Deploy

Deploy to Vercel, Railway, or self-host with Docker.

## License

MIT
