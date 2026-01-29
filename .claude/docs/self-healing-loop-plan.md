# Layout Builder Self-Healing Architecture Implementation Plan

**Status:** Claude-Gemini Consensus Reached
**Last Updated:** 2026-01-28

---

## Important Callouts

> **Puppeteer Requirement:** This plan uses Puppeteer for server-side screenshots. Ensure the deployment environment supports headless browsers.

> **Breaking API Change:** `GeminiLayoutService.analyzeImageTwoStage()` will return `{ components, designSpec, errors }` instead of just `components[]`. All call sites must be updated.

> **Bug Found:** `src/app/api/layout/analyze/route.ts` incorrectly calls `req.json()` multiple times. This will be fixed in Phase 2.

---

## Overview

This plan addresses two interconnected goals:
1. **Fix foundational bugs** that cause layouts to fail silently or lose design data
2. **Implement self-healing vision loop** for automated layout refinement

The self-healing loop depends on the foundation being solid—we fix upstream issues first, then add the feedback loop.

---

## Phase 1: Fix DesignSpec Propagation (Foundation)

**Problem:** DesignSpec is extracted in Stage 1 but discarded after Stage 2. Components have individual styles but the cohesive design system is lost.

### 1.1 Update API Response Structure

**File:** `src/services/GeminiLayoutService.ts`

Change `analyzeImageTwoStage()` to return both components AND designSpec:

```typescript
// Current: returns DetectedComponentEnhanced[]
// Fixed: returns { components: DetectedComponentEnhanced[], designSpec: DesignSpec }
```

**File:** `src/app/api/layout/analyze/route.ts`

Update response to include designSpec in the JSON response.

### 1.2 Store DesignSpec in App State

**File:** `src/store/useAppStore.ts`

Add to layout slice:
- `currentDesignSpec: DesignSpec | null`
- `setDesignSpec(spec: DesignSpec): void`

### 1.3 Pass DesignSpec to Export

**File:** `src/utils/layoutConverter.ts`

Update `convertToLayoutManifest()` signature to accept designSpec parameter. Replace hardcoded empty `colors: {}` with extracted palette.

---

## Phase 2: Fix Silent Failures (Foundation)

**Problem:** JSON parse failures return empty arrays `[]` instead of surfacing errors.

### 2.1 Create Structured Result Type

**File:** `src/types/layoutAnalysis.ts` (new)

```typescript
interface LayoutAnalysisResult {
  success: boolean;
  components: DetectedComponentEnhanced[];
  designSpec: DesignSpec | null;
  errors: string[];
  warnings: string[];
  metadata: {
    componentCount: number;
    parseAttempts: number;
    recoveredComponents: number;
  };
}
```

### 2.2 Update GeminiLayoutService Error Handling

**File:** `src/services/GeminiLayoutService.ts`

Replace all `return []` catch blocks with:
1. Attempt JSON recovery (strip markdown fences, extract array)
2. Call `sanitizeComponents()` for partial recovery
3. Return structured result with errors array

### 2.3 Fix req.json() Bug (Gemini Found)

**File:** `src/app/api/layout/analyze/route.ts`

Fix bug where `req.json()` is called multiple times. Parse once at the start, destructure all parameters from that single parse.

### 2.4 Surface Errors to UI

**File:** `src/components/layout-builder/LayoutCanvas.tsx`

Display toast/alert when `result.errors.length > 0` so user knows what failed.

---

## Phase 3: Fix Color Fallback Logic (Foundation)

**Problem:** White/transparent colors are auto-replaced with gray, losing design intent.

### 3.1 Context-Aware Color Handling

**File:** `src/utils/colorUtils.ts`

Update `getVisibleFallback()` to accept DesignSpec context:
- If component background is white AND page background is dark → keep white (it's intentional contrast)
- If component background is transparent AND it's an overlay type → keep transparent
- Only fallback when color is truly missing (`undefined`), not when it's a valid light color

### 3.2 Remove Aggressive Fallbacks from Renderer

**File:** `src/components/layout-builder/GenericComponentRenderer.tsx`

- Remove automatic `getVisibleFallback()` call
- Only apply fallback when `backgroundColor === undefined`
- Add debug outline in dev mode instead of changing colors

---

## Phase 4: Implement Self-Healing Vision Loop

**Architecture:** Generate → Render → Capture → Critique → Heal → Verify (repeat until >95% or max 3 iterations)

### 4.1 Screenshot Capture API Route

**File:** `src/app/api/layout/screenshot/route.ts` (new)

Server-side Puppeteer screenshot capture:
- Receives: rendered HTML/CSS string or URL to capture
- Returns: base64 PNG
- Handles blur effects, gradients, and custom fonts correctly

```typescript
// POST /api/layout/screenshot
interface ScreenshotRequest {
  html: string;        // Rendered HTML to screenshot
  css?: string;        // Optional CSS to inject
  viewport?: { width: number; height: number };
}

interface ScreenshotResponse {
  success: boolean;
  image: string;       // base64 PNG
  error?: string;
}
```

**Fallback:** If Puppeteer unavailable, fall back to client-side `html2canvas` with blur/gradient config.

### 4.2 Enhanced Critique Function

**File:** `src/services/GeminiLayoutService.ts`

Update `critiqueLayout()` to return structured corrections:

```typescript
interface LayoutCritique {
  fidelityScore: number; // 0-100
  overallAssessment: string;
  discrepancies: Array<{
    componentId: string;
    issue: 'color_drift' | 'spacing_error' | 'typography_mismatch' | 'position_offset' | 'missing_element';
    severity: 'minor' | 'moderate' | 'critical';
    expected: string;
    actual: string;
    correctionJSON: Partial<DetectedComponentEnhanced>;
  }>;
}
```

### 4.3 Auto-Fix Engine

**File:** `src/services/AutoFixEngine.ts` (new)

```typescript
interface AutoFixEngine {
  applyCritique(
    components: DetectedComponentEnhanced[],
    critique: LayoutCritique
  ): DetectedComponentEnhanced[];

  validateFix(
    original: DetectedComponentEnhanced,
    fixed: DetectedComponentEnhanced
  ): boolean;
}
```

Key behaviors:
- Apply only the specific properties from `correctionJSON`
- Skip fixes that would break component bounds
- Log all changes for audit trail

### 4.4 Vision Loop Engine (Orchestrator)

**File:** `src/services/VisionLoopEngine.ts` (new)

```typescript
interface SelfHealingConfig {
  maxIterations: number;        // default: 3
  targetFidelity: number;       // default: 95
  minImprovementThreshold: number; // default: 2 (stop if <2% improvement)
}

interface SelfHealingResult {
  finalComponents: DetectedComponentEnhanced[];
  iterations: number;
  finalFidelityScore: number;
  history: Array<{
    iteration: number;
    fidelityScore: number;
    changesApplied: number;
  }>;
}

async function runSelfHealingLoop(
  originalImage: string,
  initialComponents: DetectedComponentEnhanced[],
  designSpec: DesignSpec,
  canvasRef: HTMLElement,
  config: SelfHealingConfig
): Promise<SelfHealingResult>
```

### 4.5 Version Control Integration

**File:** `src/hooks/useVersionControl.ts`

Before each healing iteration:
- Save current state as a version
- Label it: "Pre-healing iteration {n}"

After healing completes:
- Save final state
- Label it: "Post-healing (score: {fidelity}%)"

User can revert to any point if AI over-corrects.

### 4.6 UI Integration

**File:** `src/components/layout-builder/LayoutCanvas.tsx`

Add healing controls:
- "Auto-Refine" button to trigger self-healing loop
- Progress indicator showing current iteration and fidelity score
- Option to stop loop early
- Display before/after comparison

---

## Phase 5: API Route Updates

### 5.1 Update Analyze Route

**File:** `src/app/api/layout/analyze/route.ts`

Changes:
1. Fix `req.json()` multiple-call bug (parse once at start)
2. Update response structure to return `{ components, designSpec, errors }`
3. Add new action: `'self-heal'`
   - Accepts: originalImage, currentSnapshot, components, designSpec
   - Returns: LayoutCritique with corrections

### 5.2 Screenshot API (covered in 4.1)

See Phase 4.1 for `src/app/api/layout/screenshot/route.ts` implementation details.

---

## File Change Summary

| File | Action | Lines (Est.) |
|------|--------|--------------|
| `src/services/GeminiLayoutService.ts` | Modify | ~100 |
| `src/services/AutoFixEngine.ts` | Create | ~120 |
| `src/services/VisionLoopEngine.ts` | Create | ~150 |
| `src/types/layoutAnalysis.ts` | Create | ~50 |
| `src/utils/colorUtils.ts` | Modify | ~30 |
| `src/utils/layoutConverter.ts` | Modify | ~40 |
| `src/store/useAppStore.ts` | Modify | ~20 |
| `src/components/layout-builder/GenericComponentRenderer.tsx` | Modify | ~30 |
| `src/components/layout-builder/LayoutCanvas.tsx` | Modify | ~60 |
| `src/app/api/layout/analyze/route.ts` | Modify | ~60 |
| `src/app/api/layout/screenshot/route.ts` | Create | ~100 |

**Total estimated changes:** ~760 lines across 11 files

---

## Implementation Order

```
Phase 1 (DesignSpec) ──┐
                       ├──► Phase 4 (Self-Healing Loop)
Phase 2 (Errors) ──────┤
                       │
Phase 3 (Colors) ──────┘

Phase 5 (API Routes) ← Parallel with Phase 4
```

**Phases 1-3 are prerequisites** for Phase 4. The self-healing loop needs:
- DesignSpec available (Phase 1)
- Proper error handling (Phase 2)
- Accurate color rendering (Phase 3)

---

## Verification Plan

### After Phase 1-3 (Foundation)
- [ ] Upload image → verify designSpec appears in Redux devtools
- [ ] Force JSON parse error → verify error toast appears (not silent)
- [ ] Upload white-on-dark design → verify white stays white

### After Phase 4-5 (Self-Healing)
- [ ] Upload complex design → run self-healing → verify score improves
- [ ] Check version history shows pre/post healing states
- [ ] Stop loop early → verify partial progress saved
- [ ] Compare screenshot capture vs original → ensure blur/gradients captured

### End-to-End Test
- [ ] Upload reference image with glassmorphism + gradients
- [ ] Generate initial layout
- [ ] Run self-healing loop (expect 2-3 iterations)
- [ ] Final fidelity score >90%
- [ ] Export → generated code includes design tokens from DesignSpec

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| html2canvas fails on blur effects | Primary: server-side Puppeteer. Fallback config for html2canvas |
| Loop never reaches 95% | Max 3 iterations + diminishing returns detection |
| AI over-corrects, breaks layout | Version control saves before each iteration |
| Screenshot API adds latency | Make healing optional, show progress indicator |
| DesignSpec storage increases state size | DesignSpec is ~2KB, negligible impact |

---

## Dependencies

**New packages needed:**
- `puppeteer` or `playwright` (for server-side screenshots)
- Optionally: `html2canvas` (already may be installed, check package.json)

**No breaking changes to existing APIs** - all additions are backward-compatible.
