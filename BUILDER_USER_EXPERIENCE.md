# Builder Page — User Experience Flow

> How someone actually uses the rebuilt Builder page, start to finish.

---

## Where the user comes from

By the time they reach the Builder page, they've already been through four steps:

```
Step 1: Wizard      → Described their app in natural conversation
Step 2: Design      → Uploaded reference images, AI generated layout
Step 3: AI Plan     → Claude + Gemini built architecture together
Step 4: Review      → Reviewed everything, clicked "Build App"
                         ↓
              ══════════════════════
              ║  BUILDER PAGE (/app) ║  ← you are here
              ══════════════════════
```

The AI already knows: the app name, description, every feature, the tech stack, the architecture, the layout, the phase plan, and the design tokens (colors, fonts, spacing). The user doesn't need to re-explain anything.

---

## What they see

```
┌──────────────────────────────────────────────────────────────────┐
│ My Social App                                              [☰]  │
├────────────────────────────┬─────────────────────────────────────┤
│                            │                                     │
│  ◉ Phase 1 of 5: Layout   │  [Preview]  [Code]    ↩ ↪  ⬇  🚀  │
│  ████████████████ 100% ✓   │  ┌───────────────────────────────┐  │
│                            │  │                               │  │
│  ✅ Phase 1 complete       │  │     Live preview of the       │  │
│  Layout injected from      │  │     app renders here          │  │
│  your design. 12 files     │  │                               │  │
│  created.                  │  │     Updates in real-time       │  │
│                            │  │     as AI writes code          │  │
│  🤖 Phase 1 is done.      │  │                               │  │
│  Your layout is live in    │  │                               │  │
│  the preview. I'm ready    │  │                               │  │
│  to start Phase 2: Auth    │  │                               │  │
│  System. Want me to go     │  │                               │  │
│  ahead?                    │  │                               │  │
│                            │  │                               │  │
│                            │  └───────────────────────────────┘  │
│                            │                                     │
│  [📎] yeah go ahead    [➤] │                                     │
│                            │                                     │
└────────────────────────────┴─────────────────────────────────────┘
```

Simple. Chat on the left, preview on the right. No three-panel maze. No mode toggles. No confusion about what to click.

---

## Scenario 1: Building the app (happy path)

```
USER: yeah go ahead

  ┌─ PhaseStatusBar updates ─────────────────────────────┐
  │ ◉ Phase 2 of 5: Auth System  ████░░░░░░░░░ 25%  ⏸ ⏭ │
  └──────────────────────────────────────────────────────┘

  AI starts streaming code for the auth system.
  Preview updates live — login page appears.
  User watches it build in real time.

  ┌─ Chat ───────────────────────────────────────────────┐
  │ 🤖 Building Phase 2: Auth System...                  │
  │                                                      │
  │ Creating:                                            │
  │  • LoginPage.tsx                                     │
  │  • SignupPage.tsx                                    │
  │  • authService.ts                                    │
  │  • middleware.ts                                     │
  │                                                      │
  │ ████████████████████████████████████████░░░░ 85%     │
  └──────────────────────────────────────────────────────┘

  Phase completes. Validation runs automatically.
  Preview shows the login page.

  ┌─ Chat ───────────────────────────────────────────────┐
  │ ✅ Phase 2 complete                                  │
  │ Auth system built. 4 files created.                  │
  │ Validation: ✓ types pass, ✓ no conflicts             │
  │                                                      │
  │ 🤖 Auth system is live. Login and signup pages       │
  │ are working in the preview. Phase 3 is User          │
  │ Profiles — want me to continue?                      │
  └──────────────────────────────────────────────────────┘

USER: keep going

  ...phases 3, 4, 5 execute the same way...
  ...user can interrupt anytime with questions or changes...
```

---

## Scenario 2: Asking a question mid-build

```
USER: wait what auth approach did you use?

  AI does NOT start building. It recognizes this is a question.

  🤖 I used JWT tokens with HTTP-only cookies. Here's the flow:

     1. User submits login form → hits /api/auth/login
     2. Server validates credentials against Supabase Auth
     3. On success, sets an HTTP-only cookie with a JWT
     4. Middleware checks the cookie on protected routes
     5. Token refreshes automatically before expiry

     I chose this over session-based auth because your architecture
     plan specified a stateless API. Want me to change the approach?

  The AI answered the question using the project's actual architecture
  plan and the code it just generated. It didn't hallucinate — it read
  the real files and the real plan.

USER: no that's perfect, keep building
```

---

## Scenario 3: Modifying something

```
USER: the login page needs a "forgot password" link

  AI detects this is a MODIFY request.
  It reads the current LoginPage.tsx (not the whole app).

  🤖 I'll add a forgot password link to the login form.
     Here's what I'm changing:

  ┌─ Diff Preview Modal ─────────────────────────────────┐
  │                                                      │
  │  LoginPage.tsx                                       │
  │                                                      │
  │  - <button type="submit">Sign In</button>           │
  │  + <button type="submit">Sign In</button>           │
  │  + <div className="text-center mt-4">               │
  │  +   <a href="/forgot-password"                     │
  │  +      style={{ color: 'var(--accent-primary)' }}> │
  │  +     Forgot your password?                        │
  │  +   </a>                                           │
  │  + </div>                                           │
  │                                                      │
  │                        [Cancel]  [Apply Changes]     │
  └──────────────────────────────────────────────────────┘

  User sees exactly what changes. Clicks "Apply Changes."
  Preview updates. Only that one file changed.
  Version snapshot saved (can undo if needed).
```

---

## Scenario 4: Something breaks

```
  Preview shows a blank page after Phase 3 builds.
  Console error appears.

  ┌─ Chat ───────────────────────────────────────────────┐
  │ ⚠️ I see an error in the preview:                    │
  │                                                      │
  │ TypeError: Cannot read property 'user' of undefined  │
  │   at ProfilePage.tsx:24                              │
  │                                                      │
  │ The issue: ProfilePage tries to access               │
  │ authContext.user but the auth provider isn't          │
  │ wrapping the profile route. The auth context          │
  │ returns undefined outside its provider.               │
  │                                                      │
  │ Fix: Wrap the profile route in AuthProvider,          │
  │ or add a null check with a redirect to login.        │
  │                                                      │
  │ Want me to fix it?                                   │
  └──────────────────────────────────────────────────────┘

USER: yeah fix it

  → Routes through MODIFY flow
  → Diff preview shows the fix
  → User approves
  → Preview comes back to life
```

---

## Scenario 5: Changing the concept mid-build

```
USER: actually let's add a messaging feature

  AI detects this is a CONCEPT update.

  🤖 Added "Messaging" to your feature list. I should
     flag that this affects the architecture — messaging
     needs:
       • A messages database table
       • Real-time subscriptions (Supabase Realtime)
       • A new MessagesPage component
       • Updates to the user profile to show conversations

     This would be a new Phase 6. Want me to add it
     to the phase plan?

USER: yes

  🤖 Done. Phase plan updated:
     Phase 1: Layout ✅
     Phase 2: Auth ✅
     Phase 3: Profiles ✅
     Phase 4: API (in progress)
     Phase 5: Polish
     Phase 6: Messaging (new)

     I'll build it after Phase 5. Or I can build it
     next if you'd rather see it sooner.
```

---

## Scenario 6: Using the toolbar

```
  User clicks [Code] tab in the preview panel:

  ┌─────────────────────────────────────────────────────────┐
  │ [Preview]  [Code]                    ↩ ↪   ⬇   🚀     │
  ├───────────────┬─────────────────────────────────────────┤
  │ 📁 src/       │  // LoginPage.tsx                       │
  │  ├ LoginPage  │                                         │
  │  ├ SignupPage │  import { useState } from 'react';      │
  │  ├ Profile    │  import { authService } from './auth';  │
  │  ├ authSvc    │                                         │
  │  ├ middleware  │  export default function LoginPage() {  │
  │  └ App.tsx    │    const [email, setEmail] = useState('' │
  │               │    ...                                   │
  └───────────────┴─────────────────────────────────────────┘

  File tree on the left. Code viewer on the right.
  Click a file to view it. (Editing is done through chat.)


  User clicks [↩ Undo]:
  → Last change reverted
  → Preview updates
  → Toast: "Undone: added forgot password link"

  User clicks [⬇ Download]:
  → ZIP file generated with all project files
  → Download starts
  → Toast: "Downloaded MyApp.zip (12 files)"

  User clicks [🚀 Deploy]:
  → Deploy modal opens
  → Options: Vercel, Netlify, or download ZIP
  → User picks Vercel → deployment starts
  → Toast: "Deploying to Vercel..."
  → Toast: "Live at https://my-social-app.vercel.app"
```

---

## Scenario 7: Checking the concept

```
  User clicks [☰] in the header.
  ConceptDrawer slides in from the left.

  ┌──────────────────────┬────────────────────────────────────┐
  │ ◀ App Concept        │                                    │
  │                      │  (preview still visible behind)    │
  │ Name: My Social App  │                                    │
  │                      │                                    │
  │ Description:         │                                    │
  │ A social platform    │                                    │
  │ with auth, profiles, │                                    │
  │ and messaging.       │                                    │
  │                      │                                    │
  │ Features:            │                                    │
  │  ☑ Authentication    │                                    │
  │  ☑ User Profiles     │                                    │
  │  ☑ Messaging         │                                    │
  │                      │                                    │
  │ Tech Stack:          │                                    │
  │  Next.js, Supabase,  │                                    │
  │  Tailwind CSS        │                                    │
  │                      │                                    │
  │ Phase Progress:      │                                    │
  │  ✅ 1. Layout        │                                    │
  │  ✅ 2. Auth          │                                    │
  │  ✅ 3. Profiles      │                                    │
  │  🔨 4. API      [▶]  │                                    │
  │  ○  5. Polish        │                                    │
  │  ○  6. Messaging     │                                    │
  └──────────────────────┴────────────────────────────────────┘

  User can edit any field directly.
  Changes save to the store.
  Click a phase → PhaseDetailModal opens with full details.
  Click [◀] or click outside → drawer closes.
```

---

## The core experience in one sentence

**You talk to the AI like a colleague. It builds, answers questions, fixes bugs, and modifies code. You watch it happen live. That's it.**

No mode switches. No hunting for the right button. No silent failures. You type what you want, the AI figures out the rest.
