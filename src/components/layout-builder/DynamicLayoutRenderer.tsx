/**
 * Dynamic Layout Renderer
 *
 * The Orchestrator for the Zero-Preset Layout Builder.
 * Maps the flat or tree-based 'detectedComponents' from Gemini
 * into a visual React tree.
 */

import React from 'react';
import { DetectedComponentEnhanced } from '@/types/layoutDesign';
import { GenericComponentRenderer } from './GenericComponentRenderer';

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
  // Sort components by vertical position (top bounds) to ensure roughly correct flow order
  // for non-absolute layouts. Uses defensive null checks to handle incomplete bounds.
  const sortedComponents = [...components].sort((a, b) => {
    const aTop = a?.bounds?.top ?? 0;
    const bTop = b?.bounds?.top ?? 0;
    return aTop - bTop;
  });

  return (
    <div
      className="relative w-full min-h-screen bg-white"
      id="layout-canvas" // ID for html2canvas
    >
      {sortedComponents.map((component) => (
        <GenericComponentRenderer
          key={component.id}
          component={component}
          onSelect={onSelectComponent}
          selectedId={selectedComponentId}
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
