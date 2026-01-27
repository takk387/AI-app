# AI App Builder

> Build complete web applications through natural conversation with AI. Plan, design, and generate production-ready React apps powered by Claude and Gemini AI.

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue)](https://www.typescriptlang.org/)
[![Claude](https://img.shields.io/badge/Claude-Sonnet_4.5-orange)](https://anthropic.com/)
[![Gemini](https://img.shields.io/badge/Gemini-2.0_Flash-blue)](https://ai.google.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-green)](https://supabase.com/)
[![Lines of Code](https://img.shields.io/badge/Lines-71K+-brightgreen)]()

---

## Overview

AI App Builder is a sophisticated platform that combines **two AI systems** to build full-stack React applications:

- **Claude Sonnet 4.5** - Code generation, architectural reasoning, and semantic analysis
- **Gemini 2.0 Flash** - Visual design analysis, layout extraction from images/videos

The platform features a **dual-mode system** (PLAN for discussion, ACT for generation), **dynamic phase planning** (2-25+ phases based on complexity), **visual layout building** from reference images, and **multi-platform deployment** (web, mobile, desktop).

---

## Features

### AI-Powered Planning (PLAN Mode)

- **Natural Conversation Wizard** - Chat with Claude to plan your app through natural dialogue
- **Progressive Concept Building** - Iteratively refine requirements, features, and technical specs
- **Image Reference Upload** - Attach design references for context
- **Draft Persistence** - Auto-save with crash recovery
- **Backend Architecture Generation** - AI generates database schemas, API routes, and auth setup
- **Dynamic Phase Planning** - Generates 2-25+ optimal build phases based on complexity

### Visual Layout Builder (Gemini 3)

- **Multi-Media Reference Upload** - Up to 4 images + 1 video for design reference
- **Client-Side Color Extraction** - Accurate palette detection (not AI guessing)
- **AI Layout Manifest Generation** - Gemini analyzes images and generates component structure
- **"Vibe Coding"** - Refine designs with natural language ("make it more playful")
- **Undo/Redo System** - Full history with keyboard shortcuts (Ctrl+Z/Y)
- **Element Selection** - Click to select and refine individual UI elements
- **Design Token Export** - CSS Variables, Tailwind Config, Style Dictionary

### Code Generation (ACT Mode)

- **Claude Sonnet 4.5** - Extended thinking for intelligent code generation
- **SSE Streaming** - Real-time progress with file-by-file updates
- **Dynamic 2-25+ Phases** - AI determines optimal phase count based on requirements
- **Smart Context Selection** - CodeContextService selects most relevant files per phase (up to 100K tokens)
- **Phase Integrity System (P1-P9)** - File conflict detection, type checking, regression testing
- **AST-Based Modifications** - Tree-sitter for surgical code edits that preserve formatting
- **Full-Stack Support** - Frontend-only or full-stack with Prisma, NextAuth, API routes

### Code Quality & Review

- **Light Review** - Syntax analysis, React patterns, security scanning
- **Comprehensive Review** - Semantic analysis with Claude AI
- **Auto-Fix** - Automatic fixing of common issues (unclosed strings, missing imports)
- **Impact Analysis** - Risk assessment and breaking change detection
- **Quality Metrics** - Scores for maintainability, security, performance, accessibility

### Version Control

- **Phase Snapshots** - Automatic snapshots at each phase
- **One-Click Rollback** - Revert to any previous state
- **Git-Like Branching** - Create, switch, merge branches
- **Side-by-Side Diff** - Compare any two versions
- **Fork Versions** - Branch from any point without losing originals

### Multi-Platform Deployment

| Platform     | Options                           |
| ------------ | --------------------------------- |
| **Web**      | Vercel, Railway, Cloudflare Pages |
| **Mobile**   | React Native → Expo (iOS/Android) |
| **Desktop**  | Electron (Windows/macOS/Linux)    |
| **Database** | Neon, Turso, Supabase             |

- **Custom Domains** - Purchase and configure domains directly
- **Environment Variables** - Manage secrets per deployment
- **Database Migrations** - Automated schema deployment
- **Deployment Logs** - Real-time build progress

### Preview & Testing

- **Sandpack Integration** - Live code execution with instant feedback
- **Device Frames** - Mobile, tablet, desktop device simulations
- **Touch Simulator** - Mobile gesture simulation
- **Console Panel** - View logs and errors
- **Error Boundaries** - Graceful error handling

### DALL-E 3 Image Generation

- **Context-Aware Images** - Hero images, card thumbnails, backgrounds
- **Batch Processing** - Rate-limited parallel generation
- **Design Integration** - Images matched to your color palette
- **Caching** - Avoid regenerating identical images

---

## Architecture

### Data Flow

```
┌─────────────────────────────────────────────────┐
│  NaturalConversationWizard (PLAN Mode)          │
│  - Chat with Claude AI                          │
│  - Upload reference images                      │
│  - Extract roles, workflows, requirements       │
└──────────────────┬──────────────────────────────┘
                   │ creates
                   ▼
         ┌─────────────────────┐
         │     AppConcept      │
         │  - name, description│
         │  - features         │
         │  - technical reqs   │
         │  - layoutManifest   │
         │  - architectureSpec │
         └──────────┬──────────┘
                    │ feeds
                    ▼
      ┌──────────────────────────────┐
      │   DynamicPhaseGenerator      │
      │  - Classify features         │
      │  - Build dependency graph    │
      │  - Generate 2-25+ phases     │
      └──────────┬───────────────────┘
                 │ produces
                 ▼
       ┌──────────────────────┐
       │   DynamicPhasePlan   │
       │  - phases[]          │
       │  - dependencies      │
       │  - test criteria     │
       └──────────┬───────────┘
                  │ executes via
                  ▼
    ┌──────────────────────────────────┐
    │  PhaseExecutionManager (ACT Mode)│
    │  - Build context for each phase  │
    │  - Stream from Claude API        │
    │  - Validate & auto-fix code      │
    │  - Run quality reviews           │
    └──────────┬───────────────────────┘
               │ generates
               ▼
     ┌──────────────────────┐
     │   Generated Code     │
     │  - React components  │
     │  - API routes        │
     │  - Database schema   │
     │  - Config files      │
     └──────────┬───────────┘
                │ previews in
                ▼
      ┌─────────────────────┐
      │   Sandpack Preview  │
      │  - Live preview     │
      │  - Hot reload       │
      │  - Error display    │
      └─────────────────────┘
```

### AI Model Routing

The system intelligently routes requests to the optimal AI:

| Task Type       | Model             | Reason                       |
| --------------- | ----------------- | ---------------------------- |
| Code generation | Claude Sonnet 4.5 | Best reasoning, code quality |
| Visual analysis | Gemini 2.0 Flash  | Multi-image/video support    |
| Quick edits     | Claude Haiku 3.5  | Fast, cost-effective         |
| Semantic review | Claude Sonnet 4.5 | Deep understanding           |

### State Management

Central Zustand store with 8 slices:

- **ChatSlice** - Messages, input, generation progress
- **ModeSlice** - PLAN/ACT mode, user requests
- **ComponentsSlice** - Generated components, loading states
- **VersionControlSlice** - Undo/redo, version history
- **UISlice** - Tabs, modals, search, preview mode
- **DataSlice** - Phase plans, layout manifests, diffs
- **DocumentationSlice** - Project docs
- **FileStorageSlice** - File browser, storage stats

---

## Tech Stack

### Frontend

- **Next.js 15.5** - App Router with streaming SSR
- **React 19** - Server Components, new hooks
- **TypeScript 5.2** - Full type safety
- **Tailwind CSS 3.3** - Utility-first styling
- **Zustand 4.5** - Lightweight state management with Immer
- **Framer Motion** - Animations

### Backend

- **Next.js API Routes** - Serverless endpoints with SSE streaming
- **Supabase** - PostgreSQL, Auth, File Storage
- **Inngest** - Background job processing

### AI Integration

- **Anthropic Claude SDK** - Sonnet 4.5 with extended thinking
- **Google Generative AI SDK** - Gemini 2.0 Flash for vision
- **OpenAI SDK** - DALL-E 3 for image generation
- **js-tiktoken** - Token counting and budget management
- **Model Router** - Intelligent AI selection per task

### Developer Tools

- **Tree-sitter** - AST parsing for surgical code edits
- **Sandpack** - Live code preview
- **Puppeteer** - Screenshot generation
- **Jest** - Testing framework
- **ESLint + Prettier** - Code quality
- **Husky** - Pre-commit hooks

---

## Codebase Statistics

| Metric                | Count         |
| --------------------- | ------------- |
| **Lines of Code**     | 71,137        |
| **Components**        | 168 files     |
| **Services**          | 75 files      |
| **Custom Hooks**      | 39 files      |
| **Utility Functions** | 67 files      |
| **API Routes**        | 30+ endpoints |
| **Type Definitions**  | 30+ files     |

### Major Files

| File                            | Lines  | Purpose                      |
| ------------------------------- | ------ | ---------------------------- |
| `astModifier.ts`                | 1,988  | AST-based code modifications |
| `PhaseExecutionManager.ts`      | 2,096  | Phase orchestration          |
| `DynamicPhaseGenerator.ts`      | 2,000+ | Phase planning               |
| `layoutDesign.ts`               | 1,000+ | Design system types          |
| `NaturalConversationWizard.tsx` | 776    | Planning wizard              |
| `useAppStore.ts`                | 717    | Central state store          |

---

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── api/
│   │   ├── ai-builder/          # Code generation endpoints
│   │   ├── architect/           # Gemini layout generation
│   │   ├── builder/             # Builder chat
│   │   ├── wizard/              # Planning & phases
│   │   ├── deploy/              # Deployment endpoints
│   │   ├── railway/             # Railway integration
│   │   ├── domains/             # Domain management
│   │   ├── images/              # DALL-E generation
│   │   ├── integrations/        # Third-party auth
│   │   └── proxy/               # API proxies
│   ├── login/, signup/          # Auth pages
│   └── layout.tsx, page.tsx
│
├── components/                   # React components (168 files)
│   ├── NaturalConversationWizard.tsx  # PLAN mode wizard
│   ├── LayoutBuilderWizard.tsx        # Visual design mode
│   ├── MainBuilderView.tsx            # ACT mode main view
│   ├── layout-builder/          # Layout sub-components
│   ├── conversation-wizard/     # Planning sub-components
│   ├── build/                   # Build UI (phase controls, progress)
│   ├── preview/                 # Preview components
│   ├── review/                  # Code review UI
│   ├── deployment/              # Deployment UI
│   ├── dashboard/               # Dashboard views
│   ├── modals/                  # Modal dialogs
│   ├── storage/                 # File storage UI
│   ├── documentation/           # Project docs UI
│   ├── dev/                     # Developer tools
│   └── ui/                      # Base UI components
│
├── services/                    # Business logic (75 files)
│   ├── DynamicPhaseGenerator.ts # Phase planning
│   ├── PhaseExecutionManager.ts # Phase execution
│   ├── CodeContextService.ts    # Smart context selection
│   ├── CodeParser.ts            # AST analysis
│   ├── CodeReviewService.ts     # Quality review
│   ├── ArchitectService.ts      # Gemini layout generation
│   ├── BuilderService.ts        # Layout refinement
│   ├── DeploymentOrchestrator.ts# Multi-platform deployment
│   └── analyzers/               # Code analyzers
│
├── hooks/                       # Custom hooks (39 files)
│   ├── useDynamicBuildPhases.ts # Phase execution
│   ├── useLayoutBuilder.ts      # Layout state
│   ├── useGeminiLayoutState.ts  # Undo/redo, drafts
│   ├── useCodeContext.ts        # Context integration
│   ├── useVersionControl.ts     # Version history
│   ├── useDeployment.ts         # Deployment workflows
│   └── __tests__/               # Hook tests
│
├── store/                       # Zustand state
│   └── useAppStore.ts           # Central store (8 slices)
│
├── types/                       # TypeScript types (30+ files)
│   ├── appConcept.ts            # App planning types
│   ├── dynamicPhases.ts         # Phase system types
│   ├── layoutDesign.ts          # Design system (41KB)
│   ├── schema.ts                # Layout manifest
│   └── architectureSpec.ts      # Backend architecture
│
├── utils/                       # Utilities (67 files)
│   ├── astModifier.ts           # AST code editing (61KB)
│   ├── codeValidator.ts         # Syntax validation
│   ├── contextCompression.ts    # Token compression
│   ├── colorExtraction.ts       # Palette extraction
│   └── applyDiff.ts             # Diff application
│
├── prompts/                     # AI system prompts
│   ├── builder.ts               # Prompt composer
│   ├── quality-standards.ts     # Quality rules
│   └── full-app/                # Full-stack prompts
│
├── data/                        # Templates and presets
├── contexts/                    # React Context providers
├── agents/                      # AI agent implementations
└── inngest/                     # Background job functions
```

---

## API Endpoints

### AI Builder

| Endpoint                          | Method | Description                 |
| --------------------------------- | ------ | --------------------------- |
| `/api/ai-builder`                 | POST   | Single component generation |
| `/api/ai-builder/full-app-stream` | POST   | Full app with SSE streaming |
| `/api/ai-builder/modify`          | POST   | Surgical code modifications |
| `/api/ai-builder/apply-diff`      | POST   | Apply diff changes          |
| `/api/ai-builder/review`          | POST   | Code quality review         |

### Wizard & Planning

| Endpoint                            | Method | Description            |
| ----------------------------------- | ------ | ---------------------- |
| `/api/wizard/chat`                  | POST   | Planning conversation  |
| `/api/wizard/generate-phases`       | POST   | Dynamic phase planning |
| `/api/wizard/generate-architecture` | POST   | Backend architecture   |

### Layout Builder

| Endpoint                           | Method | Description              |
| ---------------------------------- | ------ | ------------------------ |
| `/api/architect/generate-manifest` | POST   | Gemini layout generation |
| `/api/builder/chat`                | POST   | Layout refinement chat   |
| `/api/builder/vibe`                | POST   | Vibe transformations     |

### Deployment

| Endpoint                   | Method | Description         |
| -------------------------- | ------ | ------------------- |
| `/api/deploy/web`          | POST   | Web deployment      |
| `/api/deploy/mobile`       | POST   | Mobile deployment   |
| `/api/deploy/desktop`      | POST   | Desktop deployment  |
| `/api/deploy/database`     | POST   | Database deployment |
| `/api/railway/deploy`      | POST   | Railway deployment  |
| `/api/railway/status/[id]` | GET    | Deployment status   |

### Domains

| Endpoint                 | Method | Description        |
| ------------------------ | ------ | ------------------ |
| `/api/domains/search`    | GET    | Domain search      |
| `/api/domains/check`     | GET    | Availability check |
| `/api/domains/purchase`  | POST   | Domain purchase    |
| `/api/domains/configure` | POST   | DNS configuration  |

### Images

| Endpoint                          | Method | Description         |
| --------------------------------- | ------ | ------------------- |
| `/api/images/generate`            | POST   | DALL-E 3 generation |
| `/api/images/generate-background` | POST   | Background patterns |

---

## Key Services

### DynamicPhaseGenerator

Converts AppConcept into 2-25+ build phases:

- **Feature Classification** - Assigns features to 19 domains (auth, database, ui-component, etc.)
- **Complexity Scoring** - Simple/moderate/complex per feature
- **Dependency Detection** - Builds dependency graph between phases
- **Token Budget Management** - 16K-32K tokens per phase

### PhaseExecutionManager

Orchestrates phase execution with quality controls:

- **Context Building** - Assembles code context, design tokens, architecture spec
- **Streaming Execution** - Real-time SSE updates during generation
- **Phase Integrity (P1-P9)** - File conflicts, type checking, snapshots, testing
- **Quality Review** - Light (static) + comprehensive (AI) reviews

### CodeContextService

Intelligent file selection for AI context:

- **Importance Scoring** - Prioritizes files by reusability and dependencies
- **Multiple Representations** - Full code, signatures, types-only, summary
- **Token Budgeting** - Stays within context window limits
- **Dependency Hints** - Provides import relationships to AI

### CodeParser (Tree-sitter)

AST analysis for TypeScript/TSX:

- **Export Extraction** - Functions, classes, types, interfaces
- **Import Analysis** - Named, default, namespace imports
- **Component Detection** - React components, hooks, props
- **API Route Detection** - Next.js route handlers

---

## Key Hooks

| Hook                    | Purpose                       |
| ----------------------- | ----------------------------- |
| `useDynamicBuildPhases` | Phase execution orchestration |
| `useLayoutBuilder`      | Layout design state           |
| `useGeminiLayoutState`  | Undo/redo, draft management   |
| `useCodeContext`        | Code context integration      |
| `useVersionControl`     | Version history management    |
| `useDeployment`         | Deployment workflows          |
| `useChatSystem`         | Chat message handling         |
| `useDraftPersistence`   | Auto-save & recovery          |

---

## Quick Start

### Prerequisites

- Node.js 18+
- Anthropic API key (Claude)
- Google AI API key (Gemini)
- Supabase account
- OpenAI API key (optional, for DALL-E)

### Installation

```bash
# Clone the repository
git clone https://github.com/takk387/AI-app.git
cd AI-app

# Install dependencies
npm install
```

### Environment Variables

Create `.env.local`:

```env
# Anthropic API (required)
ANTHROPIC_API_KEY=your_anthropic_api_key

# Google AI (required for layout builder)
GOOGLE_AI_API_KEY=your_google_ai_api_key

# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI (optional - for DALL-E image generation)
OPENAI_API_KEY=your_openai_api_key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Configuration

### Environment Variables

| Variable                        | Required | Description                     |
| ------------------------------- | -------- | ------------------------------- |
| `ANTHROPIC_API_KEY`             | Yes      | Claude API key                  |
| `GOOGLE_AI_API_KEY`             | Yes      | Gemini API key                  |
| `NEXT_PUBLIC_SUPABASE_URL`      | Yes      | Supabase project URL            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes      | Supabase anon key               |
| `SUPABASE_SERVICE_ROLE_KEY`     | Yes      | Supabase service role           |
| `OPENAI_API_KEY`                | No       | For DALL-E images               |
| `NEXT_PUBLIC_APP_URL`           | No       | App URL (defaults to localhost) |

### Debug Mode

```bash
# Run with debug panels
npm run dev:debug

# Run with mock AI (no API calls)
npm run dev:mock
```

### Developer Tools

When `NODE_ENV=development`:

- **Element Inspector** - Click to select elements, generate Claude prompts
- **State Inspector** - Expose app state to `window.__APP_STATE__`
- **Debug Panel** - View API logs, token usage

---

## Deployment

### Railway

1. Push to GitHub
2. Create Railway project → Deploy from GitHub
3. Add environment variables
4. Update Supabase auth redirect URLs

### Vercel

1. Import repository to Vercel
2. Add environment variables
3. Deploy

### Cloudflare Pages

1. Connect repository to Cloudflare Pages
2. Configure build settings:
   - Build command: `npm run build`
   - Output directory: `.next`
3. Add environment variables

---

## Testing

```bash
# Run all tests
npm run test:all

# Unit tests
npm run test:unit

# Hook tests (JSDOM)
npm run test:hooks

# Service tests (Node)
npm run test:services

# Watch mode
npm run test:watch
```

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/name`)
3. Commit changes (`git commit -m 'Add feature'`)
4. Push to branch (`git push origin feature/name`)
5. Open a Pull Request

---

## License

Private repository. Contact the owner for licensing information.

---

## Acknowledgments

- [Anthropic](https://anthropic.com/) - Claude AI
- [Google AI](https://ai.google.dev/) - Gemini AI
- [OpenAI](https://openai.com/) - DALL-E 3
- [Supabase](https://supabase.com/) - Backend infrastructure
- [Railway](https://railway.app/) - Deployment platform
- [Vercel](https://vercel.com/) - Next.js framework
- [CodeSandbox](https://codesandbox.io/) - Sandpack preview

---

**Built with Next.js, React, Claude AI, and Gemini AI**
