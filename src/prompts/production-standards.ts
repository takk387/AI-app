/**
 * Production Standards for AI Code Generation
 *
 * These standards ensure generated apps include production-ready features:
 * - ErrorBoundary for graceful error handling
 * - Accessibility (semantic HTML, ARIA, keyboard navigation)
 * - SEO meta tags
 * - Modern state management patterns
 * - Modern data fetching patterns
 */

/**
 * Comprehensive production standards included in all app generation prompts.
 * Ensures generated apps are production-ready, not just demo-ready.
 */
export const PRODUCTION_STANDARDS_COMPRESSED = `
## REQUIRED PRODUCTION FEATURES

Every generated app MUST include these production features. These are not optional.

### 1. ErrorBoundary (REQUIRED)
- Wrap the main App component in an ErrorBoundary
- ErrorBoundary must catch React errors and display a fallback UI
- Include a "Try Again" button that resets the error state
- Log errors to console with component stack for debugging
- See ERROR_BOUNDARY_TEMPLATE below for implementation

### 2. Accessibility (REQUIRED)
**Semantic HTML:**
- Use <nav> for navigation, <main> for main content, <footer> for footer
- Use <section> and <article> for content areas, <aside> for sidebars
- Use <header> for page/section headers
- Use <button> for clickable actions, <a> for navigation links
- Heading hierarchy: h1 > h2 > h3 (don't skip levels)

**ARIA & Keyboard:**
- Add aria-label to icon-only buttons and links
- Add aria-labelledby or aria-describedby for form fields with descriptions
- All interactive elements must be keyboard accessible (Tab, Enter, Escape)
- Visible focus indicators on all focusable elements (focus:ring-2)
- Add role="alert" or aria-live="polite" for dynamic status messages

**Focus Management:**
- Return focus to trigger element when closing modals
- Skip links for keyboard users: <a href="#main" className="sr-only focus:not-sr-only">Skip to content</a>

### 3. SEO Meta Tags (REQUIRED for full-stack apps)
Include in the root layout or head:
- <title>{App Name} - {Brief Description}</title>
- <meta name="description" content="{2-3 sentence description}" />
- <meta name="viewport" content="width=device-width, initial-scale=1" />
- Open Graph tags for social sharing:
  - <meta property="og:title" content="{App Name}" />
  - <meta property="og:description" content="{Description}" />
  - <meta property="og:type" content="website" />

### 4. State Management Patterns
For apps with shared state across components:
- Recommend Zustand for state management: import { create } from 'zustand'
- Use shallow comparison for selectors to prevent unnecessary re-renders
- Initialize all state with appropriate defaults
- Example pattern:
  const useStore = create((set) => ({
    items: [],
    addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  }))

### 5. Data Fetching Patterns
For apps that fetch data:
- Show loading state (spinner or skeleton) while fetching
- Show error state with retry option on failure
- Handle empty states with helpful messages
- Consider SWR or React Query patterns for caching and revalidation
- Example pattern:
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
`.trim();

/**
 * ErrorBoundary component template to include in generated apps.
 * This is a class component as required by React's error boundary API.
 */
export const ERROR_BOUNDARY_TEMPLATE = `
// ErrorBoundary.tsx - INCLUDE IN EVERY APP
import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Application Error:', error);
    console.error('Component Stack:', errorInfo.componentStack);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md text-center">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-600 mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;

// Usage in App.tsx:
// import ErrorBoundary from './components/ErrorBoundary';
// export default function App() {
//   return (
//     <ErrorBoundary>
//       <YourAppContent />
//     </ErrorBoundary>
//   );
// }
`.trim();

/**
 * Minimal production standards for token-constrained contexts.
 * Use when full standards would exceed token budget.
 */
export const PRODUCTION_STANDARDS_MINIMAL = `
## REQUIRED: Production Features

1. **ErrorBoundary**: Wrap App in ErrorBoundary component with fallback UI and "Try Again" button
2. **Semantic HTML**: Use nav, main, section, footer, article, aside (not just divs)
3. **ARIA**: Add aria-label to icon buttons, aria-live for dynamic content
4. **Keyboard**: All interactive elements focusable, visible focus rings
5. **SEO**: Include <title> and <meta name="description">
6. **Loading States**: Show spinner/skeleton during data fetching
7. **Error States**: Show error message with retry option on failures
`.trim();

/**
 * Get production standards appropriate for the context.
 * @param includeTemplate Whether to include the full ErrorBoundary template
 * @param minimal Whether to use minimal version for token constraints
 */
export function getProductionStandards(
  includeTemplate: boolean = false,
  minimal: boolean = false
): string {
  if (minimal) {
    return PRODUCTION_STANDARDS_MINIMAL;
  }

  let standards = PRODUCTION_STANDARDS_COMPRESSED;

  if (includeTemplate) {
    standards += '\n\n## ERROR_BOUNDARY_TEMPLATE\n```tsx\n' + ERROR_BOUNDARY_TEMPLATE + '\n```';
  }

  return standards;
}
