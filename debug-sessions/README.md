# Debug Loop - Automated Claude-to-Claude Debugging

Eliminates the manual copy-paste loop between Claude in Chrome and Claude in Antigravity.

## How It Works

```
You find bug in browser
        |
        v
Paste findings into findings.md
        |
        v
Run: node scripts/debug-loop.js
        |
        v
[Browser Analyst Claude] <--debate--> [Code Reviewer Claude]
        |                                      |
        +----------> consensus? <--------------+
                        |
                        v
              Final fix-plan.md
                        |
                        v
        Paste into Antigravity OR use --auto-fix
```

## Quick Start

1. Find a bug using Claude in Chrome
2. Copy the findings
3. Paste into `debug-sessions/findings.md`
4. Run:
   ```bash
   node scripts/debug-loop.js
   ```
5. Review `debug-sessions/fix-plan.md`
6. Paste the fix plan into Antigravity's Claude sidebar

## Options

| Flag                | Description                      | Default                      |
| ------------------- | -------------------------------- | ---------------------------- |
| `--max-rounds <n>`  | Max debate rounds                | 4                            |
| `--findings <path>` | Custom findings file             | `debug-sessions/findings.md` |
| `--auto-fix`        | Auto-apply fixes via Claude Code | Off                          |

## Examples

```bash
# Standard debug loop
node scripts/debug-loop.js

# Quick 2-round analysis
node scripts/debug-loop.js --max-rounds 2

# Full auto - debate + apply fixes
node scripts/debug-loop.js --auto-fix

# Use a different findings file
node scripts/debug-loop.js --findings ./my-bug-report.md
```

## Output Files

| File            | Description                                      |
| --------------- | ------------------------------------------------ |
| `findings.md`   | Your input - paste Chrome Claude's findings here |
| `debate-log.md` | Full transcript of the analyst/reviewer debate   |
| `fix-plan.md`   | Final consensus fix plan (feed to Antigravity)   |
| `fix-result.md` | Results from auto-fix mode (if used)             |

## Requirements

- Claude Code CLI installed and authenticated (`claude` command available)
- Node.js 18+
