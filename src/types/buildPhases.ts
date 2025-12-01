/**
 * Type definitions for Phase-Driven Build System
 * Structures complex application generation into manageable phases
 */

// Phase IDs as a union type for type safety
export type PhaseId = 'foundation' | 'features' | 'integration' | 'optimization' | 'polish';

// Status types for phases and tasks
export type PhaseStatus = 'pending' | 'in-progress' | 'completed' | 'skipped';
export type TaskStatus = 'pending' | 'completed' | 'failed';
export type ValidationType = 'render' | 'console' | 'functionality' | 'performance';

/**
 * Validation check for a phase
 */
export interface ValidationCheck {
  id: string;
  name: string;
  type: ValidationType;
  passed: boolean;
  message?: string;
}

/**
 * Individual task within a phase
 */
export interface PhaseTask {
  id: string;
  name: string;
  description: string;
  status: TaskStatus;
  generatedCode?: string;
  errors?: string[];
}

/**
 * Build phase configuration
 */
export interface BuildPhase {
  id: PhaseId;
  name: string;
  description: string;
  order: number;
  status: PhaseStatus;
  estimatedTime: string;
  tasks: PhaseTask[];
  validationChecks: ValidationCheck[];
}

/**
 * Result of executing a phase
 */
export interface PhaseResult {
  phaseId: PhaseId;
  success: boolean;
  tasksCompleted: number;
  totalTasks: number;
  generatedCode?: string;
  errors?: string[];
  warnings?: string[];
  duration: number; // milliseconds
}

/**
 * Result of validating a phase
 */
export interface ValidationResult {
  phaseId: PhaseId;
  passed: boolean;
  checks: ValidationCheck[];
  canProceed: boolean;
  warnings?: string[];
}

/**
 * Overall build progress
 */
export interface BuildProgress {
  currentPhaseId: PhaseId | null;
  currentPhaseIndex: number;
  totalPhases: number;
  completedPhases: PhaseId[];
  percentComplete: number;
  estimatedTimeRemaining: string;
  startedAt: string;
  lastUpdated: string;
}

/**
 * Phase prompt configuration for AI generation
 */
export interface PhasePromptConfig {
  phaseId: PhaseId;
  focus: string;
  generates: string[];
  validation: string[];
  restrictions: string[];
}

/**
 * App concept for phase building (extends existing AppConcept)
 */
export interface PhasedAppConcept {
  name: string;
  description: string;
  appType: string;
  features: string[];
  uiStyle?: string;
  colorScheme?: string;
  complexity: 'simple' | 'moderate' | 'complex';
}

/**
 * Default phase configurations
 */
export const DEFAULT_PHASES: Omit<BuildPhase, 'tasks' | 'validationChecks'>[] = [
  {
    id: 'foundation',
    name: 'Foundation',
    description: 'Core structure, routing, layout',
    order: 1,
    status: 'pending',
    estimatedTime: '2-3 min',
  },
  {
    id: 'features',
    name: 'Features',
    description: 'Core features, components, state management',
    order: 2,
    status: 'pending',
    estimatedTime: '3-5 min',
  },
  {
    id: 'integration',
    name: 'Integration',
    description: 'Data flow, API connections, persistence',
    order: 3,
    status: 'pending',
    estimatedTime: '3-5 min',
  },
  {
    id: 'optimization',
    name: 'Optimization',
    description: 'Performance, bundle size, accessibility',
    order: 4,
    status: 'pending',
    estimatedTime: '2-3 min',
  },
  {
    id: 'polish',
    name: 'Polish',
    description: 'Animations, final touches, documentation',
    order: 5,
    status: 'pending',
    estimatedTime: '2-3 min',
  },
];

/**
 * Phase focus areas for validation
 */
export const PHASE_FOCUS_AREAS: Record<PhaseId, string[]> = {
  foundation: [
    'Project structure and file organization',
    'Base layout components (header, footer, sidebar)',
    'Routing configuration',
    'Global styles and theme setup',
    'Core type definitions',
    'Basic error boundaries',
  ],
  features: [
    'Feature-specific components',
    'State management setup (context/hooks)',
    'Form components with validation',
    'Data display components (tables, lists, cards)',
    'Modal and dialog systems',
    'Loading and error states',
  ],
  integration: [
    'API service layer',
    'Data fetching hooks',
    'Caching strategies',
    'Error handling for async operations',
    'Authentication integration (if needed)',
    'Database schema (if full-stack)',
  ],
  optimization: [
    'Code splitting setup',
    'Lazy loading for routes/components',
    'Image optimization',
    'Memoization where beneficial',
    'Accessibility improvements (ARIA, keyboard nav)',
    'SEO meta tags',
  ],
  polish: [
    'Micro-interactions and animations',
    'Loading skeletons',
    'Empty states',
    'Success/error feedback',
    'README and documentation',
    'Final cleanup and formatting',
  ],
};

/**
 * Validation criteria for each phase
 */
export const PHASE_VALIDATION_CRITERIA: Record<PhaseId, string[]> = {
  foundation: [
    'Layout renders correctly',
    'Navigation works',
    'No console errors',
  ],
  features: [
    'All features are accessible',
    'State updates correctly',
    'Forms validate properly',
  ],
  integration: [
    'Data flows correctly',
    'Error states handled',
    'Auth works (if applicable)',
  ],
  optimization: [
    'Performance metrics acceptable',
    'Lighthouse accessibility score',
    'No layout shifts',
  ],
  polish: [
    'Animations smooth',
    'All states have feedback',
    'Documentation complete',
  ],
};
