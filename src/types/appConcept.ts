/**
 * Type definitions for App Concept and Implementation Planning
 */

import type { LayoutDesign } from './layoutDesign';
import type { ArchitectureSpec } from './architectureSpec';
import { LayoutManifest } from '@/types/schema';
import type { FinalValidatedArchitecture } from '@/types/dualPlanning';

export interface AppConcept {
  // Basic Information
  name: string;
  description: string;
  purpose: string;
  targetUsers: string;

  // Features
  coreFeatures: Feature[];

  // UI/UX
  uiPreferences: UIPreferences;

  // Technical Requirements
  technical: TechnicalRequirements;

  // User Roles & Workflows (preserved from wizard conversation)
  roles?: UserRole[];
  workflows?: Workflow[];

  // Full conversation context for rich detail preservation
  conversationContext?: string;

  // Layout Design (from Layout Builder)
  layoutDesign?: LayoutDesign;

  // Backend Architecture (from BackendArchitectureAgent)
  architectureSpec?: ArchitectureSpec;

  // Layout Manifest (from Gemini 3 Layout Builder)
  layoutManifest?: LayoutManifest;

  // Dual AI Architecture Planning result
  dualArchitectureResult?: FinalValidatedArchitecture;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface Feature {
  id: string;
  name: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  dependencies?: string[]; // IDs of features this depends on
}

export interface UIPreferences {
  style: 'modern' | 'minimalist' | 'playful' | 'professional' | 'custom';
  colorScheme: 'light' | 'dark' | 'auto' | 'custom';
  primaryColor?: string;
  layout: 'single-page' | 'multi-page' | 'dashboard' | 'custom';
  inspiration?: string; // URL or description
  referenceMedia?: {
    type: 'image' | 'video';
    url: string;
    name: string;
  }[];

  // Layout Builder integration fields
  layoutDesignId?: string; // Reference to full LayoutDesign
  secondaryColor?: string;
  accentColor?: string;
  borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  shadowIntensity?: 'none' | 'subtle' | 'medium' | 'strong';
  fontFamily?: string;
  spacing?: 'compact' | 'normal' | 'relaxed';
}

export interface TechnicalRequirements {
  needsAuth: boolean;
  authType?: 'simple' | 'email' | 'oauth';
  needsDatabase: boolean;
  dataModels?: DataModel[];
  needsAPI: boolean;
  apiEndpoints?: string[];
  needsFileUpload: boolean;
  needsRealtime: boolean;

  // State Management & Memory Requirements
  stateComplexity?: 'simple' | 'moderate' | 'complex';
  needsStateHistory?: boolean; // Undo/redo, action history, draft autosave
  needsContextPersistence?: boolean; // Cross-session memory, conversation history, user preferences
  needsCaching?: boolean; // Performance caching layer, memoization
  needsOfflineSupport?: boolean; // Offline-first, service workers, local sync

  // Internationalization
  needsI18n?: boolean; // Multi-language support
  i18nLanguages?: string[]; // e.g., ['en', 'es', 'fr', 'de']

  // Backend Scalability & Infrastructure (added via Fix 1)
  scale?: 'small' | 'medium' | 'large' | 'enterprise';
  expectedUsers?: string; // "100", "10k", "1M+"
  hostingPreference?: 'vercel' | 'aws' | 'gcp' | 'self-hosted';
  complianceNeeds?: string[]; // ['GDPR', 'HIPAA', 'SOC2']
  integrationsNeeded?: string[]; // ['Stripe', 'SendGrid', 'Twilio']
  performanceRequirements?: {
    latencySLA?: string; // "< 200ms"
    uptimeSLA?: string; // "99.9%"
  };

  // Tech Stack Preferences (Fix 2)
  preferredDatabase?: 'sqlite' | 'postgresql' | 'mysql' | 'mongodb';
  preferredAuth?: 'nextauth' | 'clerk' | 'auth0' | 'supabase';
  preferredApiStyle?: 'rest' | 'graphql' | 'trpc';
  preferredOrm?: 'prisma' | 'drizzle' | 'typeorm';
}

export interface DataModel {
  name: string;
  fields: DataField[];
}

export interface DataField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  required: boolean;
}

/**
 * User role captured during wizard conversation
 * Preserves role-based access and capabilities
 */
export interface UserRole {
  name: string;
  capabilities: string[];
  permissions?: string[];
}

/**
 * Workflow captured during wizard conversation
 * Describes multi-step processes in the app
 */
export interface Workflow {
  name: string;
  description?: string;
  steps: string[];
  involvedRoles: string[];
}

export interface ImplementationPlan {
  concept: AppConcept;
  phases: BuildPhase[];
  estimatedSteps: number;
  createdAt: string;
}

export interface BuildPhase {
  id: string;
  phaseNumber: number;
  name: string;
  description: string;
  objectives: string[];
  prompt: string; // The prompt to send to AI
  dependencies: string[]; // IDs of phases that must complete first
  features: string[]; // Feature IDs this phase implements
  estimatedComplexity: 'simple' | 'moderate' | 'complex';
  status: 'pending' | 'in-progress' | 'completed' | 'skipped';
  notes?: string;
  estimatedHours?: number;
  result?: {
    code?: string;
    componentName?: string;
    completedAt?: string;
    actualHours?: number;
    filesCreated?: string[];
  };
}

export interface BuildProgress {
  planId: string;
  currentPhase: number;
  completedPhases: string[];
  totalPhases: number;
  percentComplete: number;
  startedAt: string;
  lastUpdated: string;
}
