# Current Features - What's Actually Implemented

This document describes features that are **actually working in the codebase** (as of November 2025).

---

## 🎨 User Interface

### Conversation-First Design
- **Two-panel layout**: Chat on left, Preview/Code on right
- **Base44-inspired** clean, modern interface
- **Dark theme** with gradient backgrounds (slate-900 → slate-800)
- **Fullscreen preview mode** with floating exit button
- **Responsive design** adapts to mobile/tablet/desktop

### Header
- **Logo badge** with gradient (blue → purple)
- **App title** with subtitle
- **My Apps button** (📂) shows library count
- **History button** (🕒) shows version count
- **Notification badges** on buttons

---

## 💬 Chat System

### Dual-Purpose Chat
The AI intelligently routes your messages:

**Q&A Mode** (Questions):
- Triggers on: "what", "how", "why", "can you explain", etc.
- Example: "What is useState?"
- Response: AI explains the concept
- Uses `/api/chat` endpoint

**Build Mode** (App Generation):
- Triggers on: "build", "create", "make", "add feature", etc.
- Example: "Build a todo app"
- Response: AI generates complete app
- Uses `/api/ai-builder/full-app` or `/api/ai-builder/modify`

### Chat Features
- **Conversation history**: Last 5-15 messages preserved
- **Message types**:
  - User messages (blue bubbles)
  - Assistant messages (gray bubbles with border)
  - System messages (purple bubbles - guidance/tips)
- **Auto-scroll** to newest messages
- **Timestamp** on every message
- **View component** buttons on generation messages

### Input Area
- **Text input** with placeholder guidance
- **Image upload button** (🖼️) for design inspiration
- **Send button** (🚀) disabled when empty
- **Loading states** with progress messages
- **Image preview** with remove button when image uploaded

---

## 🤖 AI Integration

### Claude Sonnet 4.5
- **Model**: `claude-sonnet-4-20250514`
- **Provider**: Anthropic
- **Max tokens**: 16,384 for full apps, 4,096 for modifications
- **Temperature**: 0.7 (balanced creativity)
- **Streaming responses**: Real-time token delivery

### Capabilities
- **App generation**: Complete React/Next.js apps
- **Code modifications**: Diff-based surgical edits
- **Q&A**: Programming questions and explanations
- **Image analysis**: Extract design from screenshots
- **Conversation context**: Maintains history across messages
- **Internal planning**: Hidden system for cross-message consistency

---

## 📸 Image-Inspired Designs

### Image Upload
- **Click 🖼️ button** to upload
- **Accepted formats**: JPEG, PNG, GIF, WebP
- **Max size**: 5MB
- **Preview thumbnail** shows uploaded image
- **Remove button** (✕) to clear image

### AI Processing
When image is uploaded, AI:
1. Analyzes the image
2. Extracts color palette
3. Identifies design style (modern, minimalist, bold, etc.)
4. Notes patterns and textures
5. Recreates aesthetic with Tailwind CSS

---

## 🏗️ App Generation

### Frontend-Only Apps
**Instant browser preview** for:
- Todo lists, calculators, games
- Dashboards with charts
- Landing pages, portfolios
- UI components

**Technical Details**:
- Uses `src/App.tsx` file structure
- Plain JSX (no TypeScript syntax in App.tsx)
- Sandpack for live preview
- Tailwind CSS for styling
- localStorage for data persistence
- No backend required

### Full-Stack Apps
**Download and run locally** for:
- Blogs with CMS
- E-commerce platforms
- Apps with authentication
- Database-driven apps
- API integrations

**Technical Details**:
- Next.js 13+ App Router
- `'use client'` directive for preview compatibility
- Prisma ORM for database
- NextAuth.js for authentication
- API routes in `app/api/`
- Mock data in preview, real data when run locally

**File Structure**:
```
app/
├── page.tsx           # Main page (preview-compatible)
├── layout.tsx         # Root layout
├── api/
│   └── [endpoint]/
│       └── route.ts   # API handlers
prisma/
└── schema.prisma      # Database schema
lib/
├── db.ts             # Database client
└── auth.ts           # Auth utilities
```

---

## 🔄 Modification System (Phase 2)

### Diff-Based Modifications
Instead of rewriting entire files, the system makes **surgical edits**:

**Change Types**:
- `ADD_IMPORT` - Add import statement at top
- `INSERT_AFTER` - Insert code after a pattern
- `INSERT_BEFORE` - Insert code before a pattern
- `REPLACE` - Replace specific code
- `DELETE` - Remove specific code
- `APPEND` - Add code at end of file

### Approval System
**Auto-Applied** (no approval needed):
- Simple changes: Colors, text, styling
- Medium changes: New features, dark mode, exports
- Changes marked as `MINOR_CHANGE`

**Requires Approval**:
- Complex changes: Authentication, major refactors
- Changes marked as `MAJOR_CHANGE`
- Shows diff preview with approve/reject buttons

### Staged Modifications
For **complex features** (auth, payments, etc.):

**Process**:
1. User requests complex feature
2. AI detects complexity, asks consent
3. User says "proceed"
4. AI breaks into 2-4 stages
5. Implements Stage 1, shows diff preview
6. User approves/rejects
7. After approval, AI asks "Happy with this stage?"
8. User says "yes" → proceeds to Stage 2
9. Repeats until all stages complete

**Benefits**:
- Preserves existing styling and features
- Each stage works before moving on
- User can guide direction at each step
- Prevents accidental changes

---

## 🎯 AST Operations (Phase 5 - NEW!)

### Complete Authentication in One Command ✨

**NEW:** Phase 5 introduces AST-based operations for complex modifications!

**User request:** "add authentication"

**What happens automatically:**
1. ✅ Adds state: `isLoggedIn`, `email`, `password`
2. ✅ Creates handlers: `handleLogin`, `handleLogout`
3. ✅ Generates login form UI (styled or simple)
4. ✅ Wraps existing content in conditional
5. ✅ Adds logout button to authenticated view

**All in ONE operation - no manual staging needed!**

### Available AST Operations

1. **AST_ADD_AUTHENTICATION** - Complete auth system
   - Options: `loginFormStyle` ('simple' | 'styled'), `includeEmailField` (boolean)
   
2. **AST_WRAP_ELEMENT** - Wrap components in other components
   - Example: Wrap app in AuthGuard, ErrorBoundary, Provider
   
3. **AST_ADD_STATE** - Add useState hooks with auto-import
   - Example: Add dark mode state
   
4. **AST_ADD_IMPORT** - Smart import management (auto-deduplication)
   - Example: Import React hooks
   
5. **AST_MODIFY_CLASSNAME** - Modify className attributes dynamically
   - Example: Add conditional dark mode classes
   
6. **AST_INSERT_JSX** - Insert JSX elements precisely
   - Example: Add button, form, section
   
7. **AST_ADD_USEEFFECT** - Add useEffect hooks
   - Example: Fetch data on mount
   
8. **AST_MODIFY_PROP** - Modify component props
   - Example: Change onClick handler

### Why AST Operations?

**Before Phase 5:**
- ❌ Authentication modifications failed
- ❌ "undefined" errors in complex changes
- ❌ String matching was fragile

**After Phase 5:**
- ✅ Authentication works perfectly
- ✅ No "undefined" errors
- ✅ AST-based = reliable & validated

---

## 🕒 Version Control System

### Automatic Version Saving
**Every modification creates a new version**:
- Version number increments
- Timestamp recorded
- Change description saved
- Change type tracked (NEW_APP, MAJOR_CHANGE, MINOR_CHANGE)

### Undo/Redo
**Keyboard shortcuts**:
- **Ctrl+Z** / **Cmd+Z**: Undo to previous version
- **Ctrl+Shift+Z** / **Cmd+Shift+Z**: Redo
- **Ctrl+Y** / **Cmd+Y**: Redo (alternative)

**Undo stack**:
- Unlimited history (until page refresh)
- Each undo moves version to redo stack
- Making new changes clears redo stack
- Visual button states (enabled/disabled)

### Version History Modal
**Click 🕒 History button** to open:
- Shows all versions in reverse chronological order
- Each version displays:
  - Version number
  - Timestamp
  - Change description
  - Change type badge (🚀 NEW_APP, ⚡ MAJOR, ✨ MINOR)
  - Current version highlighted in blue

**Actions per version**:
- **🔄 Revert**: Restore to that version
- **🍴 Fork**: Create alternative branch from that version
- **🔍 Compare**: Compare with current version

### Fork/Branch
**Create alternative versions**:
1. Click **🍴 Fork** on any version or current app
2. New app created with "-Fork" suffix
3. Independent from original
4. Appears in My Apps library
5. Can modify without affecting original

### Compare Versions
**Side-by-side comparison**:
1. Click **🔍 Compare with current** on any version
2. Modal shows two panels:
   - Left: Selected version
   - Right: Current version
3. Shows timestamps, descriptions
4. Code preview for each (first 1000 chars)
5. Actions: Copy code, Revert, Fork

---

## 👁️ Preview System

### Live Preview
**Sandpack integration**:
- Browser-based React sandbox
- Real-time code execution
- No backend required
- Tailwind CSS via CDN
- Error handling and console logs

### Preview Controls
**Toolbar buttons**:
- **👁️ Live Preview** tab
- **💻 Code** tab (file tree + viewer)
- **⤢ Fullscreen** button
- **⤓ Exit Fullscreen** (when in fullscreen)
- **🔄 Refresh** button

### Fullscreen Mode
**Features**:
- Hides header and controls
- Full viewport preview
- Floating exit button (top-right)
- Press button or Esc to exit

### Code View
**File tree + viewer**:
- Left sidebar: All files with icons
  - 📘 TypeScript/TSX files
  - 🎨 CSS files
  - ⚙️ JSON files
  - 📄 Other files
- Right panel: Code viewer
  - Syntax highlighting
  - Scrollable content
  - Copy to clipboard button

### Full-Stack Warning
For full-stack apps:
- Yellow warning banner: "⚠️ Preview mode: Backend features disabled"
- Appears overlaying preview
- Reminds users to download for full features

---

## 📦 App Library & Export

### My Apps Library
**Click 📂 My Apps** to open:

**Features**:
- Grid view of all saved apps
- Search bar to filter apps
- Each app card shows:
  - App name
  - Description (truncated)
  - Creation date
  - Actions (⭐ favorite, 📦 export, 🗑️ delete)
- Click card to load app
- Star to favorite apps

**Persistence**:
- Stored in browser localStorage
- Survives page refreshes
- Cleared on browser data wipe
- Max 50 apps (oldest pruned)

### Export & Download
**Click 📦 Export**:

**What you get**:
1. **ZIP file** downloads containing:
   - All source files
   - `package.json` with dependencies
   - Configuration files (tsconfig.json, tailwind.config.js, etc.)
   - `.env.example` template
   - `README.md` with setup instructions

2. **Deployment Modal** opens showing:
   - Platform options (Vercel, Netlify, GitHub)
   - Step-by-step deployment instructions
   - CLI commands to copy
   - Environment variables needed

**Deployment Instructions**:
- **Vercel**: `vercel` command
- **Netlify**: `netlify deploy --prod`
- **GitHub**: Git commands for repo creation

---

## 🔐 Authentication

### Password Protection
**Login required**:
- Landing page redirects to `/login`
- Default password: "Nerd"
- Change in `.env.local`: `SITE_PASSWORD=yourpass`

**AuthGuard Component**:
- Wraps main app in `page.tsx`
- Checks `/api/auth/check` for valid session
- Redirects to login if not authenticated
- Session stored in cookies

### Multi-User Ready
**Can be extended for**:
- Multiple users with separate passwords
- Database-backed user accounts
- OAuth integration (Google, GitHub, etc.)
- Role-based access control

---

## ⌨️ Keyboard Shortcuts

### Version Control
- **Ctrl+Z** / **Cmd+Z** - Undo last change
- **Ctrl+Shift+Z** / **Cmd+Shift+Z** - Redo
- **Ctrl+Y** / **Cmd+Y** - Redo (alternative)

### Interface
- **Enter** - Send message in chat
- **Esc** - Close modal windows

### Global Shortcuts
Work anywhere in the app when conditions met:
- Undo/redo: Only when currentComponent exists
- Shortcuts prevented in input fields

---

## 🎨 UI Components

### Modal System
**Modals for**:
- Version history
- App library
- Change approval
- Deployment instructions
- Compare versions

**Features**:
- Dark backdrop with blur
- Click outside to close
- Esc key to close
- Smooth animations
- Responsive sizing

### Buttons
**Styles**:
- Primary: Blue gradient (blue-600 → purple-600)
- Secondary: Slate background
- Success: Green (for approvals)
- Danger: Red (for rejections)
- Icon-only: Transparent with hover
- Hover effects: Scale, shadow, color shift

### Loading States
**During generation**:
- Animated spinner (three bouncing dots)
- Progress messages:
  - "🤔 Analyzing your request..."
  - "🏗️ Designing app structure..."
  - "⚡ Generating components..."
  - "🎨 Styling with Tailwind..."
  - "✨ Adding functionality..."
- Progress updates every 3 seconds

### Notifications
**Badge counters**:
- My Apps: Shows total app count
- History: Shows version count
- Red badges for important counts

---

## 🛠️ Technical Implementation

### State Management
**React hooks**:
- `useState` for component state
- `useEffect` for side effects
- `useRef` for DOM references
- `useMemo` for expensive computations

**Global state**:
- `currentComponent`: Active app being worked on
- `components`: Array of all saved apps
- `chatMessages`: Conversation history
- `undoStack` / `redoStack`: Version history

### Data Persistence
**localStorage**:
- Key: `'ai_components'`
- Stores: Array of GeneratedComponent objects
- Auto-saves on component changes
- Loads on mount

### API Routes
**Endpoints**:
- `/api/chat`: Q&A responses
- `/api/ai-builder/full-app`: New app generation
- `/api/ai-builder/modify`: Diff-based modifications
- `/api/auth/login`: Password authentication
- `/api/auth/check`: Session validation

### Error Handling
**Graceful degradation**:
- Try-catch blocks around API calls
- User-friendly error messages
- Retry suggestions
- Timeout handling (45s for modifications)
- Fallback UI for parse errors

---

## 📊 Limitations & Known Issues

### What Works Great ✅
- Simple modifications (colors, text, buttons)
- Medium complexity (dark mode, new features, exports)
- Frontend-only apps with instant preview
- Full-stack apps (download required)
- Version control and undo/redo
- Image-inspired designs

### Known Limitations ⚠️
- ~~**Authentication**: May fail~~ ✅ FIXED in Phase 5!
- **Very complex refactors**: Multi-file restructuring may need manual work
- **Token limits**: Very large apps (16K tokens) may truncate
- **Backend preview**: Full-stack features can't run in browser
- **LocalStorage limits**: Browser storage caps affect library size

**Note**: Most previously "complex" modifications now work via AST operations!

### Workarounds
- **Large apps**: Build incrementally through conversation
- **Preview issues**: Download and run locally

See [Troubleshooting](./TROUBLESHOOTING.md) for solutions.

---

## 🚀 Future Enhancements

See [FUTURE_IMPLEMENTATION_TODO.md](./FUTURE_IMPLEMENTATION_TODO.md) for:
- Template system (from old version)
- Props injection (from old version)
- Code blocks (alternative to diffs)
- AST-based modifications
- Component library
- Better syntax highlighting

---

**Last Updated**: November 2025  
**Version**: 2.0 (Conversation-First System)
