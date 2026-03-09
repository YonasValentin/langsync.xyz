# LangSync Production Readiness Audit

> Generated: 2026-03-09

## TL;DR — Skal du splitte i to repos?

**Ja.** `web/` og `packages/` er to uafhængige produkter med forskellige release-cyklusser, forskellige brugere og forskellige deployment targets. Anbefaling:

| Repo | Indhold | Target |
|------|---------|--------|
| `langsync` (eller `langsync-app`) | Next.js web app, PocketBase, Docker | Vercel / self-hosted |
| `langsync-sdk` | `@langsync/core`, `client`, `nextjs`, `expo` | npm registry |

**Fordele ved split:**
- SDK'er kan versioneres og publiceres uafhængigt
- Web-appen kan deployes uden at trigge SDK-builds
- Separate CI pipelines (npm publish vs Vercel deploy)
- Open-source SDK + closed-source cloud er nemmere at håndtere
- Forbrugere af SDK'erne behøver ikke clone hele web-appen

---

## Del 1: Web App (`web/`) — Production Readiness

### BLOKERENDE Issues

| # | Issue | Detalje |
|---|-------|---------|
| 1 | **Ingen CSP header** | `Content-Security-Policy` mangler helt i `next.config.ts`. XSS-risiko. |
| 2 | **CORS wildcard på API** | `Access-Control-Allow-Origin: *` på `/api/v1/*` — alle websites kan læse translations |
| 3 | **In-memory rate limiting** | `lib/api/rate-limit.ts` bruger in-memory store — virker ikke med multiple instanser |
| 4 | **Ingen env validation ved startup** | `lib/env.ts` eksisterer men der er ingen prestart-validering — app crasher runtime hvis env mangler |
| 5 | **Ingen error boundaries** | Ingen `react-error-boundary` — component-fejl giver hvid skærm |
| 6 | **PhraseFlow-referencer** | Gamle `PHRASEFLOW_*` env-var navne bruges stadig i koden |

### VIGTIGE Issues

| # | Issue | Anbefaling |
|---|-------|------------|
| 7 | Ingen monitoring/APM | Tilføj Sentry (`@sentry/nextjs`) |
| 8 | Version `0.1.0` | Bump til `1.0.0` for production |
| 9 | Loose dependency pinning | `next: ^16.0.7`, `stripe: ^20.3.1` — pin eksakte versioner for betalingskritisk kode |
| 10 | Manglende `engines` felt | Tilføj `"engines": { "node": ">=20.0.0" }` |
| 11 | Ingen cache headers | Statiske assets mangler `Cache-Control: immutable` |
| 12 | Ingen `type-check` script | Tilføj `"type-check": "tsc --noEmit"` til CI |
| 13 | Source maps i production | Tilføj `productionBrowserSourceMaps: false` i next.config |
| 14 | Ingen pre-commit hooks | Mangler `husky` + `lint-staged` |
| 15 | Ingen React testing utils | Har `vitest` men mangler `@testing-library/react` |

### Hvad er GODT

- `output: "standalone"` — klar til Docker
- Security headers (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- `strict: true` i TypeScript
- Vitest test setup
- ESLint konfigureret med `--max-warnings 0`
- PocketBase typed client med typesafe collections

---

## Del 2: SDK Packages (`packages/`) — npm Publish Readiness

### BLOKERENDE Issues

| # | Issue | Detalje |
|---|-------|---------|
| 1 | **Ingen dist/ mapper** | `pnpm build` er aldrig kørt — npm publish vil publicere tomme pakker |
| 2 | **`workspace:*` dependencies** | `@langsync/client` → `@langsync/core` bruger `workspace:*` — virker IKKE på npm. Forbrugere får broken packages |
| 3 | **Manglende type exports (Expo)** | `./hooks` og `./storage` subpaths mangler `types` condition — TypeScript-brugere mister type safety |
| 4 | **PhraseFlow-referencer overalt** | `PHRASEFLOW_PROJECT_ID`, `PHRASEFLOW_API_KEY` i nextjs plugin, loader, provider + expo context |

### VIGTIGE Issues

| # | Issue | Anbefaling |
|---|-------|------------|
| 5 | Inkonsistente versioner | core: 1.0.0, client: 1.0.1, nextjs: 1.1.1, expo: 1.1.0 — ingen koordineret versionering |
| 6 | Manglende `prepublishOnly` | Kun expo har det — core, client, nextjs mangler |
| 7 | Ingen changesets setup | `.changeset/` mappe mangler trods devDependency |
| 8 | Ingen publish CI workflow | `ci.yml` har lint/test/build men ingen npm publish step |
| 9 | `publint` kører ikke i CI | Eksportvalidering findes som script men er ikke i pipeline |
| 10 | Ingen `.npmignore` | Kun `files` felt — ingen safety net |

### Hvad er GODT

- Alle pakker har korrekte `package.json` felter (name, exports, main, module, types, files, sideEffects, keywords, license, repository)
- Scoped packages (`@langsync/*`) — godt mod typosquatting
- Dual CJS/ESM support via exports map
- TypeScript project references sat korrekt op
- Shared `tsconfig.base.json`
- `pkgroll` som build tool
- Test setup med vitest

---

## Del 3: Tjek mod Officielle Docs

### Next.js Production Checklist (nextjs.org/docs)

| Krav | Status |
|------|--------|
| Reverse proxy foran Next.js | ❌ Ikke dokumenteret |
| `output: "standalone"` for Docker | ✅ |
| `cacheHandler` for multi-instance | ❌ Mangler |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | ❌ Mangler |
| `deploymentId` for rolling deploys | ❌ Mangler |
| `generateBuildId` for konsistente builds | ❌ Mangler |
| `assetPrefix` for CDN | ❌ Mangler |
| Graceful shutdown (SIGTERM) | ❌ Ikke håndteret |

### npm Publishing Best Practices (docs.npmjs.com)

| Krav | Status |
|------|--------|
| `name` (scoped) | ✅ `@langsync/*` |
| `version` (semver) | ✅ |
| `description` | ✅ |
| `keywords` | ✅ |
| `license` | ✅ MIT |
| `exports` (ESM/CJS) | ✅ |
| `files` whitelist | ✅ |
| `engines` | ❌ Kun i workspace root |
| `repository` med `directory` | ✅ |
| `prepublishOnly` hook | ⚠️ Kun expo |
| `npm pack` verification | ❌ Ikke i CI |

### TypeScript Monorepo (typescriptlang.org)

| Krav | Status |
|------|--------|
| `composite: true` | ✅ |
| `declaration: true` | ✅ |
| `declarationMap: true` | ✅ |
| Shared base config | ✅ `tsconfig.base.json` |
| Project references | ✅ |
| Build med `tsc -b` | ⚠️ Bruger pkgroll i stedet |

### PocketBase JS SDK (github.com/pocketbase/js-sdk)

| Krav | Status |
|------|--------|
| Seneste version (v0.26.8) | ⚠️ Bruger `^0.26.4` — bør opdatere |
| `pb.filter()` for safe queries | ❓ Ikke verificeret |
| AsyncAuthStore for React Native | ❓ Ikke verificeret |
| Auto-cancellation awareness | ❓ Ikke verificeret |

---

## Anbefalet Handlingsplan

### Fase 1: Kritiske fixes (før launch)

1. **Rename alle PhraseFlow → LangSync** referencer
2. **Tilføj CSP header** i next.config.ts
3. **Fix CORS** — brug env var i stedet for wildcard
4. **Fix workspace:*** — erstat med `^1.0.0` version ranges
5. **Byg dist/** — kør `pnpm build` og verificer output
6. **Fix Expo type exports** — tilføj `types` til alle subpath exports
7. **Tilføj env validation** — prestart script der validerer alle required env vars
8. **Tilføj error boundaries** — wrap app i react-error-boundary

### Fase 2: Split repos

1. Opret `langsync-sdk` repo med packages/* indhold
2. Setup changesets for koordineret versionering
3. Setup npm publish CI workflow
4. Opdater web app til at bruge published npm packages i stedet for workspace refs

### Fase 3: Production hardening

1. Tilføj Sentry monitoring
2. Pin dependencies til eksakte versioner
3. Setup Redis-backed rate limiting
4. Tilføj cache headers
5. Konfigurer `deploymentId`, `generateBuildId`, `cacheHandler`
6. Setup pre-commit hooks (husky + lint-staged)
7. Tilføj React Testing Library
