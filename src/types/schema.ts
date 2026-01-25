import { z } from 'zod';

// --- TYPES ---

export type ComponentType =
  | 'container'
  | 'text'
  | 'image'
  | 'button'
  | 'input'
  | 'list'
  | 'icon'
  | 'video'
  | 'component-reference';

export interface UISpecNode {
  id: string;
  type: ComponentType;

  // SEMANTIC LAYER (For Phase Generator detection)
  semanticTag: string; // e.g., "auth-submit-btn"

  // VISUAL LAYER (For Renderer & Export)
  styles: {
    tailwindClasses: string;
    customCSS?: string;
    motion?: { initial: any; animate: any };
  };

  // DATA LAYER (For Content)
  attributes: {
    text?: string;
    src?: string;
    alt?: string;
    placeholder?: string;
    name?: string;
    actionId?: string; // e.g. "submit-form"
    componentId?: string; // For references
    linkHref?: string; // For navigation
  };

  // STATE LAYER (Inferred from Video)
  state?: {
    isLoading?: boolean;
    isHidden?: boolean;
    trigger?: 'hover' | 'click' | 'load';
  };

  children?: UISpecNode[];
}

export interface LayoutManifest {
  id: string;
  version: string;
  root: UISpecNode;
  definitions: Record<string, UISpecNode>; // Reusable components
  detectedFeatures: string[]; // Bridge to Phase Generator
  designSystem: {
    colors: Record<string, string>;
    fonts: { heading: string; body: string };
  };
}

// --- ZOD VALIDATION (Self-Healing Triggers) ---

export const UISpecNodeSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: z.enum([
      'container',
      'text',
      'image',
      'button',
      'input',
      'list',
      'icon',
      'video',
      'component-reference',
    ]),
    semanticTag: z.string(),
    styles: z.object({
      tailwindClasses: z.string(),
      customCSS: z.string().optional(),
      motion: z.any().optional(),
    }),
    attributes: z.record(z.string(), z.any()),
    state: z
      .object({
        isLoading: z.boolean().optional(),
        isHidden: z.boolean().optional(),
        trigger: z.enum(['hover', 'click', 'load']).optional(),
      })
      .optional(),
    children: z.array(UISpecNodeSchema).optional(),
  })
);

export const LayoutManifestSchema = z.object({
  id: z.string(),
  version: z.string(),
  root: UISpecNodeSchema,
  definitions: z.record(z.string(), UISpecNodeSchema),
  detectedFeatures: z.array(z.string()),
  designSystem: z.object({
    colors: z.record(z.string(), z.string()),
    fonts: z.object({ heading: z.string(), body: z.string() }),
  }),
});
