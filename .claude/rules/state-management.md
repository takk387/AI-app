---
paths:
  - src/store/**
  - src/stores/**
  - src/hooks/**
  - src/contexts/**
---

# State Management Domain

## Zustand Store Architecture

### Main Store: useAppStore

**Location:** `src/store/useAppStore.ts` (~804 lines)

Central store with 10 slices using Immer middleware and persist (v5 migrations):

```typescript
// Store creation with middleware
const useAppStore = create<AppState>()(
  devtools(
    immer((set, get) => ({
      // Slices combined here
    }))
  )
);
```

### Slices

1. **ChatSlice** - Messages and generation state

```typescript
{
  messages: Message[]
  userInput: string
  isGenerating: boolean
  addMessage(msg): void
  clearMessages(): void
}
```

2. **ModeSlice** - PLAN vs ACT mode

```typescript
{
  builderMode: 'plan' | 'act'
  setBuilderMode(mode): void
}
```

3. **ComponentsSlice** - Generated components

```typescript
{
  components: GeneratedComponent[]
  selectedComponent: string | null
  addComponent(comp): void
  updateComponent(id, updates): void
}
```

4. **VersionControlSlice** - Undo/redo

```typescript
{
  undoStack: Snapshot[]
  redoStack: Snapshot[]
  canUndo: boolean
  canRedo: boolean
  pushSnapshot(): void
  undo(): void
  redo(): void
}
```

5. **UIStateSlice** - UI visibility

```typescript
{
  activeTab: string
  modalOpen: Record<string, boolean>
  panelSizes: number[]
}
```

6. **DataSlice** - Pending changes

```typescript
{
  pendingChanges: Change[]
  deploymentInstructions: string
}
```

7. **FileStorageSlice** - Cloud files

```typescript
{
  uploadedFiles: FileRecord[]
  isUploading: boolean
}
```

8. **CodeQualitySlice** - Reviews

```typescript
{
  reviewResults: ReviewResult | null;
  accessibilityReport: A11yReport | null;
}
```

9. **PlanningSlice** - Dual AI planning state

```typescript
{
  dualArchitectureResult: DualArchitectureResult | null;
  cachedIntelligence: IntelligenceContext | null;
  setDualArchitectureResult(result): void;
  setCachedIntelligence(intel): void;
}
```

10. **LayoutBuilderSlice** - Layout builder persistence

```typescript
{
  layoutBuilderFiles: AppFile[];
  currentLayoutManifest: LayoutManifest | null;
  setLayoutBuilderFiles(files): void;
  setCurrentLayoutManifest(manifest): void;
}
```

### Persist Migrations (v5)

Store uses cascading `if (version < N)` migration pattern:

```typescript
migrate: (persisted, version) => {
  if (version < 1) {
    /* add initial fields */
  }
  if (version < 2) {
    /* add layout fields */
  }
  if (version < 3) {
    /* add phase fields */
  }
  if (version < 4) {
    /* add planning fields */
  }
  if (version < 5) {
    /* add cachedIntelligence, dualArchitectureResult */
  }
  return persisted;
};
```

## Planning Hooks

### useDualAIPlan

**Location:** `src/hooks/useDualAIPlan.ts` (~300 lines)

Manages the dual AI planning pipeline via SSE streaming.

```typescript
function useDualAIPlan() {
  return {
    stages: PipelineStage[];      // Current pipeline stage states
    isRunning: boolean;
    error: string | null;
    consensusResult: ConsensusResult | null;
    escalation: EscalationState | null;
    startPipeline(config): void;
    resolveEscalation(choice): void;
  };
}
```

**Key patterns:**

- Reads `cachedIntelligence` from store, passes to pipeline to skip Stage 2
- SSE events update stage progress in real-time
- Escalation state triggers `ConsensusEscalationDialog`
- Final result saved as `dualArchitectureResult` in store

### useBackgroundIntelligence

**Location:** `src/hooks/useBackgroundIntelligence.ts` (~150 lines)

Pre-caches intelligence during Design step (Step 2) so AI Plan (Step 3) can skip Stage 2.

```typescript
function useBackgroundIntelligence(appConcept: AppConcept | null) {
  return {
    isGathering: boolean;
    intelligence: IntelligenceContext | null;
  };
}
```

**Key patterns:**

- Starts gathering when `appConcept` is available on Design page
- Uses AbortController for cleanup on unmount
- Saves result to `cachedIntelligence` in Zustand store
- Pipeline checks for cached intelligence before running Stage 2

## Selector Patterns

**IMPORTANT:** Always use shallow comparison for performance:

```typescript
// Good - uses shallow comparison
const messages = useAppStore((state) => state.messages, shallow);

// Good - selecting multiple values
const { messages, isGenerating } = useAppStore(
  (state) => ({
    messages: state.messages,
    isGenerating: state.isGenerating,
  }),
  shallow
);

// Bad - creates new object every render
const data = useAppStore((state) => ({
  messages: state.messages,
}));
```

## Secondary Store

### useLayoutPanelStore

**Location:** `src/stores/useLayoutPanelStore.ts`

Manages layout builder panel visibility:

```typescript
{
  designPanelOpen: boolean
  animationPanelOpen: boolean
  // ... panel states
  togglePanel(name): void
}
```

## React Context Providers

### AuthContext

**Location:** `src/contexts/AuthContext.tsx`

- Supabase session management
- Login/logout methods
- User object

### ThemeContext

**Location:** `src/contexts/ThemeContext.tsx`

- Dark/light mode
- Theme persistence
- System preference detection

### SettingsContext

**Location:** `src/contexts/SettingsContext.tsx`

- User preferences
- Editor settings
- Feature flags

## Hook Patterns

### Standard Structure

```typescript
interface UseFeatureOptions {
  // Configuration
}

interface UseFeatureReturn {
  // State
  data: Data;
  isLoading: boolean;
  error: Error | null;
  // Methods
  doAction(): Promise<void>;
}

export function useFeature(options?: UseFeatureOptions): UseFeatureReturn {
  // Implementation
}
```

### Common Hooks

| Hook                        | Purpose                             |
| --------------------------- | ----------------------------------- |
| `useLayoutBuilder`          | Layout design state + GENERATE mode |
| `useDualAIPlan`             | Dual AI planning pipeline (SSE)     |
| `useBackgroundIntelligence` | Background intelligence pre-caching |
| `useChatSystem`             | Chat message management             |
| `useDatabaseSync`           | Supabase sync                       |
| `useVersionControl`         | Version history                     |
| `useStreamingGeneration`    | SSE handling                        |
| `useSmartContext`           | Context compression                 |

## Critical Dependencies

- `useAppStore` ← Central state, many components depend on it
- Zustand shallow ← Always use for selectors
- Immer middleware ← Enables mutable-style updates
- Context providers ← Must wrap app in layout.tsx
