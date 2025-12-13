# AI App Builder

> Build complete web applications through natural conversation with AI. Plan, design, and generate production-ready React apps powered by Claude AI.

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue)](https://www.typescriptlang.org/)
[![Railway](https://img.shields.io/badge/Railway-Deployed-blueviolet)](https://railway.app/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-green)](https://supabase.com/)

---

## Features

### Dual-Mode AI System
- **PLAN Mode**: Discuss and design your app without generating code - brainstorm features, refine requirements, create implementation plans
- **ACT Mode**: Generate and modify working applications with real-time code generation and context-aware changes

### AI-Powered Generation
- **Claude Sonnet 4.5** with extended thinking for intelligent code generation
- **Streaming responses** with real-time file progress tracking
- **Full-stack support** for both frontend-only and full-stack applications
- **Token budget management** for complex multi-file apps
- **Automatic code validation** with syntax checking and auto-fixing

### Dynamic Phase Building
- **AI-powered scope detection** analyzes requirements and generates 2-25+ optimal phases
- **Dependency detection** between phases with sequential execution
- **Context accumulation** across phases for coherent multi-phase builds
- **Smart code context service** with 48KB window optimization per phase
- **Test criteria generation** per phase

### App Concept Wizard
- 6-step guided creation: Template → Basic Info → Features → Design → Technical → Review
- Feature library with pre-defined templates
- Auto-save with draft persistence
- Rich concept preservation through the entire generation pipeline

### Layout Builder
- Visual layout design with AI feedback
- **Vision capabilities** - Claude can see and critique your designs via screenshots
- Design token management and export
- Export formats: CSS Variables, Tailwind Config, Figma Tokens, React components
- Version history for design changes

### DALL-E 3 Image Generation
- Hero images, card thumbnails, and background patterns
- Design context-aware prompts
- Batch processing with rate limiting
- Caching for repeated generations

### Surgical Code Modifications
- **AST-based editing** using Tree-sitter for precise changes
- Diff-based modification tracking with approval workflow
- Impact analysis with risk assessment and breaking change detection
- Context-aware editing that preserves existing functionality

### Version Control & Rollback
- Automatic version snapshots on every change
- One-click rollback to any previous state
- Fork versions without losing originals
- Side-by-side diff comparison

### Real-Time Preview
- **Sandpack integration** for interactive code playground
- Live code execution with instant feedback
- Error boundaries with graceful fallbacks

### Cloud Storage
- Supabase file storage integration
- Storage analytics and quota tracking
- Bulk operations and file categorization

### Authentication
- Supabase auth with session management
- Protected routes via middleware
- User isolation - each user's apps are private

---

## Tech Stack

### Frontend
- **Next.js 15** - App Router with streaming SSR
- **React 19** - Latest features including Server Components
- **TypeScript** - Full type safety
- **Tailwind CSS** - Utility-first styling
- **Zustand** - Lightweight state management

### Backend & Database
- **Next.js API Routes** - Serverless endpoints with SSE streaming
- **Supabase** - PostgreSQL, Auth, File Storage, Real-time

### AI Integration
- **Anthropic Claude** - Sonnet 4.5 with extended thinking
- **OpenAI DALL-E 3** - Image generation
- **js-tiktoken** - Token counting and budget management

### Developer Tools
- **Tree-sitter** - AST parsing for surgical code edits
- **Sandpack** - Live code preview
- **Puppeteer** - Screenshot generation
- **Jest** - Testing framework
- **ESLint + Prettier** - Code quality
- **Husky + lint-staged** - Pre-commit hooks

---

## Quick Start

### Prerequisites
- Node.js 18+
- Anthropic API key
- Supabase account
- OpenAI API key (optional, for image generation)

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

## Deployment (Railway)

### Deploy to Railway

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Create Railway Project**
   - Go to [railway.app](https://railway.app/)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository

3. **Add Environment Variables**
   - In Railway dashboard, go to your service → Variables
   - Add all variables from `.env.local`
   - Set `NEXT_PUBLIC_APP_URL` to your Railway URL

4. **Configure Build**
   - Railway auto-detects Next.js
   - Build command: `npm run build`
   - Start command: `npm start`

5. **Update Supabase**
   - Add your Railway URL to Supabase Auth allowed redirect URLs
   - Settings → Authentication → URL Configuration

### Railway Features
- Automatic deployments on push
- Built-in SSL certificates
- Web Application Firewall protection
- Auto-scaling and monitoring

---

## Usage

### Quick Build
1. Click "New App"
2. Describe what you want to build
3. Switch to ACT Mode
4. Type "build it"

### Guided Wizard
1. Click "Wizard" button
2. Follow the 6-step guided flow
3. Review your app concept
4. Build in phases

### Modify Existing Apps
1. Load an app from "My Apps"
2. Switch to ACT Mode
3. Describe your changes
4. Review the diff preview
5. Approve or reject

### PLAN vs ACT Mode

| Mode | Purpose |
|------|---------|
| **PLAN** | Discussion, brainstorming, architecture planning |
| **ACT** | Code generation, modifications, building |

---

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/
│   │   ├── ai-builder/    # Main AI generation endpoints
│   │   ├── images/        # DALL-E image generation
│   │   ├── wizard/        # Wizard & phase planning
│   │   ├── layout/        # Layout builder chat
│   │   ├── builder/       # Builder expert chat
│   │   └── auth/          # Authentication
│   ├── login/
│   └── signup/
├── components/
│   ├── AIBuilder.tsx      # Main orchestrator
│   ├── ChatPanel.tsx      # Chat interface
│   ├── PreviewPanel.tsx   # Code preview
│   ├── wizards/           # Wizard components
│   ├── build/             # Build system UI
│   ├── review/            # Diff review UI
│   └── modals/            # Modal dialogs
├── services/
│   ├── PhaseExecutionManager.ts
│   ├── DynamicPhaseGenerator.ts
│   ├── CodeContextService.ts
│   ├── ImpactAnalyzer.ts
│   ├── RollbackService.ts
│   └── AppImageGenerator.ts
├── hooks/                  # Custom React hooks
├── store/                  # Zustand stores
├── prompts/                # AI system prompts
├── types/                  # TypeScript definitions
└── utils/                  # Utilities
```

---

## Testing

```bash
# Run all tests
npm run test:all

# Unit tests
npm run test:unit

# Hook tests
npm run test:hooks

# Service tests
npm run test:services

# Integration tests
npm run test:integration

# Watch mode
npm run test:watch
```

---

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/ai-builder` | Single component generation |
| `/api/ai-builder/full-app-stream` | Full app generation with SSE |
| `/api/ai-builder/modify` | Surgical code modifications |
| `/api/ai-builder/apply-diff` | Apply diff changes |
| `/api/wizard/generate-phases` | Dynamic phase planning |
| `/api/wizard/chat` | Planning conversations |
| `/api/layout/chat` | Layout builder with vision |
| `/api/builder/chat` | ACT mode expert chat |
| `/api/images/generate` | DALL-E 3 image generation |
| `/api/embeddings` | Text embeddings |

---

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Claude API key |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `OPENAI_API_KEY` | No | For DALL-E image generation |
| `NEXT_PUBLIC_APP_URL` | No | App URL (defaults to localhost) |

### Debug Mode

```bash
# Run with debug panels
npm run dev:debug

# Run with mock AI (no API calls)
npm run dev:mock
```

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/name`)
3. Commit changes (`git commit -m 'Add feature'`)
4. Push to branch (`git push origin feature/name`)
5. Open a Pull Request

---

## Claude Code Integration

This repository is configured for use with [Claude Code](https://claude.ai/claude-code) cloud environment via the GitHub App.

### Features Available

- **Custom Agents**: Specialized agents for TypeScript/React, testing, API routes, Supabase, Tailwind CSS, and more
- **Project Rules**: Automated code review rules for consistent patterns across components, services, and utilities
- **Quick Commands**: Pre-configured npm scripts for common development tasks
- **File Patterns**: Smart file organization and discovery

### Configuration

The GitHub App integration is configured in `claude.json` at the repository root. This file defines:

- 7 specialized custom agents (`.github/agents/`)
- 8 project-specific rules (`.claude/rules/`)
- Development commands and file patterns
- Tech stack and important files reference

### Using Claude Code

1. Install the Claude Code GitHub App on this repository
2. Open the repository in Claude Code cloud environment
3. Ask Claude to help with development - it will use the custom agents and rules automatically
4. Custom agents available:
   - `typescript-react-editor` - Component and hook development
   - `testing` - Writing and maintaining tests
   - `nextjs-api-routes` - API endpoint development
   - `supabase-integration` - Database and auth integration
   - `tailwind-styling` - Styling and design system
   - `app-functionality` - Feature implementation
   - `documentation` - Documentation updates

---

## License

Private repository. Contact the owner for licensing information.

---

## Acknowledgments

- [Anthropic](https://anthropic.com/) - Claude AI
- [OpenAI](https://openai.com/) - DALL-E 3
- [Supabase](https://supabase.com/) - Backend infrastructure
- [Railway](https://railway.app/) - Deployment platform
- [Vercel](https://vercel.com/) - Next.js framework
- [CodeSandbox](https://codesandbox.io/) - Sandpack preview

---

**Built with Next.js, React, and Claude AI**
