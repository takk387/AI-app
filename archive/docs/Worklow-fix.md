Workflow Fix: Wizard → Design → AI Plan → Review → Builder
Summary
Fix 4 issues in the end-to-end workflow:

Layout builder ignores concept data — only 4 of 30+ AppConcept fields reach the pipeline
No "Generate Full Layout" feature — user must manually describe every page
AI planning is sequential, not parallel — intelligence gathering could start during Design
Phase regeneration doesn't include architecture — design page doesn't pass dualArchitectureResult
Navigation stays 5 steps per user preference. "Generate Full Layout" button appears in both header and chat panel.

Phase 1: Expand AppContext & Pass Full Concept to Layout Pipeline
Problem
AppContext in src/types/titanPipeline.ts:91-96 has only 4 fields. LayoutBuilderView.tsx:46-54 maps only name, colorScheme, primaryColor, style. TitanRouter and TitanBuilder never read appContext at all.

Changes

1. src/types/titanPipeline.ts — Expand AppContext interface (line 91)

export interface AppContext {
// Existing
name?: string;
colorScheme?: string;
primaryColor?: string;
style?: string;
// NEW: Rich concept data
description?: string;
purpose?: string;
targetUsers?: string;
layout?: 'single-page' | 'multi-page' | 'dashboard' | 'custom';
coreFeatures?: Array<{ id: string; name: string; description: string; priority: string }>;
needsAuth?: boolean;
needsDatabase?: boolean;
needsRealtime?: boolean;
needsFileUpload?: boolean;
roles?: Array<{ name: string; capabilities: string[] }>;
workflows?: Array<{ name: string; steps: string[]; involvedRoles: string[] }>;
// UI refinement
secondaryColor?: string;
accentColor?: string;
borderRadius?: string;
shadowIntensity?: string;
fontFamily?: string;
spacing?: string;
} 2. src/components/LayoutBuilderView.tsx — Map all concept fields (line 46-54)
Expand the useMemo to populate all new AppContext fields from appConcept.

3. src/services/TitanRouter.ts — Use appContext in routing (line 81-90)
   Add appContext summary to the Router prompt so it understands the app's scope:

App Context: ${input.appContext ? JSON.stringify({ name, features: ..., layout: ... }) : 'None'} 4. src/services/TitanBuilder.ts — Use appContext in code generation (line 141)

Add appContext?: AppContext parameter to assembleCode
Add an APP CONTEXT section to the prompt with features, pages, navigation, roles, colors
This allows the Builder to generate code that matches the concept 5. src/services/TitanPipelineService.ts — Thread appContext through pipeline (line 442)
Pass input.appContext to \_assembleCode() as the new parameter.

Files Modified: 5
src/types/titanPipeline.ts
src/components/LayoutBuilderView.tsx
src/services/TitanRouter.ts
src/services/TitanBuilder.ts
src/services/TitanPipelineService.ts
Phase 2: Add "Generate Full Layout" Capability
Problem
No way to auto-generate a full multi-page layout from the AppConcept. User must upload images or type instructions manually for each page.

Approach
Add a GENERATE mode to the pipeline. When triggered with no files, no existing code, and a rich appContext, the Router returns GENERATE mode. The Builder uses a specialized prompt to create a full multi-page React app with all pages implied by features, auth, roles, etc.

Changes

1. src/types/titanPipeline.ts — Add GENERATE mode (line 183)

mode: 'CREATE' | 'MERGE' | 'EDIT' | 'GENERATE'; 2. src/services/TitanRouter.ts — GENERATE detection (line 81-115)
Add to Router prompt:

- If NO files, NO current_code, AND appContext has features → mode: "GENERATE"
  Update fallback logic to detect GENERATE condition:

if (!input.currentCode && input.files.length === 0 && input.appContext?.coreFeatures?.length) {
return { mode: 'GENERATE', ... };
} 3. src/services/TitanBuilder.ts — GENERATE mode prompt
When strategy.mode === 'GENERATE', use a dedicated prompt section:

### GENERATE MODE — Build Complete App from Concept

Build a full multi-page React application based on this concept:

- App: {name} — {description}
- Pages needed: [derived from features + auth + roles]
- Navigation: [sidebar/top based on layout preference]
- Auth pages: [if needsAuth]
- Features: [list all with descriptions]
- Color scheme: [primary, secondary, accent]
- Style: [style preference]
- Roles: [if any, create role-specific views]

Generate App.tsx with React Router, all page components, shared navigation, and styles.css. 4. src/services/TitanPipelineService.ts — GENERATE pipeline path (line 325)
When mode is GENERATE:

Skip Surveyor (no images to analyze)
Skip Photographer (no assets to generate)
Go directly to Builder with the GENERATE prompt + appContext

if (strategy.mode === 'GENERATE') {
// Skip vision steps, go straight to Builder
files = await \_assembleCode(null, [], null, strategy, null, input.instructions, {}, undefined, undefined, input.appContext);
} 5. src/components/LayoutBuilderView.tsx — Add "Generate Full Layout" action
Add a handleGenerateFullLayout function that calls:

runPipeline([], 'Generate the complete app layout with all pages based on the concept', appContext);
Expose this to both the chat panel and parent design page.

6. src/components/layout-builder/LayoutBuilderChatPanel.tsx — Quick action card
   Add a "Generate from Concept" quick action in the welcome area (when no layout exists yet):

<button onClick={onGenerateFullLayout}>
  Generate Full Layout from Concept
</button>
Add onGenerateFullLayout?: () => void to the component's props.

7. src/app/(protected)/app/design/page.tsx — Header button
   Add a "Generate Full Layout" button in the header next to "Continue to AI Plan":

{appConcept && !currentLayoutManifest && (
<button onClick={handleGenerateFullLayout}>
Generate Full Layout
</button>
)}
This calls LayoutBuilderView's generate function via a ref or callback prop.

Files Modified: 5 existing + 0 new
src/types/titanPipeline.ts
src/services/TitanRouter.ts
src/services/TitanBuilder.ts
src/services/TitanPipelineService.ts
src/components/LayoutBuilderView.tsx
src/components/layout-builder/LayoutBuilderChatPanel.tsx
src/app/(protected)/app/design/page.tsx
Phase 3: Background Intelligence Gathering During Design
Problem
AI planning (5 stages) only starts when user navigates to /app/ai-plan. Stage 2 (Intelligence Gathering) only needs AppConcept and could run during layout design to save 15-30 seconds.

Approach
Start Stage 2 in the background when the Design page mounts. Cache the result in Zustand. When the AI Plan page starts, it passes the cached intelligence to skip Stage 2.

Changes

1. src/store/useAppStore.ts — Add intelligence cache state
   Add to DualPlanningSlice:

cachedIntelligence: IntelligenceContext | null;
setCachedIntelligence: (ctx: IntelligenceContext | null) => void;
Add to partialize (persisted). Add v4→v5 migration to handle new field.

2. Create src/hooks/useBackgroundIntelligence.ts (NEW ~80 lines)
   Hook that:

On mount, checks if cachedIntelligence exists in store
If not, fires POST /api/planning/intelligence with { concept }
Stores result via setCachedIntelligence
Idempotent (won't re-run if cached or in progress)
Invalidates cache if appConcept changes (by comparing concept hash) 3. Create src/app/api/planning/intelligence/route.ts (NEW ~60 lines)
API route that runs only LiveIntelligenceGathererService.gather(concept):

Accepts { concept: AppConcept }
Returns IntelligenceContext (search results, AI model recommendations)
Non-streaming (returns JSON, not SSE) 4. src/services/BackgroundPlanningOrchestrator.ts — Accept cached intelligence
Add optional cachedIntelligence parameter to runPipeline:

async runPipeline(
concept: AppConcept,
manifest: LayoutManifest,
emitProgress: (p: DualPlanProgress) => void,
cachedIntelligence?: IntelligenceContext
)
If cachedIntelligence is provided, skip Stage 2 and use it directly.

5. src/hooks/useDualAIPlan.ts — Pass cached intelligence
   Update startPlanning to read cachedIntelligence from store and include it in the planning session.

6. src/app/api/planning/start/route.ts — Accept cached intelligence in session
   Store cachedIntelligence in the planning session so the stream endpoint can pass it to the orchestrator.

7. src/lib/planningSessionStore.ts — Add intelligence to session type
   Add cachedIntelligence?: IntelligenceContext to PlanningSession interface.

8. src/app/api/planning/stream/[sessionId]/route.ts — Pass cached intelligence
   When creating the orchestrator, pass session.cachedIntelligence to runPipeline.

9. src/app/(protected)/app/design/page.tsx — Mount background intelligence hook

useBackgroundIntelligence(); // Starts Stage 2 in background
Add subtle status indicator: small icon showing intelligence gathering status.

Files Modified: 6 existing + 2 new
src/store/useAppStore.ts
src/services/BackgroundPlanningOrchestrator.ts
src/hooks/useDualAIPlan.ts
src/app/api/planning/start/route.ts
src/lib/planningSessionStore.ts
src/app/api/planning/stream/[sessionId]/route.ts
src/app/(protected)/app/design/page.tsx
NEW: src/hooks/useBackgroundIntelligence.ts
NEW: src/app/api/planning/intelligence/route.ts
Phase 4: Fix Phase Regeneration with Full Architecture Context
Problem
The design page calls generate-phases without dualArchitectureResult. The review page never regenerates phases after architecture arrives. So the DynamicPhaseGenerator never gets the full architecture context.

Approach
Add phase regeneration to the Review page that triggers when dualArchitectureResult arrives (or already exists on mount).

Changes

1. src/app/(protected)/app/review/page.tsx — Add architecture-aware phase regeneration
   Add a useEffect that regenerates phases when architecture result is available:

const [isRegeneratingPhases, setIsRegeneratingPhases] = useState(false);

useEffect(() => {
if (!dualArchitectureResult || !appConcept) return;
// Skip if phases already include architecture context
if (dynamicPhasePlan?.hasArchitectureContext) return;

setIsRegeneratingPhases(true);
fetch('/api/wizard/generate-phases', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
concept: appConcept,
dualArchitectureResult,
layoutBuilderFiles,
}),
})
.then(res => res.json())
.then(data => {
if (data.success && data.plan) {
data.plan.layoutBuilderFiles = layoutBuilderFiles ?? undefined;
data.plan.hasArchitectureContext = true;
setDynamicPhasePlan(data.plan);
}
})
.finally(() => setIsRegeneratingPhases(false));
}, [dualArchitectureResult, appConcept]); 2. src/types/dynamicPhases.ts — Add hasArchitectureContext flag
Add hasArchitectureContext?: boolean to DynamicPhasePlan to prevent double-regeneration.

3. src/components/review/PhasesCard.tsx — Add loading state
   Show a loading skeleton when isRegeneratingPhases is true:

{isRegeneratingPhases ? <PhasesLoadingSkeleton /> : <PhasesList phases={phases} />}
Add isLoading?: boolean prop to PhasesCard.

Files Modified: 3
src/app/(protected)/app/review/page.tsx
src/types/dynamicPhases.ts
src/components/review/PhasesCard.tsx
Implementation Order

Phase 1 (AppContext expansion) ← foundation, must go first
↓
Phase 2 (Generate Full Layout) ← depends on expanded AppContext
↓
Phase 3 (Background Intelligence) ← independent of Phases 1-2 but ordered for clarity
↓
Phase 4 (Phase Regeneration) ← depends on review page understanding
Total Files Changed
Category Count Files
Modified 15 titanPipeline.ts, LayoutBuilderView.tsx, TitanRouter.ts, TitanBuilder.ts, TitanPipelineService.ts, LayoutBuilderChatPanel.tsx, design/page.tsx, useAppStore.ts, BackgroundPlanningOrchestrator.ts, useDualAIPlan.ts, planning/start/route.ts, planningSessionStore.ts, planning/stream/[sessionId]/route.ts, review/page.tsx, dynamicPhases.ts
New 2 useBackgroundIntelligence.ts, api/planning/intelligence/route.ts
Also touched 1 review/PhasesCard.tsx
Verification Plan
After Each Phase

npm run typecheck && npm run lint && npm test
End-to-End Browser Test
Complete wizard → verify appConcept has features, roles, technical requirements
Arrive at Design page → verify "Generate Full Layout" button visible in header
Click "Generate Full Layout" → verify full multi-page layout generated with all pages from concept
Verify background intelligence indicator appears (Phase 3)
Click "Continue to AI Plan" → verify AI Plan skips Stage 2 (uses cached intelligence)
AI Plan completes → navigate to Review
Review page regenerates phases with architecture context → verify phases include architecture-informed tasks
"Proceed to Builder" → verify builder receives full context (layout + architecture + phases)
Phase 1 auto-injects layout → Phase 2+ builds features
Specific Checks
Layout builder receives all concept data (check network tab for /api/layout/pipeline request body)
GENERATE mode triggers when no files uploaded (check console for [TitanPipeline] Router strategy: { mode: 'GENERATE' })
Intelligence cached in store survives navigation (check Zustand devtools)
Phases regenerate only once on review (no infinite loop, hasArchitectureContext flag prevents re-trigger)
