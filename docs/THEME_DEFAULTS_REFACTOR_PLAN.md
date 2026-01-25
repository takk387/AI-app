# Theme Defaults Refactor Plan

## Current Status

| Phase   | Description                                      | Status                         |
| ------- | ------------------------------------------------ | ------------------------------ |
| Phase 1 | Foundation - Create `themeDefaults.ts`           | ✅ COMPLETE                    |
| Phase 2 | Logic Alignment - Update 8 service/utility files | ✅ COMPLETE                    |
| Phase 3 | UI Alignment - Replace raw Tailwind colors       | ❌ 373 occurrences in 74 files |

---

## Important Context

**Two separate color systems exist:**

1. **Garden Theme** (`globals.css` + `tailwind.config.js`) - The AI App Builder's own UI
   - Nature-inspired greens, golds, blossom pinks
   - Already centralized in CSS variables and Tailwind semantic colors
   - `success` = Garden green (#2ECC71)
   - `warning` = Gold (#C9A227)
   - `error` = Blossom pink (#C06C84)

2. **Generator Fallbacks** (`themeDefaults.ts`) - Default colors for user-generated apps
   - Generic neutral grays when users don't provide colors
   - NOW centralized in `src/constants/themeDefaults.ts`

---

## Completed Work

### Phase 1: Foundation ✅

Created `src/constants/themeDefaults.ts` with:

```typescript
export const NEUTRAL_PALETTE = {
  gray50: '#F9FAFB',
  gray100: '#F8FAFC',
  gray200: '#E5E7EB',
  gray300: '#E2E8F0',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray700: '#374151',
  gray800: '#1F2937',
  white: '#FFFFFF',
} as const;

export const STATUS_COLORS = {
  error: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  info: '#6B7280',
} as const;

export const DARK_PALETTE = {
  background: '#0F172A',
  surface: '#1E293B',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  border: '#334155',
} as const;

export const LAYER_COLORS = {
  base: '#64748B',
  content: '#3B82F6',
  dropdown: '#06B6D4',
  sticky: '#10B981',
  overlay: '#8B5CF6',
  modal: '#EC4899',
  toast: '#F59E0B',
  tooltip: '#EF4444',
  max: '#1F2937',
} as const;

export const DEFAULT_COLORS = {
  primary: NEUTRAL_PALETTE.gray500,
  secondary: NEUTRAL_PALETTE.gray400,
  accent: NEUTRAL_PALETTE.gray500,
  background: NEUTRAL_PALETTE.gray50,
  surface: NEUTRAL_PALETTE.white,
  text: NEUTRAL_PALETTE.gray700,
  textMuted: NEUTRAL_PALETTE.gray500,
  border: NEUTRAL_PALETTE.gray200,
  ...STATUS_COLORS,
} as const;
```

### Phase 2: Logic Alignment ✅

Updated 8 service/utility files to use constants:

| File                             | Constants Used                                       |
| -------------------------------- | ---------------------------------------------------- |
| `ZIndexEditor.tsx`               | `LAYER_COLORS`                                       |
| `layerUtils.ts`                  | `LAYER_COLORS`                                       |
| `DynamicPhaseGenerator.ts`       | `DEFAULT_COLORS`                                     |
| `LayoutExportService.ts`         | `DEFAULT_COLORS`, `NEUTRAL_PALETTE`, `STATUS_COLORS` |
| `colorExtraction.ts`             | `DEFAULT_COLORS`, `NEUTRAL_PALETTE`, `DARK_PALETTE`  |
| `darkModeGenerator.ts`           | `DARK_PALETTE`                                       |
| `designTokenMappings.ts`         | `STATUS_COLORS`                                      |
| `architectureTemplateMapping.ts` | `DEFAULT_COLORS`, `DARK_PALETTE`, `STATUS_COLORS`    |

Also updated 2 key UI components:

- `AnalysisProgressIndicator.tsx` → semantic Tailwind colors
- `QualityPanel.tsx` → semantic Tailwind colors

---

## Remaining Work: Phase 3 - UI Alignment

### Problem

373 occurrences of raw Tailwind colors across 74 component files bypass the Garden theme:

```tsx
// BEFORE - Raw Tailwind (generic red)
<span className="text-red-400 bg-red-500/20">Error</span>

// AFTER - Semantic Garden theme (blossom pink)
<span className="text-error-400 bg-error-500/20">Error</span>
```

### Priority Files (Top 6 Offenders - ~80 occurrences)

| File                            | Count | Impact                        |
| ------------------------------- | ----- | ----------------------------- |
| `review/EnhancedDiffViewer.tsx` | 16    | Critical - diff readability   |
| `CodeQualityReport.tsx`         | 15    | High visibility status report |
| `DiffPreview.tsx`               | 14    | Core diff feature             |
| `modals/DeploymentModal.tsx`    | 13    | User-facing deployment        |
| `review/ReviewSummary.tsx`      | 12    | Review workflow               |
| `build/ValidationDashboard.tsx` | 10    | Build feedback                |

### Replacement Rules

| Raw Color  | Semantic Replacement | Garden Theme Color     |
| ---------- | -------------------- | ---------------------- |
| `red-*`    | `error-*`            | Blossom pink (#C06C84) |
| `green-*`  | `success-*`          | Garden green (#2ECC71) |
| `yellow-*` | `warning-*`          | Gold (#C9A227)         |

### Search Pattern

Find remaining raw status colors:

```bash
grep -r "text-red-\|bg-red-\|text-green-\|bg-green-\|text-yellow-\|bg-yellow-" src/components/
```

---

## Verification Checklist

### Automated Checks

- [x] `npm run build` - passes
- [x] `npm run typecheck` - passes
- [x] `npm run lint` - passes

### Search Verification

After Phase 1 & 2, hardcoded hex colors only in constants file:

```bash
grep -r "#6B7280\|#FFFFFF\|#374151\|#E5E7EB" src/ --include="*.ts" --include="*.tsx"
# Should only return themeDefaults.ts
```

After Phase 3 completion:

```bash
grep -r "text-red-\|bg-red-\|text-green-\|bg-green-\|text-yellow-\|bg-yellow-" src/components/
# Should return 0 results
```

---

## Out of Scope

- **CSS variables in globals.css** - already centralized correctly
- **Inline styles using CSS variables** - correct pattern
- **Non-status Tailwind colors** - decorative uses of slate/gray are fine
- **Auth page box-shadows** - separate concern, lower priority

---

## Benefits

1. **Single source of truth** - All color constants in one file
2. **Type safety** - TypeScript catches invalid color references
3. **No duplicates** - ZIndexEditor and layerUtils share same constants
4. **Theme consistency** - UI uses Garden theme semantic colors
5. **Easy updates** - Change once, applies everywhere
