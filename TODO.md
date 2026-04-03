# TODO — AI App Builder

_Last updated: 2026-03-30_

---

## Completed This Session (Mar 30, 2026)

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

- [ ] **Nodebox Runtime Migration** (LARGE)
  - Switch Sandpack from browser bundler to Nodebox for full-stack preview
  - Enables: SSR, API routes, database connections, Node.js stdlib
  - Blockers: code gen produces flat React files, need Next.js conventions
  - Depends on updating Titan Pipeline output format + system prompts

- [ ] **Shell output panel** (depends on Nodebox)
  - Capture stdout/stderr with `useSandpackShellStdout()`
  - Display in collapsible panel below preview

- [ ] **Switch Railway to full bun installs** (blocked on tree-sitter migration)
  - Currently Railway uses npm for installs (`packageManager` field removed from package.json) because native `tree-sitter` triggers node-gyp ENOENT when installed with bun on Railway
  - Fix: migrate `tree-sitter` → `web-tree-sitter` (WASM-based, no native compilation)
  - Once migrated: re-add `"packageManager": "bun@1.2.0"` to package.json and commit bun.lock
