/**
 * Phase-specific AI prompts for the phase-driven build system
 * Each phase has focused prompts that generate specific parts of the application
 */

import type { PhaseId, PhasedAppConcept } from '../types/buildPhases';

/** Maximum length for code context in prompts to avoid token limits */
const MAX_CODE_CONTEXT_LENGTH = 2000;

/**
 * Truncate code to a safe length for prompt context
 */
function truncateCode(code: string | undefined, maxLength: number = MAX_CODE_CONTEXT_LENGTH): string {
  if (!code) return '';
  if (code.length <= maxLength) return code;
  return `${code.substring(0, maxLength)}...`;
}

/**
 * Generate the prompt for a specific build phase
 */
export function getPhasePrompt(
  phaseId: PhaseId,
  concept: PhasedAppConcept,
  existingCode?: string
): string {
  const baseContext = `
You are building a ${concept.appType} application called "${concept.name}".
Description: ${concept.description}
Features: ${concept.features.join(', ')}
UI Style: ${concept.uiStyle || 'modern'}
Color Scheme: ${concept.colorScheme || 'auto'}
`.trim();

  const prompts: Record<PhaseId, string> = {
    foundation: getFoundationPrompt(concept, baseContext),
    features: getFeaturesPrompt(concept, baseContext, existingCode),
    integration: getIntegrationPrompt(concept, baseContext, existingCode),
    optimization: getOptimizationPrompt(concept, baseContext, existingCode),
    polish: getPolishPrompt(concept, baseContext, existingCode),
  };

  return prompts[phaseId];
}

/**
 * Phase 1: Foundation
 * Focus: Core structure, routing, layout
 */
function getFoundationPrompt(concept: PhasedAppConcept, baseContext: string): string {
  return `${baseContext}

## PHASE 1: FOUNDATION

Generate the foundational structure for this application.

### Focus ONLY on:
1. **Project Structure**
   - File organization
   - Folder structure
   - Entry point setup

2. **Base Layout Components**
   - Header with navigation
   - Footer (if applicable)
   - Sidebar (if dashboard layout)
   - Main content area

3. **Routing Configuration**
   - Page routes
   - Navigation links
   - Active state handling

4. **Global Styles**
   - Theme setup (colors, fonts, spacing)
   - Tailwind configuration
   - CSS variables for theming
   - Dark/light mode support

5. **Core Type Definitions**
   - Main data types
   - Component prop interfaces
   - Shared utilities

6. **Error Boundaries**
   - Basic error handling
   - Fallback UI components

### DO NOT include:
- Feature implementations
- Data fetching
- API integrations
- Authentication logic
- Complex state management

### Validation Criteria:
- Layout renders correctly without errors
- Navigation works between routes
- No console errors
- Responsive design works

Generate clean, well-organized code with Tailwind CSS styling.
`.trim();
}

/**
 * Phase 2: Features
 * Focus: Core features, components, state management
 */
function getFeaturesPrompt(
  concept: PhasedAppConcept,
  baseContext: string,
  existingCode?: string
): string {
  const existingContext = existingCode
    ? `\n\n### Existing Foundation Code:\n\`\`\`\n${truncateCode(existingCode)}\n\`\`\``
    : '';

  return `${baseContext}
${existingContext}

## PHASE 2: FEATURES

Building on the foundation, implement the core features.

### Focus ONLY on:
1. **Feature-Specific Components**
${concept.features.map((f) => `   - ${f}`).join('\n')}

2. **State Management**
   - React Context for shared state
   - Custom hooks for feature logic
   - Local state for component data

3. **Form Components**
   - Input handling
   - Validation logic
   - Error messages
   - Submit handling

4. **Data Display Components**
   - Tables with sorting/filtering
   - Lists with item actions
   - Cards for data presentation
   - Grid layouts

5. **Modal and Dialog Systems**
   - Reusable modal component
   - Confirmation dialogs
   - Form modals

6. **Loading and Error States**
   - Loading skeletons
   - Error displays
   - Empty states

### DO NOT include:
- API integrations (use mock data)
- Database operations
- Authentication (unless core feature)
- Performance optimizations

### Validation Criteria:
- All features are accessible via UI
- State updates correctly on user actions
- Forms validate properly
- No runtime errors

Use TypeScript interfaces and Tailwind CSS.
`.trim();
}

/**
 * Phase 3: Integration
 * Focus: Data flow, API connections, persistence
 */
function getIntegrationPrompt(
  concept: PhasedAppConcept,
  baseContext: string,
  existingCode?: string
): string {
  const existingContext = existingCode
    ? `\n\n### Existing Code:\n\`\`\`\n${truncateCode(existingCode)}\n\`\`\``
    : '';

  return `${baseContext}
${existingContext}

## PHASE 3: INTEGRATION

Connect the features to data sources and add persistence.

### Focus ONLY on:
1. **API Service Layer**
   - API client setup
   - Endpoint definitions
   - Request/response handling
   - Error handling utilities

2. **Data Fetching Hooks**
   - Custom hooks for data operations
   - Loading states
   - Error states
   - Refetch capabilities

3. **Caching Strategies**
   - Local cache implementation
   - Cache invalidation
   - Optimistic updates

4. **Error Handling**
   - Global error handler
   - Retry logic
   - User-friendly error messages
   - Network error handling

5. **Authentication** (if needed)
   - Login/logout flow
   - Token management
   - Protected routes
   - Session handling

6. **Database Schema** (if full-stack)
   - Data models
   - Relationships
   - Migrations

### DO NOT include:
- Performance optimizations
- Analytics
- Advanced animations
- Documentation

### Validation Criteria:
- Data flows correctly between components
- Error states are properly handled
- Auth works correctly (if applicable)
- Data persists as expected

Replace mock data with actual API calls or database operations.
`.trim();
}

/**
 * Phase 4: Optimization
 * Focus: Performance, bundle size, accessibility
 */
function getOptimizationPrompt(
  concept: PhasedAppConcept,
  baseContext: string,
  existingCode?: string
): string {
  const existingContext = existingCode
    ? `\n\n### Existing Code:\n\`\`\`\n${truncateCode(existingCode)}\n\`\`\``
    : '';

  return `${baseContext}
${existingContext}

## PHASE 4: OPTIMIZATION

Optimize the application for performance and accessibility.

### Focus ONLY on:
1. **Code Splitting**
   - Dynamic imports
   - Route-based splitting
   - Component lazy loading

2. **Lazy Loading**
   - React.lazy for components
   - Suspense boundaries
   - Loading fallbacks

3. **Image Optimization**
   - Next.js Image component
   - Proper sizing
   - Format optimization
   - Lazy loading images

4. **Memoization**
   - React.memo for expensive components
   - useMemo for computed values
   - useCallback for event handlers

5. **Accessibility**
   - ARIA labels
   - Keyboard navigation
   - Focus management
   - Screen reader support
   - Color contrast

6. **SEO**
   - Meta tags
   - Open Graph tags
   - Semantic HTML
   - Structured data

### DO NOT include:
- New features
- Major UI changes
- Animation work
- Documentation

### Validation Criteria:
- Lighthouse performance score > 80
- Lighthouse accessibility score > 90
- No layout shifts (CLS < 0.1)
- Fast initial load

Apply optimizations surgically - don't break existing functionality.
`.trim();
}

/**
 * Phase 5: Polish
 * Focus: Animations, final touches, documentation
 */
function getPolishPrompt(
  concept: PhasedAppConcept,
  baseContext: string,
  existingCode?: string
): string {
  const existingContext = existingCode
    ? `\n\n### Existing Code:\n\`\`\`\n${truncateCode(existingCode)}\n\`\`\``
    : '';

  return `${baseContext}
${existingContext}

## PHASE 5: POLISH

Add final touches, animations, and documentation.

### Focus ONLY on:
1. **Micro-interactions**
   - Hover effects
   - Button animations
   - Transition effects
   - Page transitions

2. **Loading Skeletons**
   - Skeleton screens for data loading
   - Shimmer effects
   - Progressive loading indicators

3. **Empty States**
   - Helpful empty state messages
   - Call-to-action buttons
   - Illustrations (if appropriate)

4. **Feedback Systems**
   - Success messages/toasts
   - Error notifications
   - Progress indicators
   - Confirmation feedback

5. **Documentation**
   - README.md with setup instructions
   - Component documentation
   - API documentation (if applicable)
   - Usage examples

6. **Final Cleanup**
   - Code formatting
   - Remove unused code
   - Consistent naming
   - Final testing

### DO NOT include:
- New features
- Major structural changes
- Performance work (done in phase 4)

### Validation Criteria:
- Animations are smooth (60fps)
- All states have appropriate feedback
- Documentation is complete
- No console warnings or errors

Focus on user experience polish and developer documentation.
`.trim();
}

/**
 * Generate phase summary for display
 */
export function getPhaseSummary(phaseId: PhaseId): {
  title: string;
  focus: string;
  generates: string[];
  validation: string[];
} {
  const summaries: Record<PhaseId, ReturnType<typeof getPhaseSummary>> = {
    foundation: {
      title: 'Foundation',
      focus: 'Core structure, routing, layout',
      generates: [
        'Project structure',
        'Layout components',
        'Routing',
        'Global styles',
        'Type definitions',
        'Error boundaries',
      ],
      validation: [
        'Layout renders correctly',
        'Navigation works',
        'No console errors',
      ],
    },
    features: {
      title: 'Features',
      focus: 'Core features, components, state management',
      generates: [
        'Feature components',
        'State management',
        'Forms',
        'Data displays',
        'Modals',
        'Loading states',
      ],
      validation: [
        'Features accessible',
        'State updates correctly',
        'Forms validate',
      ],
    },
    integration: {
      title: 'Integration',
      focus: 'Data flow, API connections, persistence',
      generates: [
        'API service layer',
        'Data fetching hooks',
        'Caching',
        'Error handling',
        'Authentication',
        'Database schema',
      ],
      validation: [
        'Data flows correctly',
        'Errors handled',
        'Auth works',
      ],
    },
    optimization: {
      title: 'Optimization',
      focus: 'Performance, bundle size, accessibility',
      generates: [
        'Code splitting',
        'Lazy loading',
        'Image optimization',
        'Memoization',
        'Accessibility',
        'SEO',
      ],
      validation: [
        'Performance metrics',
        'Accessibility score',
        'No layout shifts',
      ],
    },
    polish: {
      title: 'Polish',
      focus: 'Animations, final touches, documentation',
      generates: [
        'Micro-interactions',
        'Loading skeletons',
        'Empty states',
        'Feedback systems',
        'Documentation',
        'Final cleanup',
      ],
      validation: [
        'Animations smooth',
        'States have feedback',
        'Docs complete',
      ],
    },
  };

  return summaries[phaseId];
}

export default {
  getPhasePrompt,
  getPhaseSummary,
};
