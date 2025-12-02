# 📚 AI App Builder - User Guide

> Your complete guide to building web applications through conversation with AI

**Version:** 3.0  
**Last Updated:** December 2, 2025

---

## 🎯 What You'll Learn

- How to build complete apps through conversation
- Understanding PLAN Mode vs ACT Mode
- Using AI Wizards for guided creation
- Building complex apps in phases
- Managing versions and changes
- Exporting and deploying your apps

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Understanding PLAN vs ACT Mode](#understanding-plan-vs-act-mode)
3. [Building Your First App](#building-your-first-app)
4. [Using AI Wizards](#using-ai-wizards)
5. [Phased Building](#phased-building)
6. [Making Modifications](#making-modifications)
7. [Version Control](#version-control)
8. [Image Upload for Design Inspiration](#image-upload-for-design-inspiration)
9. [Export & Deployment](#export--deployment)
10. [My Apps Library](#my-apps-library)
11. [Best Practices](#best-practices)
12. [Troubleshooting](#troubleshooting)
13. [FAQ](#faq)

---

## Getting Started

### Your First Visit

When you open AI App Builder, you'll see:

```
┌─────────────────────────────────────────────────┐
│  Header: Logo | Wizards | New App | My Apps    │
├──────────────────┬──────────────────────────────┤
│                  │                              │
│  💬 Chat Panel   │   👁️ Preview / 💻 Code      │
│                  │                              │
│  • Welcome msg   │   • Live preview             │
│  • Plan/Act      │   • Code view                │
│  • Input field   │   • Export/Download          │
│  • Image upload  │   • Version controls         │
│                  │                              │
└──────────────────┴──────────────────────────────┘
```

### The Interface

**Chat Panel (Left):**
- Read the welcome message for quick instructions
- Toggle between PLAN and ACT modes
- Type your requests
- Upload design inspiration images

**Preview Panel (Right):**
- **Preview Tab**: See your app running live
- **Code Tab**: View generated source code
- **Controls**: Undo, Redo, Fork, Export buttons

### Quick Concepts

**Three Ways to Build:**

1. **Direct Chat** - Just describe what you want
2. **Wizards** - Guided step-by-step planning 🧙‍♂️
3. **Templates** - Start from pre-built apps

---

## Understanding PLAN vs ACT Mode

The heart of AI App Builder is the dual-mode system.

### 💭 PLAN Mode

**Purpose:** Discussion, design, and planning

**What happens:**
- AI answers questions and explains concepts
- You can brainstorm ideas
- Refine requirements
- Create implementation plans
- **No code is generated**

**When to use:**
- "What features should a blog have?"
- "How should I structure this app?"
- "Explain authentication to me"
- "What's the best approach for..."

**Example conversation:**
```
You: "I want to build a recipe app"

AI: "Great! Let's plan it out:
     - Will users submit recipes or is it read-only?
     - Do you want search and filtering?
     - Should it have images?
     - Any dietary preferences or tags?"

You: "Users can submit, with images and tags"

AI: "Perfect! Here's what we'll need:
     - Form for recipe submission
     - Image upload
     - Tag system (vegan, gluten-free, etc.)
     - Recipe list with filter options
     - Individual recipe view
     
     Ready to build? Switch to ACT Mode!"
```

### ⚡ ACT Mode

**Purpose:** Building and modifying applications

**What happens:**
- AI generates working code
- Creates complete applications
- Makes modifications to existing apps
- Shows real-time progress
- **Code is generated and applied**

**When to use:**
- "Build a todo app"
- "Add dark mode"
- "Change the button color to blue"
- "Add authentication"

**Example conversation:**
```
You: "Build a recipe app with the features we discussed"

AI: [Streaming generation starts]
    "🚀 Starting generation...
     📝 Creating components...
     🎨 Applying styles...
     ✨ Adding functionality..."
     
    [After 15-30 seconds]
    "✅ App created! Your recipe app is ready."
    
[Preview shows working app]

You: "Add a favorites feature"

AI: "🔍 Changes Ready for Review
     I'll add a heart icon to each recipe..."
     
[Shows diff preview]
[You approve]
     
AI: "✅ Changes applied! Recipes now have favorites."
```

### Switching Between Modes

**Mode Transition Messages:**

When you switch from PLAN → ACT:
```
"⚡ Switched to ACT Mode

Ready to build! I'll read the plan we discussed and implement it.

To build: Type 'build it' or 'implement the plan'"
```

When you switch from ACT → PLAN:
```
"💭 Switched to PLAN Mode

Let's plan your next feature or discuss improvements. 
I won't generate code in this mode - we'll design the requirements first."
```

---

## Building Your First App

Let's build a simple todo app step by step.

### Step 1: Start Fresh

Click **"✨ New App"** button in the header to start a clean conversation.

### Step 2: Switch to ACT Mode

Click the **"⚡ ACT"** button at the top of the chat panel.

The button will highlight to show you're in ACT mode.

### Step 3: Describe Your App

Type a clear description:

```
"Build a todo app with:
- Add new tasks
- Mark tasks as complete
- Delete tasks
- Show total count"
```

Press Enter or click 🚀 Send.

### Step 4: Watch It Build

You'll see real-time progress:

```
⏳ Starting generation...
📝 Generating App.tsx...
📝 Generating styles...
📝 Generating TodoItem.tsx...
✅ Generation complete!
```

This typically takes 15-30 seconds depending on complexity.

### Step 5: Test Your App

The preview panel now shows your working app:

- Try adding a todo
- Click the checkbox to mark complete
- Click delete to remove a todo
- See the counter update

**Congratulations! You've built your first app! 🎉**

### Step 6: Make a Change

With the app loaded, try:

```
"Change the add button color to purple"
```

The change applies instantly. You'll see:
```
✅ Minor update applied - Button is now purple!
```

---

## Using AI Wizards

Wizards provide guided app creation with step-by-step planning.

### Starting a Wizard

Click the **"🧙‍♂️ Wizard"** button in the header.

You'll see the **Natural Conversation Wizard** modal.

### How Wizards Work

**Step 1: Describe Your App**
```
Wizard: "Tell me about the app you want to build."

You: "A blog where people can write and share posts"
```

**Step 2: Answer Follow-up Questions**
```
Wizard: "Great! A few questions:
         - Should users be able to comment?
         - Do you want categories/tags?
         - Simple or rich text editor?
         - User accounts or anonymous posting?"

You: "Yes to comments and tags. Simple editor. No accounts for now."
```

**Step 3: Review Concept**
```
Wizard: "Here's your app concept:

         📝 Blog Platform
         
         Features:
         • Create/edit/delete posts
         • Comment system
         • Tag organization
         • Simple text editor
         • Anonymous posting
         
         Does this look good?"

You: "Yes"
```

**Step 4: Get Phase Plan**
```
Wizard: "Perfect! I've created a 3-phase build plan:

         Phase 1: Post Creation & Display
         Phase 2: Tag System
         Phase 3: Comments
         
         Estimated time: 15-20 minutes
         
         Ready to build?"
```

**Step 5: Build**

The wizard closes and you're in ACT mode with a phased plan ready to execute.

### Wizard Benefits

- ✅ Structured planning process
- ✅ AI asks the right questions
- ✅ Automatic phase breakdown
- ✅ Complexity estimation
- ✅ Nothing forgotten

---

## Phased Building

For complex apps, building in phases gives better control and results.

### What is Phased Building?

Instead of generating everything at once, the app is built incrementally:

```
Phase 1: Foundation (layout, basic structure)
    ↓
Phase 2: Core Features (main functionality)
    ↓
Phase 3: Polish (styling, UX improvements)
```

### When Phases Are Created

**Automatically:**
- Wizard generates phases for you
- AI detects complexity and suggests phases

**Manually:**
- You can request: "Build this in phases"

### Working with Phases

**Phase Progress Card:**

When a phase plan exists, you'll see a card in the chat panel:

```
🏗️ Build Plan (3 Phases)

Phase 1: Foundation & Layout ✅
Phase 2: Core Features      ⏳ (Building)
Phase 3: Polish & UX        ⏸️ (Pending)
```

**Building a Phase:**

Click the **"Build"** button next to a phase, or type:
```
"Build phase 1"
"Start phase 2"
"Continue with next phase"
```

**AI generates that phase specifically**, using context from previous phases.

### Phase Execution Context

Each phase includes:
- Description of what to build
- Features to implement
- Dependencies on previous phases
- Context from completed phases

**Example:**
```
Phase 2 uses the layout created in Phase 1
Phase 3 enhances the features from Phase 2
```

### Benefits of Phased Building

**Incremental Progress:**
- Working app after each phase
- Test before moving forward
- Catch issues early

**Better Quality:**
- AI focuses on one thing at a time
- Less overwhelming context
- Cleaner, more maintainable code

**Flexibility:**
- Change direction between phases
- Skip phases if not needed
- Add custom phases

### Advanced: Phased Build Panel

For complex projects, use the **"🏗️ Phased Build"** button:

This opens a dedicated panel showing:
- All phases with status
- Validation results
- Build progress
- Phase details

**Features:**
- Pause/Resume building
- Skip phases
- Retry failed phases
- View detailed phase information
- Run validation tests

---

## Making Modifications

With an app loaded, you can make changes through conversation.

### Types of Modifications

**1. Simple Updates (Instant)**

Applied immediately without preview:

```
"Change the title to 'My Tasks'"
"Make the button blue"
"Add padding to the container"
"Change font size to larger"
```

These update in 1-2 seconds.

**2. Feature Additions (Diff Preview)**

Shows you exactly what will change:

```
"Add a search filter"
"Add dark mode toggle"
"Add export to JSON"
"Add keyboard shortcuts"
```

You'll see a **diff preview** showing:
- What files change
- What code is added/removed
- Summary of changes

Click **✅ Approve** or **❌ Reject**.

**3. Complex Changes (AST or Staged)**

For major modifications like authentication:

```
"Add authentication"
```

AI uses **AST operations** to add complete systems:
- Login form
- Logout button
- Protected content
- State management
- Event handlers

All in one operation!

### Modification Workflow

**Example: Adding Dark Mode**

```
You: "Add a dark mode toggle"

AI: "🔍 Changes Ready for Review

     I'll add:
     • useState for dark mode
     • Toggle button in header
     • Dark background when active
     • Dark text colors
     
     Files changing: App.tsx
     Lines added: 15
     Lines removed: 2"

[Diff preview shows exact changes]

You: [Click ✅ Approve]

AI: "✅ Changes applied successfully!
     
     Dark mode added with toggle button."
```

**Testing:**
- Click the sun/moon icon
- Background turns dark
- Text becomes light
- Smooth transition

### When Modifications Fail

**"Pattern not found" error:**

This means the code structure changed since AI last saw it.

**Solutions:**
1. Try a simpler change
2. Break into smaller steps
3. Ask AI to read current code first (in PLAN mode)
4. Start fresh with a new app including the feature

**Example:**
```
❌ Failed: "Refactor the entire authentication system"

✅ Better: "Add a logout button"
```

### Tips for Successful Modifications

**Be Specific:**
- ✅ "Add a blue button below the input that clears all todos"
- ❌ "Add a button"

**One Change at a Time:**
- ✅ "Add dark mode" → wait → "Add search"
- ❌ "Add dark mode, search, filters, and export"

**Describe Outcome:**
- ✅ "Save todos to localStorage so they persist after refresh"
- ❌ "Use localStorage.setItem in useEffect to save"

**Use Examples:**
- ✅ "Make it look like Gmail's interface"
- ✅ "Add a timer like the Pomodoro Technique"

---

## Version Control

Every change is automatically saved, giving you powerful version control.

### Automatic Saving

**When versions are created:**
- New app created → Version 1
- Feature added → New version
- Modification applied → New version
- Major change → New version

**Each version includes:**
- Complete code snapshot
- Description of change
- Timestamp
- Change type (NEW_APP, MAJOR_CHANGE, MINOR_CHANGE)

### Undo / Redo

**Keyboard Shortcuts:**
- **Undo**: `Ctrl+Z` (Windows/Linux) or `Cmd+Z` (Mac)
- **Redo**: `Ctrl+Shift+Z` or `Ctrl+Y` (Windows/Linux) or `Cmd+Shift+Z` (Mac)

**Buttons:**
- Click the **↶ Undo** button in preview panel
- Click the **↷ Redo** button in preview panel

**The buttons show count:**
```
↶ Undo (3)    ↷ Redo (1)
```

**How it works:**
```
1. Add feature    [Current]
2. Press Ctrl+Z → [Back to previous]
3. Press Ctrl+Y → [Forward again]
```

**Unlimited undo** during your session (clears on page refresh).

### Version History

Click **"🕒 History"** in the header to see all versions.

**What you see:**
```
Version History

Version 5 - Added search filter ← Current
November 25, 2025 at 3:45 PM
[Code preview...]
🔄 Revert | 🍴 Fork | 🔍 Compare

Version 4 - Added dark mode
November 25, 2025 at 3:30 PM
[Code preview...]
🔄 Revert | 🍴 Fork | 🔍 Compare

Version 3 - Changed button colors
[...]
```

**Actions available:**

**🔄 Revert** - Jump back to this version
- Becomes your new current version
- Previous versions still in history
- Can't redo from this point

**🍴 Fork** - Create independent copy
- New app created from this version
- Original app unchanged
- Appears in My Apps library

**🔍 Compare** - Side-by-side comparison
- Shows this version vs current
- Highlights differences
- View code changes

### Forking

**What is forking?**

Create an independent branch of your app.

**When to fork:**
- 🧪 Try experimental features safely
- 🔀 Create variations (different themes, etc.)
- 💾 Save checkpoint before major changes
- 📋 Develop multiple versions

**How to fork:**

**Method 1: Fork Current App**
1. Click **"🍴 Fork"** in preview panel header
2. New app created: "Your App - Fork"
3. Both apps independent

**Method 2: Fork from History**
1. Open **🕒 History**
2. Find version to fork
3. Click **🍴 Fork** on that version
4. New app created from that point

**Example:**
```
Original: Todo app with dark mode

[Fork original]

Fork: Todo app with dark mode
      ↓
      Try light mode with custom colors
      ↓
      
Now you have 2 independent versions!
```

### Compare Versions

**Purpose:** See exactly what changed between versions.

**How to compare:**
1. Open **🕒 History**
2. Find version to compare
3. Click **🔍 Compare with current**

**Modal shows:**
- **Left**: Selected version (old)
- **Right**: Current version (new)
- Timestamps and descriptions
- Code previews

**Use cases:**
- "What changed since yesterday?"
- "When did I add authentication?"
- "Which version had the working feature?"

---

## Image Upload for Design Inspiration

Upload screenshots to recreate visual designs.

### How It Works

AI analyzes your image and extracts:
- 🎨 Color palette (primary, secondary, accents)
- 📐 Layout structure
- ✨ Design style (modern, minimal, bold, etc.)
- 🖼️ Visual patterns and spacing

Then generates code matching that aesthetic.

### Step by Step

**1. Find Inspiration**
- Screenshot a website you like
- Design from Dribbble, Awwwards, etc.
- App screenshot
- Any design image

**2. Upload Image**
- Click **🖼️** icon next to chat input
- Select image file
- Formats: JPG, PNG, GIF, WebP
- Max size: 5MB

**3. Preview**
- Thumbnail appears above input
- Click **✕** to remove if needed

**4. Make Request**
```
"Build a todo app using this color scheme"
"Create a dashboard inspired by this design"
"Make it look like this screenshot"
"Use these colors and styling"
```

**5. AI Generates**

AI creates your app matching:
- Colors from the image
- Layout style
- Visual aesthetic
- Design patterns

### Example

```
[Upload screenshot of a sleek dark dashboard with blue accents]

You: "Build a todo app with this aesthetic"

AI: "🎨 Analyzing image...
     
     Detected:
     • Dark theme (#1a1a2e background)
     • Blue accents (#0f3460, #16213e)
     • Modern, clean design
     • Card-based layout
     • Subtle shadows
     
     Creating your app..."
     
[Generates app with dark theme, blue buttons, card layout, modern styling]
```

### Tips

**Good images:**
- ✅ Clear design with visible elements
- ✅ Good color contrast
- ✅ Representative of overall style
- ✅ High enough resolution

**Less effective:**
- ❌ Very small images
- ❌ Complex busy screenshots
- ❌ Low contrast images

**Combine with text:**
```
"Build a timer app using these colors but keep the layout simple"
```

This gives AI both visual and functional guidance.

---

## Export & Deployment

Get your app ready for production.

### Exporting Your App

**Step 1: Click Export**

Click **"📦 Export & Deploy"** button in preview panel header.

**Step 2: Download Automatically**

A ZIP file downloads containing:

```
your-app-name.zip
├── src/
│   ├── App.tsx
│   └── components/
├── public/
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── next.config.js
├── .env.example
└── README.md
```

**Step 3: Deployment Modal**

After download, a modal opens with deployment instructions.

### Running Locally

**Extract and Install:**
```bash
# Extract ZIP
unzip your-app-name.zip
cd your-app-name

# Install dependencies
npm install

# Run dev server
npm run dev
```

**Open browser:**
```
http://localhost:3000
```

Your app is now running locally!

### Deploy to Vercel (Recommended)

**Why Vercel?**
- ✅ Optimized for Next.js
- ✅ Free tier available
- ✅ Automatic deployments
- ✅ Zero configuration
- ✅ Custom domains

**Quick Deploy:**

**Method 1: Vercel CLI (Fastest)**
```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to your app
cd your-app-name

# Deploy
vercel

# Follow prompts (press Enter for defaults)
# Live in ~60 seconds!
```

**Method 2: GitHub + Vercel (Automated)**
```bash
# Create GitHub repo and push code
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main

# Then:
# 1. Go to vercel.com
# 2. Click "New Project"
# 3. Import your GitHub repo
# 4. Click "Deploy"
# Done! Auto-deploys on every push.
```

**Method 3: Drag & Drop**
1. Go to [vercel.com](https://vercel.com)
2. Drag your extracted folder
3. Click Deploy
4. Done!

### Deploy to Netlify

**Quick Deploy:**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build your app
npm run build

# Deploy
netlify deploy --prod
```

Or use Netlify's [drag & drop](https://app.netlify.com/drop).

### Environment Variables

If your app uses API keys or external services:

**For Vercel:**
1. Project Settings
2. Environment Variables tab
3. Add variables from `.env.example`

**For Netlify:**
1. Site Settings
2. Build & Deploy
3. Environment
4. Add variables

**Common variables:**
```env
ANTHROPIC_API_KEY=your_key_here
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
```

---

## My Apps Library

Manage all your created apps.

### Opening the Library

Click **"📂 My Apps"** button in the header.

### What You See

**Apps Tab:**
```
My Apps (12)

[Search apps...]

⭐ Favorites
└─ Todo App Pro
   Recipe Manager

📱 All Apps
└─ Calculator
   Timer
   Dashboard
   Blog Platform
   [...]
```

### App Cards

Each app shows:
- **Name** and description
- **Timestamp** (last modified)
- **Star icon** (click to favorite)
- **Actions**: Load, Export, Delete

### Actions

**Load App:**
- Click app card or "Load" button
- App opens in preview
- Chat history restored
- Continue working on it

**Export App:**
- Click **📤 Export** icon
- Downloads ZIP file
- Deployment modal opens

**Delete App:**
- Click **🗑️ Delete** icon
- Confirms before deleting
- Removed from library

**Toggle Favorite:**
- Click **⭐** star icon
- Favorited apps appear at top
- Helps organize important apps

### Search & Filter

**Search:**
```
[Search apps...]
```
- Searches app names and descriptions
- Real-time filtering

**Sort:**
- Newest first (default)
- Oldest first
- Alphabetical
- Favorites first

### Files Tab

**Cloud Storage:**

If you're logged in with Supabase:
- Upload project files
- Download files
- Delete files
- View storage statistics

**Use cases:**
- Store app assets
- Keep backups
- Share files between apps

---

## Best Practices

### Writing Clear Requests

**Be Specific:**
```
✅ "Add a blue button below the input that clears all completed todos"
❌ "Add a button"
```

**One Thing at a Time:**
```
✅ "Add dark mode"
   [wait for completion]
   "Now add a search filter"

❌ "Add dark mode, search, authentication, and export"
```

**Describe Outcome, Not Implementation:**
```
✅ "Make todos persist after page refresh"
❌ "Use localStorage.setItem in useEffect with JSON.stringify"
```

**Use Examples:**
```
✅ "Make it look like Gmail"
✅ "Add a timer like Pomodoro Technique"
✅ "Create buttons similar to Stripe's website"
```

### Managing Complexity

**Start Simple, Add Incrementally:**
```
1. "Build basic calculator"
2. "Add decimal support"
3. "Add keyboard input"
4. "Add history feature"
5. "Add scientific functions"
```

**Use PLAN Mode for Complex Features:**
```
PLAN: "I want to add user accounts. What's the best approach?"
[Discuss options]
[Switch to ACT]
ACT: "Add authentication using the approach we discussed"
```

**Break Large Features into Phases:**
```
Instead of: "Build complete e-commerce platform"

Better:
Phase 1: Product catalog
Phase 2: Shopping cart
Phase 3: Checkout
Phase 4: Payment integration
```

### Version Control Strategy

**Fork Before Risky Changes:**
```
1. Have working app
2. Fork it (creates backup)
3. Try risky change in fork
4. If works → continue
5. If fails → back to original
```

**Test Before Moving Forward:**
```
Build Phase 1 → Test → Phase 2 → Test → Phase 3
```

### Keyboard Shortcuts

**Efficiency Boosters:**
- `Enter` - Send message
- `Ctrl+Z` - Undo
- `Ctrl+Shift+Z` or `Ctrl+Y` - Redo
- `Esc` - Close modals

### Performance Tips

**Keep Library Manageable:**
- Export and delete old apps you don't need
- Keep library under 20 apps
- localStorage has limits (~5-10MB)

**Start New Conversations:**
- Use "New App" for new projects
- Don't let chat history get too long
- Helps AI focus better

---

## Troubleshooting

### "Pattern not found" Error

**Symptom:** Modification fails with this message.

**Cause:** Code structure doesn't match AI's expectation.

**Solutions:**

1. **Simplify change:**
   ```
   ❌ "Refactor entire component"
   ✅ "Change button color to blue"
   ```

2. **Break into steps:**
   ```
   ❌ "Add auth and dark mode"
   ✅ "Add authentication"
       [wait]
       "Now add dark mode"
   ```

3. **Ask AI to check first:**
   ```
   Switch to PLAN: "Show me current code structure"
   Then make specific change
   ```

### Changes Not Appearing

**Symptom:** You requested a change but don't see it.

**Solutions:**

1. **Hard refresh browser:**
   - `Ctrl+Shift+R` (Windows/Linux)
   - `Cmd+Shift+R` (Mac)

2. **Check code tab:**
   - Maybe change is subtle
   - View code to confirm

3. **Try undo then redo:**
   - `Ctrl+Z` then `Ctrl+Y`
   - Forces re-render

### Preview Shows Error

**Symptom:** Red error message in preview.

**Common causes:**

1. **Syntax error:**
   - Tell AI: "There's an error, please fix"
   - AI will correct it

2. **Missing dependency:**
   - Usually auto-fixed on next change
   - Or export and run `npm install`

3. **Backend feature in preview:**
   - Preview is browser-only
   - Download and run locally for backend features

### Streaming Stuck

**Symptom:** Generation progress stops updating.

**Solutions:**

1. **Wait 60 seconds:**
   - Sometimes there's a delay
   - AI might still be processing

2. **Cancel and retry:**
   - Click "Cancel" if available
   - Try request again

3. **Simplify request:**
   - Break into smaller parts
   - Build incrementally

### Image Upload Not Working

**Symptom:** Can't upload image.

**Solutions:**

1. **Check file size:**
   - Max 5MB
   - Compress if needed

2. **Check format:**
   - JPG, PNG, GIF, WebP only
   - Convert other formats

3. **Try different browser:**
   - Chrome/Edge recommended

---

## FAQ

### General

**Q: Do I need coding experience?**

A: No! AI generates all code. However, understanding basic programming concepts helps you make better requests and understand what's being built.

**Q: What framework is used?**

A: Next.js 15 with React 19, TypeScript, and Tailwind CSS.

**Q: Can I edit the generated code?**

A: Yes! Export to ZIP and edit in any code editor. It's your code to do with as you wish.

**Q: Is this free?**

A: The app itself is free. However, it uses Claude AI which requires an API key (costs per API call).

**Q: Can I use this commercially?**

A: Yes! Generated code is yours with no restrictions.

### Modes

**Q: What's the difference between PLAN and ACT?**

A: 
- **PLAN**: Discussion only, no code generation
- **ACT**: Builds and modifies apps, generates code

**Q: Can I ask questions in ACT mode?**

A: Yes, but AI assumes you want to build. For explanations, use PLAN mode.

**Q: Why does the AI keep trying to build when I just want to chat?**

A: You're in ACT mode. Switch to PLAN mode for discussions.

### Building

**Q: How long does it take to build an app?**

A: 
- Simple apps: 15-30 seconds
- Medium complexity: 30-60 seconds  
- Complex apps: 1-3 minutes (phased)

**Q: Can I build full-stack apps?**

A: The AI generates full-stack code, but preview is frontend-only. Download and run locally for backend features.

**Q: How do I add authentication?**

A: Simply say "Add authentication" in ACT mode. AI uses AST operations to add a complete auth system.

**Q: Can I build mobile apps?**

A: You can build responsive web apps that work on mobile browsers. Not native iOS/Android apps.

### Modifications

**Q: Why did my modification fail?**

A: Usually because the code structure changed. Try simpler changes or break into steps.

**Q: How do I know if a change needs approval?**

A:
- Simple changes → Applied instantly
- Complex changes → Shows diff preview
- System tells you automatically

**Q: Can I modify multiple things at once?**

A: Yes, but be specific: "Add dark mode and a search filter"

### Export

**Q: What's included in the export?**

A: Complete source code, config files, package.json, README, and .env.example.

**Q: Can I use the code in other projects?**

A: Yes! It's standard Next.js/React code. Copy/paste as needed.

**Q: How do I deploy to production?**

A: Use Vercel (recommended), Netlify, or any
