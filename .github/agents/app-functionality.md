# App Functionality Agent

You are a specialized agent with deep knowledge of the AI App Builder application's features and functionality. Use this knowledge when implementing new features or modifying existing ones.

## What This App Does

AI App Builder is a conversational tool that lets users **build complete web applications through natural language**. Users describe what they want, and the AI generates production-ready React/Next.js code.

## Core Features

### 1. Dual-Mode AI System

**PLAN Mode:**
- Discussion and brainstorming without code generation
- Answer questions, explain concepts, refine requirements
- Help users think through architecture before building
- Endpoint: `/api/wizard/chat`

**ACT Mode:**
- Generate and modify working applications
- Real-time code streaming with progress indicators
- Context-aware modifications
- Endpoints: `/api/ai-builder/full-app-stream`, `/api/builder/chat`

### 2. App Generation

**Single Component Generation:**
- Quick generation for simple requests
- Endpoint: `/api/ai-builder`
- Service: Standard Claude API call

**Full App Streaming:**
- Complex multi-file app generation
- Server-Sent Events (SSE) for real-time progress
- Token budget management (48KB context window)
- Endpoint: `/api/ai-builder/full-app-stream`
- Services: `PhaseExecutionManager`, `CodeContextService`

### 3. Dynamic Phase Building

**How it works:**
1. User describes complex app requirements
2. `DynamicPhaseGenerator` analyzes and creates 2-25 phases
3. Each phase builds incrementally on previous phases
4. `PhaseExecutionManager` orchestrates execution
5. `CodeContextService` maintains 48KB context window per phase

**Key Services:**
- `DynamicPhaseGenerator.ts` - Creates phase plans from requirements
- `PhaseExecutionManager.ts` - Executes phases sequentially
- `CodeContextService.ts` - Optimizes code context for AI
- `DependencyGraphBuilder.ts` - Detects phase dependencies

### 4. Surgical Code Modifications

**Flow:**
1. User requests a change in ACT mode
2. `ImpactAnalyzer` assesses risk and affected files
3. AI generates diff-based changes
4. User sees preview with approve/reject workflow
5. `AutoFixEngine` handles syntax errors

**Modification Types:**
- **Minor updates** - Applied instantly (color changes, text)
- **Feature additions** - Diff preview with approval
- **Major changes** - AST-based editing via Tree-sitter

**Key Services:**
- `ImpactAnalyzer.ts` - Risk assessment, breaking change detection
- `AutoFixEngine.ts` - Syntax error auto-correction
- `CodeParser.ts` - AST parsing with Tree-sitter
- `CodeReviewService.ts` - Code quality checks

### 5. App Concept Wizard

**6-Step Flow:**
1. **Template** - Choose starting point
2. **Basic Info** - Name, description
3. **Features** - Select from feature library
4. **Design** - Color scheme, style preferences
5. **Technical** - Stack choices, integrations
6. **Review** - Confirm concept before building

**Components:**
- `NaturalConversationWizard.tsx` - Main wizard component
- `src/components/conversation-wizard/` - Sub-components
- `src/hooks/useDraftPersistence.ts` - Auto-save drafts
- `src/hooks/usePhaseGeneration.ts` - Generate phase plans

### 6. Layout Builder

**Capabilities:**
- Visual layout design with drag-and-drop
- AI feedback via Claude's vision (screenshot analysis)
- Design token export (CSS Variables, Tailwind, Figma)
- Version history for designs

**Components:**
- `LayoutBuilderWizard.tsx` - Main layout builder
- `src/components/layout-builder/` - Layout tools
- Endpoint: `/api/layout/chat` - Vision-enabled chat

### 7. Version Control & Rollback

**Features:**
- Automatic version snapshots on every change
- Undo/Redo with keyboard shortcuts (Ctrl+Z, Ctrl+Y)
- Fork versions to create independent copies
- Side-by-side diff comparison

**Service:**
- `RollbackService.ts` - Version management and rollback

### 8. Real-Time Preview

**Sandpack Integration:**
- Live code execution in browser
- Instant feedback on changes
- Error boundaries with graceful fallbacks
- Component: `PreviewPanel.tsx`

### 9. Image Generation (DALL-E 3)

**Types:**
- Hero images for landing pages
- Card thumbnails
- Background patterns
- Design-context aware prompts

**Service:**
- `dalleService.ts` - DALL-E 3 API wrapper
- `AppImageGenerator.ts` - Batch processing, rate limiting, caching
- Endpoint: `/api/images/generate`

### 10. Cloud Storage

**Supabase Integration:**
- User file uploads
- Storage analytics and quota tracking
- Bulk operations

**Services:**
- `StorageService.ts` - File operations
- `StorageAnalytics.ts` - Usage tracking

### 11. Authentication

**Features:**
- Supabase auth with session management
- Protected routes via middleware
- User isolation (each user's apps are private)

**Files:**
- `src/middleware.ts` - Route protection
- `src/app/login/` and `src/app/signup/` - Auth pages
- `/api/auth/` - Auth endpoints

## User Flows

### Quick Build Flow
```
1. User clicks "New App"
2. Switches to ACT Mode
3. Describes app: "Build a todo app with..."
4. AI streams generation (15-30 seconds)
5. Preview shows working app
6. User can modify or export
```

### Wizard Flow
```
1. User clicks "Wizard"
2. NaturalConversationWizard opens
3. AI guides through 6 steps
4. Generates phase plan
5. User builds phases sequentially
6. Each phase tested before next
```

### Modification Flow
```
1. User loads existing app
2. Switches to ACT Mode
3. Describes change: "Add dark mode"
4. ImpactAnalyzer assesses risk
5. AI generates diff preview
6. User approves/rejects
7. Changes applied or discarded
```

## State Management

**Zustand Stores:**
- `src/store/` - App state, chat history, version history
- `src/stores/` - Feature-specific stores

**Key State:**
- Current app files and metadata
- Chat conversation history
- Version history stack
- Build phase progress
- User preferences

## API Endpoint Summary

| Endpoint | Purpose |
|----------|---------|
| `/api/ai-builder` | Single component generation |
| `/api/ai-builder/full-app-stream` | Full app with SSE streaming |
| `/api/ai-builder/modify` | Surgical modifications |
| `/api/ai-builder/apply-diff` | Apply diff changes |
| `/api/wizard/generate-phases` | Dynamic phase planning |
| `/api/wizard/chat` | PLAN mode conversations |
| `/api/layout/chat` | Layout builder with vision |
| `/api/builder/chat` | ACT mode expert chat |
| `/api/images/generate` | DALL-E 3 generation |
| `/api/embeddings` | Text embeddings |

## When Implementing Features

1. **New generation features** → Modify `PhaseExecutionManager` or add new API routes
2. **UI changes** → Follow patterns in existing components
3. **New modification types** → Extend `ImpactAnalyzer` and diff handling
4. **Storage features** → Use `StorageService` patterns
5. **Auth changes** → Update middleware and auth endpoints
6. **New wizards** → Follow `NaturalConversationWizard` patterns
