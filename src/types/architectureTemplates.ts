/**
 * Type definitions for Architecture Templates
 * Pre-built application patterns for accelerated development
 */

/**
 * Template category classification
 */
export type TemplateCategory = 'admin' | 'commerce' | 'content' | 'marketing' | 'saas';

/**
 * Complexity level of a template
 */
export type TemplateComplexity = 'simple' | 'moderate' | 'complex';

/**
 * Layout structure types
 */
export type LayoutType = 'sidebar' | 'topnav' | 'minimal' | 'split';

/**
 * Component priority for a template
 */
export type ComponentPriority = 'core' | 'optional';

/**
 * Architecture template metadata for display in selector
 */
export interface ArchitectureTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: TemplateCategory;
  features: string[];
  preview?: string;
  complexity: TemplateComplexity;
  estimatedComponents: number;
}

/**
 * Component definition within a template
 */
export interface TemplateComponent {
  name: string;
  description: string;
  priority: ComponentPriority;
}

/**
 * Layout structure definition
 */
export interface LayoutStructure {
  type: LayoutType;
  regions: string[];
}

/**
 * Technical requirements for a template
 */
export interface TemplateTechnicalRequirements {
  needsAuth: boolean;
  needsDatabase: boolean;
  needsAPI: boolean;
  needsFileUpload: boolean;
}

/**
 * Complete template definition with all details
 */
export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  basePrompt: string;
  requiredFeatures: string[];
  suggestedFeatures: string[];
  layoutStructure: LayoutStructure;
  components: TemplateComponent[];
  technicalRequirements: TemplateTechnicalRequirements;
}

/**
 * Full template data combining metadata and definition
 */
export interface FullTemplate
  extends ArchitectureTemplate, Omit<TemplateDefinition, 'id' | 'name' | 'description'> {}

/**
 * Template filter options for the selector
 */
export interface TemplateFilterOptions {
  category?: TemplateCategory;
  complexity?: TemplateComplexity;
  searchQuery?: string;
}
