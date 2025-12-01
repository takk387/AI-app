"use client";

import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { ResizablePanelContext, type ResizablePanelProps, RESIZABLE_PANEL_TYPE } from './ResizablePanel';
import { ResizableHandleContext, RESIZABLE_HANDLE_TYPE } from './ResizableHandle';
import { useResizable } from '@/hooks/useResizable';
import { loadPanelLayout, savePanelLayout, mergePersistedLayout } from '@/utils/panelPersistence';

export interface ResizablePanelGroupProps {
  children: React.ReactNode;
  direction: 'horizontal' | 'vertical';
  onLayoutChange?: (sizes: number[]) => void;
  persistenceKey?: string;
  className?: string;
  style?: React.CSSProperties;
  autoSaveId?: string; // Alias for persistenceKey
}

interface PanelData {
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
  collapsible?: boolean;
  collapsedSize?: number;
}

// Type guard to check if element is a ResizablePanel
function isResizablePanel(child: React.ReactElement): boolean {
  const type = child.type as any;
  // Check for symbol first (most reliable)
  if (type?.__RESIZABLE_TYPE__ === RESIZABLE_PANEL_TYPE) return true;
  // Check displayName as fallback
  if (type?.displayName === 'ResizablePanel') return true;
  // Check props as last fallback
  const props = child.props as Partial<ResizablePanelProps>;
  return props.defaultSize !== undefined || props.minSize !== undefined || props.maxSize !== undefined;
}

// Type guard to check if element is a ResizableHandle
function isResizableHandle(child: React.ReactElement): boolean {
  const type = child.type as any;
  // Check for symbol first (most reliable)
  if (type?.__RESIZABLE_TYPE__ === RESIZABLE_HANDLE_TYPE) return true;
  // Check displayName as fallback
  if (type?.displayName === 'ResizableHandle') return true;
  // Check props as last fallback
  const props = child.props as Record<string, unknown>;
  return props.hitAreaMargins !== undefined;
}

// Extract panel data from children
function extractPanelData(children: React.ReactNode): PanelData[] {
  const panels: PanelData[] = [];
  
  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child) && isResizablePanel(child)) {
      const props = child.props as Partial<ResizablePanelProps>;
      panels.push({
        defaultSize: props.defaultSize,
        minSize: props.minSize,
        maxSize: props.maxSize,
        collapsible: props.collapsible,
        collapsedSize: props.collapsedSize,
      });
    }
  });
  
  return panels;
}

/**
 * ResizablePanelGroup - Container that manages multiple resizable panels
 * 
 * Features:
 * - Manages layout of child ResizablePanels and ResizableHandles
 * - Handles drag-to-resize with smooth animations
 * - Persists layout to localStorage when persistenceKey is provided
 * - Supports both horizontal and vertical layouts
 * - Enforces min/max constraints from child panels
 * 
 * @example
 * ```tsx
 * <ResizablePanelGroup 
 *   direction="horizontal" 
 *   persistenceKey="ai-builder-layout"
 *   onLayoutChange={(sizes) => console.log('Layout changed:', sizes)}
 * >
 *   <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
 *     <ChatPanel />
 *   </ResizablePanel>
 *   <ResizableHandle />
 *   <ResizablePanel defaultSize={70} minSize={30}>
 *     <PreviewPanel />
 *   </ResizablePanel>
 * </ResizablePanelGroup>
 * ```
 */
export function ResizablePanelGroup({
  children,
  direction,
  onLayoutChange,
  persistenceKey,
  className = '',
  style = {},
  autoSaveId,
}: ResizablePanelGroupProps) {
  const actualPersistenceKey = persistenceKey || autoSaveId;
  
  // Extract panel configuration from children
  const panelData = useMemo(() => extractPanelData(children), [children]);
  
  // Calculate initial sizes
  const [isInitialized, setIsInitialized] = useState(false);
  const [initialSizes, setInitialSizes] = useState<number[]>(() => {
    const defaultSizes = panelData.map((p, i) => p.defaultSize ?? (100 / panelData.length));
    return defaultSizes;
  });
  
  // Load persisted sizes on mount
  useEffect(() => {
    if (!isInitialized && actualPersistenceKey && typeof window !== 'undefined') {
      const persisted = loadPanelLayout({ key: actualPersistenceKey });
      const defaultSizes = panelData.map((p) => p.defaultSize ?? (100 / panelData.length));
      const minSizes = panelData.map((p) => p.minSize ?? 5);
      const maxSizes = panelData.map((p) => p.maxSize ?? 95);
      
      const mergedSizes = mergePersistedLayout(
        persisted,
        panelData.length,
        defaultSizes,
        minSizes,
        maxSizes
      );
      
      setInitialSizes(mergedSizes);
      setIsInitialized(true);
    } else if (!isInitialized) {
      setIsInitialized(true);
    }
  }, [actualPersistenceKey, panelData, isInitialized]);

  // Extract min/max sizes
  const minSizes = useMemo(() => panelData.map((p) => p.minSize ?? 5), [panelData]);
  const maxSizes = useMemo(() => panelData.map((p) => p.maxSize ?? 95), [panelData]);
  
  // Use the resize hook
  const {
    sizes,
    setSizes,
    isDragging,
    activeIndex,
    startResize,
    containerRef,
    collapsePanel,
    expandPanel,
  } = useResizable({
    direction,
    defaultSizes: initialSizes,
    minSizes,
    maxSizes,
    onLayoutChange: (newSizes) => {
      onLayoutChange?.(newSizes);
      if (actualPersistenceKey) {
        savePanelLayout(newSizes, { key: actualPersistenceKey });
      }
    },
    persistenceKey: actualPersistenceKey,
  });

  // Update sizes when initialSizes change (after persistence load)
  useEffect(() => {
    if (isInitialized && initialSizes.length === panelData.length) {
      // Only set if different from current sizes
      const sizesMatch = sizes.length === initialSizes.length && 
        sizes.every((s, i) => Math.abs(s - initialSizes[i]) < 0.1);
      if (!sizesMatch) {
        setSizes(initialSizes);
      }
    }
  }, [initialSizes, isInitialized, panelData.length, sizes, setSizes]);

  // Track collapsed state per panel
  const [collapsedPanels, setCollapsedPanels] = useState<Set<number>>(new Set());

  // Handle panel collapse/expand
  const handleCollapse = useCallback((index: number) => {
    setCollapsedPanels(prev => new Set(prev).add(index));
    collapsePanel(index);
  }, [collapsePanel]);

  const handleExpand = useCallback((index: number) => {
    setCollapsedPanels(prev => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
    expandPanel(index);
  }, [expandPanel]);

  // Build enhanced children with contexts
  const enhancedChildren = useMemo(() => {
    let panelIndex = 0;
    let handleIndex = 0;
    
    return React.Children.map(children, (child) => {
      if (!React.isValidElement(child)) return child;
      
      // Check if it's a ResizablePanel using type guard
      if (isResizablePanel(child)) {
        const currentIndex = panelIndex;
        const size = sizes[currentIndex] ?? 50;
        const isCollapsed = collapsedPanels.has(currentIndex);
        
        const contextValue = {
          size,
          isCollapsed,
          collapse: () => handleCollapse(currentIndex),
          expand: () => handleExpand(currentIndex),
        };
        
        panelIndex++;
        
        // Create flex basis style
        const panelStyle: React.CSSProperties = {
          flexBasis: `${size}%`,
          flexGrow: 0,
          flexShrink: 0,
          minWidth: direction === 'horizontal' ? 0 : undefined,
          minHeight: direction === 'vertical' ? 0 : undefined,
          overflow: 'hidden',
          transition: isDragging ? 'none' : 'flex-basis 0.15s ease-out',
        };
        
        return (
          <ResizablePanelContext.Provider value={contextValue}>
            <div style={panelStyle} className="resizable-panel-wrapper">
              {child}
            </div>
          </ResizablePanelContext.Provider>
        );
      }
      
      // Check if it's a ResizableHandle using type guard
      if (isResizableHandle(child)) {
        const currentHandleIndex = handleIndex;
        
        const contextValue = {
          direction,
          isDragging,
          isActive: activeIndex === currentHandleIndex,
          startResize: (event: React.MouseEvent | React.TouchEvent | React.KeyboardEvent) => 
            startResize(currentHandleIndex, event),
          onDoubleClick: () => {
            // Toggle collapse of left/top panel
            const panelToToggle = currentHandleIndex;
            if (collapsedPanels.has(panelToToggle)) {
              handleExpand(panelToToggle);
            } else {
              handleCollapse(panelToToggle);
            }
          },
        };
        
        handleIndex++;
        
        return (
          <ResizableHandleContext.Provider value={contextValue}>
            {child}
          </ResizableHandleContext.Provider>
        );
      }
      
      // Return other children unchanged
      return child;
    });
  }, [children, sizes, collapsedPanels, direction, isDragging, activeIndex, startResize, handleCollapse, handleExpand]);

  // Container styles
  const containerStyle: React.CSSProperties = {
    ...style,
    display: 'flex',
    flexDirection: direction === 'horizontal' ? 'row' : 'column',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  };

  // Class names
  const containerClasses = [
    'resizable-panel-group',
    `resizable-panel-group-${direction}`,
    isDragging ? 'resizable-panel-group-dragging' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={containerRef}
      className={containerClasses}
      style={containerStyle}
      data-direction={direction}
      data-panel-count={panelData.length}
    >
      {enhancedChildren}
    </div>
  );
}

export default ResizablePanelGroup;
