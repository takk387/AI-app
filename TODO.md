# TODO — AI App Builder

Tracked items that need to come back to. Check items off as they're completed.

---

## Active Bugs (Round 3)

- [x] **Issue 9 — API timeout on code generation** (CRITICAL) ✅ VERIFIED 2026-03-16
  - Client 45s chunk timeout kills stream during Claude's extended thinking phase
  - Fix: server-side heartbeat + increase client timeout to 120s
  - Verified: 89s stream completed successfully (would have died at 45s before fix)

- [x] **Issue 10 — "Missing backend dependencies" warning** ✅ VERIFIED 2026-03-16
  - Phase naming mismatch: "Database Schema Setup" vs "Database Schema"
  - Fix: one-line rename in `architectureToPhaseContext.ts`
  - Verified: "Database Schema Setup" no longer appears in Railway logs

- [x] **Issue 11 — Sandpack preview not filling container** ✅ VERIFIED 2026-03-16
  - `max-w-[1800px]` cap + missing CSS propagation rules for Builder preview
  - Fix: remove max-width, add `.builder-sandpack-preview` CSS class
  - Verified: Preview fills entire right panel in Builder

---

## Active Bugs (Round 4)

- [ ] **Issue 12 — Phase plan includes irrelevant phases for simple apps** (HIGH)
  - ClickCount counter gets "Authentication System" as Phase 2
  - `featureClassifier.ts:getImplicitFeatures()` blindly trusts `tech.needsAuth`
  - Fix: require evidence of multi-user features before adding implicit auth
  - See `docs/rebuild/BUGFIX_ROUND4.md`

- [ ] **Issue 13 — "No response from AI" hides real Claude response** (MEDIUM)
  - Claude responds with text but no `===FILE:===` markers → parser says "no response"
  - Each retry wastes ~3 minutes
  - Fix: include Claude's actual response snippet in the error message
  - See `docs/rebuild/BUGFIX_ROUND4.md`

- [ ] **Issue 14 — Dead PLAN/ACT mode code breaks chat history** (CRITICAL)
  - Rebuild blueprint said to remove PLAN/ACT toggle — never done (79 refs, 18 files)
  - Consecutive same-role messages violate Anthropic API alternation requirement
  - Phase execution sends no `conversationHistory` to Claude
  - Fix: remove dead PLAN branches, add `sanitizeMessagesForAPI()`, fix phase execution
  - See `docs/rebuild/BUGFIX_ROUND4.md`

---

## Upcoming — Nodebox Runtime Migration

- [ ] **Switch Sandpack preview from browser bundler to Nodebox runtime**
  - Currently using `template="react-ts"` (client-side only)
  - Need to evaluate `template="nextjs"` for full-stack preview (SSR, API routes, server actions)
  - Nodebox is already installed as transitive dep via `@codesandbox/sandpack-client`
  - **Blockers before migration:**
    - Code generation pipeline produces flat React files (`App.tsx`, `index.tsx`)
    - Need to update Titan Pipeline to generate Next.js file conventions (`app/page.tsx`, `app/layout.tsx`)
    - `toSandpackFiles()` path mapping needs updating for Next.js structure
    - Phase 1 layout injection output format needs to match Next.js conventions
    - System prompts in `src/prompts/` reference React SPA structure — need Next.js equivalents
  - **Benefits:**
    - Server-side rendering in preview
    - API routes work in preview (Express/Next.js endpoints)
    - Full Node.js stdlib available
    - Database connections via Supabase client work natively
    - Shell output capture via `useSandpackShellStdout()`
  - **Limitations:**
    - No native C++ modules
    - No raw socket support
    - Slightly higher memory usage

- [ ] **Add shell output panel to Builder**
  - Once Nodebox is active, capture stdout/stderr with `useSandpackShellStdout()`
  - Display console output in a collapsible panel below the preview

---

## Deferred Features

- [ ] **Wire up useCodeReview hook**
  - File exists (`src/hooks/useCodeReview.ts`) but was intentionally left unwired during rebuild
  - Useful code review feature — wire into phase completion flow after core is stable
  - Ref: `BUILDER_PAGE_REDESIGN_BLUEPRINT.md` (hook disposition table), `SESSION_0.md`

---

## Technical Debt

- [ ] **Prompt size optimization for Builder**
  - `full-app-stream` assembles ~3,835 lines of system prompt from 16 files
  - Contributes to slow time-to-first-token
  - Evaluate which prompt rules can be consolidated or trimmed

- [ ] **Phase dependency ordering**
  - `resolveBackendDependencies()` matching is brittle (exact string match on phase names)
  - Consider using phase IDs or domain tags instead of display names

---

_Last updated: 2026-03-16_
