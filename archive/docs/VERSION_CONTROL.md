# 🕒 Version Control System

Complete guide to version control, undo/redo, fork, and compare features.

---

## 📋 Overview

Every modification to your app creates a new version automatically. You have complete history with the ability to undo, redo, fork, compare, and revert to any previous version.

### Key Features

- ✅ **Automatic version saving** on every change
- ✅ **Unlimited undo/redo** (until page refresh)
- ✅ **Fork/branch** to create alternatives
- ✅ **Compare versions** side-by-side
- ✅ **One-click revert** to any version
- ✅ **Version metadata** (timestamp, description, change type)

---

## 🔄 Automatic Version Saving

### When Versions Are Created

A new version is saved when:

- ✅ New app is generated (marked as `NEW_APP`)
- ✅ Major change is applied (marked as `MAJOR_CHANGE`)
- ✅ Minor change is applied (marked as `MINOR_CHANGE`)
- ✅ Undo/redo operation is performed
- ✅ Version is reverted

### What's Saved in Each Version

```typescript
{
  id: "1730583600000",
  versionNumber: 1,
  code: "/* complete app code */",
  description: "Initial app creation",
  timestamp: "2025-11-02T20:00:00.000Z",
  changeType: "NEW_APP"
}
```

### Version Numbers

- Start at 1 for new apps
- Increment sequentially
- Never reset (even with undo/redo)
- Used for identification and comparison

---

## ⏮️ Undo System

### How to Undo

**Keyboard**: `Ctrl+Z` (Windows/Linux) or `Cmd+Z` (Mac)
**Mouse**: Click the **↶** button in preview toolbar

### What Happens When You Undo

1. Current version moved to **redo stack**
2. Previous version restored from **undo stack**
3. App reverts to previous state
4. Preview updates automatically
5. Undo button updates (disabled if no more undos)

### Undo Stack

- **Unlimited history** (until page refresh)
- Each undo operation stores one version
- Making a new change clears the redo stack
- Visual feedback: Button disabled when empty

### Example Workflow

```
1. Generate app (v1)
2. Add dark mode (v2)
   Undo stack: [v1]
3. Change button color (v3)
   Undo stack: [v1, v2]
4. Press Ctrl+Z → Back to v2
   Undo stack: [v1]
   Redo stack: [v3]
5. Press Ctrl+Z → Back to v1
   Undo stack: []
   Redo stack: [v2, v3]
```

---

## ⏭️ Redo System

### How to Redo

**Keyboard**:

- `Ctrl+Shift+Z` (Windows/Linux) or `Cmd+Shift+Z` (Mac)
- `Ctrl+Y` (Windows/Linux) or `Cmd+Y` (Mac)

**Mouse**: Click the **↷** button in preview toolbar

### What Happens When You Redo

1. Current version moved to **undo stack**
2. Next version restored from **redo stack**
3. App advances to next state
4. Preview updates automatically
5. Redo button updates (disabled if no more redos)

### Redo Stack Clearing

The redo stack is **cleared** when:

- ❌ You make a new change (edit/generate/modify)
- ❌ You revert to a different version
- ❌ You fork the app

**Why?** To prevent confusing branched histories. Once you make a new change, the "future" is rewritten.

### Example Workflow

```
1. At v3, press Ctrl+Z twice → Back to v1
   Redo stack: [v2, v3]
2. Press Ctrl+Shift+Z → Forward to v2
   Redo stack: [v3]
3. Press Ctrl+Shift+Z → Forward to v3
   Redo stack: []
4. Make new change → v4 created
   Redo stack: [] (cleared)
```

---

## 📜 Version History Modal

### Opening Version History

**Click the 🕒 History button** in the header.

Shows version count badge: 🕒 History (5)

### What You See

**Reverse chronological order** (newest first):

- Version number
- Timestamp (date + time)
- Description of change
- Change type badge:
  - 🚀 **NEW_APP** (blue) - Initial creation
  - ⚡ **MAJOR_CHANGE** (orange) - Big modifications
  - ✨ **MINOR_CHANGE** (green) - Small tweaks
- **Current** badge on active version (blue highlight)

### Actions Per Version

Each version has action buttons:

**🔄 Revert** - Restore to this version

- Current state saved to undo stack first
- Version restored as current
- Preview updates
- Can undo the revert if needed

**🍴 Fork** - Create alternative branch

- New app created with "-Fork" suffix
- Independent from original
- Appears in My Apps library
- Original untouched

**🔍 Compare** - Compare with current

- Opens comparison modal
- Side-by-side view
- Shows differences
- Can revert or fork from comparison

---

## 🍴 Fork/Branch System

### What is Forking?

**Forking** creates an independent copy of your app (or a specific version) that you can modify without affecting the original.

### When to Fork

- ✅ **Experimentation**: Try radical changes safely
- ✅ **A/B testing**: Create two approaches to compare
- ✅ **Checkpointing**: Save stable state before risky changes
- ✅ **Variations**: Create themed versions (light/dark, different colors)
- ✅ **Recovery**: Fork from old version if current is broken

### How to Fork

**Method 1: Fork Current App**

1. Click **🍴 Fork** button in preview toolbar
2. New app created: "Original Name - Fork"
3. Opens in current view
4. Original still in library

**Method 2: Fork from History**

1. Open version history (🕒)
2. Find version to fork
3. Click **🍴 Fork** on that version
4. New app created from that version

**Method 3: Fork from Comparison**

1. Compare two versions
2. Click **🍴 Fork Version X**
3. Creates fork of selected version

### Fork Metadata

```typescript
{
  id: "new-unique-id",
  name: "Todo App - Fork",
  code: "/* code from forked version */",
  description: "Todo App (forked from v3)",
  timestamp: "2025-11-02T20:30:00.000Z",
  versions: [{
    versionNumber: 1,
    description: "Forked from Todo App",
    changeType: "NEW_APP"
  }]
}
```

### Fork Independence

- ✅ **Completely separate** app
- ✅ **Own version history** (starts at v1)
- ✅ **Own undo/redo** stacks
- ✅ **Can modify freely** without affecting original
- ✅ **Can fork again** to create more variations

---

## 🔍 Compare Versions

### Opening Comparison

**Method 1: From History**

1. Open version history
2. Click **🔍 Compare with current** on any version
3. Comparison modal opens

**Method 2: From Compare Button** (future feature)

- Select two versions
- Click compare

### Comparison View

**Side-by-side panels**:

**Left Panel (Selected Version)**:

- Version number and timestamp
- Change description
- Code preview (first 1000 chars)
- Copy button

**Right Panel (Current Version)**:

- Version number and timestamp
- Change description
- Code preview (first 1000 chars)
- Copy button

### Comparison Actions

**Quick Actions Bar**:

- **🔄 Revert to Version X**: Restore left version
- **🍴 Fork Version X**: Create fork of left version
- **Copy code**: Copy to clipboard
- **Close**: Exit comparison

### Use Cases

**Find what changed**:

- Compare current with v1 to see all changes
- Compare v5 with v4 to see last change
- Identify when bug was introduced

**Choose best version**:

- Compare two approaches
- Review code differences
- Pick winner to keep

**Recovery**:

- Find working version
- Compare with broken version
- Identify problematic change
- Revert or fork stable version

---

## 🎯 Version Control Strategies

### Strategy 1: Checkpoint-Based

**Best for**: Large, complex apps

**Process**:

1. Build core features (v1-v5)
2. Test thoroughly
3. Note "stable" version (e.g., v5)
4. Try experimental features (v6-v8)
5. If experiment fails, revert to v5
6. Try different approach

**Benefits**:

- Safe experimentation
- Easy recovery
- Clear milestones

---

### Strategy 2: Iterative Refinement

**Best for**: UI/design tweaking

**Process**:

1. Generate initial design (v1)
2. Make change (v2)
3. Review in preview
4. Like it? Keep it
5. Don't like it? Ctrl+Z
6. Try different change
7. Repeat until perfect

**Benefits**:

- Rapid iteration
- Immediate feedback
- Zero risk

---

### Strategy 3: Parallel Exploration

**Best for**: Major feature decisions

**Process**:

1. Create stable base (v1)
2. Fork to "Approach A"
3. Fork to "Approach B"
4. Develop each independently
5. Compare results
6. Pick winner or combine best parts

**Benefits**:

- Compare real implementations
- No what-ifs
- Data-driven decisions

---

### Strategy 4: Recovery Points

**Best for**: Risky modifications

**Process**:

1. Reach stable state (v7)
2. Note version number
3. Attempt risky change (v8)
4. If it breaks:
   - Option A: Undo (Ctrl+Z)
   - Option B: Revert to v7
   - Option C: Fork from v7, start over
5. If it works: Continue from v8

**Benefits**:

- Confidence to experiment
- Easy rollback
- Multiple recovery options

---

## 💾 Data Persistence

### What's Saved

**In Browser localStorage**:

- All apps in library
- Each app's version history
- Current app state

**Not saved**:

- Undo/redo stacks (cleared on refresh)
- Temporary UI state
- Comparison selections

### When Data Persists

- ✅ Page refresh
- ✅ Browser restart
- ✅ Multiple tabs (shared)

### When Data is Lost

- ❌ Clear browser data
- ❌ Incognito/private mode (when closed)
- ❌ Different browser/device
- ❌ LocalStorage quota exceeded

### Backup Strategy

**Export regularly**:

1. Click **📦 Export** on important apps
2. Download ZIP files
3. Store safely
4. Can reimport later if needed

---

## 🐛 Troubleshooting

### "Undo button is disabled"

**Cause**: No undo history available

**Solutions**:

- Check if any changes were made
- Undo stack clears on page refresh
- Use version history to revert instead

---

### "Redo cleared after making change"

**Cause**: This is intentional behavior

**Why**: Prevents confusing branched histories

**Workaround**:

- Fork before making change
- Compare versions to see lost redos
- Be intentional about forward/backward movement

---

### "Version history shows no versions"

**Cause**: App hasn't been modified yet

**Solutions**:

- Make a change to create first version
- Version history only shows modifications
- Initial generation doesn't create version until first change

---

### "Lost all history after refresh"

**Cause**: Undo/redo stacks are in-memory only

**Solutions**:

- Use version history instead (persists)
- Revert to old versions from history
- Fork to preserve current state before risky changes

---

## 📊 Comparison Table

| Feature         | Undo/Redo       | Version History    | Fork                |
| --------------- | --------------- | ------------------ | ------------------- |
| **Speed**       | Instant         | Click to revert    | Creates new app     |
| **Persistence** | Lost on refresh | Saved forever      | Saved forever       |
| **Scope**       | Sequential only | Any version        | Creates independent |
| **Limit**       | Unlimited       | 50 versions        | Unlimited apps      |
| **Best For**    | Quick iteration | Long-term tracking | Experimentation     |

---

## 🎓 Best Practices

### DO:

- ✅ Use undo/redo for rapid iteration
- ✅ Fork before major experiments
- ✅ Note version numbers at stable states
- ✅ Export important apps regularly
- ✅ Use version history for long-term recovery
- ✅ Compare versions to understand changes

### DON'T:

- ❌ Rely solely on undo/redo (lost on refresh)
- ❌ Forget to note stable versions
- ❌ Ignore version descriptions
- ❌ Make too many changes without testing
- ❌ Fork excessively (clutters library)

---

## 🚀 Advanced Techniques

### Technique 1: Time Travel Debugging

1. Bug appears in current version
2. Open version history
3. Try older versions until bug disappears
4. Compare working vs broken version
5. Identify problematic change
6. Fix or revert

### Technique 2: Feature Toggle Testing

1. Create base app
2. Fork to "With Feature A"
3. Fork to "With Feature B"
4. Fork to "With Both"
5. Compare all versions
6. Choose optimal combination

### Technique 3: Design Evolution

1. Save version as "Design v1"
2. Make changes
3. Save as "Design v2"
4. Continue iterating
5. Compare all designs
6. Show client/team for feedback

---

**Last Updated**: November 2025  
**Version**: 2.0
