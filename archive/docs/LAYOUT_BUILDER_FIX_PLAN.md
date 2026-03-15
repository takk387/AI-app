# Layout Builder Fidelity Fix: "Trust + Verify" Refactor

## Problem Summary

The layout builder fails to create exact replicas of reference images due to:

1. **AI may not be extracting layout data reliably** - When `layout` is undefined, inference kicks in with defaults
2. **Defensive rendering hiding problems** - `overflow: hidden` masks clipping issues instead of showing them
3. **Limited icon support** - Only ~40 hardcoded icons, unknown falls back to "Info" (despite `iconifyService.ts` existing)
4. **Active states not rendered** - Hover works, but active/focus states are missing
5. **Self-healing loop requires manual trigger** - `VisionLoopEngine.ts` (529 lines) exists and works, but isn't automatic

## Root Cause Analysis (Validated)

**Correction from initial analysis**: The layout inference in `layoutValidation.ts` does NOT override AI data. It only triggers when:

- `component.layout` is undefined/null, OR
- `component.layout.type === 'none'`

The real issue is likely that **the AI prompt isn't extracting layout data reliably**, causing inference to fill gaps with defaults (gap: 16px, align: stretch, etc.).

---

## Implementation Plan

### Phase 1: Improve AI Layout Extraction (HIGH PRIORITY)

**Goal**: Ensure AI consistently extracts layout data so inference isn't needed.

**Finding**: The inference logic at lines 727-830 already respects AI data. It only triggers when `layout` is undefined or `type === 'none'`. The fix is to improve AI extraction, not change validation.

#### 1.1 Enhance AI Prompt for Layout Extraction

**File**: [src/services/GeminiLayoutService.ts](src/services/GeminiLayoutService.ts) (lines 420-426)

**Current prompt** may not emphasize layout extraction strongly enough.

**Changes**:

- Add explicit instruction: "For EVERY container, you MUST specify layout.type, layout.gap, layout.direction"
- Provide examples of expected output for flex row vs flex column vs grid
- Emphasize exact gap values: "Specify gap in pixels (e.g., '24px'), not generic values"

#### 1.2 Verify Layout Data Flows Through

**File**: [src/utils/layoutValidation.ts](src/utils/layoutValidation.ts)

The `sanitizeComponents()` function (lines 330-350) already preserves AI layout data:

```typescript
const layout =
  rawLayout && typeof rawLayout === 'object' && rawLayout.type
    ? {
        type: rawLayout.type as 'flex' | 'grid' | 'none',
        direction: rawLayout.direction,
        gap: rawLayout.gap,
        // ... preserves all AI-provided values
      }
    : undefined;
```

**Action**: Add debug logging to verify AI is returning layout data. If not, the prompt needs strengthening.

#### 1.3 Properties AI Should Extract

Ensure these are consistently extracted:

- `layout.type` (flex, grid, none)
- `layout.direction` (row, column)
- `layout.gap` (exact value like "24px")
- `layout.justify` (start, center, space-between, space-evenly)
- `layout.align` (start, center, stretch, baseline)
- `layout.wrap` (wrap, nowrap)

---

### Phase 2: Fix Overflow & Visibility (MEDIUM PRIORITY)

**Goal**: Show problems instead of hiding them.

#### 2.1 Targeted Overflow Changes

**File**: [src/components/layout-builder/GenericComponentRenderer.tsx](src/components/layout-builder/GenericComponentRenderer.tsx)

**Current** (line 224):

```typescript
overflow: isContainer ? 'visible' : 'hidden',
```

**New logic**:

```typescript
overflow: (() => {
  // Explicit AI override wins
  if (style.overflow) return style.overflow;
  // Text-heavy components should not clip
  if (hasTextContent || type.includes('text') || type.includes('heading')) {
    return 'visible';
  }
  // Containers visible, images/media hidden
  return isContainer ? 'visible' : 'hidden';
})(),
```

#### 2.2 Fix Border Rendering Gap

**File**: [src/components/layout-builder/GenericComponentRenderer.tsx](src/components/layout-builder/GenericComponentRenderer.tsx)

**Current** (lines 277-280):

```typescript
border: style.borderWidth
  ? `${style.borderWidth} ${style.borderStyle || 'solid'} ${style.borderColor || 'transparent'}`
  : undefined,
```

**New** (handle borderColor without borderWidth):

```typescript
border: (() => {
  if (style.border) return style.border; // AI provided compound border
  if (style.borderWidth || style.borderColor) {
    return `${style.borderWidth || '1px'} ${style.borderStyle || 'solid'} ${style.borderColor || 'currentColor'}`;
  }
  return undefined;
})(),
```

---

### Phase 3: SVG Icon Synthesis (MEDIUM PRIORITY)

**Goal**: Support ANY icon via raw SVG path extraction - not limited to icon libraries.

**Philosophy**: For exact replicas, the AI should extract the actual SVG path data from the image, not just match to named icons. This follows the "Zero-Preset" principle.

#### 3.1 Update AI Prompt for SVG Path Extraction

**File**: [src/services/GeminiLayoutService.ts](src/services/GeminiLayoutService.ts)

**Add to content schema**:

```typescript
"content": {
  // ... existing fields
  "iconName": "<Lucide name as fallback>",
  "iconSvgPath": "<raw SVG path d attribute - e.g., 'M12 2L2 7l10 5 10-5-10-5z'>",
  "iconViewBox": "0 0 24 24"  // viewBox if different from default
}
```

**Add prompt instruction**:
"When detecting icons, PREFER extracting the actual SVG path data if possible. Provide iconSvgPath with the path's d attribute. Fall back to iconName only for standard icons you recognize."

#### 3.2 Update Type System

**File**: [src/types/layoutDesign.ts](src/types/layoutDesign.ts)

Add `iconSvgPath` and `iconViewBox` to content type.

#### 3.3 Update Renderer to Use Raw SVG

**File**: [src/components/layout-builder/GenericComponentRenderer.tsx](src/components/layout-builder/GenericComponentRenderer.tsx)

```typescript
const renderIcon = () => {
  // PREFER raw SVG path if provided (exact replica)
  if (content?.iconSvgPath) {
    return (
      <svg viewBox={content.iconViewBox || "0 0 24 24"} ...>
        <path d={content.iconSvgPath} />
      </svg>
    );
  }
  // Fall back to named icon lookup
  if (content?.iconName) {
    return /* existing getIconPath logic */;
  }
  return null;
};
```

This enables exact icon replication without being limited to any icon library.

---

### Phase 4: Complete Interaction State Support (MEDIUM PRIORITY)

**Goal**: Add missing active/focus states (hover already works).

**Discovery**: Hover interactions ARE being rendered at lines 620-652:

```typescript
if (hover?.backgroundColor) classes.push('hover:bg-[var(--hover-bg)]');
if (hover?.textColor) classes.push('hover:text-[var(--hover-color)]');
```

#### 4.1 Add Active State Rendering

**File**: [src/components/layout-builder/GenericComponentRenderer.tsx](src/components/layout-builder/GenericComponentRenderer.tsx)

**Current**: Only hover states are rendered. Active states are checked but no classes generated.

**Add** (after hover logic, around line 652):

```typescript
const active = component.interactions?.active;
if (active?.backgroundColor) classes.push('active:bg-[var(--active-bg)]');
if (active?.textColor) classes.push('active:text-[var(--active-color)]');
if (active?.transform) classes.push('active:[transform:var(--active-transform)]');
if (active?.scale) classes.push(`active:scale-[${active.scale}]`);

// Add CSS variables to style object
'--active-bg': active?.backgroundColor,
'--active-color': active?.textColor,
'--active-transform': active?.transform,
```

#### 4.2 Add Focus State Rendering (Optional)

Same pattern for focus states if needed for accessibility.

---

### Phase 5: Self-Healing Loop (DEFERRED - Future Enhancement)

**Status**: The self-healing loop IS functional and can be manually triggered. Auto-triggering requires architectural changes.

**Discovery**: The self-healing loop works:

- `VisionLoopEngine.ts` - 529 lines of complete implementation
- `LayoutAutoFixEngine.ts` - Applies corrections
- `useLayoutBuilder.ts` has `runSelfHealingLoop()` method (line 372+)

**Why auto-trigger is deferred**:
The `runSelfHealingLoop` function requires:

1. `originalImage: string` - The base64 original image
2. `renderToHtml: () => string` - A function to render the layout to HTML

The `renderToHtml` function comes from the UI component layer, not the hook. Auto-triggering would require passing this function through props or creating a ref-based architecture.

**For now**: The loop works when manually triggered from the UI. Users can click a "Refine Layout" button after initial analysis.

**Future enhancement**: Create a layout ref system that allows the hook to capture the rendered output automatically.

---

## Files to Modify

| File                                                                                                                     | Changes                                                 | Priority |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- | -------- |
| [src/services/GeminiLayoutService.ts](src/services/GeminiLayoutService.ts)                                               | Strengthen layout extraction prompt                     | HIGH     |
| [src/components/layout-builder/GenericComponentRenderer.tsx](src/components/layout-builder/GenericComponentRenderer.tsx) | Overflow fix, border fix, active states, icon expansion | HIGH     |
| [src/prompts/geminiLayoutBuilderPrompt.ts](src/prompts/geminiLayoutBuilderPrompt.ts)                                     | Better layout & icon instructions                       | MEDIUM   |
| [src/hooks/useLayoutBuilder.ts](src/hooks/useLayoutBuilder.ts)                                                           | Auto-trigger self-healing loop                          | LOW      |
| [src/utils/layoutValidation.ts](src/utils/layoutValidation.ts)                                                           | Add debug logging (no logic changes needed)             | LOW      |

**Existing resources to leverage:**

- `src/services/iconifyService.ts` (364 lines) - Full icon library already exists
- `src/services/VisionLoopEngine.ts` (529 lines) - Self-healing already implemented
- `src/services/LayoutAutoFixEngine.ts` - Correction application logic exists

---

## Verification Plan

After implementation:

1. **Debug logging**: Verify AI is returning layout.type, layout.gap, etc.
2. **Visual test**: Load a reference image and compare output
3. **Icon test**: Verify icons beyond the original 40 render correctly
4. **Interaction test**: Verify active states work (hover already confirmed working)
5. **Overflow test**: Verify text components don't clip unexpectedly
6. **Self-healing test**: Verify auto-refinement triggers and improves output

---

## Success Criteria

- [x] AI consistently extracts `layout.type`, `layout.gap`, `layout.direction` for containers
- [x] Text components no longer clip unexpectedly
- [x] 100+ Lucide icons render correctly (via SVG path extraction + Lucide fallback)
- [x] Active states visibly change on interactive components
- [x] Focus states render for accessibility (outline, box-shadow, border-color)
- [x] Border renders when borderColor is present (even without borderWidth)
- [x] AI prompt includes active + focus interaction schemas (not just hover)
- [ ] Self-healing loop runs automatically after initial analysis (DEFERRED — Phase 5)

---

## Notes

- **Philosophy**: "Trust the AI, verify the output" rather than "Override the AI with heuristics"
- **Key correction**: Layout inference already respects AI data - the issue is AI not extracting it reliably
- **Existing code**: Much infrastructure already exists (iconifyService, VisionLoopEngine) - integrate, don't rebuild
- **Trade-off**: May show "ugly" intermediate states - that's intentional for a creative tool
