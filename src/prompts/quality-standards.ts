/**
 * Quality Standards for AI Code Generation
 *
 * These standards are injected into generation prompts to ensure
 * production-ready code is generated on the first pass.
 */

/**
 * Comprehensive quality standards included in all full-app generation prompts.
 * Ensures Claude generates production-ready code without requiring follow-up fixes.
 */
export const CODE_QUALITY_STANDARDS = `
## MANDATORY CODE QUALITY STANDARDS

Generate production-ready code that follows these standards. Violations will be flagged by automated review.

### React Best Practices (CRITICAL)
- NEVER call hooks inside conditions, loops, or nested functions
- ALWAYS add key prop to elements rendered in .map() - use item.id or unique identifier, NOT array index
- ALWAYS include ALL dependencies in useEffect/useCallback/useMemo dependency arrays
- NEVER create inline functions in JSX props for components that re-render frequently
  BAD: onClick={() => handleClick(id)}
  GOOD: Extract to useCallback with proper dependencies

### Performance Requirements
- MOVE inline objects/arrays outside components or wrap in useMemo when passed as props
- MEMOIZE expensive operations (.filter().map().sort()) with useMemo
- USE React.memo for pure components receiving multiple props from frequently re-rendering parents
- AVOID creating new object/array references on every render

### Security (CRITICAL)
- NEVER use dangerouslySetInnerHTML without DOMPurify or equivalent sanitization
- NEVER use eval(), new Function(), or setTimeout/setInterval with string arguments
- NEVER interpolate user input directly into href, src, or other URL attributes without validation
- ESCAPE all user-generated content before display

### Code Completeness
- NO console.log or debugger statements in generated code
- ALL async operations MUST handle loading and error states with appropriate UI feedback
- ALL forms MUST have validation with clear, user-friendly error messages
- ALL functions that can fail MUST have try/catch with proper error handling and user feedback
- ALL API calls MUST handle network errors gracefully

### TypeScript Standards
- NO \`any\` types - use proper typing or \`unknown\` with type guards
- DEFINE interfaces for ALL component props
- HANDLE undefined/null cases explicitly with optional chaining (?.) or nullish coalescing (??)
- USE proper generic types for collections and utility functions

### State Management
- INITIALIZE all state with appropriate default values
- AVOID redundant state - derive values when possible
- USE controlled components for form inputs
- CLEAN UP side effects (subscriptions, timers) in useEffect return functions

### Production Features (REQUIRED)
- WRAP main App component in ErrorBoundary with fallback UI and retry button
- USE semantic HTML elements: nav, main, section, article, aside, footer (not just divs)
- ADD aria-label to icon-only buttons and interactive elements without visible text
- ENSURE all interactive elements are keyboard accessible (Tab, Enter, Escape)
- INCLUDE visible focus indicators on focusable elements (focus:ring-2 or equivalent)
- ADD <title> and <meta name="description"> for SEO
- SHOW loading states (spinner or skeleton) for all async operations
- HANDLE errors gracefully with user-friendly messages and retry options
`.trim();

/**
 * Critical-only quality rules for token-constrained contexts.
 * Use when full standards would exceed token budget.
 */
export const CRITICAL_QUALITY_RULES = `
## CRITICAL CODE QUALITY RULES

### React (violations cause runtime errors)
- Never call hooks conditionally or in loops
- Always add key prop to .map() renders (use id, not index)
- Include all dependencies in useEffect/useCallback/useMemo arrays

### Security (violations create vulnerabilities)
- Never use dangerouslySetInnerHTML without sanitization
- Never use eval() or new Function()
- Escape user content before display

### Completeness
- No console.log statements
- Handle loading and error states for async operations
- Validate form inputs
`.trim();

/**
 * Get phase-specific quality rules based on the domain/category of work.
 */
export function getPhaseQualityRules(domain: string): string {
  const rules: string[] = [];

  switch (domain.toLowerCase()) {
    case 'auth':
    case 'authentication':
      rules.push('- Never expose secrets, tokens, or API keys in client-side code');
      rules.push('- Validate all auth inputs server-side');
      rules.push('- Use httpOnly cookies for session tokens when possible');
      rules.push('- Implement proper password strength validation');
      break;

    case 'form':
    case 'forms':
      rules.push('- Include client-side validation with clear error messages');
      rules.push('- Handle form submission loading state');
      rules.push('- Disable submit button during submission');
      rules.push('- Show success/error feedback after submission');
      break;

    case 'data':
    case 'database':
    case 'api':
      rules.push('- Handle loading, error, and empty states');
      rules.push('- Implement optimistic updates where appropriate');
      rules.push('- Add proper error boundaries');
      rules.push('- Use parameterized queries to prevent injection');
      break;

    case 'ui':
    case 'component':
    case 'components':
      rules.push('- Extract event handlers to useCallback when passed to child components');
      rules.push('- Memoize expensive computations');
      rules.push('- Use semantic HTML elements');
      rules.push('- Include proper ARIA attributes for accessibility');
      break;

    default:
      // No additional rules for unknown domains
      break;
  }

  if (rules.length === 0) {
    return '';
  }

  return `\n## Phase-Specific Quality Requirements\n${rules.join('\n')}`;
}
