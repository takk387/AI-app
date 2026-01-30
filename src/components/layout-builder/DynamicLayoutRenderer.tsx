/**
 * Dynamic Layout Renderer
 *
 * The Orchestrator for the Zero-Preset Layout Builder.
 * Maps the flat or tree-based 'detectedComponents' from Gemini
 * into a visual React tree.
 *
 * Supports hierarchical layouts:
 * - Builds a component tree from flat array using parentId/children
 * - Only renders root components (they recursively render children)
 * - Falls back to flat rendering for legacy layouts without hierarchy
 */

import React, { useMemo } from 'react';
import { DetectedComponentEnhanced } from '@/types/layoutDesign';
import { GenericComponentRenderer } from './GenericComponentRenderer';
import { KeyframeInjector } from './KeyframeInjector';
import { buildComponentTree } from '@/utils/layoutValidation';

interface DynamicLayoutRendererProps {
  components: DetectedComponentEnhanced[];
  onSelectComponent: (id: string) => void;
  selectedComponentId: string | null;
}

export const DynamicLayoutRenderer: React.FC<DynamicLayoutRendererProps> = ({
  components,
  onSelectComponent,
  selectedComponentId,
}) => {
  // Build component tree from flat array
  // This handles both hierarchical (with parentId/children) and flat (legacy) layouts
  const { roots, componentMap } = useMemo(() => {
    return buildComponentTree(components);
  }, [components]);

  // Sort root components by vertical position (top bounds)
  // to ensure roughly correct visual order
  const sortedRoots = useMemo(() => {
    return [...roots].sort((a, b) => {
      const aTop = a?.bounds?.top ?? 0;
      const bTop = b?.bounds?.top ?? 0;
      return aTop - bTop;
    });
  }, [roots]);

  // Debug: Log tree structure in development
  if (process.env.NODE_ENV === 'development' && components.length > 0) {
    console.log('[DynamicLayoutRenderer] Tree structure:', {
      totalComponents: components.length,
      rootCount: roots.length,
      hasHierarchy: components.some((c) => c.parentId || (c.children && c.children.length > 0)),
    });
  }

  return (
    <div
      className="relative w-full h-full bg-white overflow-visible"
      id="layout-canvas" // ID for html2canvas
      style={{ minHeight: '600px' }} // overflow-visible allows content to extend beyond container
    >
      {/* Inject @keyframes CSS for any components with animationKeyframes */}
      <KeyframeInjector components={components} />

      {/* Only render visible root components - they recursively render their children */}
      {sortedRoots
        .filter((c) => c.visible !== false)
        .map((component) => (
          <GenericComponentRenderer
            key={component.id}
            component={component}
            componentMap={componentMap}
            onSelect={onSelectComponent}
            selectedId={selectedComponentId}
            depth={0}
          />
        ))}

      {/*
        Empty State / Placeholder
        If no components, show a helper message
      */}
      {components.length === 0 && (
        <div className="flex flex-col items-center justify-center w-full h-[500px] border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500">No layout detected yet.</p>
          <p className="text-gray-400 text-sm">Upload an image or video to start building.</p>
        </div>
      )}
    </div>
  );
};
