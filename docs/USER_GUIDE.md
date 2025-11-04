# 📚 Black Box AI APP - User Guide

**Your Complete Guide to Building Apps with AI**

Last Updated: November 4, 2025  
Version: 2.0 (Conversation-First System)

---

## 🎯 What Is This?

Black Box AI APP is an **AI-powered application builder** that creates complete, working apps through conversation. Simply describe what you want to build, and the AI generates production-ready code with live preview.

**What makes it special:**
- 🤖 **Conversational interface** - No coding required
- 👁️ **Live preview** - See your app running instantly
- 🔄 **Version control** - Unlimited undo/redo, fork, and compare
- 🎨 **Image-inspired designs** - Upload a screenshot, AI recreates the style
- ⚡ **Surgical modifications** - Change specific parts without rewriting everything
- 🔒 **Safe and reliable** - Review every change before it's applied

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Access the App
Open the app at `http://localhost:3000` (or your Vercel URL if deployed).

**First-time login:**
- Default password: `Nerd`
- (To change: Set `SITE_PASSWORD` in `.env.local` or Vercel environment variables)

### Step 2: Understand the Interface

```
┌────────────────────────────────────────────────────┐
│  Header: Logo | History (🕒) | My Apps (📂)       │
├─────────────────────┬──────────────────────────────┤
│                     │                              │
│   💬 Chat Panel     │    👁️ Preview / 💻 Code     │
│   (Left Side)       │    (Right Side)              │
│                     │                              │
│  - Conversation     │  - Live Preview Tab          │
│  - Plan/Act Toggle  │  - Code View Tab             │
│  - Input Area       │  - Export/Download           │
│  - Image Upload     │  - Undo/Redo/Fork            │
│                     │                              │
└─────────────────────┴──────────────────────────────┘
```

### Step 3: Choose Your Mode

At the top of the chat panel, you'll see two mode buttons:

**💭 PLAN Mode** (Default):
- For brainstorming and discussing
- AI explains concepts and answers questions
- **No code is generated** - just planning
- Best for: Exploring ideas, asking "how to", refining requirements

**⚡ ACT Mode**:
- For building and modifying apps
- AI generates working code
- Makes surgical modifications to existing apps
- Best for: Actually getting work done

**Rule of thumb:** Plan first, then Act!

### Step 4: Create Your First App

1. **Switch to ACT Mode** (click the ⚡ ACT button)
2. Type in chat: `Build me a simple todo app`
3. Press 🚀 Send or hit Enter
4. Watch the magic happen! ✨

**What you'll see:**
- Progress messages updating in real-time
- AI generates complete app with multiple files
- Preview panel shows your working app
- You can interact with it immediately!

### Step 5: Make a Change

With your todo app loaded, try:
- `Change the button color to purple`
- `Add a delete all button`
- `Add dark mode`

The AI makes **surgical edits** - only changing what you asked for!

---

## 💭 Understanding Plan vs Act Modes

### When to Use PLAN Mode

**PLAN Mode is for discussion and exploration:**

**Use it when you want to:**
- ✅ Brainstorm ideas: "What features should a task manager have?"
- ✅ Ask questions: "How does React Context work?"
- ✅ Get explanations: "What's the difference between useState and useReducer?"
- ✅ Refine requirements: "I want to build a blog - what should I consider?"
- ✅ Learn concepts: "Explain authentication to me"
- ✅ Plan architecture: "How should I structure a multi-page app?"

**What happens in PLAN Mode:**
- 💬 AI responds with explanations and guidance
- 📋 No code generation
- 🎯 Focus on understanding and planning
- 💡 AI helps you think through problems

**Example conversation in PLAN Mode:**
```
You: "I want to build a todo app"
AI: "Great! Let's plan it out. Here are some questions:
     1. Do you want user accounts?
     2. Should todos persist after refresh?
     3. Any priority levels or categories?
     4. Desktop only or mobile-friendly?"

You: "Just simple - add/delete/complete. No accounts."
AI: "Perfect! For a simple todo app, here's what we'll need:
     - A useState array to hold todos
     - Add function with input field
     - Map over todos to display them
     - Delete and toggle complete functions
     - localStorage for persistence
     
     Ready to build? Switch to ACT Mode and say 'build it'"
```

---

### When to Use ACT Mode

**ACT Mode is for building and modifying:**

**Use it when you want to:**
- ✅ Build a new app: "Create a calculator app"
- ✅ Modify existing app: "Add dark mode"
- ✅ Add features: "Add authentication"
- ✅ Fix issues: "The button isn't working"
- ✅ Change styling: "Make it look more modern"

**What happens in ACT Mode:**
- 🏗️ AI generates complete, working code
- 👁️ Live preview shows your app
- 🔄 Version control saves every change
- ✅ Review changes before they're applied (for complex modifications)

**Example conversation in ACT Mode:**
```
You: "Build a todo app"
AI: [Generates complete app with files]
    "🚀 App created - I've created your todo app with 3 files!"

You: "Add a counter showing total todos"
AI: [Shows diff preview]
    "🔍 Changes Ready for Review - I'll add a counter at the top"
    [You see exactly what will change]
    [Click ✅ Approve]

You: "Change the add button to green"
AI: [Applies change immediately]
    "✨ Minor update applied - Button is now green!"
```

---

### Transitioning Between Modes

**PLAN → ACT:** Natural progression
```
PLAN: "I want to build a blog"
PLAN: [Discussion about features, structure, etc.]
PLAN: "Sounds good, I'm ready to build"
[You switch to ACT Mode]
ACT: "Build the blog with those features"
```

**ACT → PLAN:** When you need guidance
```
ACT: [You've built an app]
[Something isn't working right]
[You switch to PLAN Mode]
PLAN: "Why isn't the login form showing up?"
PLAN: [AI explains the issue]
[You switch back to ACT Mode]
ACT: "Fix the login form by..."
```

**The system helps you!** When you switch modes, you'll see a helpful message explaining what changed.

---

## 🏗️ Building Your First App (Detailed Walkthrough)

### Example: Creating a Todo App

**Step 1: Switch to ACT Mode**
Click the ⚡ ACT button at top of chat panel.

**Step 2: Make Your Request**
Type a clear, specific description:

✅ **Good requests:**
- "Build a todo app with add, delete, and mark complete"
- "Create a simple calculator"
- "Make a timer that counts down from 5 minutes"

❌ **Vague requests:**
- "Build something cool" (too vague)
- "Make an app" (what kind?)

**Step 3: Watch It Generate**

You'll see progress messages:
```
🤔 Analyzing your request...
🏗️ Designing app structure...
⚡ Generating components...
🎨 Styling with Tailwind...
✨ Adding functionality...
```

**This takes 10-30 seconds** depending on complexity.

**Step 4: Review Your App**

The preview panel shows your working app:
- **Live Preview** tab: Interact with it like a real app
- **Code** tab: See all the files that were generated

**What you get:**
- `src/App.tsx` - Main app component
- Fully functional React app
- Tailwind CSS styling
- Working state management
- localStorage persistence (if applicable)

**Step 5: Test It**

Try using your app:
- Add a todo → Does it appear?
- Mark complete → Does it toggle?
- Delete → Does it remove?

If something's not right, just ask! "The delete button isn't working"

---

## ✏️ Making Modifications

### Simple Changes (Instant)

These apply immediately without approval:

**Text changes:**
```
"Change the title to 'My Tasks'"
"Update the button text to 'Add Task'"
```

**Color changes:**
```
"Make the button blue"
"Change background to light gray"
"Use a purple gradient for the header"
```

**Adding elements:**
```
"Add a 'Clear All' button"
"Add a counter showing total tasks"
"Add a reset button"
```

**Style tweaks:**
```
"Make the buttons bigger"
"Center the content"
"Add more spacing between items"
```

### Medium Complexity (Usually Instant)

These might show a diff preview:

**New features:**
```
"Add dark mode toggle"
"Add a search filter"
"Add export to CSV button"
"Add keyboard shortcuts"
```

**State management:**
```
"Save to localStorage"
"Add categories for tasks"
"Add priority levels"
```

**Layout changes:**
```
"Make it a 2-column layout"
"Add a sidebar"
"Make it responsive for mobile"
```

### Complex Features (Staged or AST)

For complex features, the AI uses either:

**A. AST Operations** (One-click, super reliable):
- Authentication (login/logout system)
- Complex state additions
- Structural changes

**Example:**
```
You: "Add authentication"
AI: ✅ Uses AST_ADD_AUTHENTICATION
    [Applies complete auth in one step]
    [Login form, logout button, state, handlers - all working!]
```

**B. Staged Implementation** (Step-by-step):
- Major refactors
- Multi-step features
- Breaking changes into stages

**Example:**
```
You: "Add a payment system"
AI: ⚠️ Complex Modification Detected
    "This requires multiple stages:
     Stage 1: Payment form UI
     Stage 2: Stripe integration
     Stage 3: Success/error handling
     
     Reply 'proceed' to continue"
     
You: "proceed"

AI: [Shows Stage 1 changes]
    ✅ Approve → [Applied]
    
AI: "Stage 1 Complete! Happy with this stage?"

You: "yes"

AI: [Shows Stage 2 changes]
    [Continue through stages...]
```

---

## 🎨 Using Image Upload for Design Inspiration

### How It Works

Upload a screenshot of any design, and the AI recreates the aesthetic!

**What AI extracts:**
- 🎨 Color palette
- 📐 Layout structure
- ✨ Design style (modern, minimalist, bold, etc.)
- 🖼️ Visual patterns

### Step-by-Step

**1. Find Inspiration**
- Screenshot a website you like
- Find a design on Dribbble/Behance
- Use any image with a design aesthetic

**2. Upload**
- Click 🖼️ button next to chat input
- Select image (JPG, PNG, GIF, WebP)
- Max 5MB

**3. Preview**
- See thumbnail of your uploaded image
- Click ✕ to remove if needed

**4. Request**
Type your request referencing the image:
```
"Build a todo app using this color scheme"
"Create a landing page inspired by this design"
"Make it look like this screenshot"
```

**5. AI Analyzes**
AI examines:
- Primary/secondary colors
- Typography style
- Spacing and layout
- Overall aesthetic

**6. Result**
Your app recreates the visual style using Tailwind CSS!

**Example:**
```
[Upload screenshot of a dark, modern dashboard]

You: "Build a todo app with this aesthetic"

AI: "🎨 Analyzing image...
     Detected: Dark theme with blue accents
     Style: Modern, clean, minimalist
     Creating your app..."
     
[Generates app with dark background, blue buttons, modern spacing]
```

---

## 🔄 Version Control & Undo/Redo

### Automatic Version Saving

**Every change creates a version:**
- New app created → Version 1
- Add dark mode → Version 2
- Change colors → Version 3
- Add feature → Version 4

**Each version includes:**
- 📝 Description of change
- ⏰ Timestamp
- 🏷️ Change type (NEW_APP, MAJOR_CHANGE, MINOR_CHANGE)
- 💾 Complete code snapshot

### Undo/Redo

**Keyboard shortcuts:**
- **Ctrl+Z** (Windows) or **Cmd+Z** (Mac): Undo
- **Ctrl+Shift+Z** or **Ctrl+Y**: Redo

**How it works:**
1. Make a change
2. Don't like it? Press Ctrl+Z
3. Previous version restored instantly
4. Changed your mind? Press Ctrl+Y to redo

**Example:**
```
1. Add dark mode → App now has dark mode
2. Press Ctrl+Z → Dark mode removed, back to original
3. Press Ctrl+Y → Dark mode returns
```

**Unlimited undo stack** (until page refresh)

### Version History Modal

**Access:** Click 🕒 History button in header

**What you see:**
- All versions in reverse chronological order
- Version number and timestamp
- Description of what changed
- Current version highlighted in blue

**Actions per version:**
- **🔄 Revert** - Restore to that version
- **🍴 Fork** - Create a new branch from that version
- **🔍 Compare** - Side-by-side comparison with current

**Example workflow:**
```
Version 5: Added authentication (Current) ← You are here
Version 4: Added dark mode
Version 3: Changed colors
Version 2: Added todo counter
Version 1: Initial todo app

[Click "Revert" on Version 3]
→ App now looks like Version 3 (without dark mode or auth)
→ Version 3 becomes new "Current"
```

### Fork/Branch

**What is forking?**
Create an alternative version of your app from any point in history.

**When to fork:**
- 🔀 Try different approaches
- 🧪 Experiment without affecting original
- 📋 Create variations (light theme vs dark theme)
- 💾 Save "checkpoint" before major changes

**How to fork:**

**Method 1: From current app**
1. Click **🍴 Fork** button in header
2. New app created: "Your App - Fork"
3. Appears in My Apps library
4. Independent from original

**Method 2: From version history**
1. Open 🕒 History
2. Find version you want to fork
3. Click **🍴 Fork** on that version
4. New app created from that specific version

**Example:**
```
Original App: Todo app with dark mode
              
[Fork it]
              
Fork: Todo app with dark mode
      ↓
      Add different color scheme
      ↓
      Now you have 2 independent versions!
      
Original: Dark mode with blue
Fork: Dark mode with purple
```

### Compare Versions

**What it does:**
Shows two versions side-by-side so you can see what changed.

**How to compare:**
1. Open 🕒 History
2. Click **🔍 Compare with current** on any version
3. Modal shows:
   - Left panel: Selected version
   - Right panel: Current version
   - Timestamps and descriptions
   - Code previews (first 1000 characters)

**Actions available:**
- 📋 Copy code from either version
- 🔄 Revert to old version
- 🍴 Fork the old version

**Use cases:**
- "What did I change between yesterday and today?"
- "Which version had the working login?"
- "When did I add dark mode?"

---

## 📦 Exporting & Deploying Your App

### Downloading Your App

**Step 1: Click Export**
Click 📦 **Export & Deploy** button in header

**Step 2: Download ZIP**
A ZIP file downloads automatically containing:
```
your-app.zip
├── src/
│   ├── App.tsx
│   └── (other components)
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── next.config.js
├── .env.example
└── README.md
```

**Step 3: Deployment Modal Opens**
Shows platform options and instructions:
- ▲ Vercel (Recommended)
- ◆ Netlify
- 🐙 GitHub Pages

### Running Locally

**Extract the ZIP:**
```bash
unzip your-app.zip
cd your-app
```

**Install dependencies:**
```bash
npm install
```

**Run development server:**
```bash
npm run dev
```

**Open in browser:**
```
http://localhost:3000
```

Your app is now running on your machine!

### Deploying to Vercel (Recommended)

**Why Vercel?**
- ✅ Optimized for Next.js (what we use)
- ✅ Free tier available
- ✅ Automatic deployments
- ✅ Custom domains
- ✅ Zero configuration

**Quick Deploy:**

**Method 1: CLI (Fast)**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd your-app
vercel

# Follow prompts (just press Enter for defaults)
# Your app is live in ~60 seconds!
```

**Method 2: GitHub + Vercel (Automated)**
1. Create GitHub repo
2. Push your code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```
3. Go to [vercel.com](https://vercel.com)
4. Import your GitHub repo
5. Click Deploy
6. Done! Auto-deploys on every push

**Method 3: Drag & Drop**
1. Go to [vercel.com](https://vercel.com)
2. Drag ZIP folder onto upload area
3. Click Deploy
4. Done!

### Deploying to Netlify

**Quick Deploy:**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
cd your-app
npm run build
netlify deploy --prod

# Follow prompts
# Your app is live!
```

Or use Netlify's drag-and-drop interface at [netlify.com](https://netlify.com)

### Environment Variables (Important!)

If your app uses:
- 🔐 Authentication
- 💾 Database
- 🔑 API keys

**You need to set environment variables in production:**

**Vercel:**
1. Go to project settings
2. Environment Variables tab
3. Add variables from your `.env.example`

**Netlify:**
1. Site settings
2. Build & Deploy
3. Environment
4. Add variables

**Common variables:**
- `DATABASE_URL` - Database connection string
- `NEXTAUTH_SECRET` - Auth secret
- `API_KEY` - External API keys

---

## 🎯 Common Use Cases with Examples

### Use Case 1: Building a Todo App

**Request:**
```
"Build a todo app with:
- Add todos
- Mark as complete
- Delete todos
- Counter showing total"
```

**What you get:**
- Input field for new todos
- List of todos with checkboxes
- Delete button per todo
- Counter at top
- localStorage persistence

**Common follow-up requests:**
```
"Add categories (Work, Personal, Shopping)"
"Add due dates"
"Add priority levels (High, Medium, Low)"
"Add search filter"
"Add dark mode"
```

---

### Use Case 2: Adding Dark Mode

**Prerequisites:** You have an existing app

**Request:**
```
"Add a dark mode toggle"
```

**What happens:**
1. AI adds `useState` for dark mode
2. Creates toggle button
3. Conditionally applies dark classes
4. Preserves all existing features

**What you get:**
- ☀️/🌙 Toggle button
- Dark background when active
- Light text in dark mode
- Smooth transition

**Customization requests:**
```
"Use purple instead of gray for dark mode"
"Make the toggle a sun/moon icon"
"Remember dark mode preference after refresh"
"Make dark mode the default"
```

---

### Use Case 3: Adding Authentication

**Prerequisites:** You have an existing app

**Request:**
```
"Add authentication"
```

**What happens:**
1. AI uses AST_ADD_AUTHENTICATION operation
2. Applies complete auth system in one step
3. No staging required!

**What you get:**
- 📝 Login form (email + password)
- 🔓 Logout button
- 🔒 Protected content (shows login when logged out)
- ✅ State management (isLoggedIn, email, password)
- ⚡ Event handlers (handleLogin, handleLogout)

**The login form includes:**
- Professional styling (centered, shadowed)
- Input fields with validation
- Submit button
- Full-screen layout when logged out

**Customization requests:**
```
"Remove the email field, just use password"
"Use a simple login form instead of styled"
"Change the logout button color to red"
"Add 'Remember Me' checkbox"
```

**Testing it:**
1. Enter any email/password
2. Click Login
3. App appears with logout button
4. Click Logout
5. Back to login form

---

### Use Case 4: Creating a Calculator

**Request:**
```
"Build a calculator with basic operations"
```

**What you get:**
- Number buttons (0-9)
- Operation buttons (+, -, ×, ÷)
- Display showing current value
- Clear button
- Equals button
- Working calculation logic

**Common follow-up requests:**
```
"Add decimal point support"
"Add percentage button"
"Add memory functions (M+, M-, MR, MC)"
"Make it look like the iPhone calculator"
"Add keyboard support"
```

---

### Use Case 5: Building a Timer

**Request:**
```
"Create a countdown timer starting at 5 minutes"
```

**What you get:**
- Large display showing MM:SS
- Start/Pause button
- Reset button
- Sound alert when done (optional)
- Working countdown logic

**Common follow-up requests:**
```
"Add custom time input"
"Add multiple preset timers (1min, 5min, 10min)"
"Add a progress circle"
"Make it full screen with larger numbers"
"Add lap timer functionality"
```

---

### Use Case 6: Creating a Dashboard

**Request:**
```
"Build a dashboard with stats cards and a chart"
```

**What you get:**
- 3-4 stat cards (views, users, revenue, etc.)
- Charts (using Chart.js or Recharts)
- Responsive grid layout
- Modern styling
- Mock data for demo

**Common follow-up requests:**
```
"Add a sidebar navigation"
"Add data table below charts"
"Add date range selector"
"Make it dark mode by default"
"Add export to PDF button"
```

---

## ❓ Frequently Asked Questions (FAQ)

### General Questions

**Q: Do I need to know how to code?**
A: No! The AI generates all code. However, basic React knowledge helps you understand what's being created.

**Q: What programming language/framework is used?**
A: React with TypeScript (TSX), Next.js 13+ App Router, and Tailwind CSS.

**Q: Can I export and modify the code myself?**
A: Yes! Export to ZIP and modify in any code editor. It's your code.

**Q: Is this free?**
A: The app is free to use. However, it uses Claude AI which costs money per API call (you need to provide your own API key).

**Q: Can I use this for commercial projects?**
A: Yes! The generated code is yours. No restrictions.

---

### Plan/Act Mode Questions

**Q: What's the difference between Plan and Act mode?**
A: 
- **PLAN**: Discussion and explanation only. No code generation.
- **ACT**: Builds and modifies apps. Generates code.

**Q: Can I ask questions in Act mode?**
A: Yes, but the AI tries to build things. For explanations, switch to PLAN mode.

**Q: Do I lose my conversation when switching modes?**
A: No! Conversation history is preserved across mode switches.

---

### Building & Modifying Questions

**Q: Why did my modification fail?**
A: Common reasons:
1. **Pattern not found** - Code changed since last modification
2. **Too complex** - Break into smaller requests
3. **Ambiguous request** - Be more specific

Solution: Try simpler, more specific requests.

**Q: How do I know if my change needs approval?**
A:
- **Simple changes** (colors, text, small additions) → Auto-applied
- **Complex changes** (authentication, major refactors) → Shows diff preview
- **System tells you!** You'll see either immediate change or approval modal.

**Q: What if I don't like a change?**
A: Press **Ctrl+Z** to undo immediately, or open History and revert to any previous version.

**Q: Can I modify multiple things at once?**
A: Yes, but be specific:
- ✅ "Add dark mode and a counter"
- ❌ "Make it better" (too vague)

**Q: How do I add authentication?**
A: Simple! Just say "Add authentication" and the AI uses AST operations to add a complete login/logout system in one step.

---

### Preview & Testing Questions

**Q: Why doesn't my full-stack app work in preview?**
A: Preview runs in browser only (no backend). Backend features like:
- Database queries
- Authentication APIs
- File uploads
- Server-side operations

...won't work in preview. **Download and run locally** to test these.

**Q: Can I interact with the preview?**
A: Yes! It's a live React app. Click buttons, type in inputs, etc.

**Q: How do I see the code?**
A: Click the **💻 Code** tab in the right panel.

**Q: Can I edit code directly in the preview?**
A: No. Use the chat to request changes. Export if you want to edit manually.

---

### Export & Deploy Questions

**Q: What's included in the export?**
A:
- All source code files
- `package.json` with dependencies
- Configuration files (TypeScript, Tailwind, Next.js)
- `.env.example` for environment variables
- `README.md` with setup instructions

**Q: How do I run it after downloading?**
A:
```bash
unzip your-app.zip
cd your-app
npm install
npm run dev
```

**Q: Can I deploy to my own hosting?**
A: Yes! It's a standard Next.js app. Deploy to:
- Vercel (easiest)
- Netlify
- AWS
- Your own server
- Anywhere that runs Node.js

**Q: Do I need to credit this app?**
A: No! Generated code is yours. Use however you want.

---

### Version Control Questions

**Q: How many versions can I save?**
A: Unlimited (until page refresh). Undo stack is in-memory.

**Q: Do versions persist after refresh?**
A: **Per-app versions**: Yes, saved in localStorage
- **Undo stack**: No, cleared on refresh

**Q: What's the difference between undo and revert?**
A:
- **Undo (Ctrl+Z)**: Quick step backward, can redo
- **Revert**: Jump to specific version in history, can't redo

**Q: Can I compare any two versions?**
A: Currently only compare old version with current. Full comparison coming soon!

**Q: What happens when I fork?**
A: Creates independent copy. Original and fork can be modified separately.

---

### Technical Questions

**Q: Can I use TypeScript?**
A: Yes! The app generates TypeScript (TSX) by default.

**Q: Can I use other CSS frameworks?**
A: Generated apps use Tailwind CSS. You can modify exported code to use anything.

**Q: Can I add npm packages?**
A: In exported code, yes. In preview, only what's already included.

**Q: Does it support React hooks?**
A: Yes! useState, useEffect, useContext, useRef, useMemo, useCallback, useReducer.

**Q: Can it create multi-page apps?**
A: Yes! It uses Next.js App Router for routing.

---

## 🔧 Troubleshooting

### Error: "Pattern not found"

**Symptom:** Modification fails with message about search pattern not found.

**Cause:** The code structure changed and doesn't match what AI expected.

**Solutions:**

1. **Try a simpler change:**
   ```
   Instead of: "Refactor the entire component"
   Try: "Change the button color to blue"
   ```

2. **Break into steps:**
   ```
   Instead of: "Add authentication and dark mode"
   Try: "Add authentication" (wait) → then "Add dark mode"
   ```

3. **Use new approach:**
   ```
   If stuck on modifications, create a new app with desired features built-in
   ```

4. **Read the file first:**
   Ask in PLAN mode: "Show me the current code structure"
   Then request changes based on actual structure

---

### Error: "Complexity detected"

**Symptom:** AI asks if you want to proceed with staged implementation.

**What it means:** The change is too complex for one step.

**Options:**

1. **Proceed with staging** (Recommended):
   ```
   Reply: "proceed"
   AI breaks into 2-4 stages
   Review and approve each stage
   ```

2. **Simplify request:**
   ```
   Instead of: "Add complete authentication with OAuth, password reset, and email verification"
   Try: "Add simple authentication" (basic login/logout)
   ```

3. **Use template or build fresh:**
   ```
   If modification keeps failing, create new app with feature included
   ```

---

### Error: "Timeout"

**Symptom:** "AI response timeout - the modification was taking too long"

**Cause:** AI took longer than 45 seconds to respond.

**Solutions:**

1. **Try again** - Sometimes it's temporary
2. **Simplify request** - Smaller changes process faster
3. **Break into steps** - Multiple small changes instead of one large
4. **Check API status** - Anthropic API may be slow

---

### Problem: "Preview shows error"

**Symptom:** Red error message in preview panel.

**Common causes:**

1. **Syntax error in generated code:**
   - Tell AI: "There's a syntax error, please fix"
   - Shows error in preview console

2. **Missing dependency:**
   - Usually auto-fixed on next change
   - Or export and run `npm install`

3. **Backend feature in preview:**
   - Preview can't run server-side code
   - Download and run locally

---

### Problem: "Change didn't apply"

**Symptom:** You asked for a change but don't see it in the preview.

**Common causes:**

1. **Change was too subtle:**
   - Check carefully - maybe it did apply but isn't obvious
   - View code to confirm

2. **Browser cache:**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Or click refresh button in preview

3. **Conflicting styles:**
   - Your new style might be overridden by existing CSS
   - Ask: "Make sure the button color is blue with !important"

---

### Problem: "App Library not loading"

**Symptom:** Click My Apps but nothing shows.

**Cause:** localStorage might be full or corrupted.

**Solutions:**

1. **Clear and reload:**
   - Open browser console (F12)
   - Type: `localStorage.clear()`
   - Refresh page
   - (Warning: This deletes all saved apps!)

2. **Export important apps first:**
   - Before clearing, export any apps you want to keep
   - Then clear localStorage
   - Re-import if needed

---

### Problem: "Image upload not working"

**Symptom:** Can't upload image or image doesn't show.

**Solutions:**

1. **Check file size:**
   - Max 5MB
   - Compress large images first

2. **Check file type:**
   - JPG, PNG, GIF, WebP only
   - Convert other formats first

3. **Try different browser:**
   - Some browsers have stricter limits
   - Chrome/Edge recommended

---

## 💡 Tips & Best Practices

### Writing Good Requests

**Be specific:**
- ✅ "Add a blue button that resets the form"
- ❌ "Add a button"

**One thing at a time:**
- ✅ "Add dark mode" → wait → "Add counter"
- ❌ "Add dark mode, counter, authentication, and search"

**Describe desired outcome, not implementation:**
- ✅ "Make todos persist after page refresh"
- ❌ "Use localStorage.setItem in useEffect"

**Use examples:**
- ✅ "Make it look like Gmail's interface"
- ✅ "Add a timer like Pomodoro Technique"

### Managing Complexity

**Start simple, add features incrementally:**
```
1. "Build basic todo app"
2. "Add categories"
3. "Add dark mode"
4. "Add authentication"
```

**Use Plan mode first for complex features:**
```
PLAN: "How should I implement user authentication?"
[Get AI's advice]
[Switch to ACT]
ACT: "Add authentication using the approach we discussed"
```

**Break large features into phases:**
- Instead of: "Build a complete e-commerce platform"
- Try: Build in stages (product catalog → cart → checkout → payments)

### Keyboard Shortcuts

**Efficiency boosters:**
- **Enter** - Send message
- **Ctrl+Z** - Undo last change
- **Ctrl+Shift+Z** or **Ctrl+Y** - Redo
- **Esc** - Close modals

### Version Control Strategy

**Save checkpoints before risky changes:**
1. Working app → Fork it
2. Try risky change in fork
3. If it works → continue
4. If it fails → go back to original

**Use descriptive change messages:**
- AI generates: "Added authentication"
- But you can request: "Add authentication with custom styling"
- Helps you find versions later

### Performance Tips

**Keep chat history manageable:**
- Start new conversation for new app
- Or use "New Task" when context gets too long

**Don't save too many apps:**
- localStorage has limits (~5-10MB)
- Export and delete old apps you don't need
- Keep library under 20 apps for best performance

---

## 🎓 Learning Resources

### Understanding React Basics

If you want to understand the generated code better:

**Key concepts to learn:**
- **Components** - Building blocks of React apps
- **Props** - Passing data between components
- **State** - Data that changes over time (`useState`)
- **Effects** - Side effects like API calls (`useEffect`)
- **Events** - Handling user interactions (`onClick`, etc.)

**Recommended learning:**
- [React Official Docs](https://react.dev)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

### Understanding the Generated Code

**File structure:**
```
src/App.tsx              # Main component
├── State variables      # const [x, setX] = useState()
├── Event handlers       # const handleX = () => {}
├── useEffect hooks      # Side effects
└── JSX return          # UI structure
```

**Common patterns:**
```tsx
// State management
const [count, setCount] = useState(0);

// Event handling
const handleClick = () => setCount(count + 1);

// Conditional rendering
{isLoggedIn ? <Dashboard /> : <LoginForm />}

// Mapping arrays
{todos.map(todo => <TodoItem key={todo.id} {...todo} />)}
```

---

## 🚀 Advanced Features

### Phased Building for Complex Apps

**What it is:**
When you request a very complex app, AI breaks it into phases.

**Example:**
```
You: "Build a complete blog platform with comments, likes, and user profiles"

AI: "🏗️ Build in Phases?
     This is complex. I suggest building in 3 phases:
     
     Phase 1: Blog posts display and creation
     Phase 2: Comments system
     Phase 3: User profiles and likes
     
     Type 'yes' to proceed with phased building"

You: "yes"

AI: [Creates phase plan]
    "Phase 1/3: Blog posts
     Features:
     - Post creation form
     - Post list display
     - Individual post view
     
     Type 'start' to begin Phase 1"

You: "start"

AI: [Builds Phase 1]
    "✅ Phase 1 Complete!
     Ready for Phase 2? Type 'continue'"
```

**Benefits:**
- Working app after each phase
- Test before moving forward
- Guide direction at each step
- Less overwhelming

### Using Context from Previous Apps

**Scenario:** You built an app yesterday, want to reference it today.

**Approach:**
1. Load the old app from My Apps
2. View its code
3. In chat, reference it:
   ```
   "Build a new todo app similar to the one I built yesterday,
    but with a different color scheme"
   ```

4. AI uses context from visible app

---

## 📱 Mobile & Responsive Design

### Making Apps Mobile-Friendly

**Request responsive design:**
```
"Make it responsive for mobile devices"
"Optimize for phones and tablets"
"Use mobile-first design"
```

**What AI adds:**
- Tailwind responsive classes (`sm:`, `md:`, `lg:`)
- Flexible layouts (flexbox, grid)
- Touch-friendly buttons (larger)
- Stack elements vertically on small screens

**Testing on mobile:**
1. Open preview
2. Open browser DevTools (F12)
3. Click device toolbar icon
4. Select mobile device
5. Or: Open on actual phone

---

## 🔐 Security Considerations

### For Production Apps

**Important notes:**

1. **Authentication is basic:**
   - Generated auth is for demonstration
   - For production, use NextAuth.js or similar
   - Or backend authentication service

2. **API keys:**
   - Never commit `.env` files to git
   - Use environment variables on hosting platform
   - Rotate keys regularly

3. **Input validation:**
   - Add validation to forms
   - Sanitize user input
   - Use TypeScript for type safety

4. **HTTPS:**
   - Always use HTTPS in production
   - Vercel/Netlify provide this automatically

---

## 🎉 Conclusion

You're now ready to build amazing apps with AI!

**Remember the key principles:**
1. **Plan first** (PLAN Mode) → **Then build** (ACT Mode)
2. **Start simple** → **Add features incrementally**
3. **Be specific** in your requests
4. **Use version control** - Fork, undo, compare
5. **Test frequently** as you build

**Need help?**
- Switch to PLAN Mode and ask questions
- Check this guide's FAQ and Troubleshooting sections
- Review CURRENT_FEATURES.md for technical details

**Happy building! 🚀**

---

## 📚 Additional Documentation

- **CURRENT_FEATURES.md** - Complete feature reference
- **MODIFICATION_GUIDE.md** - Deep dive into modifications
- **KEYBOARD_SHORTCUTS.md** - All shortcuts
- **README.md** - Project overview and setup

---

**Last Updated:** November 4, 2025  
**Version:** 2.0  
**Questions or feedback?** Open an issue on GitHub or contact the maintainer.
