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

No outstanding items. All TODO items complete.
