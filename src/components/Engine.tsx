'use client';
import React from 'react';
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

export const Engine: React.FC<EngineProps> = ({ node, definitions, onSelect, selectedId, editable = false }) => {
  // Guard against undefined/null nodes
  if (!node) {
    return null;
  }

  if (node.type === 'component-reference' && node.attributes.componentId) {
    const def = definitions[node.attributes.componentId];
    if (def) return <Engine node={def} definitions={definitions} onSelect={onSelect} selectedId={selectedId} editable={editable} />;
  }

  const tagMap: Record<string, string> = {
    container: 'div', text: 'span', button: 'button', input: 'input', list: 'div', image: 'img'
  };
  const Tag = tagMap[node.type] || 'div';
  const MotionTag = motionComponents[Tag] || motion.div;

  // Void elements cannot have children (HTML spec)
  const voidElements = ['img', 'input', 'br', 'hr', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr'];
  const isVoidElement = voidElements.includes(Tag);

  if (node.type === 'icon' && node.attributes?.src) {
    const IconCmp = (Icons as any)[node.attributes.src] || Icons.HelpCircle;
    return <IconCmp className={node.styles?.tailwindClasses ?? ''} />;
  }

  const isSelected = selectedId === node.id;
  const selectionStyle = editable && isSelected ? { outline: '2px solid #3b82f6', outlineOffset: '2px' } : {};

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
          onClick={(e: any) => { e.stopPropagation(); onSelect?.(node.id); }}
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
        onClick={(e: any) => { e.stopPropagation(); onSelect?.(node.id); }}
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
      onClick={(e: any) => { e.stopPropagation(); onSelect?.(node.id); }}
      {...filterDOMAttributes(node.attributes)}
    >
      {node.attributes?.text}
      {node.children?.filter(Boolean).map(c => (
        <Engine key={c.id} node={c} definitions={definitions} onSelect={onSelect} selectedId={selectedId} editable={editable} />
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
        <div className="p-4 text-red-500 bg-red-50 rounded border border-red-200">
          Failed to render layout. Please try regenerating.
        </div>
      );
    }
    return this.props.children;
  }
}

export const LayoutPreview: React.FC<LayoutPreviewProps> = ({ manifest, onSelectNode, selectedNodeId, editMode = false }) => {
  const cssVariables: Record<string, string> = {};
  const colors = manifest.designSystem?.colors ?? {};
  Object.entries(colors).forEach(([key, value]) => {
    cssVariables[`--${key}`] = value;
  });
  const fonts = manifest.designSystem?.fonts ?? { heading: 'sans-serif', body: 'sans-serif' };
  cssVariables['--font-heading'] = fonts.heading;
  cssVariables['--font-body'] = fonts.body;

  return (
    <EngineErrorBoundary>
      <div style={cssVariables as React.CSSProperties}>
        <Engine
          node={manifest.root}
          definitions={manifest.definitions}
          onSelect={onSelectNode}
          selectedId={selectedNodeId}
          editable={editMode}
        />
      </div>
    </EngineErrorBoundary>
  );
};
