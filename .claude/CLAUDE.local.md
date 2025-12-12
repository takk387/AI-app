# Personal Preferences (Not Committed)

This file is for your personal Claude Code preferences. It's automatically ignored by git.

## My Workflow Preferences

<!-- Customize these for your workflow -->

### Code Style

- I prefer concise code with minimal comments
- Use descriptive variable names over comments
- Keep functions small and focused

### Communication

- Be direct and concise in responses
- Skip unnecessary explanations for simple tasks
- Ask clarifying questions when requirements are ambiguous

### Development Patterns

- Always run typecheck before considering a task complete
- Prefer editing existing files over creating new ones
- Use existing utilities rather than creating new helpers

## Quick Reminders

<!-- Add project-specific notes here -->

### Current Sprint Focus

- Context compression improvements
- Token efficiency optimizations

### Files I'm Working On

- Update this as you switch focus areas

### Debugging Notes

- Add notes about tricky bugs or solutions here

## Personal Shortcuts

### Common Commands I Use

```bash
# Quick dev cycle
npm run dev

# Full validation
npm run typecheck && npm run lint && npm test

# Watch specific tests
npm test -- --watch
```

### Useful Grep Patterns

```bash
# Find all usages of a component
grep -r "ComponentName" src/

# Find all imports of a module
grep -r "from '@/services" src/
```
