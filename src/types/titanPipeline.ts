/**
 * Titan Pipeline Types
 * Includes: Vision DNA, Physics, Assets, and UI State Management
 */

import type { AppFile } from '@/types/railway';

// ============================================================================
// UI & STATE MANAGEMENT TYPES
// ============================================================================

export type PipelineStepName =
  | 'routing'
  | 'surveying'
  | 'architecting'
  | 'physicist'
  | 'photographer'
  | 'assembling';

export type PipelineStepStatus = 'idle' | 'running' | 'completed' | 'error';

export const PIPELINE_STEP_LABELS: Record<PipelineStepName, string> = {
  routing: 'Analyzing Intent',
  surveying: 'Reverse Engineering UI',
  architecting: 'Building Structure',
  physicist: 'Extracting Motion',
  photographer: 'Generating Material Assets',
  assembling: 'Synthesizing Code',
};

export interface PipelineProgress {
  currentStep: PipelineStepName;
  status: PipelineStepStatus;
  steps: Record<PipelineStepName, { status: PipelineStepStatus; message?: string }>;
}

export const createInitialProgress = (): PipelineProgress => ({
  currentStep: 'routing',
  status: 'idle',
  steps: {
    routing: { status: 'idle' },
    surveying: { status: 'idle' },
    architecting: { status: 'idle' },
    physicist: { status: 'idle' },
    photographer: { status: 'idle' },
    assembling: { status: 'idle' },
  },
});

// ============================================================================
// INSPECTOR BRIDGE TYPES (used by inspectorBridge.ts + LayoutCanvas)
// ============================================================================

/** Message sent from inspector script in Sandpack iframe to parent */
export interface InspectorMessage {
  type: 'COMPONENT_SELECTED';
  /** data-id attribute value */
  id: string;
  /** HTML tag name */
  tagName: string;
  /** outerHTML of the selected element */
  outerHTML: string;
  /** Bounding rect relative to iframe viewport */
  rect: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
}

/** State returned by the useInspectorBridge hook */
export interface InspectorBridgeState {
  /** ID of the currently selected component (data-id value) */
  selectedComponentId: string | null;
  /** outerHTML of the selected component */
  selectedHTML: string | null;
  /** Tag name of the selected component */
  selectedTagName: string | null;
  /** Bounding rect for positioning FloatingEditBubble */
  selectedRect: { top: number; left: number; width: number; height: number } | null;
  /** Clear selection */
  clearSelection: () => void;
}

// ============================================================================
// INPUT / CONTEXT TYPES
// ============================================================================

/** App context passed from the global store for personalized generation */
export interface AppContext {
  // Core identity
  name?: string;
  description?: string;
  purpose?: string;
  targetUsers?: string;

  // UI preferences
  colorScheme?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  style?: string;
  layout?: 'single-page' | 'multi-page' | 'dashboard' | 'custom';
  borderRadius?: string;
  shadowIntensity?: string;
  fontFamily?: string;
  spacing?: string;

  // Features & structure
  coreFeatures?: Array<{ id: string; name: string; description: string; priority: string }>;
  needsAuth?: boolean;
  needsDatabase?: boolean;
  needsRealtime?: boolean;
  needsFileUpload?: boolean;
  roles?: Array<{ name: string; capabilities: string[] }>;
  workflows?: Array<{ name: string; steps: string[]; involvedRoles: string[] }>;
}

export interface FileInput {
  filename: string;
  mimeType: string;
  base64: string;
}

export interface PipelineInput {
  files: FileInput[];
  instructions: string;
  currentCode: string | null;
  appContext?: AppContext;
}

// ============================================================================
// CANVAS & IMAGE METADATA (measured from source images)
// ============================================================================

/** Measured canvas dimensions from the source image, used throughout pipeline */
export interface CanvasConfig {
  width: number;
  height: number;
  source: 'measured' | 'fallback';
  aspectRatio: number;
}

/** Raw image metadata extracted via Sharp before any processing */
export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
}

/** Default canvas used only when image metadata extraction fails */
export const FALLBACK_CANVAS: CanvasConfig = {
  width: 1440,
  height: 900,
  source: 'fallback',
  aspectRatio: 1440 / 900,
};

// ============================================================================
// PIPELINE LOGIC TYPES
// ============================================================================

export interface VisualManifest {
  file_index: number;
  /** Original image reference for multimodal Builder input */
  originalImageRef?: {
    fileUri: string;
    mimeType: string;
  };
  canvas?: {
    width: number;
    height: number;
    background?: string;
  };
  global_theme?: {
    colors?: string[];
    fonts?: string[];
    gradients?: Array<{ type: string; css: string; usage: string }>;
    effects?: { glassmorphism?: boolean; neumorphism?: boolean; animations?: string[] };
    dom_tree?: {
      type: string;
      id?: string;
      styles?: Record<string, string>;
      children?: any[];
      text?: string;
      // Icon fields
      hasIcon?: boolean;
      iconSvgPath?: string;
      iconViewBox?: string;
      iconName?: string;
      iconColor?: string;
      iconPosition?: string;
      iconSize?: string;
      iconContainerStyle?: Record<string, string>;
      interactionStates?: {
        hover?: Record<string, string>;
        active?: Record<string, string>;
        focus?: Record<string, string>;
      };
    };
    assets?: string[];
  };
  measured_components: Array<{
    type: string;
    text?: string;
    box: { x: number; y: number; w: number; h: number };
    colors?: string[];
  }>;
}

export interface MotionPhysics {
  component_motions: Array<{
    id: string;
    velocity: { x: number; y: number };
    mass: number;
    spring: { stiffness: number; damping: number };
  }>;
}

export interface ComponentStructure {
  layout_strategy: 'flex' | 'grid' | 'absolute';
  tree: Array<{
    type: string;
    id: string;
    props: Record<string, any>;
    children?: any[];
  }>;
}

export interface MergeStrategy {
  mode: 'CREATE' | 'MERGE' | 'EDIT' | 'GENERATE';
  base_source: 'codebase' | 'file_0' | null;
  file_roles: string[];
  execution_plan: {
    measure_pixels: number[];
    extract_physics: number[];
    preserve_existing_code: boolean;
    generate_assets?: Array<{
      name: string;
      description: string;
      vibe?: string;
      type?: 'texture' | 'image' | 'icon';
      source?: 'text_only' | 'reference_image';
    }>;
  };
}

// ============================================================================
// RESULTS
// ============================================================================

export interface PipelineResult {
  files: AppFile[];
  strategy: MergeStrategy;
  manifests: VisualManifest[];
  physics: MotionPhysics | null;
  warnings: string[];
  stepTimings: Record<string, number>;
}

export interface LiveEditResult {
  success: boolean;
  modifiedCode?: string;
  error?: string;
  updatedCode?: string;
}
