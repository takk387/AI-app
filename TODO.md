# TODO — AI App Builder

_Last updated: 2026-04-09_

---

## Completed (Apr 9, 2026)

- ✅ Langfuse + Sentry observability (LLM tracing, error tracking, 10 AI routes instrumented)
- ✅ WebContainers migration (replaced Sandpack with real Node.js runtime in browser)
  - Real `npm install`, real dev server, real terminal output
  - 3 preview tiers: Instant (esbuild) / Full (WebContainer) / Deploy (Railway)
  - Safari fallback to esbuild with detection
  - Shell output panel built into WebContainerPreview (stdout/stderr from npm + dev server)
- ✅ Railway deploy fix (Builder changed from Dockerfile to Railpack)
- ✅ Improved error messaging — user-friendly messages with actionable hints for all AI generation errors

## Completed (Mar 30, 2026)

- ✅ 8 builder pipeline bugs fixed
- ✅ 28 orphaned files removed (-9,248 lines)
- ✅ 290 → 11 lint warnings (96% reduction)
- ✅ 8 monolithic files refactored into 54 modules
- ✅ 14 dependency upgrades (TypeScript 6, Zustand 5, ESLint 9, Next.js 16, Tailwind 4, + 9 others)
- ✅ Prompt size optimization (~2,000 tokens saved per request)
- ✅ Phase dependency ordering (3-tier fallback resolution)
- ✅ useCodeReview hook wired into phase completion lifecycle

---

## Remaining

### Data Persistence (User-Facing)

- [ ] **Persist chat messages to localStorage** — conversation history lost on page refresh during builds
- [ ] **IndexedDB for undo/redo history** — version snapshots stored in browser memory, lost on refresh, and can cause memory bloat on long editing sessions

### Data Persistence (Server-Side — needed for multi-instance / resilience)

- [ ] **Redis for planningSessionStore** — in-memory Map loses all active Dual AI planning sessions on deploy. Migration path documented in `src/lib/planningSessionStore.ts`
- [ ] **Redis for ContextCache** — code analysis + dependency graphs re-computed from scratch after every deploy. Migration path documented in `src/services/ContextCache.ts`
- [ ] **Persist deployment tracking to Supabase** — `railway_projects` table exists but active deployment status is in-memory only, lost on restart

### UI

- [ ] **LayoutDesignSection component** — show layout design summary in concept panel when `appConcept.layoutDesign` present. Plan in `.claude/plans/layout-design-section.md`

### Pipeline

- [ ] **Self-Healing Loop Phases 1-2** — fix DesignSpec propagation + silent failures in layout analysis. Plan in `.claude/docs/self-healing-loop-plan.md`
- [ ] **Full-stack prompt iteration** — test and refine Next.js App Router output from FULL_STACK prompts with real WebContainers preview
