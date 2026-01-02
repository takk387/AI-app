# Unlimited Layout Builder Plan

## Overview

A **"Click + Talk"** layout builder that enables anyone to create professional designs without technical knowledge. Users click elements and describe changes in plain English - AI handles everything.

**This is ADDITIVE** - the current guided/preset builder remains for users who prefer it.

---

## Philosophy

### Core Principles

1. **Zero Learning Curve** - If you can click and type, you can design
2. **AI Does the Work** - User describes, AI implements
3. **Always Show Options** - AI suggests 2-3 visual choices, user picks
4. **No Technical Terms Required** - Natural language only
5. **Dual AI Architecture** - Claude + Gemini working together

### What Users DON'T Need to Know

- CSS properties (padding, margin, flexbox)
- Pixel values or measurements
- Color codes or color theory
- Responsive breakpoints
- Animation keyframes
- Design terminology

### What Users DO Need to Know

- Click on things
- Describe what they want in their own words
- Say yes or no to AI suggestions

---

## Builder Modes

```
Layout Builder Options:
├── GUIDED MODE (current)        ← Preserved
│   └── Preset-based, quick, fewer decisions
│
└── CLICK + TALK MODE (new)      ← Added
    └── Natural language, AI-driven, unlimited possibilities
```

Users choose their comfort level when starting.

---

## Interface Design

### Main Screen

```
┌──────────────────────────────────────────────────────────────────┐
│  🎨 Layout Builder  [← Undo] [Redo →]  [Desktop] [Tablet] [Mobile]  [Save ▼] │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│                    ┌─────────────────────┐                       │
│                    │                     │                       │
│                    │   LIVE PREVIEW      │                       │
│                    │                     │                       │
│                    │  (Click anything    │                       │
│                    │   to edit it)       │                       │
│                    │                     │                       │
│                    └─────────────────────┘                       │
│                                                                  │
│    ───────────────────────────────────────────────────────      │
│                                                                  │
│    💬 Click any element above, or just tell me what you want:   │
│    ┌──────────────────────────────────────────────────────┐     │
│    │                                                      │     │
│    └──────────────────────────────────────────────────────┘     │
│    [📎 Upload reference]  [🎤 Voice]               [Send ➤]     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### When Element is Selected

```
┌──────────────────────────────────────────────────────────────────┐
│  Selected: Header                              [✓ Done editing] │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│    ┌─────────────────────────────────────────────────────────┐  │
│    │ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │  │
│    │ ┃  HEADER (selected - blue outline)                  ┃ │  │
│    │ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │  │
│    │                                                         │  │
│    │     Rest of the page...                                 │  │
│    │                                                         │  │
│    └─────────────────────────────────────────────────────────┘  │
│                                                                  │
│    ───────────────────────────────────────────────────────      │
│                                                                  │
│    💬 What do you want to do with the Header?                   │
│                                                                  │
│    Quick actions:                                                │
│    [Make sticky] [Change color] [Add shadow] [Make taller]      │
│                                                                  │
│    Or describe in your own words:                                │
│    ┌──────────────────────────────────────────────────────┐     │
│    │                                                      │     │
│    └──────────────────────────────────────────────────────┘     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Quick Actions (Context-Aware)

Different elements show different quick actions:

**Header:**

```
[Make sticky] [Change background] [Add shadow] [Change height]
```

**Button:**

```
[Make bigger] [Change color] [More rounded] [Add hover effect]
```

**Text:**

```
[Make bigger] [Change font] [Bold it] [Center it]
```

**Image:**

```
[Make bigger] [Add border] [Round corners] [Add shadow]
```

**Section:**

```
[More padding] [Change background] [Rearrange items]
```

---

## Natural Language Understanding

### Basic Styling

| User Says                        | AI Does                              |
| -------------------------------- | ------------------------------------ |
| "Make it bigger"                 | Increases size                       |
| "More space around this"         | Adds padding/margin                  |
| "Make it pop"                    | Adds shadow, contrast, or color      |
| "This looks cramped"             | Increases spacing                    |
| "Make it sticky"                 | Sticks to top on scroll              |
| "Center this"                    | Centers the element                  |
| "Move this up"                   | Changes position                     |
| "Make the text easier to read"   | Adjusts size, contrast, line-height  |
| "I don't like this color"        | Offers color alternatives            |
| "Make it look more professional" | Improves typography, spacing, colors |
| "Make it modern"                 | Applies contemporary design patterns |
| "Too much going on"              | Simplifies, adds whitespace          |

### Responsive Design

| User Says                        | AI Does                               |
| -------------------------------- | ------------------------------------- |
| "This looks bad on mobile"       | Fixes mobile layout                   |
| "Hide the sidebar on phone"      | Hides sidebar on mobile only          |
| "Stack these on smaller screens" | Columns become rows on mobile         |
| "Make the text bigger on mobile" | Increases mobile font size            |
| "The menu is hard to tap"        | Makes touch targets larger            |
| "Fix it for all devices"         | Optimizes for desktop, tablet, mobile |

### Micro Interactions

| User Says                                   | AI Does                            |
| ------------------------------------------- | ---------------------------------- |
| "Make the button do something when I hover" | Adds hover effect                  |
| "Add some movement"                         | Adds subtle animations             |
| "Make it feel more interactive"             | Adds hover/click feedback          |
| "When I click this, make it bounce"         | Adds click animation               |
| "Fade this in when the page loads"          | Adds entrance animation            |
| "Make it smooth"                            | Adds transitions                   |
| "Add some life to this"                     | Adds micro-interactions throughout |

### Advanced Interactions

| User Says                         | AI Does                          |
| --------------------------------- | -------------------------------- |
| "Make things appear as I scroll"  | Adds scroll-triggered animations |
| "Swipe to delete on mobile"       | Adds swipe gesture               |
| "Let me drag to reorder"          | Adds drag and drop               |
| "Show buttons only when hovering" | Adds hover reveal                |
| "Show a spinner while loading"    | Adds loading state               |
| "What should disabled look like?" | Shows disabled state options     |

---

## AI Response Patterns

### Always Show Visual Options

```
User: "Make the header better"

AI Response:
┌─────────────────────────────────────────────────────────────┐
│ Here are 3 ways to improve the header:                      │
│                                                             │
│ ┌─────────┐  ┌─────────┐  ┌─────────┐                      │
│ │Option A │  │Option B │  │Option C │                      │
│ │ Clean   │  │ Bold    │  │ Minimal │                      │
│ └─────────┘  └─────────┘  └─────────┘                      │
│                                                             │
│ [Pick one] or tell me what you'd like different            │
└─────────────────────────────────────────────────────────────┘
```

### Confirm Before Big Changes

```
User: "Change all the colors"

AI: "I'll update the color scheme. Here's a preview:"
    [Before] → [After]

    "Apply this change?"
    [Yes, looks good] [No, try different colors] [Describe what I want]
```

### Explain in Simple Terms

```
User: "Why does this look weird on mobile?"

AI: "The sidebar is taking up too much space on small screens.
     I can:
     1. Hide it behind a menu button on mobile
     2. Move it to the bottom
     3. Make it narrower

     Which sounds good?"
```

### Proactive Suggestions

```
AI: "I noticed a few things that could be improved:

    1. The text contrast is low (harder to read)
    2. The buttons are different sizes
    3. The spacing is inconsistent

    Want me to fix these?"
```

---

## Responsive Design System

### Device Preview

```
┌────────────────────────────────────────────────────────────┐
│  [Desktop]  [Tablet]  [Mobile]  ← Click to switch view    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│         Preview updates to show that device size           │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Responsive Conversation Flow

```
User: *switches to Mobile view*
User: "This is too cramped"

AI: "I see a few issues on mobile:
     • Sidebar is taking up space
     • Text is too small
     • Buttons are hard to tap

     Want me to fix all of these?"

     [Yes, fix them] [Show me options]

User: *clicks "Yes, fix them"*

AI: "Done! On mobile now:
     • Sidebar hidden (hamburger menu instead)
     • Text size increased 20%
     • Buttons are full-width and taller

     Check it out!"
```

### Automatic Responsive Detection

```
AI: "I noticed your design looks great on desktop but has
     issues on tablet and mobile. Want me to optimize for
     all devices?"

     [Yes, optimize all] [Let me check each device first]
```

### Per-Device Overrides

Users can make device-specific changes:

```
User: *on Mobile view*
User: "Hide this image on mobile"

AI: "Done! The image is now hidden on mobile but still
     shows on tablet and desktop."
```

---

## Micro Interactions System

### Hover Effects

```
User: *clicks a button*
User: "Make it more interactive"

AI: "Here are 3 interaction styles for this button:"

    [Option A]          [Option B]          [Option C]
    Subtle lift         Color shift         Glow effect
    on hover            on hover            on hover

    [▶ Preview each]

User: *clicks Option A*

AI: "Applied! The button now lifts slightly when you hover.
     Want me to add a click effect too?"
```

### Click/Tap Feedback

```
User: "Make it bounce when clicked"

AI: "Done! The button now has a satisfying bounce effect
     when clicked. Here's how it looks:"

     [▶ Play animation]

     [Keep it] [Make it subtler] [Try different effect]
```

### Scroll Animations

```
User: "Make things appear as I scroll down"

AI: "I'll add scroll animations. Elements will fade in
     as you scroll to them."

     [▶ Preview scroll effect]

     [Apply to all sections] [Just this section] [Customize]
```

### Loading States

```
User: "What happens while this is loading?"

AI: "Right now, nothing shows during loading. I can add:"

    [Spinner]           [Skeleton]          [Progress bar]
    Shows a             Shows gray          Shows loading
    spinning icon       placeholder         progress

User: *clicks Skeleton*

AI: "Done! While loading, users will see a placeholder
     that matches the content shape."
```

### State Variations

```
User: "What should this look like when disabled?"

AI: "Here are 3 disabled state options:"

    [Grayed out]     [Faded]          [Muted colors]

User: *picks Grayed out*

AI: "Applied! Disabled elements are now clearly grayed out."
```

### Page Transitions

```
User: "Make page changes smoother"

AI: "I'll add page transitions. Options:"

    [Fade]           [Slide]          [Scale]
    Smooth fade      Slide from       Subtle zoom
    in/out           the side         effect
```

### Gesture Support (Mobile)

```
User: *on Mobile view*
User: "I want to swipe to delete items"

AI: "I'll add swipe-to-delete:"
     • Swipe left reveals delete button
     • Swipe further to confirm

     [▶ Preview gesture]

     [Add this] [Different gesture]
```

### Drag and Drop

```
User: "Let users reorder these by dragging"

AI: "I'll make these draggable:"
     • Drag handle appears on hover
     • Smooth animation while dragging
     • Visual feedback on drop

     [▶ Preview drag & drop]

     [Add this]
```

---

## Reference-Based Design

### Image Upload

```
User: *uploads screenshot of a website they like*

AI: "Nice design! I can see it uses:
     • Clean minimal style
     • Blue accent color (#3B82F6)
     • Rounded corners
     • Subtle shadows
     • Generous spacing

     What would you like me to apply?"

     [ ] Colors
     [ ] Typography
     [ ] Spacing
     [ ] Effects (shadows, rounded corners)
     [x] All of the above

     [Apply selected]
```

### Style Matching

```
User: "Make it look like Apple's website"

AI: "Apple's style is known for:
     • Lots of white space
     • Large, bold headlines
     • Minimal color (mostly black/white)
     • Smooth animations

     Here's a preview with Apple-inspired styling:"

     [Before] → [After]

     [Apply this] [Adjust specific things]
```

### Video Reference (for animations)

```
User: *uploads video of an animation they like*

AI: "I see this animation:
     • Smooth ease-out timing
     • Elements slide up while fading in
     • About 0.3 second duration

     Want me to apply this animation style to your design?"

     [Yes, apply it] [Show me on a specific element]
```

---

## Dual AI Architecture

The system uses multiple AI models for optimal results:

### Model Routing

| Task                      | AI Used                                     | Why                       |
| ------------------------- | ------------------------------------------- | ------------------------- |
| Understanding user intent | Claude Sonnet 4                             | Best at natural language  |
| Complex design decisions  | Claude Opus 4.5                             | Deep reasoning            |
| Image/reference analysis  | Claude Sonnet 4 (vision) + Gemini 2.0 Flash | Best visual understanding |
| Quick style changes       | Claude Haiku 3.5                            | Fast and cheap            |
| Animation generation      | Claude Sonnet 4                             | Good at code generation   |
| Video frame analysis      | Gemini 2.0 Flash                            | Better at video           |

### Fallback Chain

```
Primary: Claude Sonnet 4
    ↓ (if fails or rate limited)
Fallback: GPT-4o
    ↓ (if fails)
Fallback: Claude Haiku 3.5
```

### Vision Analysis Pipeline

```
User uploads image
    ↓
Claude Sonnet 4 (vision): Analyzes layout, style, mood
    ↓
Gemini 2.0 Flash: Extracts precise colors, measurements
    ↓
Combined: Rich style profile
    ↓
Claude Sonnet 4: Generates CSS/design changes
```

---

## Undo/Redo System

### Visual History

Users can undo/redo any change with a visual timeline:

```
┌──────────────────────────────────────────────────────────────────┐
│  [← Undo] [Redo →]                    History ▼                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  History dropdown:                                               │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ ● Current                                                  │ │
│  │ ○ Added hover effect to button                             │ │
│  │ ○ Changed header color to blue                             │ │
│  │ ○ Made text bigger                                         │ │
│  │ ○ Initial design                                           │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Click any state to jump back to that point                     │
└──────────────────────────────────────────────────────────────────┘
```

### Keyboard Shortcuts

- **Ctrl/Cmd + Z** - Undo last change
- **Ctrl/Cmd + Shift + Z** - Redo last undo
- **Ctrl/Cmd + Y** - Alternative redo

### Conversation-Aware Undo

```
User: "Undo that"

AI: "I've undone the last change (added shadow to button).
     Your button is back to how it was before."

User: "Go back to how it looked 5 minutes ago"

AI: "Here's what your design looked like 5 minutes ago:"
    [Before] ← [5 min ago] → [Now]

    [Restore this version] [Just show me]
```

### Implementation

```typescript
interface HistoryEntry {
  id: string;
  timestamp: Date;
  description: string; // Human-readable
  designState: DesignState; // Full snapshot
  changedElements: string[]; // Which elements changed
}

interface HistoryManager {
  entries: HistoryEntry[];
  currentIndex: number;
  maxEntries: number; // Default: 50

  push(entry: HistoryEntry): void;
  undo(): DesignState | null;
  redo(): DesignState | null;
  jumpTo(index: number): DesignState;
}
```

---

## Save/Load System

### Auto-Save

Designs auto-save every 30 seconds and on significant changes:

```
┌──────────────────────────────────────────────────────────────────┐
│  💾 Saved just now                                   [Save ▼]    │
│                                                                  │
│  Save dropdown:                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ [Save now]                                                 │ │
│  │ [Save as new version]                                      │ │
│  │ [Export design]                                            │ │
│  │ ─────────────────                                          │ │
│  │ [Load previous version]                                    │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Version History

```
User: "Load the version from yesterday"

AI: "Here are your saved versions:"

    ┌─────────────────────────────────────────────────────────┐
    │ Today 2:30 PM (current)                        [Load]   │
    │ Today 11:00 AM - "Added responsive mobile"     [Load]   │
    │ Yesterday 4:45 PM - "Initial design"           [Load]   │
    │ Dec 28 - "Backup before changes"               [Load]   │
    └─────────────────────────────────────────────────────────┘
```

### Named Versions

```
User: "Save this as my approved design"

AI: "Saved! I've named this version 'Approved Design'.
     You can load it anytime from the save menu."
```

### Design Templates

Users can save designs as reusable templates:

```
User: "Save this header as a template"

AI: "Saved as a template! You can now use this header
     in other projects. I've named it 'Sticky Header with Shadow'.

     Want to give it a different name?"
```

### Data Model

```typescript
interface SavedDesign {
  id: string;
  projectId: string;
  name?: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  designState: DesignState;
  thumbnail?: string; // Preview image
  metadata: {
    deviceOptimized: ('desktop' | 'tablet' | 'mobile')[];
    hasAnimations: boolean;
    elementCount: number;
  };
}

interface DesignTemplate {
  id: string;
  userId: string;
  name: string;
  category: 'header' | 'footer' | 'section' | 'full-page';
  designState: Partial<DesignState>;
  isPublic: boolean;
}
```

---

## Integration with Main App Builder

The Layout Builder output feeds directly into the main AI App Builder:

### Flow Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Layout Builder │ ──→ │  Design Export  │ ──→ │   App Builder   │
│  (Click + Talk) │     │  (Components)   │     │   (Full App)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                      │                       │
         │                      │                       │
    User designs           Generates:              Integrates:
    layout visually       - React components      - With logic
                          - Tailwind styles       - With data
                          - Design tokens         - With routing
```

### How It Works

```
User in Layout Builder:
  1. Designs header, footer, main sections
  2. Adds responsive styles
  3. Adds micro-interactions
  4. Clicks "Use in App" →

App Builder receives:
  - Component code (React + Tailwind)
  - Design tokens (colors, spacing, typography)
  - Animation definitions
  - Responsive breakpoints

App Builder then:
  - Generates matching pages using the layout
  - Applies design tokens throughout
  - Maintains consistency
```

### Integration Conversation

```
User: "Use this layout in my app"

AI: "I'll apply this layout to your app. This includes:

     ✓ Header (sticky, with mobile menu)
     ✓ Footer (4-column, responsive)
     ✓ Main content layout (sidebar + content)
     ✓ Color scheme (blue accent, white background)
     ✓ Typography (Inter font, proper sizing)
     ✓ Animations (fade-in on scroll)

     [Apply to all pages] [Just the homepage] [Let me choose]"
```

### Technical Integration

```typescript
// Layout Builder exports
interface LayoutExport {
  // Generated React components
  components: {
    name: string;
    code: string;
    styles: string;
  }[];

  // Design tokens for consistency
  tokens: DesignTokens;

  // Layout structure
  layout: {
    header?: string; // Component name
    footer?: string;
    sidebar?: string;
    mainContent: string;
  };

  // Responsive settings
  breakpoints: {
    mobile: number;
    tablet: number;
    desktop: number;
  };

  // Animations to include
  animations: Animation[];
}

// App Builder consumes
function applyLayout(appState: AppState, layout: LayoutExport): AppState {
  // Merge components
  // Apply tokens to theme
  // Set up page layouts
  // Register animations
  return updatedAppState;
}
```

### Bidirectional Sync

When the app builder modifies layout components, changes reflect in the layout builder:

```
App Builder: Modifies header to add login button
    ↓
Layout Builder: Shows updated header with login button
    ↓
User can: Further refine in either builder
```

---

## Technical Implementation

### Core Type Definitions

```typescript
// Element types supported
type ElementType =
  | 'container'
  | 'section'
  | 'header'
  | 'footer'
  | 'sidebar'
  | 'text'
  | 'heading'
  | 'paragraph'
  | 'link'
  | 'button'
  | 'input'
  | 'form'
  | 'image'
  | 'video'
  | 'icon'
  | 'list'
  | 'card'
  | 'modal'
  | 'nav'
  | 'menu'
  | 'tabs'
  | 'custom';

// Animation reference
interface AnimationRef {
  id: string;
  trigger: 'load' | 'scroll' | 'hover' | 'click' | 'focus';
  delay?: number;
  duration?: number;
}

// Shared/reusable styles
interface SharedStyle {
  id: string;
  name: string;
  styles: Record<string, string | number>;
  appliedTo: string[]; // Element IDs
}

// Animation definition
interface Animation {
  id: string;
  name: string;
  keyframes: Record<string, Record<string, string>>;
  timing: string;
  duration: number;
  iterationCount: number | 'infinite';
}

// Design tokens extracted from the design
interface DesignTokens {
  colors: Record<string, string>;
  spacing: Record<string, string>;
  typography: {
    fontFamily: Record<string, string>;
    fontSize: Record<string, string>;
    fontWeight: Record<string, number>;
    lineHeight: Record<string, string>;
  };
  effects: {
    shadows: Record<string, string>;
    borderRadius: Record<string, string>;
  };
  transitions: Record<string, string>;
}

// Design option returned by AI
interface DesignOption {
  id: string;
  preview: string; // Rendered HTML/image
  description: string; // "Clean and minimal"
  changes: StyleChange[]; // What will change
}

interface StyleChange {
  elementId: string;
  property: string;
  oldValue: string | number;
  newValue: string | number;
}
```

### Data Model

```typescript
interface DesignState {
  // All elements (unlimited nesting)
  elements: Map<string, DesignElement>;

  // Root elements per breakpoint
  roots: {
    desktop: string[];
    tablet: string[];
    mobile: string[];
  };

  // Shared styles
  sharedStyles: SharedStyle[];

  // Animations
  animations: Animation[];

  // Design tokens (extracted)
  tokens: DesignTokens;
}

// Style type for reuse
type StyleProps = Record<string, string | number>;

interface DesignElement {
  id: string;
  type: ElementType;
  name?: string; // User-friendly name

  // Any CSS property - no presets
  styles: StyleProps;

  // Responsive overrides
  responsiveStyles: {
    tablet?: Partial<StyleProps>;
    mobile?: Partial<StyleProps>;
  };

  // Interactions
  interactions: {
    hover?: Partial<StyleProps>;
    active?: Partial<StyleProps>;
    focus?: Partial<StyleProps>;
    disabled?: Partial<StyleProps>;
  };

  // Animations
  animations: {
    entrance?: AnimationRef;
    scroll?: AnimationRef;
    hover?: AnimationRef;
    click?: AnimationRef;
  };

  // Children (unlimited)
  children: string[];
}
```

### Click Detection

```typescript
<PreviewFrame
  onClick={(element) => {
    setSelectedElement(element);
    showQuickActions(element.type);
    openContextualChat(element);
  }}
>
  <LivePreview design={currentDesign} />
</PreviewFrame>
```

### AI Context Building

```typescript
interface ChatContext {
  // What's selected
  selectedElement: DesignElement | null;
  elementType: string;
  currentStyles: Record<string, string>;

  // Surrounding context
  parentElement: DesignElement | null;
  siblingElements: DesignElement[];

  // Current view
  deviceView: 'desktop' | 'tablet' | 'mobile';

  // User preferences (learned)
  userPreferences: {
    preferredColors: string[];
    preferredStyle: string;
    preferredAnimationSpeed: string;
  };
}
```

### Option Generation

```typescript
async function generateOptions(
  element: DesignElement,
  userRequest: string,
  count: number = 3
): Promise<DesignOption[]> {
  const context = buildContext(element);

  const options = await ai.generateVariations({
    element,
    request: userRequest,
    context,
    count,
  });

  return options.map((opt) => ({
    preview: renderPreview(opt),
    description: opt.description,
    changes: opt.changes,
  }));
}
```

---

## Component Structure

```
src/components/unlimited-builder/
├── Builder/
│   ├── UnlimitedBuilder.tsx      # Main container
│   ├── BuilderModeSwitch.tsx     # Toggle guided/unlimited
│   └── BuilderToolbar.tsx        # Device switcher, save, etc.
├── Preview/
│   ├── LivePreview.tsx           # Rendered design
│   ├── ClickableOverlay.tsx      # Element selection
│   ├── SelectionHighlight.tsx    # Blue outline on selected
│   └── DeviceFrame.tsx           # Desktop/tablet/mobile frames
├── Chat/
│   ├── ChatPanel.tsx             # Main chat interface
│   ├── QuickActions.tsx          # Context-aware buttons
│   ├── OptionsPicker.tsx         # Visual option selection
│   ├── BeforeAfter.tsx           # Change preview
│   └── VoiceInput.tsx            # Voice input support
├── History/
│   ├── HistoryManager.tsx        # Undo/redo state management
│   ├── HistoryControls.tsx       # Undo/redo buttons
│   ├── HistoryDropdown.tsx       # Visual history timeline
│   └── useHistory.ts             # History hook
├── SaveLoad/
│   ├── SaveButton.tsx            # Save with dropdown
│   ├── VersionHistory.tsx        # List of saved versions
│   ├── TemplateManager.tsx       # Save/load templates
│   └── AutoSave.tsx              # Auto-save provider
├── Reference/
│   ├── ReferenceUploader.tsx     # Image/video upload
│   ├── StyleExtractor.tsx        # Extract styles from reference
│   └── StyleMatcher.tsx          # Apply extracted styles
├── Responsive/
│   ├── DeviceSwitcher.tsx        # Desktop/tablet/mobile toggle
│   ├── ResponsivePreview.tsx     # Show all devices at once
│   └── BreakpointIndicator.tsx   # Show current breakpoint
├── Interactions/
│   ├── InteractionPicker.tsx     # Choose hover/click/etc.
│   ├── AnimationPreview.tsx      # Preview animations
│   └── StateEditor.tsx           # Edit hover/disabled states
├── Integration/
│   ├── LayoutExporter.tsx        # Export for app builder
│   ├── AppBuilderBridge.tsx      # Sync with main builder
│   └── useAppBuilderSync.ts      # Bidirectional sync hook
└── Export/
    ├── CodeExporter.tsx          # React + Tailwind export
    ├── CSSExporter.tsx           # Plain CSS export
    └── TokenExporter.tsx         # Design tokens export
```

---

## Export Options

### React + Tailwind (Default)

```tsx
// Generated Header.tsx
export function Header() {
  return (
    <header
      className="sticky top-0 z-50 flex items-center justify-between
                       w-full h-[72px] px-8 bg-white shadow-sm
                       transition-shadow duration-200 hover:shadow-md"
    >
      <Logo />
      <nav className="hidden md:flex items-center gap-6">
        <NavLink href="#">Features</NavLink>
        <NavLink href="#">Pricing</NavLink>
      </nav>
      <MobileMenu className="md:hidden" />
      <Button className="hover:scale-105 active:scale-95 transition-transform">Get Started</Button>
    </header>
  );
}
```

### Plain CSS

```css
.header {
  position: sticky;
  top: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 72px;
  padding: 0 2rem;
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.2s ease;
}

.header:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

@media (max-width: 768px) {
  .header nav {
    display: none;
  }
  .header .mobile-menu {
    display: block;
  }
}
```

### Design Tokens

```json
{
  "colors": {
    "primary": "#3b82f6",
    "background": "#ffffff",
    "text": "#1f2937"
  },
  "spacing": {
    "header-height": "72px",
    "section-padding": "4rem"
  },
  "effects": {
    "shadow-sm": "0 1px 3px rgba(0,0,0,0.1)",
    "shadow-md": "0 4px 12px rgba(0,0,0,0.15)"
  },
  "transitions": {
    "default": "0.2s ease"
  }
}
```

---

## Error Handling

### AI Failures

```
AI: "I had trouble understanding that request. Could you try:
     • Being more specific about which element
     • Describing what you want it to look like
     • Uploading a reference image

     Or try one of these quick actions:"
     [Make it bigger] [Change color] [Add effect]
```

### Invalid Changes

```
AI: "That change would hide important content. Instead, I can:
     1. Make it smaller but still visible
     2. Move it to a different position
     3. Hide it only on certain devices

     Which would you prefer?"
```

### Undo on Mistake

```
AI: "Oops, that didn't look right. I've automatically undone
     the change. Want me to try a different approach?"

     [Try again] [Show me options] [Undo more]
```

### Network/API Errors

```
AI: "I'm having trouble connecting right now.
     Your design is safely auto-saved.

     [Retry] [Work offline] [Check status]"
```

---

## Accessibility

### Built-in Checks

AI automatically checks and suggests fixes for:

- **Color contrast** - WCAG AA/AAA compliance
- **Touch targets** - Minimum 44x44px on mobile
- **Focus states** - Visible focus indicators
- **Text sizing** - Minimum readable sizes
- **Alt text** - Prompts for image descriptions

### Accessibility Warnings

```
AI: "I noticed some accessibility issues:

     ⚠️ Button text contrast is too low (3.2:1, needs 4.5:1)
     ⚠️ This link has no focus state
     ⚠️ Touch target is only 32px (needs 44px minimum)

     Want me to fix these?"

     [Fix all] [Show me each one] [Ignore for now]
```

### Accessible Design Requests

| User Says                          | AI Does                                       |
| ---------------------------------- | --------------------------------------------- |
| "Make sure this is accessible"     | Runs full audit, suggests fixes               |
| "Can colorblind people see this?"  | Tests color combinations, offers alternatives |
| "Make it work with screen readers" | Adds proper labels, structure, ARIA           |
| "Fix the contrast"                 | Adjusts colors to meet WCAG standards         |

---

## Implementation Phases

### Phase 1: Core Click + Talk (Weeks 1-4)

- [ ] Basic preview with click detection
- [ ] Element selection and highlighting
- [ ] Chat panel with AI integration
- [ ] Quick action buttons
- [ ] Basic style changes via natural language
- [ ] Undo/redo system with keyboard shortcuts
- [ ] Visual history timeline

### Phase 2: Visual Options & Saving (Weeks 5-6)

- [ ] Generate multiple design options
- [ ] Visual option picker
- [ ] Before/after comparison
- [ ] Apply selected option
- [ ] Auto-save functionality
- [ ] Version history
- [ ] Named saves

### Phase 3: Responsive (Weeks 7-8)

- [ ] Device preview switcher
- [ ] Responsive style overrides
- [ ] Mobile-specific AI suggestions
- [ ] Auto-responsive optimization

### Phase 4: Micro Interactions (Weeks 9-11)

- [ ] Hover state editing
- [ ] Click animations
- [ ] Scroll-triggered animations
- [ ] Loading states
- [ ] Transition editor

### Phase 5: Reference Mode (Weeks 12-13)

- [ ] Image upload and analysis
- [ ] Style extraction
- [ ] Apply extracted styles
- [ ] Video reference support

### Phase 6: Advanced Features (Weeks 14-16)

- [ ] Drag and drop interactions
- [ ] Gesture support (mobile)
- [ ] Page transitions
- [ ] Component creation
- [ ] Design templates (save/load)

### Phase 7: Integration & Export (Weeks 17-18)

- [ ] React + Tailwind export
- [ ] Plain CSS export
- [ ] Design tokens export
- [ ] App Builder integration
- [ ] Bidirectional sync with main builder
- [ ] Performance optimization

---

## Summary

| Aspect                  | Guided Mode (Current) | Click + Talk Mode (New)    |
| ----------------------- | --------------------- | -------------------------- |
| **Input**               | Click presets         | Natural language           |
| **Options**             | 3-5 per property      | Unlimited                  |
| **Learning curve**      | Low                   | Zero                       |
| **Speed**               | Fast for simple       | Fast for anything          |
| **Flexibility**         | Limited               | Unlimited                  |
| **Responsive**          | Basic                 | Full control               |
| **Animations**          | Preset effects        | Any interaction            |
| **Technical knowledge** | Some helpful          | None required              |
| **Undo/Redo**           | Basic                 | Visual history timeline    |
| **Saving**              | Manual                | Auto-save + versions       |
| **Templates**           | N/A                   | Save/load custom templates |
| **App Integration**     | Separate flow         | Direct integration         |

**The goal:** Anyone can create a professional, responsive, interactive layout by simply clicking and talking to the AI.

---

## Key Additions in This Plan

1. **Undo/Redo System** - Visual history timeline, keyboard shortcuts, conversation-aware undo
2. **Save/Load System** - Auto-save, version history, named saves, design templates
3. **App Builder Integration** - Bidirectional sync, layout export, design tokens transfer
4. **Updated AI Models** - Claude Sonnet 4, Opus 4.5, Haiku 3.5, Gemini 2.0 Flash, GPT-4o fallback
5. **Core Type Definitions** - ElementType, AnimationRef, SharedStyle, Animation, DesignTokens, DesignOption, StyleChange
6. **Error Handling** - AI failures, invalid changes, auto-undo on mistakes, network errors
7. **Accessibility** - Built-in WCAG checks, contrast warnings, touch target validation, screen reader support
8. **New Components** - History/, SaveLoad/, Integration/ component folders
