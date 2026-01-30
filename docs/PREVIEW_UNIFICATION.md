# Unified Workspace & Shell Generation Plan

> Convert layout builder output into actual React code files (the "shell") that the AI builder extends, instead of the current lossy LayoutManifest conversion pipeline.

## Problem

The current pipeline: `DetectedComponentEnhanced[] → LayoutManifest (lossy) → DynamicPhaseGenerator (re-describes layout as text) → Claude regenerates from text descriptions`. This loses animations, keyframes, visual effects, gradients, glassmorphism, and exact CSS values. The AI builder then regenerates layout from scratch based on text descriptions of what was already visually designed.

## Solution

Generate actual React `.tsx` files from the layout data BEFORE entering the build phase. These "shell files" become the starting codebase that the AI builder extends with logic, API integrations, and interactivity — rather than regenerating layout from scratch.

## Architecture (Claude-Gemini Consensus)

```
Design Page (layout builder)
    ↓ User clicks "Continue to Build"
    ↓ ShellGeneratorService converts DetectedComponentEnhanced[] → file map
    ↓ Store: generatedShellFiles = { "App.tsx": "...", "components/Hero.tsx": "...", ... }
    ↓
Build Page (AI builder)
    ↓ Reads generatedShellFiles from store
    ↓ Sets as initial currentComponent.code (JSON with files array)
    ↓ DynamicPhaseGenerator sees hasShell=true → skips Setup scaffold + Design System phase
    ↓ Remaining phases ADD to shell files (auth, API routes, state, etc.)
```

---

## Phase 1: ShellGeneratorService (NEW)

### 1.1 Create `src/services/ShellGeneratorService.ts`

**Purpose:** Convert `DetectedComponentEnhanced[]` + `DesignSpec` into a `Record<string, string>` file map of real React code.

**Input:**

- `components: DetectedComponentEnhanced[]` (from layout builder)
- `designSpec: DesignSpec | null` (from Stage 1 analysis)
- `appName: string` (from AppConcept)

**Output:**

```typescript
interface ShellGenerationResult {
  success: boolean;
  files: Record<string, string>; // path → content
  dependencies: Record<string, string>; // package → version
  warnings: string[];
}
```

**File map structure:**

```
App.tsx                    — Root layout with section imports
components/Header.tsx      — Per top-level component
components/Hero.tsx
components/Features.tsx
components/Footer.tsx
styles/globals.css         — CSS variables, @keyframes, design tokens
styles/animations.css      — All animation keyframes (from KeyframeInjector logic)
tailwind.config.ts         — Extended theme with design spec colors/fonts
```

**Key implementation details:**

1. **Component → File mapping:** Each top-level `DetectedComponentEnhanced` (no parentId or parentId is root) becomes its own `.tsx` file. Children are rendered inline within the parent file.

2. **Style conversion:** Reuse `stylesToTailwind()` from `layoutConverter.ts` but ALSO preserve:
   - `animation` shorthand → inline style
   - `animationKeyframes` → extracted to `styles/animations.css`
   - `backgroundImage` (gradients) → inline style
   - `backdropFilter` (glassmorphism) → inline style
   - `boxShadow` → inline style
   - `transition` → inline style or Tailwind class

3. **CSS variables generation:** From `DesignSpec.colorPalette` → CSS custom properties in `globals.css`:

   ```css
   :root {
     --color-primary: #hex;
     --color-secondary: #hex;
     /* ... all palette colors */
   }
   ```

4. **@keyframes extraction:** Reuse the logic from `KeyframeInjector.tsx` (`buildKeyframeRule()`, `extractAnimationName()`) but output to a static CSS file instead of runtime `<style>` tag.

5. **Visual effects:**
   - `css-animation` effects → keyframes in `animations.css`
   - `particle-system` effects → import `CSSParticleEffect` component, copy utility to shell output
   - Canvas effects → skip (not yet supported)

6. **Image handling:**
   - `content.imageUrl` → `<img src={url} />`
   - `content.imageDescription` → placeholder `<div>` with aria-label
   - `content.hasImage` without description → gradient placeholder

7. **Tailwind config:** Extend theme with design spec colors, fonts, border-radius, spacing.

**Files to create:**

- `src/services/ShellGeneratorService.ts` (~400-500 lines)

**Files to reference (import logic from):**

- `src/utils/layoutConverter.ts` — `stylesToTailwind()` logic
- `src/components/layout-builder/KeyframeInjector.tsx` — `buildKeyframeRule()`, `extractAnimationName()`, `camelToKebab()`
- `src/components/effects/CSSParticleEffect.tsx` — particle CSS generation logic
- `src/types/designSpec.ts` — DesignSpec type
- `src/types/layoutDesign.ts` — DetectedComponentEnhanced type

---

## Phase 2: Store Integration

### 2.1 Add shell state to `useAppStore.ts`

**File:** `src/store/useAppStore.ts`

**Add to DataSlice interface** (after line 207):

```typescript
// Shell Generation (design → build bridge)
generatedShellFiles: Record<string, string> | null;
shellDependencies: Record<string, string> | null;
```

**Add actions to DataSlice** (after line 236):

```typescript
setGeneratedShellFiles: (files: Record<string, string> | null) => void;
setShellDependencies: (deps: Record<string, string> | null) => void;
```

**Add to persist partialize** (line 604-614):

```typescript
generatedShellFiles: state.generatedShellFiles,
shellDependencies: state.shellDependencies,
```

**Bump store version** from `2` to `3` (line 590) and add migration:

```typescript
if (version === 2) {
  return {
    ...state,
    generatedShellFiles: state.generatedShellFiles ?? null,
    shellDependencies: state.shellDependencies ?? null,
  };
}
```

**Add selector** (after line 712):

```typescript
export const useShellState = () =>
  useAppStore(
    useShallow((state) => ({
      generatedShellFiles: state.generatedShellFiles,
      shellDependencies: state.shellDependencies,
    }))
  );
```

---

## Phase 3: Design Page Integration

### 3.1 Modify `design/page.tsx` — Shell generation on "Continue to Build"

**File:** `src/app/(protected)/app/design/page.tsx`

**Current behavior** (line 15-18): Just navigates to `/app/build`.

**New behavior:**

1. Read `components` and `designSpec` from the layout builder store
2. Call `ShellGeneratorService.generate()`
3. Store result in `generatedShellFiles` and `shellDependencies`
4. Update `appConcept` with `hasShell: true` flag
5. Navigate to `/app/build`
6. Show loading state during generation

**Pseudocode:**

```typescript
const handleContinueToBuild = useCallback(async () => {
  setIsGeneratingShell(true);
  try {
    // Get layout data from store
    const components = useAppStore.getState().layoutComponents;
    const designSpec = useAppStore.getState().currentDesignSpec;
    const appName = appConcept?.name || 'My App';

    // Generate shell files
    const service = new ShellGeneratorService();
    const result = service.generate(components, designSpec, appName);

    if (result.success) {
      // Store shell files
      setGeneratedShellFiles(result.files);
      setShellDependencies(result.dependencies);

      // Update concept with shell flag
      updateAppConceptField('hasShell', true);
    }

    router.push('/app/build');
  } finally {
    setIsGeneratingShell(false);
  }
}, [router, appConcept, ...]);
```

**Need to determine:** How to access the raw `DetectedComponentEnhanced[]` from the layout builder. Currently the store has `currentLayoutManifest` (already converted) but we need the pre-conversion components. Two options:

- **Option A:** Also persist `DetectedComponentEnhanced[]` to the store (preferred — they're already in `useLayoutBuilder` hook state)
- **Option B:** Back-convert from LayoutManifest (lossy, defeats the purpose)

**Decision: Option A.** The `useLayoutBuilder` hook already calls `saveToWizard()` which converts to LayoutManifest. We need to ALSO save the raw components to the store. This requires:

### 3.2 Persist raw components to store

**File:** `src/store/useAppStore.ts`

**Add to DataSlice:**

```typescript
// Raw layout components (pre-conversion, for shell generation)
layoutComponents: DetectedComponentEnhanced[] | null;
setLayoutComponents: (components: DetectedComponentEnhanced[] | null) => void;
```

**Add to persist partialize.**

**File:** `src/hooks/useLayoutBuilder.ts` — `saveToWizard()` method

Currently saves LayoutManifest to store. Add: also save raw `components` array to `setLayoutComponents()`.

---

## Phase 4: DynamicPhaseGenerator — Shell Awareness

### 4.1 Add `hasShell` flag to phase generation

**File:** `src/services/DynamicPhaseGenerator.ts`

**Modify `generatePhasePlan()`** (line 298):

When `concept.hasShell === true`:

1. **Skip "Project Setup" scaffold features** (line 1363-1414): The shell already provides folder structure, base styling, core layout components. Replace with a lighter "Shell Integration" setup phase that:
   - Sets up routing around existing shell components
   - Installs dependencies (from `shellDependencies`)
   - Does NOT regenerate layout, styling, or design tokens

2. **Skip "Design System Setup" phase entirely** (line 1117-1119): The shell already has `globals.css` with CSS variables, `tailwind.config.ts` with theme, and all design tokens baked in.

3. **Add shell context to remaining phases:** Each phase's `conceptContext` should include a `shellFiles` field listing the files already generated, so the AI knows what exists and can import from them.

**Implementation:**

```typescript
// In generatePhasePlan:
if (concept.hasShell) {
  // Phase 1: Shell Integration (lighter than full setup)
  phases.push(this.createShellIntegrationPhase(phaseNumber++, concept));
  // Skip createDesignSystemPhase entirely
} else {
  phases.push(this.createSetupPhase(phaseNumber++, concept));
  if (concept.layoutManifest) {
    phases.push(this.createDesignSystemPhase(phaseNumber++, concept, concept.layoutManifest));
  }
}
```

**New method: `createShellIntegrationPhase()`**

- Phase name: "Shell Integration"
- Features: routing setup, dependency installation, shell file verification
- Does NOT include: layout generation, design tokens, base styling, typography
- `conceptContext` includes list of shell file paths

### 4.2 Update AppConcept type

**File:** `src/types/appConcept.ts`

Add optional field:

```typescript
interface AppConcept {
  // ... existing fields
  hasShell?: boolean; // True when shell files were generated from layout builder
}
```

---

## Phase 5: Build Page — Shell File Injection

### 5.1 Inject shell files as initial code

**File:** `src/app/(protected)/app/build/page.tsx`

**Current flow** (lines 34-39): When `dynamicPhasePlan` exists but `dynamicBuildPhases.plan` doesn't, initialize the plan.

**New flow:** Additionally, when `generatedShellFiles` exist:

1. Convert shell file map to the `currentComponent.code` JSON format:
   ```typescript
   const codeJson = JSON.stringify({
     files: Object.entries(shellFiles).map(([path, content]) => ({ path, content })),
     dependencies: shellDependencies || {},
     name: appConcept?.name || 'My App',
     description: appConcept?.description || '',
   });
   ```
2. Set this as `currentComponent.code` in the store so BrowserPreview can render it immediately
3. Set `accumulatedCode` in the build phases hook so subsequent phases know what files exist

**Key insight from codebase exploration:** The preview chain is:

```
currentComponent.code (JSON string)
  → FullAppPreview → JSON.parse → { files: [...] }
    → BrowserPreview → esbuild-wasm → rendered preview
```

So shell files need to be formatted as: `{ files: [{ path, content }], dependencies: {...} }` JSON string.

### 5.2 Modify PhaseExecutionManager context

**File:** `src/services/PhaseExecutionManager.ts`

When building execution context for phases, include shell file list so Claude knows what already exists:

- `getExecutionContext()` should include `existingShellFiles: string[]` (file paths)
- The execution prompt should say: "The following files already exist from the design shell: [list]. Import from and extend these files rather than creating new layout components."

---

## Phase 6: Types & Validation

### 6.1 Shell generation types

**File:** `src/types/shellGeneration.ts` (NEW)

```typescript
export interface ShellGenerationResult {
  success: boolean;
  files: Record<string, string>;
  dependencies: Record<string, string>;
  warnings: string[];
  metadata: {
    componentCount: number;
    hasAnimations: boolean;
    hasParticleEffects: boolean;
    hasGlassmorphism: boolean;
    designTokenCount: number;
  };
}

export interface ShellGenerationConfig {
  /** Include visual effects in shell (default: true) */
  includeEffects: boolean;
  /** Include animations CSS (default: true) */
  includeAnimations: boolean;
  /** Generate Tailwind config (default: true) */
  generateTailwindConfig: boolean;
  /** CSS variable prefix (default: '--color') */
  cssVariablePrefix: string;
}
```

---

## Files Modified (Summary)

| File                                      | Change                                                                                                   | Lines    |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------- |
| `src/services/ShellGeneratorService.ts`   | **NEW** — Core shell generation logic                                                                    | ~400-500 |
| `src/types/shellGeneration.ts`            | **NEW** — Shell generation types                                                                         | ~40      |
| `src/store/useAppStore.ts`                | Add `generatedShellFiles`, `shellDependencies`, `layoutComponents` state + actions + persist + migration | ~30      |
| `src/app/(protected)/app/design/page.tsx` | Call ShellGeneratorService on "Continue to Build", show loading state                                    | ~40      |
| `src/app/(protected)/app/build/page.tsx`  | Inject shell files as initial `currentComponent.code`                                                    | ~25      |
| `src/services/DynamicPhaseGenerator.ts`   | `hasShell` check, `createShellIntegrationPhase()`, skip design system phase                              | ~60      |
| `src/services/PhaseExecutionManager.ts`   | Include shell file list in execution context                                                             | ~15      |
| `src/types/appConcept.ts`                 | Add `hasShell?: boolean` field                                                                           | ~2       |
| `src/hooks/useLayoutBuilder.ts`           | Save raw components to store in `saveToWizard()`                                                         | ~5       |

**Total new code:** ~620 lines (1 new service, 1 new type file, 7 modified files)

---

## Implementation Order

```
1. Types first       → shellGeneration.ts, appConcept.ts update
2. Store second      → useAppStore.ts (state, actions, persist, migration)
3. Service third     → ShellGeneratorService.ts (core logic)
4. Hook fourth       → useLayoutBuilder.ts (save raw components)
5. Phase gen fifth   → DynamicPhaseGenerator.ts (hasShell awareness)
6. Pages sixth       → design/page.tsx (trigger), build/page.tsx (inject)
7. Execution seventh → PhaseExecutionManager.ts (shell context)
```

---

## Critical Design Decisions

1. **Pure computation, no AI calls:** ShellGeneratorService is a deterministic code generator, not an AI call. It maps component data → React code using templates. This is fast and predictable.

2. **One-way flow:** Design → Build only. No back-sync from build to design. Once shell is generated, the layout builder's job is done.

3. **Shell files are extensible, not locked:** The AI builder can modify shell files during build phases. They're a starting point, not a read-only constraint.

4. **Animations as CSS files, not runtime injection:** Shell moves `@keyframes` from runtime `<style>` tags (KeyframeInjector) to static CSS files. This is more portable and doesn't require the layout builder's runtime components.

5. **Particle effects as utility copy:** For components with particle effects, the shell includes a standalone `CSSParticleEffect` utility (adapted from the layout builder's version) rather than importing from the layout builder package.

6. **Store version bump:** v2 → v3 migration is backward-compatible (new fields default to `null`).

---

## Verification

### After Phase 1-2 (Types + Store):

- `npm run typecheck` passes
- Store version migration works (clear localStorage, verify no errors)

### After Phase 3 (ShellGeneratorService):

- Unit test: Feed sample `DetectedComponentEnhanced[]` array → verify output file map
- Verify `App.tsx` imports all section components
- Verify `globals.css` has correct CSS variables from DesignSpec
- Verify `animations.css` has @keyframes from component `animationKeyframes`
- Verify Tailwind config extends theme correctly

### After Phase 4-5 (Hook + PhaseGenerator):

- `npm run typecheck` passes
- With `hasShell: true`, verify phase plan skips "Design System Setup"
- Verify "Shell Integration" phase is lighter than "Project Setup"

### After Phase 6-7 (Pages + Execution):

- Full E2E: Upload image → layout builder analyzes → design page → click "Continue to Build" → verify shell files appear in preview → verify build phases skip layout generation
- Verify BrowserPreview renders the shell files correctly via esbuild-wasm
- `npm run build` succeeds (production build)
- `npm run lint` passes
- `npm test` — all existing tests pass

### Manual Fidelity Check:

- Compare layout builder canvas rendering vs. shell file preview rendering
- Animations should play in both
- Colors should match exactly
- Typography should match
- Gradient backgrounds should be preserved
