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
 * Form UX standards for polished form handling.
 * Ensures forms have proper validation, feedback, and user experience.
 */
export const FORM_UX_STANDARDS = `
## FORM UX REQUIREMENTS

### Real-time Validation
- Validate on blur (first touch) then on change (subsequent edits)
- Show inline errors below fields immediately
- Use aria-invalid and aria-describedby for accessibility

### Form Field Pattern
\`\`\`tsx
const [value, setValue] = useState('');
const [error, setError] = useState<string | null>(null);
const [touched, setTouched] = useState(false);

const validate = (val: string) => {
  if (!val.trim()) { setError('This field is required'); return false; }
  setError(null); return true;
};

<div>
  <label htmlFor="email" className="block text-sm font-medium">
    Email <span className="text-red-500" aria-hidden="true">*</span>
  </label>
  <input
    id="email"
    type="email"
    value={value}
    onChange={(e) => { setValue(e.target.value); if (touched) validate(e.target.value); }}
    onBlur={() => { setTouched(true); validate(value); }}
    aria-invalid={!!error}
    aria-describedby={error ? "email-error" : undefined}
    aria-required="true"
    className={\`border rounded px-3 py-2 w-full \${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'} focus:outline-none focus:ring-2\`}
  />
  {error && <p id="email-error" className="text-red-500 text-sm mt-1" role="alert">{error}</p>}
</div>
\`\`\`

### Submit Button States
- Disable during submission: disabled={isSubmitting}
- Show spinner during submit: {isSubmitting ? <Spinner /> : 'Submit'}
- Prevent double-submit with form onSubmit handler

### Toast Feedback Pattern
\`\`\`tsx
const [toast, setToast] = useState<{type: 'success'|'error', message: string} | null>(null);

// Show toast after action:
setToast({ type: 'success', message: 'Saved successfully!' });
setTimeout(() => setToast(null), 3000);

// Render toast (add to component JSX):
{toast && (
  <div
    className={\`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 \${
      toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
    } text-white\`}
    role="alert"
    aria-live="polite"
  >
    {toast.message}
  </div>
)}
\`\`\`

### Error Recovery
- Show retry button on failed submissions
- Preserve form data on errors (don't clear fields)
- Clear form only on successful submission
`.trim();

/**
 * Security hardening standards for generated apps.
 * Ensures apps have proper input sanitization, CSRF protection, and secure defaults.
 */
export const SECURITY_HARDENING_STANDARDS = `
## SECURITY HARDENING

### Input Sanitization
\`\`\`tsx
// For displaying user-generated content safely:
const sanitizeForDisplay = (input: string): string =>
  input.replace(/[<>&"']/g, (c) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;'
  }[c] || c));

// For URLs (validate before using in href/src):
const isSafeUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:', 'mailto:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

// Usage: <a href={isSafeUrl(userUrl) ? userUrl : '#'}>Link</a>
\`\`\`

### CSRF Protection (Full-stack apps)
- Include CSRF token in forms that mutate data
- Validate tokens server-side before processing
- Use SameSite=Strict for session cookies

### Rate Limiting Pattern (API Routes)
\`\`\`tsx
// Simple rate limiter for API routes (use Redis in production):
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) return false;
  record.count++;
  return true;
}

// Usage in API route:
// if (!checkRateLimit(request.ip)) {
//   return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
// }
\`\`\`

### Secure Headers (next.config.js for full-stack)
\`\`\`js
// Add to next.config.js:
const nextConfig = {
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    }];
  },
};
\`\`\`

### Secure Defaults
- Use httpOnly cookies for sensitive tokens
- Set Secure flag on cookies in production
- Never log sensitive data (passwords, tokens, API keys)
- Validate and sanitize all user inputs on both client and server
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
