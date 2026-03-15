# AI App Builder

> Build complete web applications through natural conversation with AI. Plan, design, and generate production-ready React apps powered by a dual AI system — Claude and Gemini working in consensus.

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Claude](https://img.shields.io/badge/Claude-Opus_4.6-orange)](https://anthropic.com/)
[![Gemini](https://img.shields.io/badge/Gemini-3_Flash/Pro-blue)](https://ai.google.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-green)](https://supabase.com/)

---

## Overview

AI App Builder is a platform that combines **two AI systems** to build full-stack React applications through a guided 5-step workflow:

- **Claude (Opus 4.6 / Sonnet 4.5)** — Code generation, architectural reasoning, consensus negotiation
- **Gemini (3 Flash / Pro)** — Visual design analysis, layout extraction, image generation, vision critique

The platform features a **5-step guided workflow** (Plan -> Design -> AI Plan -> Review -> Build), a **dual AI architecture planning pipeline** where Claude and Gemini independently generate and negotiate architecture proposals, **visual layout building** from reference images or pure generation, and an **agentic Titan Pipeline** for multi-step code generation with self-healing.

---

## 5-Step Workflow

```
Step 1: Wizard (/app/wizard)
    Natural conversation with Claude to build your AppConcept
    -> features, tech requirements, UI preferences
    |
Step 2: Design (/app/design)
    Upload reference images or use GENERATE mode (no images needed)
    -> Gemini Vision analyzes layout, self-healing loop refines
    -> Background intelligence gathering starts
    |
Step 3: AI Plan (/app/ai-plan)
    Dual AI Planning Pipeline (Claude + Gemini)
    -> Layout Analysis -> Intelligence -> Parallel Architecture
    -> Consensus Negotiation -> Dual Validation
    -> User resolves any escalated disagreements
    |
Step 4: Review (/app/review)
    Review all gathered data before building
    -> Concept, features, phases, layout, architecture, settings
    -> Phase plan regenerated with architecture context
    |
Step 5: Build (/app)
    Titan Pipeline generates code phase-by-phase
    -> Router -> Surveyor -> Builder -> Self-Healing Loop
    -> Live Sandpack preview with version history
```

---

## Features

### Conversational Planning (Step 1)

- **Natural Conversation Wizard** — Chat with Claude to plan your app through dialogue
- **Progressive Concept Building** — Iteratively refine requirements, features, and technical specs
- **Image Reference Upload** — Attach design references for context
- **Draft Persistence** — Auto-save with crash recovery

### Visual Layout Design (Step 2)

- **Multi-Image Reference Upload** — Up to 4 images for design reference
- **GENERATE Mode** — Create a full layout from AppConcept alone, no images required
- **Gemini Vision Analysis** — AI analyzes images and generates component structure
- **Self-Healing Vision Loop** — Screenshot -> Critique -> Fix -> Repeat for pixel accuracy
- **Natural Language Refinement** — "Make it more playful", "add a dark sidebar"
- **Undo/Redo** — Full history with keyboard shortcuts (Ctrl+Z/Y)
- **Background Intelligence** — Pre-caches web search + AI intelligence while you design

### Dual AI Architecture Planning (Step 3)

- **5-Stage Pipeline** — Layout Analysis -> Intelligence -> Parallel Generation -> Consensus -> Validation
- **Claude + Gemini Consensus** — Both AIs independently propose architectures, then negotiate
- **Live Progress** — SSE streaming with stage-by-stage progress updates
- **Escalation Handling** — User resolves disagreements between AIs (pick Claude, Gemini, or merge)
- **Cross-Validation** — Both AIs validate the final architecture before proceeding

### Code Generation (Step 5)

- **Titan Pipeline** — Agentic orchestrator: Router -> Surveyor -> Builder -> Healing Loop
- **Dynamic Phases (2-25+)** — AI determines optimal phase count based on complexity
- **SSE Streaming** — Real-time progress with file-by-file updates
- **AST-Based Modifications** — Tree-sitter for surgical code edits preserving formatting
- **Phase Integrity (P1-P9)** — File conflict detection, type checking, regression testing
- **Smart Context Selection** — CodeContextService selects most relevant files per phase

### Code Quality & Review (Step 4)

- **Light Review** — Syntax analysis, React patterns, security scanning
- **Comprehensive Review** — Semantic analysis with Claude AI
- **Auto-Fix** — Automatic fixing of common issues
- **Quality Metrics** — Scores for maintainability, security, performance, accessibility

### Version Control

- **Phase Snapshots** — Automatic snapshots at each phase
- **One-Click Rollback** — Revert to any previous state
- **Side-by-Side Diff** — Compare any two versions
- **Undo/Redo Stacks** — Full version history

### Preview & Testing

- **Sandpack Integration** — Live code execution with instant feedback
- **Device Frames** — Mobile, tablet, desktop device simulations
- **Console Panel** — View logs and errors
- **Error Boundaries** — Graceful error handling

### Multi-Platform Deployment

| Platform     | Options                             |
| ------------ | ----------------------------------- |
| **Web**      | Vercel, Railway, Cloudflare Pages   |
| **Mobile**   | React Native via Expo (iOS/Android) |
| **Desktop**  | Electron (Windows/macOS/Linux)      |
| **Database** | Neon, Turso, Supabase               |

---

## Architecture

### AI Model Routing

| Task                   | Model           | Reason                             |
| ---------------------- | --------------- | ---------------------------------- |
| Code generation        | Claude Opus 4.6 | Best reasoning, code quality       |
| Architecture proposals | Claude + Gemini | Dual consensus for robustness      |
| Visual layout analysis | Gemini 3 Flash  | Multi-image vision, agentic loops  |
| Image generation       | Gemini 3 Pro    | Multimodal text+image generation   |
| Vision critique        | Gemini 3 Flash  | Fast feedback for healing loop     |
| Intent routing         | Gemini 3 Flash  | Fast classification (CREATE/MERGE) |

### Titan Pipeline

```
Input (Images + Instructions)
    -> Router (Intent Analysis -> MergeStrategy: CREATE/MERGE/EDIT)
    -> Surveyor (Gemini Vision -> VisualManifest[])
    -> Builder (Gemini -> React/Tailwind Code)
    -> Self-Healing Vision Loop (Screenshot -> Critique -> Fix -> Repeat)

CREATE mode shortcut: Router -> Surveyor -> Builder -> Healing Loop
```

### State Management

Central Zustand store with **10 slices** and v5 migration chain:

- **ChatSlice** — Messages, input, generation progress
- **ModeSlice** — PLAN/ACT mode, user requests
- **ComponentsSlice** — Generated components, loading states
- **VersionControlSlice** — Undo/redo, version history
- **UISlice** — Tabs, modals, search, preview mode
- **DataSlice** — Phase plans, layout manifests, design specs
- **DocumentationSlice** — Project docs
- **FileStorageSlice** — File browser, storage stats
- **BuildSettingsSlice** — Build configuration
- **DualPlanningSlice** — Architecture result, escalation, negotiation rounds

---

## Tech Stack

### Frontend

- **Next.js 15.5** — App Router with streaming SSR
- **React 19** — Server Components, new hooks
- **TypeScript** — Full type safety
- **Tailwind CSS** — Utility-first styling
- **Zustand 4.5** — Lightweight state management with Immer middleware
- **Framer Motion** — Animations

### Backend

- **Next.js API Routes** — 66 route handlers with SSE streaming
- **Supabase** — PostgreSQL, Auth, File Storage
- **Inngest** — Background job processing
- **Railway** — Production deployment platform

### AI Integration

- **Anthropic Claude SDK** — Opus 4.6 / Sonnet 4.5 for code generation and architecture
- **Google GenAI SDK (`@google/genai`)** — Gemini 3 Flash/Pro for vision, image gen, critique
- **OpenAI SDK** — Embeddings and proxy services only
- **js-tiktoken** — Token counting and budget management

### Developer Tools

- **Tree-sitter** — AST parsing for surgical code edits
- **Sandpack** — Live code preview
- **Jest** — Dual-project test config (Node for services, JSDOM for hooks/components)
- **ESLint + Prettier** — Code quality
- **Husky** — Pre-commit hooks

---

## Codebase Statistics

| Metric                   | Count |
| ------------------------ | ----- |
| **TypeScript/TSX Files** | 612   |
| **Components**           | 176   |
| **Services**             | 86    |
| **Custom Hooks**         | 43    |
| **Utilities**            | 80    |
| **API Routes**           | 66    |
| **Type Definitions**     | 48    |

### Key Files

| File                                | Lines | Purpose                               |
| ----------------------------------- | ----- | ------------------------------------- |
| `useAppStore.ts`                    | ~900  | Central Zustand store (10 slices, v5) |
| `MainBuilderView.tsx`               | ~870  | Main orchestrator + Titan Pipeline    |
| `PhaseExecutionManager.ts`          | ~780  | Phase execution orchestrator          |
| `NaturalConversationWizard.tsx`     | ~750  | Conversation wizard UI                |
| `DynamicPhaseGenerator.ts`          | ~685  | Phase planning engine                 |
| `useDynamicBuildPhases.ts`          | ~650  | Phase execution hook                  |
| `BackgroundPlanningOrchestrator.ts` | ~620  | Dual AI 5-stage pipeline              |
| `LiveIntelligenceGatherer.ts`       | ~600  | Web search + AI intelligence          |
| `useLayoutBuilder.ts`               | ~575  | Layout builder state + GENERATE mode  |
| `ConsensusNegotiator.ts`            | ~530  | Claude-Gemini consensus engine        |
| `TitanPipelineService.ts`           | ~500  | Titan Pipeline orchestrator           |
| `VisionLoopEngine.ts`               | ~500  | Self-healing vision loop              |

---

## Project Structure

```
src/
+-- app/                              # Next.js App Router
|   +-- (protected)/app/
|   |   +-- wizard/                   # Step 1: Conversation planning
|   |   +-- design/                   # Step 2: Visual layout design
|   |   +-- ai-plan/                  # Step 3: Dual AI architecture planning
|   |   +-- review/                   # Step 4: Review before building
|   |   +-- page.tsx                  # Step 5: Main builder view
|   |   +-- dashboard/                # App dashboard
|   |   +-- settings/                 # User settings
|   +-- api/                          # 66 API route handlers
|   |   +-- ai/                       # AI proxy routes (Claude, Gemini)
|   |   +-- planning/                 # Dual AI planning (start, stream, intelligence)
|   |   +-- web-search/               # Live web search for intelligence
|   |   +-- wizard/                   # Wizard phase generation
|   |   +-- ai-builder/               # Code generation endpoints
|   |   +-- deploy/                   # Deployment endpoints
|   |   +-- images/                   # Image generation
|   |   +-- integrations/             # Third-party integrations
|   +-- login/, signup/               # Auth pages
|
+-- components/                       # 176 React components
|   +-- MainBuilderView.tsx           # Main orchestrator + Titan Pipeline
|   +-- NaturalConversationWizard.tsx # Step 1: Planning wizard
|   +-- LayoutBuilderView.tsx         # Step 2: Visual design
|   +-- ConsensusEscalationDialog.tsx # Dual AI escalation modal
|   +-- ai-plan/                      # AI Plan step components
|   +-- review/                       # Review step (14 files)
|   +-- layout-builder/               # Layout sub-components
|   +-- build/                        # Build UI components
|   +-- effects/                      # Visual effects (CSS particles)
|   +-- ui/                           # Base UI components
|
+-- services/                         # 86 business logic services
|   +-- TitanPipelineService.ts       # Agentic pipeline orchestrator
|   +-- BackgroundPlanningOrchestrator.ts # Dual AI 5-stage pipeline
|   +-- ConsensusNegotiator.ts        # Claude-Gemini consensus engine
|   +-- DualValidationOrchestrator.ts # Cross-validation of architectures
|   +-- LiveIntelligenceGatherer.ts   # Web search + AI intelligence
|   +-- GeminiLayoutCritique.ts       # Vision critique for healing loop
|   +-- VisionLoopEngine.ts           # Self-healing vision loop
|   +-- PhaseExecutionManager.ts      # Phase execution orchestrator
|   +-- DynamicPhaseGenerator.ts      # Phase planning engine
|   +-- CodeParser.ts                 # AST analysis (Tree-sitter)
|   +-- analyzers/                    # Specialized analyzers
|   +-- __tests__/                    # Service tests
|
+-- hooks/                            # 43 custom hooks
|   +-- useDualAIPlan.ts              # Dual AI planning (SSE, escalation)
|   +-- useBackgroundIntelligence.ts  # Background intelligence pre-caching
|   +-- useDynamicBuildPhases.ts      # Phase execution
|   +-- useLayoutBuilder.ts           # Layout design state
|   +-- __tests__/                    # Hook tests
|
+-- store/                            # Zustand centralized state
|   +-- useAppStore.ts                # 10 slices, v5 migrations, persist
|
+-- types/                            # 48 type definition files
|   +-- layoutDesign/                 # Design type system (8 files)
|   +-- dualPlanning.ts               # Dual AI planning types
|   +-- titanPipeline.ts              # Pipeline types
|   +-- dynamicPhases.ts              # Phase types
|   +-- appConcept.ts                 # Planning types
|
+-- utils/                            # 80 utility files
|   +-- astModifier.ts + 5 modules    # AST modification suite
|   +-- layoutValidation.ts           # Zod schema validation
|   +-- architectureToPhaseContext.ts  # Architecture -> phase converter
|
+-- agents/                           # AI agent implementations
+-- lib/                              # Server-side utilities
+-- prompts/                          # AI system prompts
+-- data/                             # Templates and presets
+-- contexts/                         # React Context providers
```

---

## API Endpoints

### AI & Planning

| Endpoint                     | Method | Description                       |
| ---------------------------- | ------ | --------------------------------- |
| `/api/ai/claude`             | POST   | Claude AI proxy                   |
| `/api/ai/gemini`             | POST   | Gemini AI proxy                   |
| `/api/planning/start`        | POST   | Initiate dual AI planning session |
| `/api/planning/stream`       | GET    | SSE stream for pipeline progress  |
| `/api/planning/intelligence` | POST   | Intelligence gathering endpoint   |
| `/api/web-search`            | POST   | Live web search for intelligence  |

### Code Generation

| Endpoint                          | Method | Description                 |
| --------------------------------- | ------ | --------------------------- |
| `/api/ai-builder`                 | POST   | Single component generation |
| `/api/ai-builder/full-app-stream` | POST   | Full app with SSE streaming |
| `/api/ai-builder/modify`          | POST   | Surgical code modifications |
| `/api/ai-builder/review`          | POST   | Code quality review         |

### Wizard & Layout

| Endpoint                            | Method | Description              |
| ----------------------------------- | ------ | ------------------------ |
| `/api/wizard/chat`                  | POST   | Planning conversation    |
| `/api/wizard/generate-phases`       | POST   | Dynamic phase planning   |
| `/api/wizard/generate-architecture` | POST   | Backend architecture     |
| `/api/architect/generate-manifest`  | POST   | Gemini layout generation |

### Deployment & Images

| Endpoint               | Method | Description             |
| ---------------------- | ------ | ----------------------- |
| `/api/deploy/web`      | POST   | Web deployment          |
| `/api/deploy/vercel/*` | POST   | Vercel deployment       |
| `/api/railway/deploy`  | POST   | Railway deployment      |
| `/api/images/generate` | POST   | Gemini image generation |

---

## Quick Start

### Prerequisites

- Node.js 18+
- Anthropic API key (Claude)
- Google AI API key (Gemini)
- Supabase account

### Installation

```bash
git clone https://github.com/takk387/AI-app.git
cd AI-app
npm install
```

### Environment Variables

Create `.env.local`:

```env
# Required
ANTHROPIC_API_KEY=your_anthropic_api_key
GOOGLE_API_KEY=your_google_ai_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional
OPENAI_API_KEY=your_openai_api_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Run

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run typecheck    # TypeScript check
npm run lint         # ESLint check
npm test             # Run all tests
npm run test:hooks   # Hook tests (JSDOM)
npm run test:services # Service tests (Node)
```

---

## Deployment

### Railway (Production)

This app deploys to **Railway**. The Vercel integration routes (`/api/deploy/vercel/`) are a user feature for deploying user-generated apps, not infrastructure for this app.

1. Push to GitHub
2. Create Railway project -> Deploy from GitHub
3. Set `NEXT_PUBLIC_APP_URL` to your Railway app URL
4. Add remaining environment variables
5. Update Supabase auth redirect URLs

---

## Testing

Dual-project Jest configuration:

- **Node environment** — Service tests (`npm run test:services`)
- **JSDOM environment** — Hook and component tests (`npm run test:hooks`)

```bash
npm test              # All tests
npm run test:hooks    # Hook tests (JSDOM)
npm run test:services # Service tests (Node)
```

---

## License

Private repository. Contact the owner for licensing information.

---

**Built with Next.js 15, React 19, Claude AI, and Gemini AI**
