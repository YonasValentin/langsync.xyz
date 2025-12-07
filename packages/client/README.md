# @langsync/client

API client for LangSync. Works with cloud and self-hosted instances.

## Install

```bash
npm install @langsync/client
```

## Usage

```typescript
import { LangSyncClient } from '@langsync/client'

const client = new LangSyncClient({
  apiKey: 'your-api-key',
  projectId: 'your-project-id',
})

// Get all translations
const translations = await client.getTranslations()

// Get translations for one language
const en = await client.getLanguageTranslations('en')
// { 'hero.title': 'Welcome', 'hero.subtitle': '...' }

// Get all languages at once
const all = await client.getAllTranslations()
// { en: {...}, da: {...} }

// Project metadata
const project = await client.getProject()
```

## Config

```typescript
new LangSyncClient({
  apiKey: string,        // Required
  projectId: string,     // Required
  baseUrl?: string,      // Default: 'https://api.langsync.xyz/v1'
  timeout?: number,      // Default: 10000ms
  cacheTTL?: number,     // Default: 3600s (1 hour)
  retries?: number,      // Default: 3
})
```

## Self-Hosted

```typescript
const client = new LangSyncClient({
  apiKey: 'your-key',
  projectId: 'your-project',
  baseUrl: 'https://your-domain.com/api/v1',
})
```

## Caching

Built-in memory cache with TTL. Force refresh with `{ refresh: true }`:

```typescript
const fresh = await client.getTranslations({ refresh: true })
client.clearCache()
```

## Error Handling

```typescript
import {
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  NetworkError,
} from '@langsync/client'

try {
  await client.getTranslations()
} catch (err) {
  if (err instanceof AuthenticationError) {
    // Invalid API key
  } else if (err instanceof RateLimitError) {
    // Wait err.retryAfter seconds
  }
}
```

## Requirements

Node.js 18+ (native fetch)

## License

MIT
