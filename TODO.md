# TODO — AI App Builder

_Last updated: 2026-03-30_

Items ordered easiest → hardest within each section.

---

## Quick Wins

- [ ] Remove `intersection-observer` polyfill (Baseline since 2019, just uninstall)
- [ ] Update `@typescript-eslint/*` 8.0 → 8.57 (safe minor bump)
- [ ] Update `@types/node` 20 → 25, `@types/uuid` 10 → 11 (type-only)
- [ ] Wire up `useCodeReview` hook (file exists at `src/hooks/useCodeReview.ts`, unwired during rebuild)

---

## Bugs

- [ ] **Claude "no response" hides real output** (MEDIUM)
  - Claude responds with text but no `===FILE:===` markers → parser says "no response"
  - Each retry wastes ~3 minutes
  - Fix: include Claude's actual response snippet in the error message

- [ ] **Auto-advance after Phase 1 layout injection not firing** (MEDIUM)
  - `completePhase` → `startPhase(nextPhaseNumber)` chain fires but the auto-execute effect in `usePhaseExecution` doesn't pick it up
  - User has to manually click "Start" for Phase 2

- [ ] **Builder has no graceful degradation when earlier steps fail** (HIGH)
  - No warning when `layoutBuilderFiles` is null (Design step failed)
  - No warning when `dualArchitectureResult` is null (AI Plan skipped)
  - Builder silently falls back to AI-only generation (slower, times out)
  - Fix: pre-flight check with user-facing warning and option to go back

- [ ] **Dead PLAN/ACT mode code** (MEDIUM)
  - 79 references across 18 files — never fully removed during rebuild
  - Consecutive same-role messages violate Anthropic API alternation requirement
  - Fix: remove dead PLAN branches, full cleanup pass

---

## Dependency Upgrades

### Trivial (do now)

- [ ] `intersection-observer` — uninstall (polyfill no longer needed)
- [ ] `@typescript-eslint/eslint-plugin` 8.0 → 8.57 (safe minor)
- [ ] `@typescript-eslint/parser` 8.0 → 8.57 (safe minor)
- [ ] `@types/node` 20 → 25
- [ ] `@types/uuid` 10 → 11

### Easy (this week)

- [ ] **`@supabase/auth-helpers-nextjs` → `@supabase/ssr`** (DEPRECATED)
  - Package is dead, final version 0.15.0, no more updates
  - Already have `@supabase/ssr` installed
  - Swap: `createMiddlewareClient` → `createServerClient`, `createClientComponentClient` → `createBrowserClient`
  - Guide: https://supabase.com/docs/guides/auth/server-side/migrating-to-ssr-from-auth-helpers

- [ ] **`lucide-react`** 0.562 → 1.7
  - Brand icons removed, `aria-hidden` default, 32% bundle size reduction
  - Guide: https://lucide.dev/guide/react/migration

- [ ] **`stripe`** 20.1 → 21.0
  - `decimal_string` fields → `Stripe.Decimal` type, new API version
  - Low impact (only affects Issuing fields)

- [ ] **`inngest`** 3.48 → 4.1
  - Triggers moved to options object, default mode → cloud (`INNGEST_DEV=1` for local)
  - Guide: https://www.inngest.com/docs/reference/typescript/v4/migrations/v3-to-v4

- [ ] **`lint-staged`** 15 → 16.4
  - Config format may change, check `.lintstagedrc` compatibility

### Medium (next sprint)

- [ ] **`typescript`** 5.2 → 6.0
  - `moduleResolution: classic` removed, ES5 deprecated, `esModuleInterop` always on
  - Has `ts5to6` migration tool, 95% compatibility reported
  - Guide: https://gist.github.com/privatenumber/3d2e80da28f84ee30b77d53e1693378f

- [ ] **`zustand`** 4.5 → 5.0
  - Default exports removed, `create` → `createWithEqualityFn` for custom equality
  - Persist middleware no longer auto-persists initial state
  - Guide: https://zustand.docs.pmnd.rs/reference/migrations/migrating-to-v5

- [ ] **`eslint`** 8.57 → 9+ (DEPRECATED)
  - Migrate `.eslintrc` to flat config (`eslint.config.js`)
  - Has migration tool: https://eslint.org/blog/2024/05/eslint-configuration-migrator/
  - Also update `eslint-config-next` 15 → 16

### Hard (dedicated effort)

- [ ] **`next`** 15.5 → 16.2
  - Async APIs (`params`, `cookies()`, `headers()` return Promises)
  - `proxy.ts` renamed to `proxy.ts`, edge runtime removed
  - Turbopack default (ignores custom webpack config)
  - Caching is opt-in (no more implicit caching)
  - Has codemod: `npx @next/codemod@canary upgrade latest`
  - Guide: https://nextjs.org/docs/app/guides/upgrading/version-16

- [ ] **`tailwindcss`** 3.3 → 4.2
  - No more `tailwind.config.js` (CSS-based config)
  - Utility renames: `rounded-sm` → `rounded-xs`, `rounded` → `rounded-sm`
  - Default border color → `currentColor`, buttons → `cursor: default`
  - Has upgrade tool: https://tailwindcss.com/docs/upgrade-guide
  - Do together with Next.js 16

---

## Tech Debt

- [ ] **Prompt size optimization** (MEDIUM)
  - `full-app-stream` assembles ~3,835 lines of system prompt from 16 files
  - Contributes to slow time-to-first-token
  - Evaluate which prompt rules can be consolidated or trimmed

- [ ] **Phase dependency ordering** (LOW)
  - `resolveBackendDependencies()` uses brittle exact string match on phase names
  - Should use phase IDs or domain tags instead

- [ ] **11 `react-hooks/exhaustive-deps` warnings** (LOW)
  - All intentional (prevent Zustand infinite re-renders)
  - Proper fix: restructure hooks to use stable refs/selectors
  - Not urgent — works correctly as-is

---

## Features

- [ ] **Nodebox Runtime Migration** (LARGE)
  - Switch Sandpack from browser bundler to Nodebox for full-stack preview
  - Enables: SSR, API routes, database connections, Node.js stdlib
  - Blockers:
    - Code generation produces flat React files (`App.tsx`, `index.tsx`)
    - Need Titan Pipeline to generate Next.js conventions (`app/page.tsx`)
    - `toSandpackFiles()` path mapping needs updating
    - System prompts reference React SPA structure
  - Limitations: no native C++ modules, no raw sockets, higher memory

- [ ] **Shell output panel** (depends on Nodebox)
  - Capture stdout/stderr with `useSandpackShellStdout()`
  - Display in collapsible panel below preview
