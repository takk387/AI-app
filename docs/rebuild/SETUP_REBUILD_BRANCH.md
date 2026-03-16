# How to Set Up the Rebuild Branch

This creates a git branch where Claude Code reads the lightweight CLAUDE.md (48 lines) instead of the full one (1,393 lines + 3,308 lines of rules).

## One-Time Setup

```bash
# Create the rebuild branch from your current branch
git checkout -b builder-rebuild

# Backup the original CLAUDE.md
cp CLAUDE.md CLAUDE_ORIGINAL.md

# Replace with the lightweight rebuild version
cp docs/rebuild/CLAUDE_REBUILD.md CLAUDE.md

# Move the heavy rule files out of auto-load path
mkdir -p .claude/rules-backup
mv .claude/rules/*.md .claude/rules-backup/

# Commit the swap
git add -A
git commit -m "Setup rebuild branch: lightweight CLAUDE.md, rules moved out of auto-load"
```

## Starting a Session

1. Make sure you're on the rebuild branch: `git checkout builder-rebuild`
2. Open Claude Code (or Claude in VS Code)
3. Tell it which session to run:

```
Read docs/rebuild/SESSION_3.md and build exactly what it says.
```

That's it. The AI reads ~80 lines of CLAUDE.md + ~100 lines of session briefing instead of 4,701 lines of rules.

## Switching Back to Normal Development

```bash
# Go back to main (or your dev branch)
git checkout main

# Full CLAUDE.md and rules are still there, untouched
```

The rebuild branch has the lightweight CLAUDE.md. Main has the full one. Git handles the switching.

## After the Rebuild is Complete

```bash
# Merge the rebuild work into main
git checkout main
git merge builder-rebuild

# Restore the original CLAUDE.md (the merge will have the lightweight one)
cp CLAUDE_ORIGINAL.md CLAUDE.md

# Restore the rule files
mv .claude/rules-backup/*.md .claude/rules/
rmdir .claude/rules-backup

# Commit the restoration
git add -A
git commit -m "Restore full CLAUDE.md after rebuild complete"

# Clean up
git branch -d builder-rebuild
rm CLAUDE_ORIGINAL.md
```

## Important

- **Don't do normal development work on the rebuild branch.** The lightweight CLAUDE.md doesn't have the safety rails for complex refactoring.
- **Each session should be one commit (or a few).** Keep the git history clean for easy rollback.
- **If a session goes wrong,** just `git reset --hard HEAD` to undo that session's work and try again.
