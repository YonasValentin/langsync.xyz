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

### EKSTRA Issues (fra dybdegående analyse)

| # | Issue | Detalje |
|---|-------|---------|
| 16 | **Stripe checkout → localhost fallback** | `app/api/stripe/checkout/route.ts:79` falder tilbage til `http://localhost:3000` hvis `Origin` header mangler. Sikkerhedsrisiko + broken payment flows. Brug `NEXT_PUBLIC_APP_URL` env var. |
| 17 | **PocketBase admin auth: lazy validation** | `lib/pocketbase-server.ts` — admin credentials valideres først ved første API-kald. App starter "succesfuldt" men crasher på første request. |
| 18 | **Docker kører som root** | Dockerfile mangler `USER nextjs` — kører container som root user. |
| 19 | **PocketBase `:latest` tag** | `docker-compose.yml` bruger `ghcr.io/muchobien/pocketbase:latest` — bør pinnes til specifik version. |
| 20 | **Ingen `.dockerignore`** | Docker context inkluderer `.git`, `node_modules`, `.env.local` osv. |
| 21 | **Ingen CSRF-beskyttelse** | Stoler kun på `SameSite=Lax` cookies — ingen CSRF tokens. |
| 22 | **Stripe webhook mangler idempotency** | Duplikerede webhook events kan forårsage double-charge. Ingen event deduplication. |
| 23 | **N+1 query problem** | `hooks/queries/use-projects.ts` — for 10 projekter laves 21 DB queries. Brug PocketBase `expand`. |
| 24 | **Ingen transaction rollback** | `lib/api/client.ts` `createKey()` — hvis translations fejler, forbliver key uden translations (partial state). |
| 25 | **GPT-4 model + priser hardcoded** | `app/api/ai/translate/route.ts:137` — model `gpt-4-turbo` og pricing er hardcoded. |
| 26 | **`tsconfig.tsbuildinfo` i git** | 1.2MB fil checked ind — bør være i `.gitignore`. |

### Hvad er GODT

- `output: "standalone"` — klar til Docker
- Security headers (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- `strict: true` i TypeScript
- Vitest test setup
- ESLint konfigureret med `--max-warnings 0`
- PocketBase typed client med typesafe collections
- JWT token refresh hvert 6. time (før 7-dages PocketBase expiry)
- API key format validation med sanitization
- Project ownership verification på API routes
- Admin PB client caching med race condition håndtering

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

### EKSTRA Issues (fra dybdegående analyse)

| # | Issue | Detalje |
|---|-------|---------|
| 11 | **`expo/src/storage/cache.js.d.ts`** | Manuel `.d.ts` fil i source — vil skabe konflikter med auto-genererede types. Bør slettes. |
| 12 | **Kun 14% test coverage** | 7 test filer for 49 source filer. Mangler component tests, hook tests, integration tests. |
| 13 | **CI bygger ikke packages** | `ci.yml` kører kun `pnpm build` for web — packages bygges aldrig i CI. |
| 14 | **`pnpm publish` løser `workspace:*`** | pnpm v9+ konverterer automatisk — men kun hvis `pnpm publish` bruges, IKKE `npm publish`. Bør dokumenteres. |
| 15 | **Ingen CHANGELOG filer** | Nødvendigt for npm releases og version tracking. |

### Hvad er GODT

- Alle pakker har korrekte `package.json` felter (name, exports, main, module, types, files, sideEffects, keywords, license, repository)
- Scoped packages (`@langsync/*`) — godt mod typosquatting
- Dual CJS/ESM support via exports map
- TypeScript project references sat korrekt op
- Shared `tsconfig.base.json`
- `pkgroll` som build tool
- Test setup med vitest
- Excellent API design: in-flight request deduplication, exponential backoff retries
- Expo: 3 loading strategies (runtime, bundled, hybrid) — production-grade arkitektur
- Expo: AsyncStorage cache med TTL, timeout protection, version-aware migration
- Expo: Komplet RTL language support
- Custom error hierarchy med korrekt prototype chain
- Code quality score: 8/10

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
