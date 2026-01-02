# ⌨️ Keyboard Shortcuts

Quick reference for all keyboard shortcuts in the AI App Builder.

---

## 🕒 Version Control

### Undo/Redo

- **Ctrl+Z** (Windows/Linux) / **Cmd+Z** (Mac)
  - Undo last change
  - Reverts to previous version
  - Works globally when app is loaded
  - Unlimited undo until page refresh
- **Ctrl+Shift+Z** (Windows/Linux) / **Cmd+Shift+Z** (Mac)
  - Redo last undone change
  - Restores from redo stack
  - Clears when new change is made
- **Ctrl+Y** (Windows/Linux) / **Cmd+Y** (Mac)
  - Alternative redo shortcut
  - Same behavior as Ctrl+Shift+Z
  - For users familiar with different conventions

### Requirements

- Shortcuts only work when an app is loaded (`currentComponent` exists)
- Won't interfere with text input fields
- Visual feedback via button states (enabled/disabled)

---

## 💬 Chat & Input

### Message Sending

- **Enter**
  - Send message in chat input
  - Submits prompt to AI
  - Also works with image uploads
  - Disabled when input is empty or AI is generating

### Navigation

- **Esc**
  - Close any open modal
  - Exit fullscreen mode (alternative to button)
  - Dismiss popups
  - Return to main view

---

## 📝 Text Editing

### In Input Fields

Standard text editing shortcuts work:

- **Ctrl+A** / **Cmd+A** - Select all text
- **Ctrl+C** / **Cmd+C** - Copy
- **Ctrl+V** / **Cmd+V** - Paste
- **Ctrl+X** / **Cmd+X** - Cut
- **Ctrl+Z** / **Cmd+Z** - Undo text edit (in input only)
- **Arrow keys** - Navigate cursor
- **Home** / **End** - Jump to start/end
- **Backspace** / **Delete** - Remove characters

---

## 🔍 Quick Actions

### Context Menu

- **Right-click** on code
  - Copy code
  - Select all (in code viewer)

### File Operations

In code view:

- **Click** file name - View file contents
- **Click** copy button - Copy to clipboard

---

## 🎯 Tips & Tricks

### Efficient Workflow

1. **Generate** app with Enter
2. **Preview** automatically switches to preview tab
3. **Modify** with natural language
4. **Undo** with Ctrl+Z if not satisfied
5. **Refine** iteratively
6. **Export** when complete

### Version Control Workflow

1. Make changes through chat
2. If result isn't perfect: **Ctrl+Z** to undo
3. Try different approach
4. **Ctrl+Shift+Z** to compare approaches
5. Keep the version you prefer

### Power User Tips

- **Rapid prototyping**: Make changes quickly, undo freely
- **A/B testing**: Fork, try alternative, compare
- **Checkpoint saves**: Before major changes, note version number
- **Keyboard-first**: Minimize mouse use with shortcuts

---

## 🚫 Limitations

### Shortcuts That Don't Work

- No shortcuts for opening modals (use mouse)
- No shortcuts for switching tabs (use mouse)
- No shortcuts for app library navigation
- No custom shortcut configuration (yet)

### Disabled States

- Undo/Redo disabled when:
  - No app loaded
  - No undo/redo history available
  - Currently generating
- Enter disabled when:
  - Input is empty
  - AI is generating

---

## 🔮 Future Shortcuts

### Planned (Not Yet Implemented)

- **Ctrl+S** - Quick save to library
- **Ctrl+E** - Open export modal
- **Ctrl+K** - Open command palette
- **Ctrl+/** - Toggle chat sidebar
- **Ctrl+B** - Toggle file tree
- **F11** - Fullscreen preview
- **Ctrl+Enter** - Force send (even when generating)

See [FUTURE_IMPLEMENTATION_TODO.md](./FUTURE_IMPLEMENTATION_TODO.md) for more.

---

## 📊 Shortcut Reference Table

| Action          | Windows/Linux | Mac         | Context         |
| --------------- | ------------- | ----------- | --------------- |
| Undo            | Ctrl+Z        | Cmd+Z       | Version control |
| Redo            | Ctrl+Shift+Z  | Cmd+Shift+Z | Version control |
| Redo (alt)      | Ctrl+Y        | Cmd+Y       | Version control |
| Send message    | Enter         | Enter       | Chat input      |
| Close modal     | Esc           | Esc         | Any modal       |
| Exit fullscreen | Esc           | Esc         | Preview mode    |
| Select all      | Ctrl+A        | Cmd+A       | Text fields     |
| Copy            | Ctrl+C        | Cmd+C       | Text fields     |
| Paste           | Ctrl+V        | Cmd+V       | Text fields     |
| Cut             | Ctrl+X        | Cmd+X       | Text fields     |

---

## 🎓 Learning Path

### For Beginners

1. Start with **Enter** to send messages
2. Learn **Esc** to close things
3. Master **Ctrl+Z** for mistakes
4. Explore mouse-based features

### For Power Users

1. Use **Ctrl+Z/Shift+Z** for rapid iteration
2. Combine with Fork for experimentation
3. Build keyboard-first workflow
4. Request additional shortcuts in issues

---

## 💡 Accessibility

### Keyboard Navigation

- All interactive elements reachable via Tab
- Visual focus indicators on all controls
- No keyboard traps
- Screen reader compatible (ARIA labels)

### Alternatives to Shortcuts

- All shortcuts have button equivalents
- Mouse/touch fully supported
- No features require keyboard-only

---

**Last Updated**: November 2025  
**Version**: 2.0
