'use client';

/**
 * useElementInspector Hook
 *
 * Core logic for the Visual Element Inspector dev tool.
 * Manages inspection state, element selection, and prompt generation.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  ElementInspectorState,
  ElementInspectorActions,
  InspectedElement,
} from '@/types/elementInspector';
import {
  generateSelectorPath,
  generateDisplayName,
  extractComputedStyles,
  detectComponentName,
  guessSourceFiles,
  generateClaudePrompt,
} from '@/utils/elementInspector';

/**
 * Options for useElementInspector hook
 */
export interface UseElementInspectorOptions {
  /** Maximum number of elements that can be selected */
  maxSelections?: number;
  /** Callback when inspect mode changes */
  onInspectModeChange?: (active: boolean) => void;
}

/**
 * Return type for useElementInspector hook
 */
export type UseElementInspectorReturn = ElementInspectorState & ElementInspectorActions;

/**
 * Hook for managing element inspection state and actions
 */
export function useElementInspector(
  options: UseElementInspectorOptions = {}
): UseElementInspectorReturn {
  const { maxSelections = 10, onInspectModeChange } = options;

  // State
  const [isActive, setIsActive] = useState(false);
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);
  const [selectedElements, setSelectedElements] = useState<InspectedElement[]>([]);
  const [problemDescription, setProblemDescription] = useState('');
  const [desiredChange, setDesiredChange] = useState('');
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');

  // Refs for cleanup
  const previousBodyCursorRef = useRef<string>('');

  /**
   * Toggle inspect mode on/off
   */
  const toggleInspectMode = useCallback(() => {
    setIsActive(prev => {
      const newValue = !prev;

      // Update body cursor
      if (newValue) {
        previousBodyCursorRef.current = document.body.style.cursor;
        document.body.style.cursor = 'crosshair';
      } else {
        document.body.style.cursor = previousBodyCursorRef.current;
        setHoveredElement(null);
      }

      onInspectModeChange?.(newValue);
      return newValue;
    });
  }, [onInspectModeChange]);

  /**
   * Extract data from an element for selection
   */
  const extractElementData = useCallback((element: HTMLElement): InspectedElement => {
    const selectorPath = generateSelectorPath(element);
    const displayName = generateDisplayName(element);
    const computedStyles = extractComputedStyles(element);
    const reactComponentName = detectComponentName(element);

    const inspectedElement: InspectedElement = {
      id: `el_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      selectorPath,
      displayName,
      tagName: element.tagName.toLowerCase(),
      elementId: element.id || null,
      classNames: Array.from(element.classList),
      computedStyles,
      reactComponentName,
      guessedSourceFiles: [],
      textContent: element.textContent?.trim().slice(0, 200) || '',
      boundingRect: element.getBoundingClientRect(),
      element,
    };

    // Guess source files
    inspectedElement.guessedSourceFiles = guessSourceFiles(inspectedElement);

    return inspectedElement;
  }, []);

  /**
   * Toggle selection of an element
   */
  const toggleElementSelection = useCallback((element: HTMLElement) => {
    setSelectedElements(prev => {
      // Check if already selected
      const existingIndex = prev.findIndex(el => el.element === element);

      if (existingIndex !== -1) {
        // Remove from selection
        return prev.filter((_, i) => i !== existingIndex);
      }

      // Check max selections
      if (prev.length >= maxSelections) {
        console.warn(`Maximum of ${maxSelections} elements can be selected`);
        return prev;
      }

      // Add to selection
      const elementData = extractElementData(element);
      return [...prev, elementData];
    });
  }, [maxSelections, extractElementData]);

  /**
   * Remove a selected element by id
   */
  const removeSelectedElement = useCallback((id: string) => {
    setSelectedElements(prev => prev.filter(el => el.id !== id));
  }, []);

  /**
   * Clear all selections
   */
  const clearAllSelections = useCallback(() => {
    setSelectedElements([]);
  }, []);

  /**
   * Generate the Claude prompt
   */
  const generatePrompt = useCallback(() => {
    console.log('[ElementInspector] Generating prompt...', {
      selectedElements: selectedElements.length,
      problemDescription,
      desiredChange,
    });

    try {
      const prompt = generateClaudePrompt(
        selectedElements,
        problemDescription,
        desiredChange
      );
      console.log('[ElementInspector] Prompt generated:', prompt.slice(0, 100) + '...');
      setGeneratedPrompt(prompt);
      setIsPromptModalOpen(true);
    } catch (error) {
      console.error('[ElementInspector] Error generating prompt:', error);
    }
  }, [selectedElements, problemDescription, desiredChange]);

  /**
   * Copy prompt to clipboard
   */
  const copyPromptToClipboard = useCallback(async (): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      return true;
    } catch (err) {
      console.error('Failed to copy prompt to clipboard:', err);
      return false;
    }
  }, [generatedPrompt]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previousBodyCursorRef.current) {
        document.body.style.cursor = previousBodyCursorRef.current;
      }
    };
  }, []);

  // Keyboard shortcut: Escape to exit inspect mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isActive) {
        toggleInspectMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, toggleInspectMode]);

  return {
    // State
    isActive,
    hoveredElement,
    selectedElements,
    problemDescription,
    desiredChange,
    isPromptModalOpen,
    generatedPrompt,

    // Actions
    toggleInspectMode,
    setHoveredElement,
    toggleElementSelection,
    removeSelectedElement,
    clearAllSelections,
    setProblemDescription,
    setDesiredChange,
    generatePrompt,
    setPromptModalOpen: setIsPromptModalOpen,
    copyPromptToClipboard,
  };
}

export default useElementInspector;
