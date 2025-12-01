"use client";

import React from 'react';

// Symbol for component identification
export const RESIZABLE_PANEL_TYPE = Symbol.for('ResizablePanel');

export interface ResizablePanelProps {
  children: React.ReactNode;
  defaultSize?: number; // Percentage (0-100)
  minSize?: number; // Minimum percentage
  maxSize?: number; // Maximum percentage
  collapsible?: boolean;
  collapsedSize?: number;
  onCollapse?: () => void;
  onExpand?: () => void;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
}

export interface ResizablePanelContextValue {
  size: number;
  isCollapsed: boolean;
  collapse: () => void;
  expand: () => void;
}

// Context for panel data (set by ResizablePanelGroup)
export const ResizablePanelContext = React.createContext<ResizablePanelContextValue | null>(null);

/**
 * ResizablePanel - A panel that can be resized within a ResizablePanelGroup
 * 
 * @example
 * ```tsx
 * <ResizablePanelGroup direction="horizontal">
 *   <ResizablePanel defaultSize={30} minSize={20}>
 *     <ChatPanel />
 *   </ResizablePanel>
 *   <ResizableHandle />
 *   <ResizablePanel defaultSize={70} minSize={30}>
 *     <PreviewPanel />
 *   </ResizablePanel>
 * </ResizablePanelGroup>
 * ```
 */
export function ResizablePanel({
  children,
  defaultSize,
  minSize,
  maxSize,
  collapsible = false,
  collapsedSize = 0,
  onCollapse,
  onExpand,
  className = '',
  style = {},
  id,
}: ResizablePanelProps) {
  const context = React.useContext(ResizablePanelContext);
  
  // Get size from context or use default
  const currentSize = context?.size ?? defaultSize ?? 50;
  const isCollapsed = context?.isCollapsed ?? false;
  
  // Panel styles
  const panelStyle: React.CSSProperties = {
    ...style,
    overflow: 'hidden',
    position: 'relative',
  };

  return (
    <div
      className={`resizable-panel ${className} ${isCollapsed ? 'resizable-panel-collapsed' : ''}`}
      style={panelStyle}
      data-panel-id={id}
      data-panel-size={currentSize}
      data-min-size={minSize}
      data-max-size={maxSize}
      data-collapsible={collapsible}
      data-collapsed-size={collapsedSize}
      data-default-size={defaultSize}
    >
      {children}
    </div>
  );
}

// Attach type symbol for identification
ResizablePanel.displayName = 'ResizablePanel';
(ResizablePanel as any).__RESIZABLE_TYPE__ = RESIZABLE_PANEL_TYPE;

/**
 * Hook to access panel context from within a ResizablePanel
 */
export function useResizablePanelContext(): ResizablePanelContextValue | null {
  return React.useContext(ResizablePanelContext);
}

export default ResizablePanel;
