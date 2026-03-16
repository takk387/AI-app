# AI App Builder — Rebuild Mode

You are working on the Builder page rebuild. Read your assigned session briefing in `docs/rebuild/` and build exactly what it says.

## Rules

1. Read your session briefing. It tells you what to build, what files to read, and how to verify.
2. Use `useBuilder()` for all data in components. No direct store access. No prop drilling.
3. CSS variables for all colors. Tailwind for layout only. See the theme table in your briefing.
4. Toast feedback for every user action. No silent failures.
5. Run `npm run typecheck` and `npm run lint` when done.
6. Don't modify files outside your session scope.
7. Don't read MASTER_CONTEXT_VERIFIED.md or any other large docs. Your briefing has everything you need.

## Tech Stack

Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Zustand (with Immer), Sandpack + Nodebox for preview.

## Theme Table

| Instead of         | Use                                              |
| ------------------ | ------------------------------------------------ |
| `bg-slate-900`     | `style={{ background: 'var(--bg-primary)' }}`    |
| `bg-slate-800`     | `style={{ background: 'var(--bg-secondary)' }}`  |
| `bg-slate-700`     | `style={{ background: 'var(--bg-tertiary)' }}`   |
| `text-white`       | `style={{ color: 'var(--text-primary)' }}`       |
| `text-slate-400`   | `style={{ color: 'var(--text-muted)' }}`         |
| `text-slate-300`   | `style={{ color: 'var(--text-secondary)' }}`     |
| `border-white/10`  | `style={{ borderColor: 'var(--border-color)' }}` |
| `border-slate-700` | `style={{ borderColor: 'var(--border-light)' }}` |

## Import Aliases

Always use `@/` imports: `import { useAppStore } from '@/store/useAppStore'`
