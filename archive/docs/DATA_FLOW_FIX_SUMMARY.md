# Data Flow Fix Summary

## Problem Statement

1. Data wasn't making it all the way from the wizard to the builder
2. Data was lost when navigating between workflow steps
3. Multiple confusing save locations (Dashboard vs App Library)

## Root Causes Identified

### Issue 1: Dashboard vs App Library - Two Different Data Sources

- **Dashboard** fetched from `project_documentation` table
- **App Library** fetched from `generated_apps` table
- These were completely separate with no synchronization

### Issue 2: Wizard Data Not Transferred to GeneratedComponent

In `useAppCrud.ts`, when naming an app, the `handleNameAppSubmit` function was creating an empty `GeneratedComponent` without transferring:

- `appConcept` (wizard planning data)
- `dynamicPhasePlan` (AI-generated build phases)
- `layoutManifest` (design data)
- `layoutThumbnail` (preview image)

### Issue 3: ID Divergence

- Wizard created `currentAppId` (UUID #1)
- Builder created `GeneratedComponent.id` (UUID #2)
- This broke the link between documentation and the app

### Issue 4: No Data Restoration on Load

When loading a component from the library, the wizard data wasn't restored to Zustand store.

## Fixes Implemented

### Fix 1: Updated GeneratedComponent Type

**File:** `src/types/aiBuilderTypes.ts`

Added new fields:

```typescript
interface GeneratedComponent {
  // ... existing fields
  appConcept?: AppConcept | null;
  layoutManifest?: LayoutManifest | null;
  layoutThumbnail?: LayoutThumbnail | null;
  buildStatus?: 'planning' | 'designing' | 'building' | 'complete' | 'deployed';
}
```

### Fix 2: Updated handleNameAppSubmit

**File:** `src/hooks/useAppCrud.ts`

Now transfers all wizard data when creating a new component:

- Uses existing `currentAppId` from wizard if available (ensures ID consistency)
- Transfers `appConcept`, `dynamicPhasePlan`, `layoutManifest`, `layoutThumbnail`
- Sets initial `buildStatus` based on what data exists

### Fix 3: Updated loadComponent

**File:** `src/hooks/useAppCrud.ts`

Now restores all wizard data to Zustand store when loading a component:

- Restores `appConcept` → `setAppConcept()`
- Restores `layoutManifest` → `setCurrentLayoutManifest()`
- Restores `layoutThumbnail` → `setLayoutThumbnail()`
- Restores `dynamicPhasePlan` → `setDynamicPhasePlan()`

### Fix 4: Updated Database Sync

**File:** `src/hooks/useDatabaseSync.ts`

- Added new fields to `DbMetadata` interface
- Updated `componentToDb()` to save all wizard data
- Updated `dbToComponent()` to restore all wizard data

### Fix 5: Unified Dashboard

**File:** `src/hooks/useDashboard.ts`

- Dashboard now fetches from `generated_apps` table (same as App Library)
- Dashboard is now the single source of truth for all projects
- Removed dependency on `project_documentation` table

### Fix 6: Removed App Library from Navigation

**File:** `src/components/SideDrawer.tsx`

- Removed "App Library" menu item
- Dashboard is now the only place to view/manage projects
- Simplified navigation and reduced confusion

## Data Flow After Fix

```
Wizard → Creates AppConcept + DynamicPhasePlan + currentAppId (UUID)
    ↓
Design → Creates LayoutManifest + layoutThumbnail
    ↓
Review → Confirms all data
    ↓
Builder → NameAppModal (if new)
    ↓
handleNameAppSubmit → Creates GeneratedComponent WITH:
    - Same ID as wizard (UUID)
    - appConcept transferred
    - dynamicPhasePlan transferred
    - layoutManifest transferred
    - layoutThumbnail transferred
    - buildStatus set based on progress
    ↓
Database → All data saved to generated_apps table
    ↓
Dashboard → Shows all projects from generated_apps
    ↓
Load Project → Restores all data to Zustand store
```

## Benefits

1. **Single Source of Truth**: Dashboard is the only place to view projects
2. **Complete Data Transfer**: All wizard data flows to builder
3. **ID Consistency**: Same ID used throughout workflow
4. **Data Restoration**: Loading a project restores all context
5. **Simpler Mental Model**: One project = One record = One dashboard entry

## Testing Checklist

- [ ] Create new project through wizard
- [ ] Verify appConcept is captured
- [ ] Go through design phase
- [ ] Verify layoutManifest is captured
- [ ] Proceed to builder
- [ ] Verify NameAppModal shows with pre-filled name from wizard
- [ ] Verify component has all wizard data (check console logs)
- [ ] Go to Dashboard
- [ ] Verify project appears with thumbnail
- [ ] Load project from Dashboard
- [ ] Verify all data is restored (check console logs)
- [ ] Verify App Library is removed from side menu
