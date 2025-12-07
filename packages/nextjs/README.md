# @langsync/nextjs

Next.js integration for LangSync. Zero runtime API calls - translations are bundled at build time.

## Install

```bash
npm install @langsync/nextjs
```

## Setup

```tsx
// app/layout.tsx
import { TranslationProvider, loadAllTranslations } from '@langsync/nextjs'

export default async function RootLayout({ children }) {
  const translations = await loadAllTranslations({
    apiKey: process.env.LANGSYNC_API_KEY,
    projectId: process.env.LANGSYNC_PROJECT_ID,
    languages: ['en', 'da'],
  })

  return (
    <html>
      <body>
        <TranslationProvider
          translations={translations.en}
          language="en"
          defaultLanguage="en"
        >
          {children}
        </TranslationProvider>
      </body>
    </html>
  )
}
```

## Usage

```tsx
'use client'
import { useTranslations } from '@langsync/nextjs'

export default function Page() {
  const t = useTranslations()
  return <h1>{t('hero.title')}</h1>
}
```

With variables:

```tsx
// "welcome.message": "Hello {{name}}, you have {{count}} messages"
t('welcome.message', { name: 'John', count: 5 })
```

## Language Switching

```tsx
import { EnhancedTranslationProvider, useLanguage, LanguageSwitcher } from '@langsync/nextjs'

// Wrap app with enhanced provider for language switching
<EnhancedTranslationProvider
  apiKey={process.env.LANGSYNC_API_KEY}
  projectId={process.env.LANGSYNC_PROJECT_ID}
  defaultLanguage="en"
  languages={['en', 'da', 'de']}
>
  {children}
</EnhancedTranslationProvider>

// Use the hook
const { currentLanguage, switchLanguage } = useLanguage()

// Or the built-in component
<LanguageSwitcher variant="dropdown" />
```

## API

### loadTranslations(config)

Load translations for one language (server-side).

```tsx
const translations = await loadTranslations({
  apiKey: string,
  projectId: string,
  language: string,
  baseUrl?: string,  // For self-hosted
})
```

### loadAllTranslations(config)

Load multiple languages at once.

```tsx
const all = await loadAllTranslations({
  apiKey: string,
  projectId: string,
  languages: string[],
})
// { en: {...}, da: {...} }
```

### useTranslations()

Returns translation function.

```tsx
const t = useTranslations()
t('key')
t('key', { var: 'value' })
t('key', undefined, { fallback: 'Default' })
```

### useLanguage()

Language state and switching.

```tsx
const { currentLanguage, switchLanguage, availableLanguages, loading } = useLanguage()
```

### LanguageSwitcher

Pre-built language selector.

```tsx
<LanguageSwitcher
  variant="buttons" | "dropdown" | "select"
  showFlags={boolean}
  languageNames={{ en: 'English', da: 'Dansk' }}
/>
```

## Self-Hosted

Point to your own LangSync instance:

```tsx
const translations = await loadTranslations({
  apiKey: 'your-key',
  projectId: 'your-project',
  language: 'en',
  baseUrl: 'https://your-domain.com/api/v1',
})
```

## Route-Based i18n

```tsx
// app/[lang]/layout.tsx
export async function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'da' }]
}

export default async function Layout({ children, params }) {
  const translations = await loadTranslations({
    apiKey: process.env.LANGSYNC_API_KEY,
    projectId: process.env.LANGSYNC_PROJECT_ID,
    language: params.lang,
  })

  return (
    <TranslationProvider translations={translations} language={params.lang}>
      {children}
    </TranslationProvider>
  )
}
```

## Requirements

- Next.js 14+
- React 18+
- Node.js 18+

## License

MIT
