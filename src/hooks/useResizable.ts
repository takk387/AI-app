import { useState, useCallback, useRef, useEffect } from 'react';
import { loadPanelLayout, savePanelLayout, normalizeSizes } from '@/utils/panelPersistence';

export interface ResizeState {
  sizes: number[];
  isDragging: boolean;
  activeIndex: number | null;
}

export interface UseResizableOptions {
  direction: 'horizontal' | 'vertical';
  defaultSizes?: number[];
  minSizes?: number[];
  maxSizes?: number[];
  onLayoutChange?: (sizes: number[]) => void;
  persistenceKey?: string;
}

export interface UseResizableReturn {
  sizes: number[];
  setSizes: (sizes: number[]) => void;
  isDragging: boolean;
  activeIndex: number | null;
  startResize: (index: number, event: React.MouseEvent | React.TouchEvent | React.KeyboardEvent) => void;
  handleResize: (event: MouseEvent | TouchEvent) => void;
  stopResize: () => void;
  containerRef: React.RefObject<HTMLDivElement>;
  collapsePanel: (index: number) => void;
  expandPanel: (index: number) => void;
}

// Helper to get position from event
function getPositionFromEvent(
  event: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent,
  direction: 'horizontal' | 'vertical'
): number {
  if ('touches' in event && event.touches.length > 0) {
    return direction === 'horizontal' ? event.touches[0].clientX : event.touches[0].clientY;
  }
  if ('clientX' in event) {
    return direction === 'horizontal' ? event.clientX : event.clientY;
  }
  return 0;
}

export function useResizable({
  direction,
  defaultSizes = [50, 50],
  minSizes = [],
  maxSizes = [],
  onLayoutChange,
  persistenceKey,
}: UseResizableOptions): UseResizableReturn {
  // Per-instance save timeout to avoid race conditions between multiple hook instances
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Per-instance debounced save function
  const persistSizesDebounced = useCallback((key: string, sizesToSave: number[]) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      savePanelLayout(sizesToSave, { key });
    }, 100); // Short delay since savePanelLayout already debounces
  }, []);
  
  // Initialize sizes from persistence or defaults
  const initialSizes = persistenceKey 
    ? loadPanelLayout({ key: persistenceKey }) || defaultSizes 
    : defaultSizes;
  
  const [sizes, setSizesState] = useState<number[]>(normalizeSizes(initialSizes));
  const [isDragging, setIsDragging] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startPositionRef = useRef<number>(0);
  const startSizesRef = useRef<number[]>([]);
  const collapsedSizesRef = useRef<Map<number, number>>(new Map());

  // Set sizes and trigger callbacks
  const setSizes = useCallback((newSizes: number[]) => {
    const normalized = normalizeSizes(newSizes);
    setSizesState(normalized);
    onLayoutChange?.(normalized);
    if (persistenceKey) {
      persistSizesDebounced(persistenceKey, normalized);
    }
  }, [onLayoutChange, persistenceKey, persistSizesDebounced]);

  // Start resize operation
  const startResize = useCallback((
    index: number, 
    event: React.MouseEvent | React.TouchEvent | React.KeyboardEvent
  ) => {
    // Handle keyboard events for accessibility
    if ('key' in event) {
      const step = 5; // 5% step for keyboard navigation
      const newSizes = [...sizes];
      
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        // Decrease left/top panel, increase right/bottom panel
        const decrease = Math.min(step, newSizes[index] - (minSizes[index] || 5));
        if (decrease > 0) {
          newSizes[index] -= decrease;
          newSizes[index + 1] = (newSizes[index + 1] || 0) + decrease;
          setSizes(newSizes);
        }
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        // Increase left/top panel, decrease right/bottom panel
        const maxAllowed = maxSizes[index] || 95;
        const increase = Math.min(step, maxAllowed - newSizes[index], (newSizes[index + 1] || 0) - (minSizes[index + 1] || 5));
        if (increase > 0) {
          newSizes[index] += increase;
          newSizes[index + 1] = (newSizes[index + 1] || 0) - increase;
          setSizes(newSizes);
        }
      } else if (event.key === 'Home') {
        event.preventDefault();
        // Collapse to minimum
        const minSize = minSizes[index] || 5;
        const diff = newSizes[index] - minSize;
        newSizes[index] = minSize;
        newSizes[index + 1] = (newSizes[index + 1] || 0) + diff;
        setSizes(newSizes);
      } else if (event.key === 'End') {
        event.preventDefault();
        // Expand to maximum
        const maxSize = maxSizes[index] || 95;
        const diff = maxSize - newSizes[index];
        const availableFromNext = (newSizes[index + 1] || 0) - (minSizes[index + 1] || 5);
        const actualDiff = Math.min(diff, availableFromNext);
        newSizes[index] += actualDiff;
        newSizes[index + 1] = (newSizes[index + 1] || 0) - actualDiff;
        setSizes(newSizes);
      }
      return;
    }

    event.preventDefault();
    setIsDragging(true);
    setActiveIndex(index);
    startPositionRef.current = getPositionFromEvent(event, direction);
    startSizesRef.current = [...sizes];
  }, [sizes, setSizes, direction, minSizes, maxSizes]);

  // Handle resize during drag
  const handleResize = useCallback((event: MouseEvent | TouchEvent) => {
    if (!isDragging || activeIndex === null || !containerRef.current) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const containerSize = direction === 'horizontal' 
      ? containerRect.width 
      : containerRect.height;

    const currentPosition = getPositionFromEvent(event, direction);
    const delta = currentPosition - startPositionRef.current;
    const deltaPercent = (delta / containerSize) * 100;

    const newSizes = [...startSizesRef.current];
    
    // Calculate new sizes for the two adjacent panels
    let newLeftSize = newSizes[activeIndex] + deltaPercent;
    let newRightSize = (newSizes[activeIndex + 1] || 0) - deltaPercent;

    // Apply min/max constraints
    const minLeft = minSizes[activeIndex] || 5;
    const maxLeft = maxSizes[activeIndex] || 95;
    const minRight = minSizes[activeIndex + 1] || 5;
    const maxRight = maxSizes[activeIndex + 1] || 95;

    // Constrain left panel
    if (newLeftSize < minLeft) {
      const diff = minLeft - newLeftSize;
      newLeftSize = minLeft;
      newRightSize += diff;
    } else if (newLeftSize > maxLeft) {
      const diff = newLeftSize - maxLeft;
      newLeftSize = maxLeft;
      newRightSize += diff;
    }

    // Constrain right panel
    if (newRightSize < minRight) {
      const diff = minRight - newRightSize;
      newRightSize = minRight;
      newLeftSize -= diff;
    } else if (newRightSize > maxRight) {
      const diff = newRightSize - maxRight;
      newRightSize = maxRight;
      newLeftSize += diff;
    }

    // Final boundary check
    newLeftSize = Math.max(minLeft, Math.min(maxLeft, newLeftSize));
    newRightSize = Math.max(minRight, Math.min(maxRight, newRightSize));

    newSizes[activeIndex] = newLeftSize;
    newSizes[activeIndex + 1] = newRightSize;

    setSizesState(newSizes);
  }, [isDragging, activeIndex, direction, minSizes, maxSizes]);

  // Stop resize operation
  const stopResize = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setActiveIndex(null);
      onLayoutChange?.(sizes);
      if (persistenceKey) {
        persistSizesDebounced(persistenceKey, sizes);
      }
    }
  }, [isDragging, sizes, onLayoutChange, persistenceKey, persistSizesDebounced]);

  // Collapse a panel (store current size and minimize)
  const collapsePanel = useCallback((index: number) => {
    const currentSize = sizes[index];
    const minSize = minSizes[index] || 5;
    
    if (currentSize > minSize) {
      collapsedSizesRef.current.set(index, currentSize);
      const newSizes = [...sizes];
      const diff = currentSize - minSize;
      newSizes[index] = minSize;
      
      // Distribute the freed space to adjacent panels
      if (index + 1 < newSizes.length) {
        newSizes[index + 1] += diff;
      } else if (index > 0) {
        newSizes[index - 1] += diff;
      }
      
      setSizes(newSizes);
    }
  }, [sizes, setSizes, minSizes]);

  // Expand a previously collapsed panel
  const expandPanel = useCallback((index: number) => {
    const savedSize = collapsedSizesRef.current.get(index);
    if (savedSize !== undefined) {
      const newSizes = [...sizes];
      const currentSize = sizes[index];
      const diff = savedSize - currentSize;
      
      newSizes[index] = savedSize;
      
      // Take space from adjacent panels
      if (index + 1 < newSizes.length) {
        const available = newSizes[index + 1] - (minSizes[index + 1] || 5);
        const take = Math.min(diff, available);
        newSizes[index + 1] -= take;
      }
      
      collapsedSizesRef.current.delete(index);
      setSizes(normalizeSizes(newSizes));
    }
  }, [sizes, setSizes, minSizes]);

  // Add and remove event listeners
  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => {
        e.preventDefault();
        handleResize(e);
      };
      
      const handleTouchMove = (e: TouchEvent) => {
        handleResize(e);
      };
      
      const handleMouseUp = () => stopResize();
      const handleTouchEnd = () => stopResize();

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);

      // Add cursor style to body during drag
      document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging, handleResize, stopResize, direction]);

  return {
    sizes,
    setSizes,
    isDragging,
    activeIndex,
    startResize,
    handleResize,
    stopResize,
    containerRef: containerRef as React.RefObject<HTMLDivElement>,
    collapsePanel,
    expandPanel,
  };
}
