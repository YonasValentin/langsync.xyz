# @langsync/expo

Translation management for React Native and Expo apps.

## Install

```bash
npm install @langsync/expo @react-native-async-storage/async-storage
```

## Setup

```tsx
import { TranslationProvider } from '@langsync/expo'

export default function App() {
  return (
    <TranslationProvider
      config={{
        apiKey: process.env.EXPO_PUBLIC_LANGSYNC_API_KEY,
        projectId: process.env.EXPO_PUBLIC_LANGSYNC_PROJECT_ID,
        defaultLanguage: 'en',
        languages: ['en', 'es', 'da'],
        strategy: 'runtime',
      }}
    >
      <MyApp />
    </TranslationProvider>
  )
}
```

## Usage

```tsx
import { useTranslations } from '@langsync/expo'

function WelcomeScreen() {
  const t = useTranslations()

  return (
    <View>
      <Text>{t('welcome.title')}</Text>
      <Text>{t('greeting', { name: 'John' })}</Text>
    </View>
  )
}
```

## Loading Strategies

### Runtime (default)

Fetches from API with caching.

```tsx
strategy: 'runtime',
cacheTTL: 86400, // 24 hours
```

### Bundled

Ships translations with the app. No network needed.

```tsx
import en from './translations/en.json'
import da from './translations/da.json'

<TranslationProvider
  config={{
    strategy: 'bundled',
    defaultLanguage: 'en',
    languages: ['en', 'da'],
    bundledTranslations: { en, da },
  }}
>
```

### Hybrid

Bundled fallback + runtime updates. Best for production.

```tsx
import en from './translations/en.json'

<TranslationProvider
  config={{
    apiKey: '...',
    projectId: '...',
    strategy: 'hybrid',
    defaultLanguage: 'en',
    languages: ['en', 'da'],
    bundledTranslations: { en },
  }}
>
```

## Language Switching

```tsx
import { useLanguage, LanguageSwitcher } from '@langsync/expo'

// Hook
const { language, changeLanguage, availableLanguages } = useLanguage()
await changeLanguage('da')

// Component
<LanguageSwitcher variant="buttons" />
<LanguageSwitcher variant="modal" />
<LanguageSwitcher variant="compact" />
```

## API

### useTranslations()

```tsx
const t = useTranslations()
t('key')
t('key', { var: 'value' })
t('key', {}, { defaultValue: 'Fallback' })
```

### useTranslation(key, vars?, options?)

Single translation, slightly more optimized.

```tsx
const title = useTranslation('welcome.title')
```

### useLanguage()

```tsx
const { language, availableLanguages, changeLanguage, isChanging, error } = useLanguage()
```

### useTranslationContext()

Full context access for advanced use.

```tsx
const { translations, language, isLoading, refresh } = useTranslationContext()
```

### LanguageSwitcher

```tsx
<LanguageSwitcher
  variant="buttons" | "modal" | "compact" | "flatlist"
  languageNames={{ en: 'English', da: 'Dansk' }}
  showCheckmark={true}
/>
```

## RTL Support

Automatic RTL handling for Arabic, Hebrew, Persian, Urdu.

```tsx
import { isRTLLanguage, applyRTLIfNeeded } from '@langsync/expo'

isRTLLanguage('ar') // true
await applyRTLIfNeeded('ar') // May require restart on Android
```

Disable with `enableRTL: false` in config.

## Offline

- **Runtime**: Uses AsyncStorage cache
- **Bundled**: Fully offline
- **Hybrid**: Falls back to bundled when offline

## Error Handling

```tsx
<TranslationProvider
  config={{ ... }}
  errorComponent={(error, retry) => (
    <View>
      <Text>Failed to load: {error.message}</Text>
      <Button title="Retry" onPress={retry} />
    </View>
  )}
>
```

Or with callback:

```tsx
config={{
  onError: (error) => console.error(error),
}}
```

## Self-Hosted

```tsx
config={{
  baseUrl: 'https://your-domain.com/api/v1',
  apiKey: '...',
  projectId: '...',
}}
```

## TypeScript

Full type support included.

```tsx
import type { LangSyncExpoConfig, LanguageHookResult } from '@langsync/expo'
```

## License

MIT
