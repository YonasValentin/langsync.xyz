# LangSync Packages

NPM packages for LangSync translation management.

## Packages

| Package | Description |
|---------|-------------|
| [@langsync/core](./core) | Shared types and utilities |
| [@langsync/client](./client) | API client |
| [@langsync/nextjs](./nextjs) | Next.js integration |
| [@langsync/expo](./expo) | React Native / Expo |

## Install

```bash
npm install @langsync/nextjs
```

## Usage

```tsx
import { useTranslations } from '@langsync/nextjs'

export default function Page() {
  const t = useTranslations()
  return <h1>{t('welcome')}</h1>
}
```

## Development

```bash
pnpm install
pnpm build
pnpm test
```

## License

MIT
