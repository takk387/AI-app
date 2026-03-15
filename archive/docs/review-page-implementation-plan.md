# Review Page Implementation Plan (Final + PLAN Mode Enhancement)

**STATUS:** PLAN ONLY - No code changes until explicitly requested

**Created:** 2026-01-31
**Collaborators:** Claude, Gemini, Cline

---

## Summary

| Change           | Details                                |
| ---------------- | -------------------------------------- |
| Route            | `/app/build` → `/app/review`           |
| Label            | "3 Build" → "3 Review"                 |
| Purpose          | Execution → Read-only confirmation     |
| Layout Thumbnail | Capture on Design exit                 |
| **PLAN Mode**    | Can update concept + regenerate phases |

---

## Phase 1: Types

### 1.1 Review Types

**[NEW]** `src/types/reviewTypes.ts`

```typescript
export interface BuildSettings {
  autoAdvance: boolean;
}

export interface LayoutThumbnail {
  dataUrl: string;
  capturedAt: string;
}

// For PLAN mode concept updates
export interface ConceptUpdateRequest {
  type: 'add_feature' | 'modify_feature' | 'change_description' | 'full_update';
  changes: Partial<AppConcept>;
  regeneratePhases: boolean;
}

// For concept diff display
export interface ConceptChange {
  field: string;
  type: 'added' | 'removed' | 'modified';
  oldValue?: unknown;
  newValue?: unknown;
}

// API response type
export interface ConceptUpdateResponse {
  success: boolean;
  updatedConcept?: AppConcept;
  changes?: ConceptChange[];
  phasePlan?: DynamicPhasePlan;
  regeneratedAt?: string;
  error?: string;
  originalConcept?: AppConcept; // For verification on error
}
```

### 1.2 ChatMessage Extension

**[MODIFY]** `src/types/aiBuilderTypes.ts`

Add loading and error state properties to ChatMessage:

```diff
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  componentCode?: string;
  componentPreview?: boolean;
+ isLoading?: boolean;  // Show loading indicator
+ isError?: boolean;    // Style as error message
}
```

---

## Phase 2: Store Updates

**[MODIFY]** `src/store/useAppStore.ts`

Add to `DataSlice`:

```typescript
// Review state
isReviewed: boolean;
setIsReviewed: (reviewed: boolean) => void;

// Build settings
buildSettings: BuildSettings;
setBuildSettings: (settings: Partial<BuildSettings>) => void;

// Layout thumbnail
layoutThumbnail: LayoutThumbnail | null;
setLayoutThumbnail: (thumbnail: LayoutThumbnail | null) => void;

// Phase plan metadata (for staleness detection)
phasePlanGeneratedAt: string | null;
setPhasePlanGeneratedAt: (timestamp: string | null) => void;
```

Default values:

```typescript
isReviewed: false,
buildSettings: { autoAdvance: true },
layoutThumbnail: null,
phasePlanGeneratedAt: null,
```

---

## Phase 3: Route & Navigation

**[MOVE]** Directory: `src/app/(protected)/app/build/` → `src/app/(protected)/app/review/`

**[MODIFY]** `src/components/AppNavigation.tsx` (lines 45-60)

```diff
- href: '/app/build',
- label: 'Build',
- description: 'Generate code',
+ href: '/app/review',
+ label: 'Review',
+ description: 'Review & confirm',
```

Icon: Change to checkmark circle (`M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z`)

---

## Phase 4: Design Page Updates

**[MODIFY]** `src/components/layout-builder/LayoutCanvas.tsx`

Add capturable element ID:

```typescript
<div id="layout-builder-preview" className="...">
  {/* existing Sandpack content */}
</div>
```

**[MODIFY]** `src/app/(protected)/app/design/page.tsx`

```typescript
import { captureLayoutPreview } from '@/utils/screenshotCapture';

const handleContinueToReview = useCallback(async () => {
  try {
    const result = await captureLayoutPreview('layout-builder-preview');
    if (result?.success && result.dataUrl) {
      setLayoutThumbnail({
        dataUrl: result.dataUrl,
        capturedAt: new Date().toISOString(),
      });
    }
  } catch (e) {
    console.warn('Failed to capture layout thumbnail:', e);
  }

  router.push('/app/review');
}, [router, setLayoutThumbnail]);
```

Button text: `"Continue to Review"`

---

## Phase 5: Review Page Rewrite

**[REWRITE]** `src/app/(protected)/app/review/page.tsx`

Remove:

- `useDynamicBuildPhases` hook
- All execution controls
- `PhasedBuildPanel`

New structure:

```typescript
export default function ReviewPage() {
  const router = useRouter();
  const appConcept = useAppStore((s) => s.appConcept);
  const dynamicPhasePlan = useAppStore((s) => s.dynamicPhasePlan);
  const layoutThumbnail = useAppStore((s) => s.layoutThumbnail);
  const { buildSettings, setBuildSettings, setIsReviewed } = useAppStore();

  if (!appConcept) return <EmptyState type="no-concept" />;

  return (
    <div className="review-page">
      <Header appName={appConcept.name} />

      <Grid cols={2}>
        <ConceptCard concept={appConcept} onEdit={() => router.push('/app/wizard')} />
        <LayoutCard thumbnail={layoutThumbnail} onEdit={() => router.push('/app/design')} />
      </Grid>

      <FeaturesCard features={appConcept.features} />

      {dynamicPhasePlan ? (
        <PhasesCard phases={dynamicPhasePlan.phases} />
      ) : (
        <EmptyState type="no-phases" />
      )}

      <SettingsCard settings={buildSettings} onChange={setBuildSettings} />

      <Button onClick={() => { setIsReviewed(true); router.push('/app'); }}>
        Proceed to Builder →
      </Button>
    </div>
  );
}
```

---

## Phase 6: Review Components

**[NEW]** `src/components/review/`

| File               | Purpose                                         |
| ------------------ | ----------------------------------------------- |
| `ConceptCard.tsx`  | App name, description, "Edit in Wizard" link    |
| `LayoutCard.tsx`   | Thumbnail image or fallback, "Edit Design" link |
| `FeaturesCard.tsx` | Priority-sorted feature list                    |
| `PhasesCard.tsx`   | Read-only phase list with estimates             |
| `SettingsCard.tsx` | Build settings (autoAdvance toggle)             |
| `EmptyState.tsx`   | Handles no-concept and no-phases states         |
| `index.ts`         | Barrel export                                   |

---

## Phase 7: Builder Integration

**[MODIFY]** `src/components/MainBuilderView.tsx`

Line ~355 - Use build settings:

```diff
const dynamicBuildPhases = useDynamicBuildPhases({
- autoAdvance: true,
+ autoAdvance: buildSettings.autoAdvance,
  onPhaseComplete: ...
});
```

Lines ~779-787 - Gate auto-start on `isReviewed`:

```diff
useEffect(() => {
  if (
    currentMode === 'ACT' &&
+   isReviewed &&
    dynamicBuildPhases.plan &&
    ...
  ) {
    dynamicBuildPhases.startPhase(1);
  }
-}, [...]);
+}, [..., isReviewed]);
```

---

## Phase 8: PLAN Mode Enhancement (Option A)

**Purpose:** Allow users to update concept and regenerate phases directly in Builder's PLAN mode, without navigating back through the flow.

### 8.1 New API Route

**[NEW]** `src/app/api/builder/update-concept/route.ts`

```typescript
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { DynamicPhaseGenerator } from '@/services/DynamicPhaseGenerator';
import type { AppConcept } from '@/types/appConcept';

// Initialize Anthropic client
const anthropic = new Anthropic();

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

interface UpdateConceptRequest {
  currentConcept: AppConcept;
  userMessage: string; // Natural language request
  regeneratePhases: boolean;
}

export async function POST(request: Request) {
  const { currentConcept, userMessage, regeneratePhases } = await request.json();

  try {
    // 1. Use Claude to interpret the user's request and update concept
    const updatedConcept = await interpretConceptUpdate(currentConcept, userMessage);

    // 2. Generate diff for confirmation (returned to client)
    const changes = generateConceptDiff(currentConcept, updatedConcept);

    // 3. Optionally regenerate phases
    let newPhasePlan = null;
    if (regeneratePhases) {
      const generator = new DynamicPhaseGenerator();
      newPhasePlan = await generator.generatePhasePlan(updatedConcept);
    }

    return NextResponse.json({
      success: true,
      updatedConcept,
      changes, // Diff for UI confirmation
      phasePlan: newPhasePlan,
      regeneratedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Concept update failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update concept',
        // Return original concept so client can verify no corruption
        originalConcept: currentConcept,
      },
      { status: 500 }
    );
  }
}

interface ConceptChange {
  field: string;
  type: 'added' | 'removed' | 'modified';
  oldValue?: unknown;
  newValue?: unknown;
}

function generateConceptDiff(original: AppConcept, updated: AppConcept): ConceptChange[] {
  const changes: ConceptChange[] = [];

  // Check name change
  if (original.name !== updated.name) {
    changes.push({
      field: 'name',
      type: 'modified',
      oldValue: original.name,
      newValue: updated.name,
    });
  }

  // Check description change
  if (original.description !== updated.description) {
    changes.push({
      field: 'description',
      type: 'modified',
      oldValue: original.description,
      newValue: updated.description,
    });
  }

  // Check features
  const originalFeatures = new Set(original.features?.map((f) => f.name) || []);
  const updatedFeatures = new Set(updated.features?.map((f) => f.name) || []);

  updated.features?.forEach((f) => {
    if (!originalFeatures.has(f.name)) {
      changes.push({ field: `feature: ${f.name}`, type: 'added', newValue: f });
    }
  });

  original.features?.forEach((f) => {
    if (!updatedFeatures.has(f.name)) {
      changes.push({ field: `feature: ${f.name}`, type: 'removed', oldValue: f });
    }
  });

  return changes;
}

async function interpretConceptUpdate(
  current: AppConcept,
  userMessage: string
): Promise<AppConcept> {
  const systemPrompt = `You are updating an app concept based on a user request.

Current concept:
${JSON.stringify(current, null, 2)}

Rules:
- Only modify fields relevant to the user's request
- Preserve all other fields exactly as they are
- Return valid JSON matching the AppConcept schema
- For new features, generate appropriate priority (1-5) and description
- For feature removal, filter out the matching feature
- Maintain consistency with existing app theme and purpose

User request: "${userMessage}"

Return ONLY the updated concept as valid JSON. No explanation, no markdown.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{ role: 'user', content: systemPrompt }],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type');
  }

  return JSON.parse(content.text) as AppConcept;
}
```

### 8.2 PLAN Mode UI Enhancement

**[MODIFY]** `src/components/MainBuilderView.tsx`

Add concept update detection in PLAN mode chat with confirmation and error handling:

```typescript
// State for confirmation dialog
const [pendingConceptUpdate, setPendingConceptUpdate] = useState<{
  changes: ConceptChange[];
  updatedConcept: AppConcept;
  phasePlan: DynamicPhasePlan | null;
} | null>(null);

// In handleSendMessage or equivalent
const handlePlanModeMessage = async (message: string) => {
  // INVERTED LOGIC: Detect non-concept messages (smaller set)
  // Everything else defaults to concept interpretation
  const isExplicitlyNotConceptChange = detectNonConceptIntent(message);

  if (isExplicitlyNotConceptChange) {
    // Handle questions, info requests, etc.
    handleNormalPlanChat(message);
    return;
  }

  // Default: Treat as potential concept change
  // Snapshot current state for rollback
  const previousConcept = appConcept;
  const previousPhasePlan = dynamicPhasePlan;

  try {
    // Show loading state
    addChatMessage({
      role: 'assistant',
      content: 'Analyzing your request...',
      isLoading: true,
    });

    // Call update API (initially without regenerating phases)
    const response = await fetch('/api/builder/update-concept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentConcept: appConcept,
        userMessage: message,
        regeneratePhases: false, // First get the diff
      }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to update concept');
    }

    // If no changes detected, respond conversationally
    if (!data.changes || data.changes.length === 0) {
      addChatMessage({
        role: 'assistant',
        content:
          "I didn't detect any concept changes in your message. Could you clarify what you'd like to modify? For example: 'Add a dark mode feature' or 'Change the app name to TaskMaster'.",
      });
      return;
    }

    // Show confirmation dialog with diff
    setPendingConceptUpdate({
      changes: data.changes,
      updatedConcept: data.updatedConcept,
      phasePlan: null,
    });
  } catch (error) {
    // Rollback on error
    setAppConcept(previousConcept);
    setDynamicPhasePlan(previousPhasePlan);

    addChatMessage({
      role: 'assistant',
      content: `Failed to update concept: ${error instanceof Error ? error.message : 'Unknown error'}. No changes were made.`,
      isError: true,
    });
  }
};

// Confirm and apply the pending update
const confirmConceptUpdate = async (regeneratePhases: boolean) => {
  if (!pendingConceptUpdate) return;

  const previousConcept = appConcept;
  const previousPhasePlan = dynamicPhasePlan;

  try {
    // Apply the concept update
    setAppConcept(pendingConceptUpdate.updatedConcept);

    // Regenerate phases if requested
    if (regeneratePhases) {
      const response = await fetch('/api/builder/update-concept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentConcept: pendingConceptUpdate.updatedConcept,
          userMessage: '', // Empty - just regenerating
          regeneratePhases: true,
        }),
      });

      const data = await response.json();
      if (data.phasePlan) {
        setDynamicPhasePlan(data.phasePlan);
        setPhasePlanGeneratedAt(new Date().toISOString());
      }
    }

    // Success message
    addChatMessage({
      role: 'assistant',
      content: `Concept updated successfully.${regeneratePhases ? ' Phases regenerated.' : ''} Switch to ACT mode when ready to build.`,
    });

    setPendingConceptUpdate(null);
  } catch (error) {
    // Rollback on error
    setAppConcept(previousConcept);
    setDynamicPhasePlan(previousPhasePlan);

    addChatMessage({
      role: 'assistant',
      content: `Phase regeneration failed: ${error instanceof Error ? error.message : 'Unknown error'}. Concept reverted to previous state.`,
      isError: true,
    });

    setPendingConceptUpdate(null);
  }
};

// Cancel the pending update
const cancelConceptUpdate = () => {
  setPendingConceptUpdate(null);
  addChatMessage({
    role: 'assistant',
    content: 'Concept update cancelled. No changes were made.',
  });
};

/**
 * INVERTED LOGIC: Detect messages that are NOT concept changes
 * This is a smaller, more predictable set than trying to detect all concept changes
 *
 * Non-concept messages include:
 * - Questions (what, how, why, etc.)
 * - Information requests (help, show, list)
 * - Messages ending with question marks
 */
function detectNonConceptIntent(message: string): boolean {
  const trimmed = message.trim();

  const nonConceptPatterns = [
    /^(what|how|why|when|where|who|which|can you|could you|would you|will you|do you|is there|are there)\b/i,
    /^(explain|tell me|show me|help|list|display|describe)\b/i,
    /^(thanks|thank you|ok|okay|got it|understood|i see)\b/i,
    /\?$/, // Ends with question mark
  ];

  return nonConceptPatterns.some((p) => p.test(trimmed));
}
```

### 8.3 Confirmation Dialog Component

**[NEW]** `src/components/modals/ConceptUpdateConfirmDialog.tsx`

```typescript
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import type { ConceptChange } from '@/types/reviewTypes';

interface Props {
  isOpen: boolean;
  changes: ConceptChange[];
  onConfirm: (regeneratePhases: boolean) => void;
  onCancel: () => void;
}

export function ConceptUpdateConfirmDialog({ isOpen, changes, onConfirm, onCancel }: Props) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <div className="p-6 max-w-md">
        <h3 className="text-lg font-semibold mb-4">Confirm Concept Changes</h3>

        <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
          {changes.map((change, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <span className={`
                px-1.5 py-0.5 rounded text-xs font-medium
                ${change.type === 'added' ? 'bg-green-100 text-green-700' : ''}
                ${change.type === 'removed' ? 'bg-red-100 text-red-700' : ''}
                ${change.type === 'modified' ? 'bg-yellow-100 text-yellow-700' : ''}
              `}>
                {change.type}
              </span>
              <span className="font-medium">{change.field}</span>
              {change.type === 'modified' && (
                <span className="text-gray-500">
                  "{String(change.oldValue)}" → "{String(change.newValue)}"
                </span>
              )}
            </div>
          ))}
        </div>

        <p className="text-sm text-gray-600 mb-4">
          These changes may require regenerating the build phases.
        </p>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={() => onConfirm(false)}>
            Apply Without Regenerating
          </Button>
          <Button variant="primary" onClick={() => onConfirm(true)}>
            Apply & Regenerate Phases
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
```

### 8.4 Regenerate Phases Button

**[MODIFY]** `src/components/MainBuilderView.tsx`

Add explicit regenerate button in PLAN mode header:

```typescript
{currentMode === 'PLAN' && (
  <button
    onClick={handleRegeneratePhases}
    className="flex items-center text-sm text-purple-600 hover:text-purple-700"
  >
    <RefreshCw className="w-4 h-4 mr-1" />
    Regenerate Phases
  </button>
)}

const handleRegeneratePhases = async () => {
  if (!appConcept) return;

  const previousPhasePlan = dynamicPhasePlan;

  try {
    addChatMessage({
      role: 'assistant',
      content: 'Regenerating phases...',
      isLoading: true,
    });

    const response = await fetch('/api/wizard/generate-phases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ concept: appConcept }),
    });

    const data = await response.json();
    setDynamicPhasePlan(data.phasePlan);
    setPhasePlanGeneratedAt(new Date().toISOString());

    addChatMessage({
      role: 'assistant',
      content: `Phases regenerated: ${data.phasePlan.phases.length} phases created.`,
    });
  } catch (error) {
    setDynamicPhasePlan(previousPhasePlan);
    addChatMessage({
      role: 'assistant',
      content: `Failed to regenerate phases: ${error instanceof Error ? error.message : 'Unknown error'}`,
      isError: true,
    });
  }
};
```

---

## Files Summary

| Action  | File                                                   |
| ------- | ------------------------------------------------------ |
| NEW     | `src/types/reviewTypes.ts`                             |
| MODIFY  | `src/types/aiBuilderTypes.ts`                          |
| MODIFY  | `src/store/useAppStore.ts`                             |
| MOVE    | `src/app/(protected)/app/build/` → `review/`           |
| MODIFY  | `src/components/AppNavigation.tsx`                     |
| MODIFY  | `src/components/layout-builder/LayoutCanvas.tsx`       |
| MODIFY  | `src/app/(protected)/app/design/page.tsx`              |
| REWRITE | `src/app/(protected)/app/review/page.tsx`              |
| NEW     | `src/components/review/ConceptCard.tsx`                |
| NEW     | `src/components/review/LayoutCard.tsx`                 |
| NEW     | `src/components/review/FeaturesCard.tsx`               |
| NEW     | `src/components/review/PhasesCard.tsx`                 |
| NEW     | `src/components/review/SettingsCard.tsx`               |
| NEW     | `src/components/review/EmptyState.tsx`                 |
| NEW     | `src/components/review/index.ts`                       |
| MODIFY  | `src/components/MainBuilderView.tsx`                   |
| NEW     | `src/app/api/builder/update-concept/route.ts`          |
| NEW     | `src/components/modals/ConceptUpdateConfirmDialog.tsx` |

**Total: 18 files** (10 new, 7 modify, 1 move)

---

## Verification Checklist

### Review Page

- [ ] Navigate: Wizard → Design → Review → Builder
- [ ] Confirm step 3 shows "Review" with checkmark icon
- [ ] Verify layout thumbnail appears in Review
- [ ] Verify no build controls in Review
- [ ] Verify "Edit" links navigate to Wizard/Design
- [ ] Verify build settings persist to Builder
- [ ] Verify Builder won't auto-start until `isReviewed` is true

### PLAN Mode Concept Updates

- [ ] In PLAN mode, say "Add a notifications feature"
- [ ] Verify confirmation dialog shows with diff
- [ ] Verify "Apply Without Regenerating" updates concept only
- [ ] Verify "Apply & Regenerate Phases" updates both
- [ ] Verify "Cancel" makes no changes
- [ ] Verify "Regenerate Phases" button works independently

### Inverted Detection Logic

- [ ] Say "I want dark mode" → should detect as concept change
- [ ] Say "Add authentication" → should detect as concept change
- [ ] Say "What features do I have?" → should NOT trigger concept update
- [ ] Say "How does this work?" → should NOT trigger concept update
- [ ] Say "Thanks!" → should NOT trigger concept update
- [ ] If no changes detected → verify "no changes detected" message appears

### Error Handling & Rollback

- [ ] Simulate API error during concept update → verify rollback
- [ ] Simulate API error during phase regeneration → verify concept rollback
- [ ] Verify error messages display in chat
- [ ] Verify no state corruption after errors

---

## Flow Diagram

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────────────────────┐
│ Wizard  │ ──► │ Design  │ ──► │ Review  │ ──► │        Builder          │
│         │     │         │     │         │     │  ┌─────────┐ ┌────────┐ │
│ Create  │     │ Layout  │     │ Confirm │     │  │  PLAN   │ │  ACT   │ │
│ Concept │     │ Design  │     │ & Edit  │     │  │  Mode   │ │  Mode  │ │
└─────────┘     └─────────┘     └─────────┘     │  │         │ │        │ │
                                                │  │ Update  │ │Execute │ │
     ▲               ▲                          │  │ Concept │ │ Phases │ │
     │               │                          │  │ Regen   │ │        │ │
     │               │                          │  │ Phases  │ │        │ │
     └───────────────┴──── "Edit" links ────────│  └─────────┘ └────────┘ │
                                                └─────────────────────────┘
                                                          │
                                                          ▼
                                                   Minor changes?
                                                   Stay in Builder!
```

---

## Design Decisions

### Gemini's Additions (Post-Review)

After initial plan review, Gemini identified 3 critical production requirements:

1. **Prompt Engineering** - Added structured system prompt for `interpretConceptUpdate()` to ensure consistent, predictable AI responses
2. **Confirmation UX** - Added diff display before applying changes so users see exactly what's changing
3. **Error Handling + Rollback** - Added try/catch with state rollback to prevent corruption if API calls fail

These additions are reflected in Phase 8.1, 8.2, and 8.3.

### Cline's Final Review Additions

After Cline's final review, these fixes were incorporated:

1. **Anthropic Client Import** - Added `import Anthropic from '@anthropic-ai/sdk'` and client initialization to Phase 8.1
2. **ChatMessage Type Extension** - Added `isLoading` and `isError` optional properties (Phase 1.2)
3. **Feature.name Verified** - Confirmed `Feature` interface has `name` property in `appConcept.ts:48`

**Note on Model Version:** The plan uses `claude-sonnet-4-20250514`. Verify this is the current model ID at implementation time.

### Gemini's Final Review: Inverted Detection Logic

Gemini identified that the original `detectConceptChangeIntent` regex patterns were brittle and would miss edge cases like:

- "I want dark mode" (no "feature" keyword)
- "Remove the login page" ("page" not "feature")
- "Add authentication" (missing explicit keywords)

**Solution: Invert the logic.** Instead of detecting concept changes (large, unpredictable set), detect NON-concept messages (small, predictable set):

- Questions: "What...", "How...", "Why..."
- Info requests: "Help", "Show me", "Explain"
- Acknowledgments: "Thanks", "Got it"
- Messages ending with "?"

Everything else defaults to concept interpretation. If Claude detects no changes, a friendly "no changes detected" message is shown. The confirmation dialog serves as the safety net.

### Why no `isReviewed` reset logic?

The Builder is a full editing environment with:

- Chat interface for natural language modifications
- PLAN/ACT mode switching
- Code editor with undo/redo
- Version history

Users can make changes directly in Builder. Only major architectural changes (new concept, complete redesign) require navigating back to Wizard/Design.

### Why PLAN mode handles concept updates?

Instead of forcing users back through Wizard → Design → Review for minor changes, PLAN mode can:

1. Interpret natural language requests
2. Update the AppConcept
3. Regenerate phases if needed
4. Keep user in Builder context

This provides a seamless experience for iterative development.
