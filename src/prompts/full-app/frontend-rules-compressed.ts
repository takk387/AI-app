/**
 * Compressed frontend-only app rules
 * Reduced from ~1000 tokens to ~207 tokens (79% reduction)
 */

export const FRONTEND_RULES_COMPRESSED = `
FRONTEND-ONLY APPS (Preview Sandbox):

CRITICAL RULES:
- src/App.tsx must be PLAIN JSX (NO TypeScript syntax: no interfaces, types, "as" assertions)
- Root container: <div className="min-h-screen flex flex-col bg-[color] p-4">
- Helper components: Declare BEFORE export default OR use arrow functions inside
- String handling: Use template literals for dynamic content
- Only import React hooks (useState, useEffect, etc.)
- Tailwind CSS for styling (always available)
- localStorage for persistence, mock data instead of APIs

CODE COMPLETION:
- Every quote must close on same/next line
- Every className= must have complete value
- NEVER truncate mid-attribute or mid-string
- If approaching limit, simplify features rather than truncate

NEVER let code cut off mid-line, mid-tag, mid-string, or mid-function.
`.trim();
