# @langsync/core

Shared types and utilities for LangSync.

## Install

```bash
npm install @langsync/core
```

## Usage

```typescript
import type { Project, TranslationKey } from '@langsync/core'
import { flattenTranslations, interpolate } from '@langsync/core'

// Flatten nested translations
const flat = flattenTranslations({ hero: { title: 'Welcome' } })
// { 'hero.title': 'Welcome' }

// Interpolate variables
interpolate('Hello {{name}}!', { name: 'World' })
// 'Hello World!'
```

## Exports

**Types:** `Project`, `TranslationKey`, `Language`, `LangSyncConfig`

**Utils:** `flattenTranslations`, `unflattenTranslations`, `interpolate`, `getNestedValue`

**Constants:** `SUPPORTED_LANGUAGES`, `DEFAULT_API_URL`, `ENDPOINTS`

## License

MIT
