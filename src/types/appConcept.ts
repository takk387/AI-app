/**
 * Type definitions for App Concept and Implementation Planning
 */

import type { LayoutDesign } from './layoutDesign';

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
