/**
 * Prompt Builder Utility
 * Loads and combines compressed prompt sections modularly
 */

import { COMPONENT_SYNTAX_RULES } from './common/component-syntax';
import { DELIMITER_FORMAT } from './common/response-format';
import { AST_OPERATIONS_COMPRESSED } from './modify/ast-operations-compressed';
import { MODIFICATION_EXAMPLES } from './modify/examples-compressed';
import { FRONTEND_RULES_COMPRESSED } from './full-app/frontend-rules-compressed';
import { FULLSTACK_RULES_COMPRESSED } from './full-app/fullstack-rules-compressed';
import { FULLAPP_EXAMPLES_COMPRESSED } from './full-app/examples-compressed';

/**
 * Build system prompt for modify route
 * Combines: base rules + AST operations + examples
 */
export function buildModifyPrompt(baseInstructions: string): string {
  return `${baseInstructions}

${COMPONENT_SYNTAX_RULES}

${AST_OPERATIONS_COMPRESSED}

${MODIFICATION_EXAMPLES}

CRITICAL REMINDERS:
- Only JSON output (no conversational text)
- Minimal changes (surgical edits only)
- Exact searchFor patterns
- Preserve existing code unless explicitly requested
`.trim();
}

/**
 * Build system prompt for full-app route
 * Combines: base rules + frontend + fullstack + examples
 */
export function buildFullAppPrompt(
  baseInstructions: string,
  includeImageContext: boolean = false,
  isModification: boolean = false
): string {
  const imageContext = includeImageContext
    ? `
🎨 IMAGE-INSPIRED DESIGN:
Analyze uploaded image for colors, style, patterns. Apply aesthetic to app design using Tailwind CSS.
`
    : '';

  const modificationContext = isModification
    ? `
MODIFICATION MODE:
- Check conversation history for ===INTERNAL_PLAN===
- Maintain consistency with existing architecture
- Classify as MAJOR_CHANGE or MINOR_CHANGE
- Update INTERNAL_PLAN with completed features
- Use exact same delimiter format as new apps
`.trim()
    : '';

  return `${baseInstructions}
${imageContext}
${modificationContext ? '\n' + modificationContext + '\n' : ''}

${COMPONENT_SYNTAX_RULES}

${DELIMITER_FORMAT}

APPLICATION TYPE DETECTION:
- FRONTEND_ONLY: UI components, calculators, games, dashboards (preview sandbox)
- FULL_STACK: Database, auth, API routes, file uploads (local dev required)

${FRONTEND_RULES_COMPRESSED}

${FULLSTACK_RULES_COMPRESSED}

${FULLAPP_EXAMPLES_COMPRESSED}

REMEMBER:
- Complete code (never truncate mid-line/tag/string)
- Tailwind CSS for styling
- Include setup instructions
`.trim();
}

/**
 * Build system prompt for ai-builder route (single components)
 * Simpler, already optimized
 */
export function buildComponentPrompt(): string {
  return `You are an expert React/TypeScript component generator.

Rules:
1. Functional components with TypeScript
2. Include TypeScript interfaces for reusability
3. Modern React hooks (useState, useEffect) ONLY when necessary
4. Tailwind CSS for styling
5. React best practices
6. Accessible (ARIA labels, semantic HTML)

${COMPONENT_SYNTAX_RULES}

CRITICAL FOR PREVIEW:
- Default export returns PURE HTML with hardcoded values
- Include reusable component separately
- NO props in main return - use actual text values

${DELIMITER_FORMAT}

Respond with: ===NAME=== ===EXPLANATION=== ===CODE=== ===END===

CRITICAL RULES:
- Default export Demo must have ZERO curly braces with variables
- Use EXACT delimiters (===NAME===, ===EXPLANATION===, ===CODE===, ===END===)
- Do NOT wrap in markdown code blocks
- Do NOT add text before ===NAME=== or after ===END===
`.trim();
}
