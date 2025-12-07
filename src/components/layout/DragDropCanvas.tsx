'use client';

import React, { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/**
 * Section types that can be reordered in the layout
 */
export type SectionType = 'header' | 'hero' | 'stats' | 'cards' | 'list' | 'footer' | 'sidebar';

/**
 * Section configuration for drag-and-drop
 */
export interface LayoutSection {
  id: SectionType;
  label: string;
  visible: boolean;
  locked?: boolean; // Header/footer typically locked to position
}

/**
 * Default section order for different layout types
 */
export const DEFAULT_SECTION_ORDER: Record<string, LayoutSection[]> = {
  'single-page': [
    { id: 'header', label: 'Header', visible: true, locked: true },
    { id: 'hero', label: 'Hero Section', visible: true },
    { id: 'cards', label: 'Card Grid', visible: true },
    { id: 'list', label: 'List Section', visible: true },
    { id: 'footer', label: 'Footer', visible: true, locked: true },
  ],
  'multi-page': [
    { id: 'header', label: 'Header', visible: true, locked: true },
    { id: 'hero', label: 'Hero Section', visible: true },
    { id: 'stats', label: 'Stats Row', visible: true },
    { id: 'cards', label: 'Card Grid', visible: true },
    { id: 'footer', label: 'Footer', visible: true, locked: true },
  ],
  dashboard: [
    { id: 'header', label: 'Header', visible: true, locked: true },
    { id: 'stats', label: 'Stats Row', visible: true },
    { id: 'cards', label: 'Card Grid', visible: true },
    { id: 'list', label: 'List Section', visible: true },
    { id: 'footer', label: 'Footer', visible: true, locked: true },
  ],
};

/**
 * Props for sortable section wrapper
 */
interface SortableSectionProps {
  id: string;
  children: React.ReactNode;
  isLocked?: boolean;
  isDragging?: boolean;
}

/**
 * Sortable wrapper for layout sections
 */
export function SortableSection({
  id,
  children,
  isLocked = false,
  isDragging,
}: SortableSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id,
    disabled: isLocked,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
    position: 'relative',
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {/* Drag handle - only show for non-locked sections */}
      {!isLocked && (
        <div
          {...attributes}
          {...listeners}
          className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-8 z-10
            opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing
            bg-slate-700 rounded-l-md p-1.5 shadow-lg border border-slate-600
            ${isDragging ? 'opacity-100' : ''}`}
          title="Drag to reorder"
        >
          <svg
            className="w-4 h-4 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8h16M4 16h16"
            />
          </svg>
        </div>
      )}

      {/* Lock indicator for locked sections */}
      {isLocked && (
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-8 z-10
            opacity-0 group-hover:opacity-60 transition-opacity
            bg-slate-800 rounded-l-md p-1.5 border border-slate-700"
          title="Position locked"
        >
          <svg
            className="w-4 h-4 text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
      )}

      {children}
    </div>
  );
}

/**
 * Props for DragDropCanvas
 */
interface DragDropCanvasProps {
  sections: LayoutSection[];
  onSectionsChange: (sections: LayoutSection[]) => void;
  children: (section: LayoutSection, index: number) => React.ReactNode;
  className?: string;
  disabled?: boolean;
}

/**
 * Drag-and-drop canvas for reordering layout sections
 */
export function DragDropCanvas({
  sections,
  onSectionsChange,
  children,
  className = '',
  disabled = false,
}: DragDropCanvasProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over || active.id === over.id) {
        return;
      }

      const oldIndex = sections.findIndex((s) => s.id === active.id);
      const newIndex = sections.findIndex((s) => s.id === over.id);

      // Don't allow moving to/from locked positions
      const activeSection = sections[oldIndex];
      const overSection = sections[newIndex];

      if (activeSection?.locked || overSection?.locked) {
        return;
      }

      const newSections = arrayMove(sections, oldIndex, newIndex);
      onSectionsChange(newSections);
    },
    [sections, onSectionsChange]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  // Get sortable IDs (only non-locked sections can be sorted)
  const sortableIds = sections.filter((s) => !s.locked).map((s) => s.id);

  // Find the active section for the drag overlay
  const activeSection = activeId ? sections.find((s) => s.id === activeId) : null;

  if (disabled) {
    // When disabled, just render children without drag functionality
    return (
      <div className={className}>
        {sections.map((section, index) => (
          <div key={section.id}>{children(section, index)}</div>
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
        <div className={className}>
          {sections.map((section, index) => (
            <SortableSection
              key={section.id}
              id={section.id}
              isLocked={section.locked}
              isDragging={activeId === section.id}
            >
              {children(section, index)}
            </SortableSection>
          ))}
        </div>
      </SortableContext>

      {/* Drag overlay for visual feedback */}
      <DragOverlay>
        {activeSection ? (
          <div className="bg-slate-800/90 border-2 border-blue-500 rounded-lg p-4 shadow-2xl">
            <div className="flex items-center gap-2 text-white">
              <svg
                className="w-5 h-5 text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8h16M4 16h16"
                />
              </svg>
              <span className="font-medium">{activeSection.label}</span>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/**
 * Hook for managing section order state
 */
export function useSectionOrder(layoutType: string = 'single-page') {
  const [sections, setSections] = useState<LayoutSection[]>(
    () => DEFAULT_SECTION_ORDER[layoutType] || DEFAULT_SECTION_ORDER['single-page']
  );

  const reorderSections = useCallback((newSections: LayoutSection[]) => {
    setSections(newSections);
  }, []);

  const toggleSectionVisibility = useCallback((sectionId: SectionType) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, visible: !s.visible } : s))
    );
  }, []);

  const resetToDefault = useCallback(() => {
    setSections(DEFAULT_SECTION_ORDER[layoutType] || DEFAULT_SECTION_ORDER['single-page']);
  }, [layoutType]);

  return {
    sections,
    reorderSections,
    toggleSectionVisibility,
    resetToDefault,
  };
}

export default DragDropCanvas;
