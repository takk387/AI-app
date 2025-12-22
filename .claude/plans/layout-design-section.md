# Phase 3: Layout Design Section Plan

## Problem Statement

The AppConcept type includes `layoutDesign?: LayoutDesign` (from Layout Builder), but the App Concept Panel does NOT currently display this data. Users who create layout designs in the Layout Builder should see that design information in the concept panel.

## Current State

- `AppConcept.layoutDesign` stores the full LayoutDesign object
- UIPreferencesSection only shows basic style/color/layout type - NOT the full layout design
- No LayoutDesignSection exists in the concept panel sections

---

## LayoutDesign Type Overview

From `src/types/layoutDesign.ts`:

```typescript
interface LayoutDesign {
  id: string;
  name: string;
  version: number;

  basePreferences: {
    style: 'modern' | 'minimalist' | 'playful' | 'professional' | 'custom';
    colorScheme: 'light' | 'dark' | 'auto' | 'custom';
    layout: 'single-page' | 'multi-page' | 'dashboard' | 'custom';
  };

  globalStyles: GlobalStyles; // Typography, colors, spacing, effects

  components: {
    header?: HeaderDesign;
    sidebar?: SidebarDesign;
    hero?: HeroDesign;
    navigation?: NavigationDesign;
    cards?: CardDesign;
    lists?: ListDesign;
    stats?: StatsDesign;
    footer?: FooterDesign;
  };

  structure: LayoutStructure;
  responsive: ResponsiveSettings;
  referenceMedia: ReferenceMedia[];
  designContext?: DesignContext;
}
```

---

## Implementation Plan

### Files to Create (1 new file)

#### `src/components/concept-panel/sections/LayoutDesignSection.tsx`

A new section component that displays layout design summary when `appConcept.layoutDesign` is present.

**Display Information:**

1. **Header** - Layout name with "Layout Design" label
2. **Base Preferences** - Style, color scheme, layout type pills
3. **Color Palette** - Visual color swatches from globalStyles.colors
4. **Components Overview** - Icons/badges for configured components (header, sidebar, hero, footer, etc.)
5. **Typography Preview** - Font family and heading weight
6. **Reference Media** - Thumbnail of uploaded reference images (if any)

**Example Layout:**

```
┌─────────────────────────────────────────────┐
│ 🎨 Layout Design                    [Edit]  │
├─────────────────────────────────────────────┤
│ "My App Layout" v1                          │
│                                             │
│ Style: [Modern] [Dark] [Dashboard]          │
│                                             │
│ Colors:  ⬤ ⬤ ⬤ ⬤ ⬤                        │
│          Primary Secondary Accent ...       │
│                                             │
│ Components:                                 │
│ [✓ Header] [✓ Sidebar] [✓ Hero] [✓ Footer]  │
│                                             │
│ Typography: Inter / Semibold headings       │
└─────────────────────────────────────────────┘
```

### Files to Modify (2 files)

#### 1. `src/components/concept-panel/sections/index.ts`

Add export for new LayoutDesignSection.

#### 2. `src/components/concept-panel/AppConceptPanel.tsx`

Import and render LayoutDesignSection when `appConcept.layoutDesign` exists.

**Placement:** Between UIPreferencesSection and TechnicalSection.

```typescript
{/* UI Preferences */}
<UIPreferencesSection ... />

{/* Layout Design (if present) */}
{appConcept.layoutDesign && (
  <>
    <div className="border-t border-zinc-800" />
    <LayoutDesignSection
      layoutDesign={appConcept.layoutDesign}
      onUpdate={handleUpdate}
      readOnly={isReadOnly}
    />
  </>
)}

{/* Technical Requirements */}
<TechnicalSection ... />
```

---

## Implementation Steps

### Step 1: Create LayoutDesignSection Component

Create `src/components/concept-panel/sections/LayoutDesignSection.tsx`:

- Collapsible section matching other sections' pattern
- Import LayoutDesign type from `@/types/layoutDesign`
- Extract and display key information:
  - Name and version
  - Base preferences as pills/badges
  - Color swatches from globalStyles.colors
  - Component indicators (which ones are configured)
  - Typography info

### Step 2: Export from Index

Add to `src/components/concept-panel/sections/index.ts`:

```typescript
export { LayoutDesignSection } from './LayoutDesignSection';
```

### Step 3: Integrate into AppConceptPanel

Update `src/components/concept-panel/AppConceptPanel.tsx`:

- Import LayoutDesignSection
- Conditionally render when `appConcept.layoutDesign` is present
- Pass appropriate props (readOnly for ACT mode)

---

## Design Patterns to Follow

### Match Existing Section Pattern

Follow the same structure as UIPreferencesSection:

```typescript
interface LayoutDesignSectionProps {
  layoutDesign: LayoutDesign;
  onUpdate?: (path: string, value: unknown) => void;
  readOnly?: boolean;
}

export function LayoutDesignSection({
  layoutDesign,
  onUpdate,
  readOnly = false
}: LayoutDesignSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div>
      {/* Header with toggle */}
      <button onClick={() => setIsExpanded(!isExpanded)} ...>
        <ChevronIcon />
        <LayoutIcon />
        <span>Layout Design</span>
      </button>

      {isExpanded && (
        <div className="space-y-3 pl-5">
          {/* Content */}
        </div>
      )}
    </div>
  );
}
```

### Color Swatches Component

Reuse pattern from UIPreferencesSection:

```typescript
<div className="flex gap-2">
  {colors.primary && (
    <div
      className="w-6 h-6 rounded border border-zinc-600"
      style={{ backgroundColor: colors.primary }}
      title={`Primary: ${colors.primary}`}
    />
  )}
  {/* ... more colors */}
</div>
```

### Component Indicators

Show which layout components are configured:

```typescript
const configuredComponents = Object.entries(layoutDesign.components || {})
  .filter(([_, design]) => design?.visible !== false)
  .map(([name]) => name);

// Render as badges
<div className="flex flex-wrap gap-1">
  {configuredComponents.map(name => (
    <span key={name} className="px-1.5 py-0.5 text-[10px] bg-blue-500/20 text-blue-400 rounded">
      {name}
    </span>
  ))}
</div>
```

---

## Files Summary

### ✏️ Files to CREATE (1)

| File                                                            | Description                           |
| --------------------------------------------------------------- | ------------------------------------- |
| `src/components/concept-panel/sections/LayoutDesignSection.tsx` | New section for layout design display |

### ✏️ Files to MODIFY (2)

| File                                               | Change                                |
| -------------------------------------------------- | ------------------------------------- |
| `src/components/concept-panel/sections/index.ts`   | Add export for LayoutDesignSection    |
| `src/components/concept-panel/AppConceptPanel.tsx` | Import and render LayoutDesignSection |

### 🚫 Files to NOT TOUCH

- `src/components/NaturalConversationWizard.tsx`
- `src/components/LayoutBuilderWizard.tsx`
- `src/components/modals/PhasedBuildPanel.tsx`
- `src/hooks/useDynamicBuildPhases.ts`

---

## Success Criteria

- [ ] LayoutDesignSection displays when appConcept.layoutDesign exists
- [ ] Shows layout name and version
- [ ] Shows base preferences (style, colorScheme, layout type)
- [ ] Shows color palette swatches
- [ ] Shows which components are configured (header, sidebar, etc.)
- [ ] Shows typography info (font family, heading weight)
- [ ] Collapsible section matching existing UI pattern
- [ ] Read-only in ACT mode (same as other sections)
- [ ] TypeScript compiles without errors
- [ ] No modifications to LayoutBuilderWizard or NaturalConversationWizard
