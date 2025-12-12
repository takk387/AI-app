# AI App Builder - Complete Architecture Analysis

> Generated: December 2024
> Purpose: Comprehensive documentation of the AI App Builder architecture and SDK Agent integration plan

---

## Table of Contents

1. [Project Statistics](#project-statistics)
2. [Complete Architecture](#complete-architecture)
3. [Two Pathways](#two-pathways)
4. [Key Components](#key-components)
5. [Services](#services)
6. [Hooks](#hooks)
7. [API Routes](#api-routes)
8. [Data Flow](#data-flow)
9. [SDK Agent Integration Plan](#sdk-agent-integration-plan)

---

## Project Statistics

| Category               | Count                          |
| ---------------------- | ------------------------------ |
| Total TypeScript files | 343                            |
| React Components       | 128                            |
| Services               | 28 (+ 5 analyzers)             |
| Custom Hooks           | 28                             |
| Utilities              | 60                             |
| API Routes             | 27                             |
| Type Definitions       | 16                             |
| Data/Presets           | 16 (including 6 app templates) |

### Directory Structure

```
src/
├── app/                    # Next.js 15 App Router
│   ├── api/               # 27 API routes
│   ├── login/, signup/    # Auth pages
│   └── page.tsx           # Main entry
├── components/            # 128 React components
│   ├── AIBuilder.tsx      # Main orchestrator
│   ├── NaturalConversationWizard.tsx  # Detailed concept design
│   ├── LayoutBuilderWizard.tsx        # Detailed visual design
│   ├── ChatPanel.tsx      # Main builder chat
│   ├── PreviewPanel.tsx   # Live preview
│   ├── build/             # Build UI components
│   ├── conversation-wizard/
│   ├── layout-builder/    # 13+ sub-components
│   ├── modals/            # Modal dialogs
│   ├── preview/           # Preview components
│   ├── review/            # Code review UI
│   ├── storage/           # File storage UI
│   └── ui/                # Base UI components
├── services/              # 28+ services
│   ├── DynamicPhaseGenerator.ts    # Phase plan creation (1,847 lines)
│   ├── PhaseExecutionManager.ts    # Phase execution (1,522 lines)
│   ├── CodeParser.ts               # Tree-sitter AST
│   ├── AutoFixEngine.ts            # Auto-fix issues
│   ├── CodeReviewService.ts        # Quality review
│   ├── analyzers/                  # 5 specialized analyzers
│   └── [external services]         # Colormind, Iconify, Lottie, etc.
├── hooks/                 # 28 custom hooks
│   ├── useLayoutBuilder.ts         # Layout design state (1,287 lines)
│   ├── useDynamicBuildPhases.ts    # Phase execution wrapper
│   ├── usePhaseGeneration.ts       # Wizard → phase generation
│   └── [20+ more hooks]
├── store/                 # Zustand store (8 slices)
├── types/                 # 16 type definition files
├── utils/                 # 60 utility modules
├── prompts/               # AI system prompts
└── data/                  # Presets & templates
    ├── animationPresets.ts
    ├── advancedEffectsPresets.ts
    ├── componentStatePresets.ts
    ├── designTemplates.ts
    └── templates/         # 6 app templates
```

---

## Complete Architecture

```
╔═══════════════════════════════════════════════════════════════════════════════════╗
║                         MAIN BUILDER (AIBuilder.tsx)                               ║
║                    Can build layouts AND concepts directly                         ║
╠═══════════════════════════════════════════════════════════════════════════════════╣
║                                                                                    ║
║  CHAT-BASED DESIGN:                                                               ║
║                                                                                    ║
║  PLAN Mode ──► /api/wizard/chat                                                   ║
║    • Build AppConcept through conversation                                        ║
║    • Define features, roles, workflows                                            ║
║    • Set technical requirements                                                   ║
║                                                                                    ║
║  ACT Mode ──► /api/builder/chat (Builder Expert)                                  ║
║    • Extended thinking for intent detection                                       ║
║    • Routes to:                                                                    ║
║      ├── shouldTriggerBuild ──► /api/ai-builder/full-app-stream                  ║
║      ├── shouldTriggerModify ──► /api/ai-builder/modify                          ║
║      └── shouldTriggerDesign ──► /api/builder/design-chat                        ║
║                                                                                    ║
║  Design Chat (same tools as Layout Builder):                                      ║
║    • Claude vision (screenshots)                                                  ║
║    • Colormind palettes                                                           ║
║    • Iconify icons                                                                ║
║    • Lottie animations                                                            ║
║    • Font identification                                                          ║
║    • Accessibility audit                                                          ║
║    • v0 component generation                                                      ║
║    • DALL-E backgrounds                                                           ║
║                                                                                    ║
║  MAIN BUILDER'S OWN PHASE GENERATION:                                             ║
║                                                                                    ║
║  /api/ai-builder/plan-phases (SIMPLER)                                            ║
║    • Parses conversation + prompt                                                 ║
║    • Returns 2-5 simple phases                                                    ║
║    • No domain classification                                                     ║
║    • Quick prototyping workflow                                                   ║
║                                                                                    ║
╚═══════════════════════════════════════════════════════════════════════════════════╝


╔═══════════════════════════════════════════════════════════════════════════════════╗
║                    SEPARATE WIZARDS (For Detailed Design)                          ║
╠═══════════════════════════════════════════════════════════════════════════════════╣
║                                                                                    ║
║  LAYOUT BUILDER WIZARD              NATURAL CONVERSATION WIZARD                   ║
║  (Separate Component)               (Separate Component)                          ║
║                                                                                    ║
║  Purpose: DETAILED visual           Purpose: DETAILED concept                     ║
║  design for every aspect            design through deep conversation              ║
║                                                                                    ║
║  Features:                          Features:                                     ║
║  • AI vision (screenshots)          • Real Claude conversations                   ║
║  • Reference image upload           • Feature extraction                          ║
║  • Video analysis                   • Role definition                             ║
║  • Color extraction                 • Workflow capture                            ║
║  • All external services            • User stories                                ║
║  • Typography panel                 • Acceptance criteria                         ║
║  • Animation timeline               • Technical requirements                      ║
║  • Dark mode editor                 • Validation rules                            ║
║  • Breakpoint editor                • Integration points                          ║
║  • Layer panel                                                                    ║
║  • State preview                    Can IMPORT LayoutDesign                       ║
║  • Performance reports              from store (joining point)                    ║
║  • Accessibility checks                                                           ║
║                                                                                    ║
║  Output: LayoutDesign               Output: WizardState                           ║
║  → stored in currentLayoutDesign    + importedLayoutDesign                        ║
║    (Zustand store)                                                                ║
║                                                                                    ║
║                        ↓ JOIN: Layout imported into wizard ↓                      ║
║                                                                                    ║
║  ┌─────────────────────────────────────────────────────────────────────────────┐  ║
║  │                      JOINED: Complete AppConcept                             │  ║
║  │                                                                              │  ║
║  │  usePhaseGeneration hook builds:                                            │  ║
║  │  {                                                                           │  ║
║  │    name, description, purpose, targetUsers                                  │  ║
║  │    coreFeatures: [...detailed features...]                                  │  ║
║  │    uiPreferences: {...}                                                     │  ║
║  │    technical: {...}                                                         │  ║
║  │    roles: [...from wizard...]                                               │  ║
║  │    workflows: [...from wizard...]                                           │  ║
║  │    conversationContext: "full extracted context"                            │  ║
║  │    layoutDesign: importedLayoutDesign  ← FROM LAYOUT BUILDER                │  ║
║  │  }                                                                           │  ║
║  └─────────────────────────────────────────────────────────────────────────────┘  ║
║                                         │                                         ║
║                                         ▼                                         ║
║  ┌─────────────────────────────────────────────────────────────────────────────┐  ║
║  │              /api/wizard/generate-phases (COMPREHENSIVE)                     │  ║
║  │                                                                              │  ║
║  │  Uses: DynamicPhaseGenerator service (1,847 lines)                          │  ║
║  │        + PhaseContextExtractor                                              │  ║
║  │                                                                              │  ║
║  │  Capabilities:                                                               │  ║
║  │  • 2-25+ phases based on complexity                                         │  ║
║  │  • 17 feature domains                                                       │  ║
║  │  • Token budgeting (16KB max, 5KB target per phase)                         │  ║
║  │  • Dependency graph calculation                                             │  ║
║  │  • Phase-specific context extraction                                        │  ║
║  │  • Preserves full LayoutDesign in PhaseConceptContext                       │  ║
║  └─────────────────────────────────────────────────────────────────────────────┘  ║
║                                         │                                         ║
║                                         ▼                                         ║
║                          DynamicPhasePlan (2-25+ phases)                          ║
║                                         │                                         ║
╚═════════════════════════════════════════╪═════════════════════════════════════════╝
                                          │
                                          ▼
╔═══════════════════════════════════════════════════════════════════════════════════╗
║                     MAIN BUILDER EXECUTES THE PLAN                                 ║
╠═══════════════════════════════════════════════════════════════════════════════════╣
║                                                                                    ║
║  useDynamicBuildPhases Hook (wraps PhaseExecutionManager)                         ║
║                                                                                    ║
║  For each phase:                                                                   ║
║    1. startPhase(phaseNumber)                                                     ║
║    2. getExecutionContext() → formatLayoutDesignForPrompt()                       ║
║    3. /api/ai-builder/full-app-stream (SSE)                                       ║
║    4. completePhase(result) → accumulate context                                  ║
║    5. Quality review if enabled                                                   ║
║                                                                                    ║
║  Validation Layer:                                                                 ║
║    • codeValidator.ts (Tree-sitter AST)                                           ║
║    • AutoFixEngine.ts (auto-fix issues)                                           ║
║    • CodeReviewService.ts (5 analyzers)                                           ║
║                                                                                    ║
║  Output:                                                                           ║
║    • Sandpack Preview (live execution)                                            ║
║    • Version Control (undo/redo/fork)                                             ║
║    • Supabase Storage                                                             ║
║                                                                                    ║
╚═══════════════════════════════════════════════════════════════════════════════════╝
```

---

## Two Pathways

### Pathway 1: Main Builder Direct (Quick Prototyping)

```
Main Builder chat
       │
       ▼
/api/ai-builder/plan-phases
       │
       ▼
2-5 simple phases (no domain classification)
       │
       ▼
Execute with PhaseExecutionManager
```

**Use case:** Quick prototypes, simple apps, fast iteration

### Pathway 2: Wizards → Join → Comprehensive (Detailed Apps)

```
Layout Builder Wizard ─────┐
  (detailed LayoutDesign)  │
                           │  JOIN via Zustand store
Natural Wizard ────────────┤
  (detailed WizardState)   │
                           ▼
              Complete AppConcept
              (with layoutDesign merged)
                           │
                           ▼
          /api/wizard/generate-phases
          (DynamicPhaseGenerator)
                           │
                           ▼
          DynamicPhasePlan (2-25+ phases)
          • 17 feature domains
          • Token budgeting
          • Dependency graph
          • Full context preservation
                           │
                           ▼
          Main Builder executes
          (PhaseExecutionManager)
```

**Use case:** Complex apps, detailed design requirements, production-quality output

---

## Key Components

### Main Components

| Component                       | Purpose                                            | Lines  |
| ------------------------------- | -------------------------------------------------- | ------ |
| `AIBuilder.tsx`                 | Main orchestrator, mode switching, phase execution | 1,500+ |
| `NaturalConversationWizard.tsx` | Detailed concept design through conversation       | 630+   |
| `LayoutBuilderWizard.tsx`       | Visual design with AI vision                       | 1,830+ |
| `ChatPanel.tsx`                 | Chat interface for main builder                    | 400+   |
| `PreviewPanel.tsx`              | Live Sandpack preview                              | 200+   |

### Component Directories

- `build/` - Build UI components
- `conversation-wizard/` - Wizard sub-components
- `layout-builder/` - 13+ layout builder sub-components
- `modals/` - Modal dialogs
- `preview/` - Preview components
- `review/` - Code review UI
- `storage/` - File storage UI
- `ui/` - Base UI components

---

## Services

| Service                        | Purpose                         | Lines |
| ------------------------------ | ------------------------------- | ----- |
| `DynamicPhaseGenerator.ts`     | Creates 2-25+ phase plans       | 1,847 |
| `PhaseExecutionManager.ts`     | Executes phases with context    | 1,522 |
| `CodeParser.ts`                | Tree-sitter AST parsing         | 1,067 |
| `CodeContextService.ts`        | Smart context management        | 800+  |
| `AutoFixEngine.ts`             | Auto-fix common issues          | 400+  |
| `CodeReviewService.ts`         | Quality review pipeline         | 600+  |
| `StorageService.ts`            | Supabase file storage           | 831   |
| `ImpactAnalyzer.ts`            | Change impact analysis          | 300+  |
| `designReplicator.ts`          | Extract design from screenshots | 500+  |
| `colormindService.ts`          | Color palette generation        | 200+  |
| `iconifyService.ts`            | Icon search (100+ sets)         | 150+  |
| `lottieService.ts`             | Animation search                | 100+  |
| `fontIdentificationService.ts` | Font identification             | 200+  |
| `accessibilityAuditService.ts` | WCAG audit                      | 200+  |
| `v0Service.ts`                 | Vercel component generation     | 150+  |
| `dalleService.ts`              | DALL-E image generation         | 200+  |

### Analyzers (services/analyzers/)

- `SyntaxAnalyzer.ts`
- `SemanticAnalyzer.ts`
- `ReactAnalyzer.ts`
- `SecurityAnalyzer.ts`
- `PerformanceAnalyzer.ts`

---

## Hooks

| Hook                        | Purpose                        | Lines |
| --------------------------- | ------------------------------ | ----- |
| `useLayoutBuilder.ts`       | Layout builder state & actions | 1,287 |
| `useDynamicBuildPhases.ts`  | Phase execution wrapper        | 539   |
| `usePhaseGeneration.ts`     | Wizard → phase generation      | 333   |
| `useVersionControl.ts`      | Undo/redo/fork                 | 300+  |
| `useDatabaseSync.ts`        | Supabase sync                  | 200+  |
| `useStreamingGeneration.ts` | SSE streaming                  | 300+  |
| `useSmartContext.ts`        | Semantic memory                | 200+  |
| `useCodeReview.ts`          | Code review integration        | 200+  |
| `useFileStorage.ts`         | File storage operations        | 200+  |
| `useMessageSender.ts`       | Chat message handling          | 200+  |
| `useChatSystem.ts`          | Chat state management          | 150+  |
| `useDesignAnalysis.ts`      | Design analysis                | 150+  |
| `useDesignReplication.ts`   | Design replication             | 150+  |
| `useDraftPersistence.ts`    | Draft auto-save                | 100+  |
| `useKeyboardShortcuts.ts`   | Keyboard shortcuts             | 100+  |
| `useResponsivePreview.ts`   | Responsive preview modes       | 100+  |
| `useTheme.ts`               | Theme management               | 100+  |
| `useToast.ts`               | Toast notifications            | 50+   |

---

## API Routes

### AI Builder

- `POST /api/ai-builder` - Single component generation
- `POST /api/ai-builder/full-app-stream` - Full app with SSE streaming
- `POST /api/ai-builder/modify` - Surgical code modifications
- `POST /api/ai-builder/apply-diff` - Apply reviewed diffs
- `POST /api/ai-builder/plan-phases` - Simple phase generation (main builder)
- `POST /api/ai-builder/review` - Code quality review
- `POST /api/ai-builder/analyze-semantic` - Semantic memory extraction

### Wizard

- `POST /api/wizard/chat` - Natural conversation (PLAN mode)
- `POST /api/wizard/generate-phases` - Comprehensive phase generation

### Layout Builder

- `POST /api/layout/chat` - Layout design with AI vision
- `POST /api/layout/video-analyze` - Video reference analysis

### Builder Chat

- `POST /api/builder/chat` - ACT mode expert chat
- `POST /api/builder/design-chat` - Design-focused chat

### Other

- `POST /api/images/generate` - DALL-E 3 image generation
- `POST /api/embeddings` - Text embeddings
- `POST /api/screenshot` - Puppeteer screenshots
- `POST /api/analytics` - Usage analytics
- `GET /api/health` - Health check
- Auth routes (`/api/auth/*`)

---

## Data Flow

### LayoutDesign Flow

```
Layout Builder Wizard
       │
       ▼
useLayoutBuilder.saveDesign()
       │
       ▼
setCurrentLayoutDesign() → Zustand store
       │
       ▼
Natural Wizard imports via store
       │
       ▼
usePhaseGeneration builds AppConcept.layoutDesign
       │
       ▼
DynamicPhaseGenerator preserves in PhaseConceptContext
       │
       ▼
PhaseExecutionManager.formatLayoutDesignForPrompt()
       │
       ▼
Exact Tailwind/CSS values in generation prompt
```

### Phase Execution Flow

```
DynamicPhasePlan received
       │
       ▼
useDynamicBuildPhases.initializePlan()
       │
       ▼
PhaseExecutionManager created
       │
       ▼
For each phase:
  ├── startPhase(n)
  ├── getExecutionContext(n)
  │     └── formatLayoutDesignForPrompt()
  │     └── accumulated files/features
  │     └── phase-specific context
  ├── /api/ai-builder/full-app-stream
  │     └── SSE streaming
  │     └── buildFullAppPrompt()
  ├── Validate code (Tree-sitter)
  ├── Auto-fix if needed
  ├── completePhase(result)
  │     └── Update accumulated state
  │     └── Quality review
  └── Next phase...
```

---

## SDK Agent Integration Plan

### Overview

The Claude Agent SDK can complement the existing architecture at specific points without replacing the sophisticated systems already in place.

### Where SDK Agents ADD Value

#### 1. Post-Sandpack "Build for Real" Agent

**Purpose:** After user approves Sandpack preview, create actual runnable project

**Implementation:**

```typescript
// src/services/SDKBuildAgent.ts
import { query } from '@anthropic-ai/claude-agent-sdk';

export async function buildRealProject(
  generatedComponent: GeneratedComponent,
  outputPath: string,
  onProgress: (msg: string) => void
) {
  const appData = JSON.parse(generatedComponent.code);

  for await (const msg of query({
    prompt: `
      Create a production-ready project from this validated specification.

      The code has already been:
      - Validated by Tree-sitter AST analysis
      - Auto-fixed by AutoFixEngine
      - Quality reviewed by CodeReviewService
      - User-approved in Sandpack preview

      Tasks:
      1. Write all ${appData.files.length} files to ${outputPath}
      2. Run npm install
      3. Run npm run build - report any errors
      4. Report success
    `,
    options: {
      allowedTools: ['Write', 'Bash', 'Read'],
      cwd: outputPath,
      permissionMode: 'acceptEdits',
    },
  })) {
    // Stream progress to UI
  }
}
```

**Integration point:** Add "Build for Real" button in PreviewPanel

#### 2. Test Generation & Execution Agent

**Purpose:** Make testCriteria from phases executable

**Implementation:**

```typescript
// src/services/SDKTestAgent.ts
import { query } from '@anthropic-ai/claude-agent-sdk';

export async function generateAndRunTests(phaseResult: PhaseExecutionResult, concept: AppConcept) {
  for await (const msg of query({
    prompt: `
      Generate and run tests for Phase ${phaseResult.phaseNumber}.

      Test criteria from phase plan:
      ${phaseResult.testCriteria?.join('\n')}

      User roles to test for:
      ${concept.roles?.map((r) => `- ${r.name}: ${r.capabilities.join(', ')}`).join('\n')}

      Tasks:
      1. Write unit tests for utility functions
      2. Write component tests for React components
      3. Write integration tests for API routes
      4. Run npm test
      5. Report coverage and any failures
    `,
    options: {
      allowedTools: ['Read', 'Write', 'Edit', 'Bash'],
      permissionMode: 'acceptEdits',
    },
  })) {
    // Collect test results
  }
}
```

**Integration point:** Add to useDynamicBuildPhases after phase completion

#### 3. Design Fidelity Verification Agent

**Purpose:** Verify generated code uses exact LayoutDesign tokens

**Implementation:**

```typescript
// src/services/SDKDesignVerifier.ts
import { query } from '@anthropic-ai/claude-agent-sdk';

export async function verifyDesignFidelity(generatedCode: string, layoutDesign: LayoutDesign) {
  const { globalStyles } = layoutDesign;

  for await (const msg of query({
    prompt: `
      Verify this code implements the design system exactly.

      REQUIRED colors (check EXACT hex values):
      - Primary: ${globalStyles.colors.primary}
      - Background: ${globalStyles.colors.background}
      - Text: ${globalStyles.colors.text}

      REQUIRED effects:
      - Border radius: ${globalStyles.effects.borderRadius}
      - Shadows: ${globalStyles.effects.shadows}

      REQUIRED typography:
      - Font: ${globalStyles.typography.fontFamily}
      - Heading weight: ${globalStyles.typography.headingWeight}

      Tasks:
      1. Search all .tsx files for color usage
      2. Check if hardcoded colors match design tokens
      3. Check border-radius classes are consistent
      4. Report any deviations from spec
    `,
    options: {
      allowedTools: ['Read', 'Grep', 'Glob'],
      permissionMode: 'bypassPermissions',
    },
  })) {
    // Collect verification results
  }
}
```

**Integration point:** Add to CodeReviewService or as separate verification step

#### 4. Deployment Agent

**Purpose:** Automate deployment after build approval

**Implementation:**

```typescript
// src/services/SDKDeployAgent.ts
import { query } from '@anthropic-ai/claude-agent-sdk';

export async function deployProject(
  projectPath: string,
  platform: 'vercel' | 'railway' | 'netlify'
) {
  for await (const msg of query({
    prompt: `
      Deploy this project to ${platform}.

      Tasks:
      1. Verify build succeeds: npm run build
      2. Run tests: npm test
      3. Deploy using ${platform} CLI
      4. Report deployment URL
      5. If errors, attempt to fix and retry once
    `,
    options: {
      allowedTools: ['Read', 'Bash', 'Edit'],
      permissionMode: 'acceptEdits',
    },
  })) {
    // Stream deployment progress
  }
}
```

**Integration point:** Add to DeploymentModal

#### 5. Sandpack Webhook Backend Agent (Future)

**Purpose:** Run actual API routes for Sandpack webhooks

**Implementation:**

```typescript
// src/services/SDKBackendAgent.ts
import { query } from '@anthropic-ai/claude-agent-sdk';

export async function startBackendForPreview(
  apiRoutes: Array<{ path: string; content: string }>,
  port: number
) {
  for await (const msg of query({
    prompt: `
      Start a development backend server for Sandpack preview.

      API routes to serve:
      ${apiRoutes.map((r) => r.path).join('\n')}

      Tasks:
      1. Create temp Next.js API project
      2. Write the API route files
      3. Install dependencies
      4. Start on port ${port}
      5. Keep running and report URL
    `,
    options: {
      allowedTools: ['Write', 'Bash'],
      permissionMode: 'bypassPermissions',
    },
  })) {
    // Return dev server URL
  }
}
```

**Integration point:** Future Sandpack webhook integration

### Where SDK Agents Should NOT Replace

| Component               | Why Keep Current Implementation                                                       |
| ----------------------- | ------------------------------------------------------------------------------------- |
| `DynamicPhaseGenerator` | Sophisticated domain classification, token budgeting, dependency graph - custom logic |
| `PhaseExecutionManager` | formatLayoutDesignForPrompt(), accumulated context tracking - tailored to your system |
| `codeValidator.ts`      | Tree-sitter AST is precise and fast                                                   |
| `AutoFixEngine.ts`      | Deterministic fix strategies                                                          |
| `CodeReviewService.ts`  | 5 specialized analyzers working together                                              |
| Layout Builder vision   | Already integrated with Claude vision                                                 |
| Design Chat tools       | Already has all external service integrations                                         |

### Integration Architecture

```
╔═══════════════════════════════════════════════════════════════════════════════════╗
║                         EXISTING SYSTEM (KEEP)                                     ║
║                                                                                    ║
║  Wizards → Join → DynamicPhaseGenerator → PhaseExecutionManager → Validation      ║
║                                                                                    ║
╠═══════════════════════════════════════════════════════════════════════════════════╣
║                                                                                    ║
║                              ↓ Output                                             ║
║                                                                                    ║
║                     Sandpack Preview (User Approval)                              ║
║                                                                                    ║
║                              ↓ Approved                                           ║
║                                                                                    ║
╠═══════════════════════════════════════════════════════════════════════════════════╣
║                         SDK AGENT LAYER (NEW)                                      ║
║                                                                                    ║
║  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  ║
║  │ Build Agent │  │ Test Agent  │  │Deploy Agent │  │ Design Verify Agent     │  ║
║  │             │  │             │  │             │  │                         │  ║
║  │ • Write     │  │ • Generate  │  │ • Build     │  │ • Verify color usage    │  ║
║  │   files     │  │   tests     │  │ • Deploy    │  │ • Check border-radius   │  ║
║  │ • npm build │  │ • Run tests │  │ • Report    │  │ • Validate typography   │  ║
║  │ • Fix errs  │  │ • Fix fails │  │   URL       │  │ • Report deviations     │  ║
║  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────────┘  ║
║                                                                                    ║
║                              ↓ Real Output                                        ║
║                                                                                    ║
║  ┌─────────────────────────────────────────────────────────────────────────────┐  ║
║  │  • Working project directory                                                 │  ║
║  │  • Passing tests with coverage                                              │  ║
║  │  • Deployed URL                                                              │  ║
║  │  • Design compliance report                                                  │  ║
║  └─────────────────────────────────────────────────────────────────────────────┘  ║
║                                                                                    ║
╚═══════════════════════════════════════════════════════════════════════════════════╝
```

### Implementation Priority

1. **High Priority:** Build Agent (immediate value for users wanting real output)
2. **High Priority:** Test Agent (makes testCriteria actionable)
3. **Medium Priority:** Design Verification Agent (quality assurance)
4. **Medium Priority:** Deployment Agent (streamlines workflow)
5. **Future:** Sandpack Backend Agent (when webhooks are implemented)

### Files to Create

```
src/
├── agents/
│   ├── SDKBuildAgent.ts
│   ├── SDKTestAgent.ts
│   ├── SDKDesignVerifier.ts
│   ├── SDKDeployAgent.ts
│   └── index.ts
├── hooks/
│   └── useSDKAgents.ts (wrapper hook)
└── components/
    └── modals/
        └── AgentProgressModal.tsx (UI for agent progress)
```

### Configuration

```typescript
// src/config/agentConfig.ts
export const SDK_AGENT_CONFIG = {
  buildAgent: {
    enabled: true,
    permissionMode: 'acceptEdits',
    maxTurns: 50,
  },
  testAgent: {
    enabled: true,
    permissionMode: 'acceptEdits',
    maxTurns: 30,
  },
  designVerifier: {
    enabled: true,
    permissionMode: 'bypassPermissions',
    maxTurns: 20,
  },
  deployAgent: {
    enabled: true,
    permissionMode: 'acceptEdits',
    maxTurns: 30,
    supportedPlatforms: ['vercel', 'railway', 'netlify'],
  },
};
```

---

## Summary

The AI App Builder is a sophisticated system with:

- **128 components** organized into specialized directories
- **28 services** including phase generation, code analysis, and external integrations
- **28 hooks** for state management and feature integration
- **Two distinct pathways** for app building (quick vs comprehensive)
- **Comprehensive validation** with Tree-sitter, AutoFixEngine, and 5 analyzers

SDK agents complement this at the **edges** (build, test, deploy, verify) without replacing the sophisticated core logic for phase generation, context management, and code analysis.
