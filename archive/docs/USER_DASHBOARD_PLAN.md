# User Dashboard Implementation Plan

## Overview

Add a User Dashboard page that displays all of a user's projects and related information. The dashboard will be accessible from:

1. The SideDrawer menu (above "Project Docs")
2. The homepage navigation bar (when logged in)

---

## Route

```
/app/dashboard
```

This follows the existing protected route pattern under `/app/*`.

---

## Files to Modify

### 1. SideDrawer.tsx

**Path:** `src/components/SideDrawer.tsx`

**Changes:**

- Add a "Dashboard" menu item in the Project section, positioned above "Project Docs"
- Use an appropriate icon (e.g., `LayoutDashboard` from lucide-react)
- Link to `/app/dashboard`

**Location in file:** Around line 119, before the FileIcon "Project Docs" item

```tsx
// Add before Project Docs item
{
  icon: LayoutDashboard,
  label: 'Dashboard',
  description: 'View all projects',
  onClick: () => router.push('/app/dashboard'),
}
```

---

### 2. MarketingNav.tsx

**Path:** `src/components/marketing/MarketingNav.tsx`

**Changes:**

- Add a "Dashboard" link visible only when user is logged in
- Position it in the desktop navigation area
- Also add to mobile menu

**Implementation notes:**

- Use existing `useAuth()` hook to check login status
- Style consistently with existing nav items

---

## New Files to Create

### 1. Dashboard Page

**Path:** `src/app/(protected)/app/dashboard/page.tsx`

```tsx
// Main dashboard page component
// Server component that fetches initial data
// Renders DashboardView client component
```

---

### 2. Dashboard View Component

**Path:** `src/components/dashboard/DashboardView.tsx`

**Sections:**

#### Header

- Page title: "My Dashboard"
- Quick action button: "New Project" (links to `/app/wizard`)

#### Stats Cards Row

- Total Projects count
- Completed Builds count
- In Progress count
- Templates Saved count

#### Projects List/Grid

- Toggleable view (list/grid)
- Each project card shows:
  - Project name (from concept snapshot)
  - Status badge (planning, ready, building, completed, failed, paused)
  - Last modified date
  - Feature count
  - Progress percentage
  - Quick actions (Continue, View Docs, Export, Archive)

#### Filters & Search

- Search by project name
- Filter by status
- Sort by: Recent, Name, Status

#### Recent Activity

- Timeline of recent actions across all projects
- Build completions, exports, etc.

---

### 3. Dashboard Components

**Path:** `src/components/dashboard/`

| File                 | Purpose                      |
| -------------------- | ---------------------------- |
| `DashboardView.tsx`  | Main dashboard container     |
| `StatsCards.tsx`     | Row of statistic cards       |
| `ProjectCard.tsx`    | Individual project card      |
| `ProjectList.tsx`    | List/grid of project cards   |
| `ProjectFilters.tsx` | Search and filter controls   |
| `RecentActivity.tsx` | Activity timeline            |
| `EmptyState.tsx`     | Shown when no projects exist |

---

### 4. Dashboard Hook

**Path:** `src/hooks/useDashboard.ts`

**Functionality:**

- Fetch all user projects from Supabase
- Aggregate statistics
- Handle project filtering/sorting
- Manage loading and error states

```typescript
interface UseDashboardReturn {
  projects: ProjectDocumentation[];
  stats: DashboardStats;
  isLoading: boolean;
  error: Error | null;
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  refetch: () => Promise<void>;
}
```

---

### 5. Dashboard Types

**Path:** `src/types/dashboard.ts`

```typescript
interface DashboardStats {
  totalProjects: number;
  completedBuilds: number;
  inProgress: number;
  savedTemplates: number;
  totalTokensUsed: number;
}

interface FilterState {
  search: string;
  status: BuildStatus | 'all';
  sortBy: 'recent' | 'name' | 'status';
  sortOrder: 'asc' | 'desc';
  view: 'grid' | 'list';
}

interface ProjectCardData {
  id: string;
  name: string;
  description: string;
  status: BuildStatus;
  updatedAt: string;
  createdAt: string;
  featureCount: number;
  progress: number;
  previewImage?: string;
}
```

---

## Database Considerations

### Existing Tables Used

- `project_documentation` - Primary source for project data
- `generated_apps` - For additional app metadata
- `app_templates` - For saved templates count

### Queries Needed

#### Fetch User Projects

```sql
SELECT *
FROM project_documentation
WHERE user_id = auth.uid()
ORDER BY updated_at DESC;
```

#### Aggregate Stats

```sql
SELECT
  COUNT(*) as total_projects,
  COUNT(*) FILTER (WHERE build_status = 'completed') as completed,
  COUNT(*) FILTER (WHERE build_status IN ('building', 'planning', 'ready')) as in_progress
FROM project_documentation
WHERE user_id = auth.uid();
```

#### Templates Count

```sql
SELECT COUNT(*)
FROM app_templates
WHERE created_by = auth.uid();
```

### No Schema Changes Required

All necessary data already exists in current tables.

---

## Component Hierarchy

```
DashboardPage (server component)
└── DashboardView (client component)
    ├── Header
    │   ├── Title
    │   └── NewProjectButton
    ├── StatsCards
    │   ├── StatCard (Total Projects)
    │   ├── StatCard (Completed)
    │   ├── StatCard (In Progress)
    │   └── StatCard (Templates)
    ├── ProjectFilters
    │   ├── SearchInput
    │   ├── StatusFilter
    │   ├── SortDropdown
    │   └── ViewToggle
    ├── ProjectList
    │   └── ProjectCard (mapped)
    │       ├── ProjectStatus
    │       ├── ProjectInfo
    │       └── ProjectActions
    ├── RecentActivity
    │   └── ActivityItem (mapped)
    └── EmptyState (conditional)
```

---

## Implementation Steps

### Phase 1: Foundation

1. Create dashboard types in `src/types/dashboard.ts`
2. Create `useDashboard` hook with Supabase queries
3. Create basic `DashboardView` component
4. Create dashboard page at `src/app/(protected)/app/dashboard/page.tsx`
5. Test route access and authentication

### Phase 2: Core Components

1. Build `StatsCards` component
2. Build `ProjectCard` component
3. Build `ProjectList` component with grid/list toggle
4. Build `EmptyState` component
5. Integrate components into `DashboardView`

### Phase 3: Filtering & Search

1. Build `ProjectFilters` component
2. Add search functionality to `useDashboard`
3. Add status filter logic
4. Add sort functionality
5. Persist filter preferences (localStorage or store)

### Phase 4: Navigation Integration

1. Modify `SideDrawer.tsx` - add Dashboard link above Project Docs
2. Modify `MarketingNav.tsx` - add Dashboard link for logged-in users
3. Test navigation from both locations

### Phase 5: Polish

1. Add loading skeletons
2. Add error handling UI
3. Add animations (Framer Motion, consistent with app)
4. Add `RecentActivity` component
5. Mobile responsive adjustments
6. Accessibility review

---

## UI/UX Considerations

### Consistent Styling

- Use existing Tailwind classes and design patterns
- Match color scheme from `SideDrawer` and other app components
- Use existing UI components from `src/components/ui/`

### Status Colors (existing pattern)

| Status    | Color           |
| --------- | --------------- |
| planning  | blue            |
| ready     | yellow          |
| building  | orange/animated |
| completed | green           |
| failed    | red             |
| paused    | gray            |

### Responsive Breakpoints

- Mobile: Single column, list view default
- Tablet: 2 column grid option
- Desktop: 3-4 column grid option

### Loading States

- Skeleton cards while fetching
- Inline loading for actions

### Empty State

- Friendly message when no projects
- Prominent "Create Your First Project" CTA

---

## Testing Checklist

- [ ] Dashboard loads for authenticated users
- [ ] Redirects to login for unauthenticated users
- [ ] Projects display correctly with all metadata
- [ ] Stats calculate accurately
- [ ] Search filters projects by name
- [ ] Status filter works correctly
- [ ] Sort options work correctly
- [ ] View toggle (grid/list) works
- [ ] Project card actions work (Continue, View Docs, Export)
- [ ] New Project button navigates to wizard
- [ ] SideDrawer link works
- [ ] MarketingNav link works (when logged in)
- [ ] Mobile responsive layout
- [ ] Empty state displays when no projects
- [ ] Error states handle gracefully

---

## Future Enhancements (Out of Scope)

- Project archiving functionality
- Bulk export multiple projects
- Project duplication
- Collaboration/sharing features
- Usage analytics charts
- Project tags/categories
- Favorites/pinned projects

---

## Dependencies

### Existing (no new packages needed)

- `lucide-react` - Icons
- `framer-motion` - Animations
- `@supabase/supabase-js` - Database
- `zustand` - State management (if needed)
- `tailwindcss` - Styling

---

## Estimated Scope

| Phase   | Components              |
| ------- | ----------------------- |
| Phase 1 | 4 files                 |
| Phase 2 | 5 files                 |
| Phase 3 | 2 files (modifications) |
| Phase 4 | 2 files (modifications) |
| Phase 5 | Polish existing         |

**Total new files:** ~10
**Files to modify:** ~2
