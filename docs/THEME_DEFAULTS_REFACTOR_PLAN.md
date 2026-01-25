# Theme Defaults Refactor Plan

## Overview

Centralize 39 hardcoded color instances from 8 files into a single `src/constants/themeDefaults.ts` file, eliminating duplicates and ensuring consistency between generators and UI.

---

## Important Context

**Two separate color systems exist:**

1. **Garden Theme** (`globals.css`) - The AI App Builder's own UI
   - Nature-inspired greens, golds, blossom pinks
   - Already centralized in CSS variables (`--accent-primary: #2ECC71`, etc.)
   - NOT the focus of this refactor

2. **Generator Fallbacks** (scattered in services) - Default colors for user-generated apps
   - Generic neutral grays when users don't provide colors
   - Currently hardcoded across 8+ files
   - **THIS is what we're centralizing**

---

## Problem Statement

The codebase has hardcoded hex colors scattered across multiple files:

| File                             | Color Count | Usage                                         |
| -------------------------------- | ----------- | --------------------------------------------- |
| `DynamicPhaseGenerator.ts`       | 4           | Generator fallbacks                           |
| `LayoutExportService.ts`         | 12          | Export fallbacks                              |
| `ZIndexEditor.tsx`               | 9           | Layer visualization                           |
| `layerUtils.ts`                  | 6           | Layer visualization (duplicates ZIndexEditor) |
| `architectureTemplateMapping.ts` | 11          | Template defaults                             |
| `darkModeGenerator.ts`           | 5           | Dark mode palette                             |
| `colorExtraction.ts`             | 15+         | Extraction fallbacks                          |
| `designTokenMappings.ts`         | 4           | CSS variable fallbacks                        |

**Key issues:**

- Same colors defined in multiple places (e.g., `#6B7280` appears 12 times)
- Exact duplicates between `ZIndexEditor` and `layerUtils`
- Risk of drift when updating colors
- No type safety for color values

---

## Solution: Semantic Color Constants

### File Structure

```
src/
├── constants/
│   └── themeDefaults.ts    # NEW - All color constants
```

### Constant Organization

```typescript
// src/constants/themeDefaults.ts

// ============================================
// 1. NEUTRAL PALETTE (raw gray values)
// ============================================
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

// ============================================
// 2. STATUS COLORS (semantic)
// ============================================
export const STATUS_COLORS = {
  error: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  info: '#6B7280',
} as const;

// ============================================
// 3. DARK MODE PALETTE
// ============================================
export const DARK_PALETTE = {
  background: '#0F172A',
  surface: '#1E293B',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  border: '#334155',
} as const;

// ============================================
// 4. Z-INDEX LAYER VISUALIZATION COLORS
// (Used by ZIndexEditor and layerUtils)
// ============================================
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

// ============================================
// 5. DEFAULT COLOR FALLBACKS
// (Used by generators and services)
// ============================================
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

// ============================================
// Type exports
// ============================================
export type NeutralColor = keyof typeof NEUTRAL_PALETTE;
export type StatusColor = keyof typeof STATUS_COLORS;
export type LayerColor = keyof typeof LAYER_COLORS;
```

---

## File Modifications

### 1. `src/components/ZIndexEditor.tsx`

**Lines 34-42** - Replace hardcoded `TOKEN_INFO` colors:

```typescript
// BEFORE
const TOKEN_INFO = {
  base: { label: 'Base', description: '...', color: '#64748B' },
  content: { label: 'Content', description: '...', color: '#3B82F6' },
  // ... 7 more
};

// AFTER
import { LAYER_COLORS } from '@/constants/themeDefaults';

const TOKEN_INFO = {
  base: { label: 'Base', description: '...', color: LAYER_COLORS.base },
  content: { label: 'Content', description: '...', color: LAYER_COLORS.content },
  // ... 7 more
};
```

### 2. `src/utils/layerUtils.ts`

**Lines 56-61** - Replace `LAYER_GROUP_INFO` colors:

```typescript
// BEFORE
export const LAYER_GROUP_INFO = {
  base: { name: 'Base', useCase: '...', color: '#64748B', zRange: [0, 9] },
  // ... 5 more
};

// AFTER
import { LAYER_COLORS } from '@/constants/themeDefaults';

export const LAYER_GROUP_INFO = {
  base: { name: 'Base', useCase: '...', color: LAYER_COLORS.base, zRange: [0, 9] },
  // ... 5 more
};
```

### 3. `src/services/DynamicPhaseGenerator.ts`

**Lines 1347, 1361-1364** - Replace inline fallbacks:

```typescript
// BEFORE
const primaryColor = colors.primary || '#6B7280';
const backgroundColor = colors.background || '#FFFFFF';
const textColor = colors.text || '#374151';
const borderColor = colors.border || '#E5E7EB';

// AFTER
import { DEFAULT_COLORS } from '@/constants/themeDefaults';

const primaryColor = colors.primary || DEFAULT_COLORS.primary;
const backgroundColor = colors.background || DEFAULT_COLORS.background;
const textColor = colors.text || DEFAULT_COLORS.text;
const borderColor = colors.border || DEFAULT_COLORS.border;
```

### 4. `src/services/LayoutExportService.ts`

**Lines 133-146** - Replace all fallback colors:

```typescript
// BEFORE
return {
  colors: {
    primary: colors.primary || '#6B7280',
    secondary: colors.secondary || '#9CA3AF',
    // ... 10 more hardcoded values
  },
};

// AFTER
import { DEFAULT_COLORS } from '@/constants/themeDefaults';

return {
  colors: {
    primary: colors.primary || DEFAULT_COLORS.primary,
    secondary: colors.secondary || DEFAULT_COLORS.secondary,
    // ... using DEFAULT_COLORS for all
  },
};
```

### 5. `src/data/architectureTemplateMapping.ts`

**Lines 175-185** - Replace light/dark mode colors:

```typescript
// AFTER
import { DEFAULT_COLORS, DARK_PALETTE, NEUTRAL_PALETTE } from '@/constants/themeDefaults';

colors: {
  primary: DEFAULT_COLORS.primary,
  secondary: DEFAULT_COLORS.secondary,
  background: isLightScheme ? DEFAULT_COLORS.background : DARK_PALETTE.background,
  surface: isLightScheme ? DEFAULT_COLORS.surface : DARK_PALETTE.surface,
  text: isLightScheme ? DEFAULT_COLORS.text : DARK_PALETTE.text,
  // ...
},
```

### 6. `src/utils/darkModeGenerator.ts`

**Lines 13-17** - Replace dark mode overrides:

```typescript
// AFTER
import { DARK_PALETTE } from '@/constants/themeDefaults';

const darkColors = {
  ...colors,
  background: DARK_PALETTE.background,
  surface: DARK_PALETTE.surface,
  text: DARK_PALETTE.text,
  textMuted: DARK_PALETTE.textMuted,
  border: DARK_PALETTE.border,
};
```

### 7. `src/utils/colorExtraction.ts`

**Lines 320-347, 437-446** - Replace extraction fallbacks:

```typescript
// AFTER
import { DEFAULT_COLORS, DARK_PALETTE, NEUTRAL_PALETTE } from '@/constants/themeDefaults';

// Light scheme fallbacks
background = sortedLight[0]?.hex || NEUTRAL_PALETTE.white;
text = sortedDarkForText[0]?.hex || DARK_PALETTE.background;

// Dark scheme fallbacks
background = sortedDark[0]?.hex || DARK_PALETTE.background;
text = sortedLightForText[0]?.hex || DARK_PALETTE.text;

// Full fallback palette
return { ...DEFAULT_COLORS };
```

### 8. `src/utils/designTokenMappings.ts`

**Lines 280-283** - Replace status color fallbacks:

```typescript
// BEFORE
--color-success: ${colors.success || '#6B7280'};
--color-warning: ${colors.warning || '#6B7280'};
--color-error: ${colors.error || '#6B7280'};

// AFTER
import { STATUS_COLORS } from '@/constants/themeDefaults';

--color-success: ${colors.success || STATUS_COLORS.success};
--color-warning: ${colors.warning || STATUS_COLORS.warning};
--color-error: ${colors.error || STATUS_COLORS.error};
```

---

## Execution Order

1. **Create** `src/constants/themeDefaults.ts`
2. **Update** `ZIndexEditor.tsx` and `layerUtils.ts` (eliminates duplicates)
3. **Update** `DynamicPhaseGenerator.ts` and `LayoutExportService.ts`
4. **Update** `colorExtraction.ts`, `darkModeGenerator.ts`, `designTokenMappings.ts`
5. **Update** `architectureTemplateMapping.ts`
6. **Verify** build, typecheck, lint

---

## Verification Checklist

### Automated Checks

- [ ] `npm run build` - passes
- [ ] `npm run typecheck` - passes
- [ ] `npm run lint` - passes

### Manual Verification

- [ ] Z-Index Editor displays correct layer colors
- [ ] Generated layouts have proper color fallbacks
- [ ] Dark mode colors apply correctly

### Search Verification

After refactor, this search should only return the constants file:

```bash
grep -r "#6B7280\|#FFFFFF\|#374151\|#E5E7EB" src/ --include="*.ts" --include="*.tsx"
```

---

---

## Phase 2: Tailwind Status Color Alignment

### Discovery

The `tailwind.config.js` **already defines semantic status colors**:

```javascript
// Lines 97-132 - ALREADY EXISTS
success: {
  50 - 900;
} // Garden green (#2ECC71)
warning: {
  50 - 900;
} // Gold (#C9A227)
error: {
  50 - 900;
} // Blossom pink (#C06C84)
```

**Problem:** Components use raw Tailwind colors instead of these semantic classes.

### Example Refactor

```tsx
// BEFORE - Uses Tailwind red (doesn't match Garden theme)
<span className="text-red-400 bg-red-500/20">Error</span>

// AFTER - Uses semantic error (blossom pink)
<span className="text-error-400 bg-error-500/20">Error</span>
```

### Files to Refactor (Phase 2)

| File                            | Issue                                                                | Fix                                                                              |
| ------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `AnalysisProgressIndicator.tsx` | `text-red-400`, `bg-red-500/20`, `text-green-400`, `bg-green-500/20` | Use `text-error-400`, `bg-error-500/20`, `text-success-400`, `bg-success-500/20` |
| `QualityPanel.tsx`              | `text-red-400`, `text-green-400`, `text-yellow-400`                  | Use semantic `error`, `success`, `warning`                                       |
| Other status indicators         | Raw color utilities                                                  | Semantic utilities                                                               |

### Search Pattern

Find components using raw status colors:

```bash
grep -r "text-red-\|bg-red-\|text-green-\|bg-green-\|text-yellow-\|bg-yellow-" src/components/
```

---

## Out of Scope

These are intentionally NOT included in this refactor:

- **CSS variables in globals.css** - already centralized correctly
- **Inline styles using CSS variables** - correct pattern
- **Auth page box-shadows** - separate concern, lower priority
- **Non-status Tailwind colors** - decorative uses of slate/gray are fine

---

## Benefits

1. **Single source of truth** - All color constants in one file
2. **Type safety** - TypeScript catches invalid color references
3. **No duplicates** - ZIndexEditor and layerUtils share same constants
4. **Semantic clarity** - `DEFAULT_COLORS.primary` vs `#6B7280`
5. **Easy updates** - Change once, applies everywhere
6. **Generator/UI consistency** - Same fallbacks used throughout
