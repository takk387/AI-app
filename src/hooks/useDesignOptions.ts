/**
 * useDesignOptions Hook
 *
 * Manages design option generation and selection for Click + Talk mode.
 * Handles API calls to generate variations and tracks selection state.
 */

import { useState, useCallback } from 'react';
import type { LayoutDesign, SelectedElementInfo } from '@/types/layoutDesign';
import type { DesignOption } from '@/components/layout-builder/DesignOptionsPanel';

interface UseDesignOptionsReturn {
  /** Current design options available */
  options: DesignOption[];
  /** Whether options are being generated */
  isGenerating: boolean;
  /** Currently selected option index */
  selectedIndex: number;
  /** Whether the options panel should be shown */
  isOpen: boolean;
  /** Error message if generation failed */
  error: string | null;
  /** Generate new design options based on request */
  generateOptions: (
    request: string,
    element?: SelectedElementInfo | null,
    currentDesign?: Partial<LayoutDesign>,
    count?: number
  ) => Promise<void>;
  /** Select an option and apply its changes */
  selectOption: (option: DesignOption) => void;
  /** Navigate to a specific option */
  setSelectedIndex: (index: number) => void;
  /** Open the options panel */
  openPanel: () => void;
  /** Close the options panel */
  closePanel: () => void;
  /** Clear all options */
  clearOptions: () => void;
}

/**
 * Hook for managing design option generation and selection
 */
export function useDesignOptions(
  onApplyChanges?: (changes: Partial<LayoutDesign>) => void
): UseDesignOptionsReturn {
  const [options, setOptions] = useState<DesignOption[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Generate design options via API
   */
  const generateOptions = useCallback(
    async (
      request: string,
      element?: SelectedElementInfo | null,
      currentDesign?: Partial<LayoutDesign>,
      count: number = 3
    ) => {
      setIsGenerating(true);
      setError(null);
      setIsOpen(true);

      try {
        const response = await fetch('/api/layout/generate-options', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            request,
            element: element || null,
            currentDesign: currentDesign || {},
            count,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to generate options');
        }

        const data = await response.json();

        if (data.options && Array.isArray(data.options)) {
          setOptions(data.options);
          setSelectedIndex(0);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to generate options';
        setError(message);
        console.error('Design options generation failed:', err);
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  /**
   * Select an option and apply its changes
   */
  const selectOption = useCallback(
    (option: DesignOption) => {
      if (onApplyChanges && option.changes) {
        onApplyChanges(option.changes);
      }
      setIsOpen(false);
    },
    [onApplyChanges]
  );

  /**
   * Open the options panel
   */
  const openPanel = useCallback(() => {
    setIsOpen(true);
  }, []);

  /**
   * Close the options panel
   */
  const closePanel = useCallback(() => {
    setIsOpen(false);
  }, []);

  /**
   * Clear all options
   */
  const clearOptions = useCallback(() => {
    setOptions([]);
    setSelectedIndex(0);
    setError(null);
  }, []);

  return {
    options,
    isGenerating,
    selectedIndex,
    isOpen,
    error,
    generateOptions,
    selectOption,
    setSelectedIndex,
    openPanel,
    closePanel,
    clearOptions,
  };
}

export default useDesignOptions;
