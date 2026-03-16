---
paths:
  - src/components/conversation-wizard/**
  - src/components/NaturalConversationWizard.tsx
  - src/hooks/usePhaseGeneration.ts
  - src/hooks/useDraftPersistence.ts
  - src/hooks/useArchitectureGeneration.ts
  - src/hooks/usePlanRegeneration.ts
  - src/app/api/wizard/**
  - src/types/appConcept.ts
---

# Conversation Wizard Domain

## Component Architecture

**Main Component:** `NaturalConversationWizard.tsx` (~737 lines)

- Continuous conversation-based app planning (no rigid steps)
- Auto-saves drafts with recovery on refresh
- Sequential generation: Architecture → Phase Plan
- Generates AppConcept object for phase execution

**Sub-components in `conversation-wizard/`:**

- `ChatInputArea.tsx` - Text input with file upload
- `MessageBubble.tsx` - Chat message with markdown rendering
- `SuggestedActionsBar.tsx` - Quick action buttons
- `ConceptSummaryPanel.tsx` - Side panel showing current concept
- `RecoveryPromptDialog.tsx` - Draft recovery modal
- `WizardHeader.tsx` - Header with layout import option
- `PendingImagesPreview.tsx` - Image upload preview
- `ArchitectureReviewPanel.tsx` - Backend architecture display with expandable sections

## Key Hooks

### useDraftPersistence

**Location:** `src/hooks/useDraftPersistence.ts` (~206 lines)

Handles auto-save/recovery of conversation state:

```typescript
{
  // State
  messages: Message[]
  setMessages: Dispatch<SetStateAction<Message[]>>
  wizardState: TState
  setWizardState: Dispatch<SetStateAction<TState>>
  phasePlan: TPlan | null
  setPhasePlan: Dispatch<SetStateAction<TPlan | null>>

  // Recovery
  isInitialized: boolean
  showRecoveryPrompt: boolean
  draftAge: string

  // Actions
  startFresh(): void
  recover(): void
  clearDrafts(): void
}
```

### usePhaseGeneration

**Location:** `src/hooks/usePhaseGeneration.ts` (~437 lines)

Handles phase generation and context building:

```typescript
{
  isGeneratingPhases: boolean
  isRegeneration: boolean
  previousPlan: DynamicPhasePlan | null
  generatePhases(preGeneratedArchitecture?): Promise<void>
  buildConversationContext(): string
  convertRolesToUserRoles(): UserRole[] | undefined
  extractWorkflowsFromConversation(): Workflow[] | undefined
  formatPhasePlanMessage(plan, isUpdate?): string
}
```

**Context Building:**

- Uses `segmentConversation` for conversation analysis
- Uses `buildStructuredContext` for structured extraction
- Prioritizes high-importance segments for token efficiency

### useArchitectureGeneration

**Location:** `src/hooks/useArchitectureGeneration.ts`

Generates backend architecture before phase generation:

```typescript
{
  architectureSpec: ArchitectureSpec | null
  isGeneratingArchitecture: boolean
  architectureError: string | null
  needsBackend: boolean
  generateArchitecture(): Promise<void>
  clearArchitecture(): void
}
```

### usePlanRegeneration

**Location:** `src/hooks/usePlanRegeneration.ts`

Monitors concept changes and triggers automatic plan regeneration:

```typescript
{
  isRegenerating: boolean
  pendingRegeneration: boolean
  regenerationReason: string | null
  cancelRegeneration(): void
}
```

## API Routes

| Route                               | Method | Purpose                       |
| ----------------------------------- | ------ | ----------------------------- |
| `/api/wizard/chat`                  | POST   | Conversation with AI          |
| `/api/wizard/generate-architecture` | POST   | Generate backend architecture |
| `/api/wizard/generate-phases`       | POST   | Generate phase plan           |

## Wizard Flow

Sequential 3-phase generation pipeline:

1. **Conversation** - Natural chat to build app concept
   - AI extracts features, roles, workflows from conversation
   - User can import layout from Layout Builder
   - Draft auto-saved continuously

2. **Architecture Generation** - If backend needed
   - Generates database schema, API endpoints, auth strategy
   - User reviews in ArchitectureReviewPanel
   - Can regenerate if changes needed

3. **Phase Generation** - Create implementation plan
   - Builds complete AppConcept from wizard state
   - Generates DynamicPhasePlan for execution
   - Auto-regenerates if concept changes significantly

4. **Navigation** - Wizard complete → `router.push('/app/design')`
   - AppConcept saved to Zustand store
   - User proceeds to Layout Builder (LayoutBuilderView) for visual design

## AppConcept Type Structure

**Location:** `src/types/appConcept.ts`

```typescript
interface AppConcept {
  name: string;
  description: string;
  purpose: string;
  targetUsers: string;
  coreFeatures: Feature[];
  uiPreferences: UIPreferences;
  technical: TechnicalRequirements;
  roles?: UserRole[];
  workflows?: Workflow[];
  layoutDesign?: LayoutDesign; // From Layout Builder
  architectureSpec?: ArchitectureSpec; // From architecture generation
  conversationContext?: string; // Compressed conversation
  createdAt: string;
  updatedAt: string;
}

interface Feature {
  id: string;
  name: string;
  description: string;
  priority: 'must-have' | 'nice-to-have';
  complexity: 'simple' | 'moderate' | 'complex';
}
```

## State Management

State managed by `useDraftPersistence` hook (not useAppStore):

```typescript
// From useDraftPersistence
{
  messages: Message[]           // Conversation history
  wizardState: WizardState      // Extracted concept data
  phasePlan: DynamicPhasePlan   // Generated plan
}

// WizardState shape
{
  name?: string
  description?: string
  purpose?: string
  targetUsers?: string
  features: Feature[]
  technical: Partial<TechnicalRequirements>
  uiPreferences: Partial<UIPreferences>
  roles?: Role[]
  workflows?: Workflow[]
  isComplete: boolean
  readyForPhases: boolean
}
```

## Integration Points

- **Layout Builder** → Can import `layoutDesign` into AppConcept
- **Architecture Generation** → Generates `architectureSpec` before phases
- **DynamicPhaseGenerator** → Receives completed AppConcept
- **Navigation** → After completion, navigates to `/app/design` (LayoutBuilderView)
- **MainBuilderView** → Eventually receives phase plan for execution (via Zustand store)

## Critical Dependencies

- `useDraftPersistence` ← Prevents lost work on refresh
- `usePhaseGeneration` ← Bridges wizard to builder
- `useArchitectureGeneration` ← Sequential generation requires architecture first
- `usePlanRegeneration` ← Auto-updates plan on concept changes
- `appConcept.ts` types ← Contract with phase generator
- `conversationSegmentation.ts` ← Context compression utilities
- `structuredExtraction.ts` ← Structured context building
