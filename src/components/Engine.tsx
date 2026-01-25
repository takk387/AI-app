'use client';
import React, { useMemo } from 'react';
import { UISpecNode } from '@/types/schema';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';

// Pre-created motion components to avoid creating new component types on every render
const motionComponents: Record<string, React.ComponentType<any>> = {
  div: motion.div,
  span: motion.span,
  p: motion.p,
  button: motion.button,
  input: motion.input,
  img: motion.img,
};

// Placeholder for missing images
const PLACEHOLDER_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect fill='%23f3f4f6' width='100' height='100'/%3E%3Ctext x='50' y='50' font-family='Arial' font-size='12' fill='%239ca3af' text-anchor='middle' dy='.3em'%3ENo Image%3C/text%3E%3C/svg%3E`;

// Filter out React-specific props that shouldn't be spread to DOM elements
function filterDOMAttributes(attrs: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!attrs) return {};
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { iconName, componentId, text, ...domSafe } = attrs;
  return domSafe;
}

interface EngineProps {
  node: UISpecNode;
  definitions: Record<string, UISpecNode>;
  onSelect?: (id: string) => void;
  selectedId?: string;
  editable?: boolean;
}

export const Engine: React.FC<EngineProps> = ({
  node,
  definitions,
  onSelect,
  selectedId,
  editable = false,
}) => {
  // Guard against undefined/null nodes
  if (!node) {
    return null;
  }

  if (node.type === 'component-reference' && node.attributes.componentId) {
    const def = definitions[node.attributes.componentId];
    if (def) {
      return (
        <Engine
          node={def}
          definitions={definitions}
          onSelect={onSelect}
          selectedId={selectedId}
          editable={editable}
        />
      );
    }
    // FALLBACK: Log warning and render placeholder instead of nothing
    console.warn(
      `[Engine] Missing definition for component-reference: "${node.attributes.componentId}"`
    );
    return (
      <div className="p-2 border border-dashed border-orange-400 bg-orange-50 text-orange-700 text-sm rounded">
        Missing component: {node.attributes.componentId}
      </div>
    );
  }

  const tagMap: Record<string, string> = {
    container: 'div',
    text: 'span',
    button: 'button',
    input: 'input',
    list: 'div',
    image: 'img',
    // Semantic HTML elements for better structure
    header: 'header',
    footer: 'footer',
    nav: 'nav',
    section: 'section',
    article: 'article',
    aside: 'aside',
    main: 'main',
  };
  const Tag = tagMap[node.type] || 'div';
  const MotionTag = motionComponents[Tag] || motion.div;

  // Void elements cannot have children (HTML spec)
  const voidElements = [
    'img',
    'input',
    'br',
    'hr',
    'meta',
    'link',
    'area',
    'base',
    'col',
    'embed',
    'source',
    'track',
    'wbr',
  ];
  const isVoidElement = voidElements.includes(Tag);

  if (node.type === 'icon' && node.attributes?.src) {
    const IconCmp = (Icons as any)[node.attributes.src] || Icons.HelpCircle;
    return <IconCmp className={node.styles?.tailwindClasses ?? ''} />;
  }

  const isSelected = selectedId === node.id;
  const selectionStyle =
    editable && isSelected ? { outline: '2px solid #3b82f6', outlineOffset: '2px' } : {};

  // For void elements, render without children
  if (isVoidElement) {
    // Special handling for images with fallback
    if (Tag === 'img') {
      return (
        <MotionTag
          className={node.styles?.tailwindClasses ?? ''}
          style={selectionStyle}
          initial={node.styles?.motion?.initial}
          animate={node.styles?.motion?.animate}
          onClick={(e: any) => {
            e.stopPropagation();
            onSelect?.(node.id);
          }}
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
            e.currentTarget.src = PLACEHOLDER_SVG;
          }}
          {...filterDOMAttributes(node.attributes)}
        />
      );
    }
    return (
      <MotionTag
        className={node.styles?.tailwindClasses ?? ''}
        style={selectionStyle}
        initial={node.styles?.motion?.initial}
        animate={node.styles?.motion?.animate}
        onClick={(e: any) => {
          e.stopPropagation();
          onSelect?.(node.id);
        }}
        {...filterDOMAttributes(node.attributes)}
      />
    );
  }

  return (
    <MotionTag
      className={node.styles?.tailwindClasses ?? ''}
      style={selectionStyle}
      initial={node.styles?.motion?.initial}
      animate={node.styles?.motion?.animate}
      onClick={(e: any) => {
        e.stopPropagation();
        onSelect?.(node.id);
      }}
      {...filterDOMAttributes(node.attributes)}
    >
      {node.attributes?.text}
      {node.children
        ?.filter((c, i) => {
          if (!c) {
            // Debug logging: find out if we are losing nodes here
            if (process.env.NODE_ENV === 'development') {
              console.warn(`[Engine] Filtered falsy child at index ${i} in node "${node.id}"`);
            }
            return false;
          }
          return true;
        })
        .map((c) => (
          <Engine
            key={c.id}
            node={c}
            definitions={definitions}
            onSelect={onSelect}
            selectedId={selectedId}
            editable={editable}
          />
        ))}
    </MotionTag>
  );
};

/**
 * LayoutPreview - Wrapper that injects CSS variables from designSystem
 */
interface LayoutPreviewProps {
  manifest: {
    root: UISpecNode;
    definitions: Record<string, UISpecNode>;
    designSystem: {
      colors: Record<string, string>;
      fonts: { heading: string; body: string };
    };
  };
  onSelectNode?: (id: string) => void;
  selectedNodeId?: string;
  editMode?: boolean;
}

// Error boundary to prevent render crashes from breaking the entire app
class EngineErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-error-500 bg-error-50 rounded border border-error-200">
          Failed to render layout. Please try regenerating.
        </div>
      );
    }
    return this.props.children;
  }
}

export const LayoutPreview: React.FC<LayoutPreviewProps> = ({
  manifest,
  onSelectNode,
  selectedNodeId,
  editMode = false,
}) => {
  const colors = manifest.designSystem?.colors ?? {};
  const fonts = manifest.designSystem?.fonts ?? { heading: 'sans-serif', body: 'sans-serif' };

  // SAFE FALLBACKS: Use hex colors instead of var() which might not be defined
  const safeBackground = colors.background || '#ffffff';
  const safeColor = colors.text || '#000000';

  // Build CSS variables and wrapper style in useMemo (must be called before any early returns)
  const wrapperStyle = useMemo(() => {
    const cssVars: Record<string, string> = {};

    Object.entries(colors).forEach(([key, value]) => {
      if (value) {
        cssVars[`--${key}`] = value;
        if (key === 'textMuted') cssVars['--text-muted'] = value;
      }
    });

    cssVars['--font-heading'] = fonts.heading;
    cssVars['--font-body'] = fonts.body;

    return {
      ...cssVars,
      backgroundColor: safeBackground,
      color: safeColor,
      minHeight: '100%',
      width: '100%',
      position: 'relative' as const,
    } as React.CSSProperties;
  }, [colors, fonts, safeBackground, safeColor]);

  // Debug logging for blank preview diagnosis (after hooks)
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log('[LayoutPreview] Rendering with manifest:', {
      hasRoot: !!manifest.root,
      rootType: manifest.root?.type,
      rootChildrenCount: manifest.root?.children?.length ?? 0,
      definitionsCount: Object.keys(manifest.definitions || {}).length,
      hasColors: !!manifest.designSystem?.colors,
    });
  }

  // Guard against missing manifest data (after all hooks)
  if (!manifest.root) {
    // eslint-disable-next-line no-console
    console.error('[LayoutPreview] ERROR: manifest.root is missing');
    return (
      <div className="p-4 text-red-500 bg-red-50 rounded border border-red-200">
        Invalid manifest: missing root node. Please regenerate.
      </div>
    );
  }

  return (
    <EngineErrorBoundary>
      <div style={wrapperStyle}>
        <Engine
          node={manifest.root}
          definitions={manifest.definitions || {}}
          onSelect={onSelectNode}
          selectedId={selectedNodeId}
          editable={editMode}
        />
      </div>
    </EngineErrorBoundary>
  );
};
