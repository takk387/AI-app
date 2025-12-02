# 🤖 AI App Builder

> Build complete web applications through natural conversation with AI. Plan, design, and generate production-ready React apps powered by Claude AI.

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Ready-green)](https://supabase.com/)

---

## ✨ Features

### 🎯 Dual-Mode AI System
- **💭 PLAN Mode**: Discuss and design your app without generating code
  - Brainstorm features and architecture
  - Refine requirements through conversation
  - Create detailed implementation plans
- **⚡ ACT Mode**: Generate and modify working applications
  - Real-time code generation
  - Surgical code modifications
  - Context-aware changes

### 🧙‍♂️ Guided App Creation
- **Interactive Wizards**: Step-by-step app planning with AI assistance
- **Smart Conversations**: Natural language understanding of requirements
- **Template Suggestions**: AI recommends the best starting point

### 🏗️ Phased Building System
- Break complex apps into manageable phases
- Context-aware phase execution
- Build incrementally with dependencies
- Track progress across phases

### ⚡ Real-Time Generation
- **Streaming Code Generation**: Watch your app come to life
- **Live Progress Tracking**: See each file as it's created
- **Instant Preview**: Test components immediately
- **Sandpack Integration**: Interactive code playground

### 🔄 Advanced Version Control
- **Automatic History**: Every change saved automatically
- **Undo/Redo**: One-click rollback to any state
- **Fork Versions**: Create variations without losing originals
- **Compare Versions**: Side-by-side diff viewer
- **Smart Rollback**: Revert to any previous version

### 🎨 Pre-Built Templates
Choose from 6 production-ready templates:
- **Blog**: Content-focused with dynamic routing
- **CRUD App**: Full database operations
- **Dashboard**: Analytics and data visualization
- **E-commerce**: Product catalog and shopping cart
- **Landing Page**: Marketing and conversion optimized
- **SaaS Platform**: Multi-page application structure

### 🔍 Intelligent Code Modifications
- **Diff-Based Editing**: Review changes before applying
- **Approval Workflow**: Accept or reject modifications
- **Impact Analysis**: Understand effects before committing
- **AST Parsing**: Surgical code changes with Tree-sitter

### 📁 Cloud Storage Integration
- **File Management**: Upload and organize project assets
- **Supabase Storage**: Secure cloud file storage
- **Analytics**: Track storage usage and file statistics
- **Bulk Operations**: Delete multiple files at once

### 📦 Export & Deployment
- **Download as ZIP**: Get complete project files
- **Deployment Guides**: Instructions for Vercel, Netlify, etc.
- **Production Ready**: Optimized code with best practices
- **One-Click Export**: Package entire application instantly

### 🔐 Authentication & Security
- **Supabase Auth**: Secure user authentication
- **Protected Routes**: Middleware-based route protection
- **User Isolation**: Each user's apps are private
- **Session Management**: Persistent login state

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.0 or higher
- **npm** or **yarn**
- **Supabase** account (free tier works)
- **Anthropic API** key (Claude)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/takk387/AI-app.git
   cd AI-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   
   ```env
   # Anthropic API
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   
   # Optional: App Configuration
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Set up Supabase**
   
   Run the migrations in your Supabase project:
   ```bash
   # The migrations are in supabase/migrations/
   # Apply them through Supabase dashboard or CLI
   ```

5. **Run development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

---

## 🎯 How to Use

### Getting Started

1. **Start a Conversation**
   - Click "New App" to begin
   - Describe what you want to build in natural language
   - Use the image upload to share design inspiration

2. **Choose Your Approach**
   
   **Option A: Quick Build**
   - Describe your app
   - Switch to ACT Mode
   - Type "build it" and let AI generate everything
   
   **Option B: Use Wizards** 🧙‍♂️
   - Click "Wizard" button
   - Answer guided questions
   - Get a structured plan
   - Build in phases
   
   **Option C: Detailed Planning**
   - Stay in PLAN Mode
   - Discuss features and architecture
   - Refine requirements
   - Then switch to ACT Mode to build

### PLAN Mode vs ACT Mode

| Mode | Purpose | AI Behavior |
|------|---------|-------------|
| **💭 PLAN** | Discussion & Design | Answers questions, suggests features, creates plans |
| **⚡ ACT** | Code Generation | Generates working code, modifies apps, implements features |

**Tip**: Always start in PLAN Mode to design, then switch to ACT Mode to build.

### Building in Phases

1. Use the **Wizard** to create a phased build plan
2. AI generates 3-7 phases based on complexity
3. Build one phase at a time for better control
4. Each phase includes context from previous phases

### Modifying Existing Apps

1. Load an app from "My Apps"
2. Switch to ACT Mode
3. Describe your changes
4. Review the diff preview
5. Approve or reject modifications

### Version Control

- **Undo/Redo**: Use buttons in the preview panel
- **History**: Click "History" to view all versions
- **Fork**: Create a copy to experiment safely
- **Compare**: View differences between versions

---

## 🛠️ Tech Stack

### Frontend
- **[Next.js 15](https://nextjs.org/)** - React framework with App Router
- **[React 19](https://react.dev/)** - UI library with latest features
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first styling
- **[Zustand](https://zustand-demo.pmnd.rs/)** - Lightweight state management

### Backend & Database
- **Next.js API Routes** - Serverless backend
- **[Supabase](https://supabase.com/)** - Backend-as-a-Service
  - PostgreSQL database
  - Authentication
  - File storage
  - Real-time subscriptions

### AI Integration
- **[Anthropic Claude](https://www.anthropic.com/)** - AI code generation
  - Claude 3.5 Sonnet for complex reasoning
  - Streaming responses for real-time feedback
  - Extended context for full-app generation

### Developer Tools
- **[Tree-sitter](https://tree-sitter.github.io/tree-sitter/)** - Code parsing and AST manipulation
- **[Sandpack](https://sandpack.codesandbox.io/)** - Live code preview and execution
- **[Jest](https://jestjs.io/)** - Testing framework
- **[JSZip](https://stuk.github.io/jszip/)** - App export functionality

---

## 📂 Project Structure

```
AI-APP-BUILDER/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # API Routes
│   │   │   ├── ai-builder/      # Main AI endpoints
│   │   │   ├── chat/            # Chat API
│   │   │   ├── auth/            # Authentication
│   │   │   └── wizard/          # Wizard endpoints
│   │   ├── login/               # Login page
│   │   ├── signup/              # Signup page
│   │   └── page.tsx             # Home page
│   │
│   ├── components/              # React components
│   │   ├── AIBuilder.tsx        # Main orchestrator
│   │   ├── ChatPanel.tsx        # Chat interface
│   │   ├── PreviewPanel.tsx     # Code preview
│   │   ├── modals/              # Modal dialogs
│   │   ├── build/               # Build system UI
│   │   ├── review/              # Code review UI
│   │   └── storage/             # File storage UI
│   │
│   ├── hooks/                   # Custom React hooks
│   │   ├── useBuildPhases.ts   # Phase management
│   │   ├── useVersionControl.ts # Version history
│   │   ├── useDatabaseSync.ts  # Supabase sync
│   │   └── useStreamingGeneration.ts # Streaming AI
│   │
│   ├── services/                # Business logic
│   │   ├── PhaseOrchestrator.ts        # Phase coordination
│   │   ├── PhaseExecutionManager.ts    # Phase execution
│   │   ├── DynamicPhaseGenerator.ts    # AI phase planning
│   │   ├── ImpactAnalyzer.ts          # Change analysis
│   │   ├── RollbackService.ts         # Version rollback
│   │   └── StorageService.ts          # File management
│   │
│   ├── types/                   # TypeScript types
│   ├── utils/                   # Utility functions
│   ├── prompts/                 # AI prompts
│   ├── data/templates/          # App templates
│   ├── contexts/                # React contexts
│   └── store/                   # Zustand stores
│
├── supabase/                    # Supabase configuration
│   └── migrations/              # Database migrations
│
├── tests/                       # Test files
├── docs/                        # Documentation
└── public/                      # Static assets
```

---

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key | ✅ Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | ✅ Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | ✅ Yes |
| `NEXT_PUBLIC_APP_URL` | Your app URL | ❌ No (defaults to localhost) |

### Getting API Keys

**Anthropic API Key:**
1. Sign up at [console.anthropic.com](https://console.anthropic.com/)
2. Navigate to API Keys
3. Create a new key
4. Copy and add to `.env.local`

**Supabase Setup:**
1. Create project at [supabase.com](https://supabase.com/)
2. Go to Settings > API
3. Copy URL and keys
4. Apply database migrations from `supabase/migrations/`

---

## 🧪 Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:validator    # Code validation tests
npm run test:retry        # Retry logic tests
npm run test:integration  # Integration tests

# Run all tests including integration
npm run test:all
```

---

## 📤 Deployment

### Deploy to Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com/)
   - Click "New Project"
   - Import your GitHub repository

3. **Add Environment Variables**
   - Add all variables from `.env.local`
   - Deploy

4. **Configure Supabase**
   - Update `NEXT_PUBLIC_APP_URL` with your Vercel URL
   - Add Vercel URL to Supabase allowed origins

### Other Platforms

The app can be deployed to any platform supporting Next.js:
- **Netlify**: Use `next export` for static export
- **Railway**: Direct deployment with build commands
- **DigitalOcean**: App Platform supports Next.js
- **AWS Amplify**: Full Next.js support

---

## 🎨 Customization

### Adding New Templates

1. Create a new file in `src/data/templates/`
2. Follow the template structure:
   ```typescript
   export const myTemplate = {
     id: 'my-template',
     name: 'My Template',
     description: 'Description here',
     tags: ['tag1', 'tag2'],
     // ... more config
   };
   ```
3. Export from `src/data/templates/index.ts`

### Modifying AI Prompts

AI prompts are located in `src/prompts/`:
- `builder.ts` - Main builder prompts
- `phasePrompts.ts` - Phase-specific prompts
- `wizardSystemPrompt.ts` - Wizard conversation prompts

### Customizing UI Theme

Edit `src/app/globals.css` for global styles or use the built-in theme toggle for light/dark modes.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is part of a private repository. Please contact the repository owner for licensing information.

---

## 🙏 Acknowledgments

- **Anthropic** for Claude AI
- **Supabase** for backend infrastructure
- **Vercel** for Next.js framework
- **CodeSandbox** for Sandpack live preview

---

## 📧 Support

For questions or issues:
- Open an issue on GitHub
- Check the [User Guide](docs/USER_GUIDE.md)

---

**Built with ❤️ using Next.js, React, and Claude AI**
