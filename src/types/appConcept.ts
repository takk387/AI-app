/**
 * Type definitions for App Concept and Implementation Planning
 */

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
