# langsync.xyz

Open-source translation management for Next.js and React Native.

## Features

- Dashboard for managing translations
- AI-powered translations via OpenAI
- NPM packages for Next.js and Expo
- Self-host or use the cloud
- Real-time collaboration

## Quick Start

### Cloud

```bash
npm install @langsync/nextjs
```

```tsx
import { TranslationProvider, loadTranslations } from '@langsync/nextjs'

const translations = await loadTranslations({
  apiKey: process.env.LANGSYNC_API_KEY,
  projectId: process.env.LANGSYNC_PROJECT_ID,
  language: 'en',
})

<TranslationProvider translations={translations} language="en">
  <App />
</TranslationProvider>
```

### Self-Hosted

```bash
git clone https://github.com/YonasValentin/langsync.xyz
cd langsync.xyz

# Start PocketBase
pocketbase serve --dir=./pb_data
# Import pb_schema.json via Admin UI at http://127.0.0.1:8090/_/

# Start dashboard
cd web && npm install && npm run dev
```

## Packages

| Package | Description |
|---------|-------------|
| [@langsync/nextjs](./packages/nextjs) | Next.js integration |
| [@langsync/expo](./packages/expo) | React Native / Expo |
| [@langsync/client](./packages/client) | API client |
| [@langsync/core](./packages/core) | Shared types |

## Stack

- **Dashboard**: Next.js 16, PocketBase, Tailwind
- **API**: PocketBase + Next.js API routes
- **AI**: OpenAI GPT-4

## License

MIT
