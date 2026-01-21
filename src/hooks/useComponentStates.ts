'use client';

/**
 * useComponentStates Hook
 *
 * Manages component state editing for buttons, inputs, cards, and links.
 * Supports default, hover, focus, active, and disabled states with live preview.
 */

import { useState, useCallback, useMemo } from 'react';
import type { ButtonSpec, InputSpec, CardSpec } from '@/types/layoutDesign';

// ============================================================================
// TYPES
// ============================================================================

export type ComponentType = 'button' | 'input' | 'card' | 'link';
export type ComponentState = 'default' | 'hover' | 'focus' | 'active' | 'disabled' | 'error';

export interface StateProperty {
  name: string;
  type: 'color' | 'number' | 'string' | 'select';
  label: string;
  unit?: string;
  options?: string[];
  min?: number;
  max?: number;
}

export interface LinkSpec {
  variant: string;
  states: {
    default: Record<string, string>;
    hover: Record<string, string>;
    focus: Record<string, string>;
    active: Record<string, string>;
    visited?: Record<string, string>;
  };
  fontSize: string;
  fontWeight: number;
  textDecoration: string;
  transition: string;
}

export type AnyComponentSpec = ButtonSpec | InputSpec | CardSpec | LinkSpec;

export interface UseComponentStatesReturn {
  // Current state
  componentType: ComponentType;
  currentState: ComponentState;
  spec: AnyComponentSpec;

  // State values
  getStateValue: (property: string) => string;
  setStateValue: (property: string, value: string) => void;

  // Batch operations
  copyState: (fromState: ComponentState, toState: ComponentState) => void;
  resetState: (state: ComponentState) => void;
  resetAllStates: () => void;

  // Navigation
  setComponentType: (type: ComponentType) => void;
  setCurrentState: (state: ComponentState) => void;

  // Available properties
  availableProperties: StateProperty[];
  availableStates: ComponentState[];

  // Update full spec
  updateSpec: (updates: Partial<AnyComponentSpec>) => void;
  setSpec: (spec: AnyComponentSpec) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const BUTTON_PROPERTIES: StateProperty[] = [
  { name: 'background', type: 'color', label: 'Background' },
  { name: 'color', type: 'color', label: 'Text Color' },
  { name: 'borderColor', type: 'color', label: 'Border Color' },
  { name: 'borderWidth', type: 'number', label: 'Border Width', unit: 'px', min: 0, max: 10 },
  { name: 'boxShadow', type: 'string', label: 'Box Shadow' },
  { name: 'transform', type: 'string', label: 'Transform' },
  { name: 'opacity', type: 'number', label: 'Opacity', min: 0, max: 1 },
];

const INPUT_PROPERTIES: StateProperty[] = [
  { name: 'background', type: 'color', label: 'Background' },
  { name: 'color', type: 'color', label: 'Text Color' },
  { name: 'borderColor', type: 'color', label: 'Border Color' },
  { name: 'borderWidth', type: 'number', label: 'Border Width', unit: 'px', min: 0, max: 10 },
  { name: 'boxShadow', type: 'string', label: 'Box Shadow' },
  { name: 'outline', type: 'string', label: 'Outline' },
  { name: 'placeholderColor', type: 'color', label: 'Placeholder Color' },
];

const CARD_PROPERTIES: StateProperty[] = [
  { name: 'background', type: 'color', label: 'Background' },
  { name: 'borderColor', type: 'color', label: 'Border Color' },
  { name: 'borderWidth', type: 'number', label: 'Border Width', unit: 'px', min: 0, max: 10 },
  { name: 'boxShadow', type: 'string', label: 'Box Shadow' },
  { name: 'transform', type: 'string', label: 'Transform' },
];

const LINK_PROPERTIES: StateProperty[] = [
  { name: 'color', type: 'color', label: 'Text Color' },
  {
    name: 'textDecoration',
    type: 'select',
    label: 'Text Decoration',
    options: ['none', 'underline', 'line-through'],
  },
  { name: 'opacity', type: 'number', label: 'Opacity', min: 0, max: 1 },
  { name: 'background', type: 'color', label: 'Background' },
];

const PROPERTIES_BY_TYPE: Record<ComponentType, StateProperty[]> = {
  button: BUTTON_PROPERTIES,
  input: INPUT_PROPERTIES,
  card: CARD_PROPERTIES,
  link: LINK_PROPERTIES,
};

const STATES_BY_TYPE: Record<ComponentType, ComponentState[]> = {
  button: ['default', 'hover', 'focus', 'active', 'disabled'],
  input: ['default', 'hover', 'focus', 'error', 'disabled'],
  card: ['default', 'hover'],
  link: ['default', 'hover', 'focus', 'active'],
};

// ============================================================================
// DEFAULT SPECS
// ============================================================================

// NOTE: Using neutral gray colors as defaults - actual colors are AI-generated based on design description
const DEFAULT_BUTTON_SPEC: ButtonSpec = {
  variant: 'primary',
  size: 'md',
  states: {
    default: {
      background: '#6B7280',
      color: '#FFFFFF',
      borderColor: 'transparent',
      borderWidth: '0px',
      boxShadow: 'none',
      transform: 'none',
    },
    hover: {
      background: '#4B5563',
      color: '#FFFFFF',
      borderColor: 'transparent',
      borderWidth: '0px',
      boxShadow: '0 4px 12px rgba(107, 114, 128, 0.4)',
      transform: 'translateY(-1px)',
    },
    focus: {
      background: '#6B7280',
      color: '#FFFFFF',
      borderColor: 'transparent',
      borderWidth: '0px',
      boxShadow: '0 0 0 3px rgba(107, 114, 128, 0.5)',
      transform: 'none',
    },
    active: {
      background: '#374151',
      color: '#FFFFFF',
      borderColor: 'transparent',
      borderWidth: '0px',
      boxShadow: 'none',
      transform: 'translateY(1px)',
    },
    disabled: {
      background: '#64748B',
      color: '#94A3B8',
      borderColor: 'transparent',
      borderWidth: '0px',
      boxShadow: 'none',
      transform: 'none',
      opacity: '0.6',
    },
  },
  borderRadius: '8px',
  padding: '12px 24px',
  fontSize: '14px',
  fontWeight: 500,
  transition: 'all 0.2s ease',
};

const DEFAULT_INPUT_SPEC: InputSpec = {
  variant: 'outlined',
  size: 'md',
  states: {
    default: {
      background: 'transparent',
      color: '#F8FAFC',
      borderColor: '#334155',
      borderWidth: '1px',
      boxShadow: 'none',
    },
    hover: {
      background: 'transparent',
      color: '#F8FAFC',
      borderColor: '#475569',
      borderWidth: '1px',
      boxShadow: 'none',
    },
    focus: {
      background: 'transparent',
      color: '#F8FAFC',
      borderColor: '#6B7280',
      borderWidth: '2px',
      boxShadow: '0 0 0 3px rgba(107, 114, 128, 0.2)',
    },
    error: {
      background: 'rgba(107, 114, 128, 0.1)',
      color: '#F8FAFC',
      borderColor: '#6B7280',
      borderWidth: '1px',
      boxShadow: 'none',
    },
    disabled: {
      background: '#1E293B',
      color: '#64748B',
      borderColor: '#334155',
      borderWidth: '1px',
      boxShadow: 'none',
      opacity: '0.5',
    },
  },
  borderRadius: '8px',
  padding: '10px 14px',
  fontSize: '14px',
  labelStyle: { color: '#94A3B8', fontSize: '12px', fontWeight: '500' },
  placeholderStyle: { color: '#64748B' },
};

const DEFAULT_CARD_SPEC: CardSpec = {
  variant: 'elevated',
  states: {
    default: {
      background: '#1E293B',
      borderColor: '#334155',
      borderWidth: '1px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      transform: 'none',
    },
    hover: {
      background: '#1E293B',
      borderColor: '#475569',
      borderWidth: '1px',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
      transform: 'translateY(-4px)',
    },
  },
  borderRadius: '12px',
  padding: '20px',
  shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  border: '1px solid #334155',
  background: '#1E293B',
};

// NOTE: Using neutral gray colors as defaults - actual colors are AI-generated based on design description
const DEFAULT_LINK_SPEC: LinkSpec = {
  variant: 'default',
  states: {
    default: {
      color: '#6B7280',
      textDecoration: 'none',
      opacity: '1',
      background: 'transparent',
    },
    hover: {
      color: '#9CA3AF',
      textDecoration: 'underline',
      opacity: '1',
      background: 'transparent',
    },
    focus: {
      color: '#6B7280',
      textDecoration: 'underline',
      opacity: '1',
      background: 'rgba(107, 114, 128, 0.1)',
    },
    active: {
      color: '#4B5563',
      textDecoration: 'underline',
      opacity: '1',
      background: 'transparent',
    },
  },
  fontSize: '14px',
  fontWeight: 500,
  textDecoration: 'none',
  transition: 'all 0.15s ease',
};

const DEFAULT_SPECS: Record<ComponentType, AnyComponentSpec> = {
  button: DEFAULT_BUTTON_SPEC,
  input: DEFAULT_INPUT_SPEC,
  card: DEFAULT_CARD_SPEC,
  link: DEFAULT_LINK_SPEC,
};

// ============================================================================
// HOOK
// ============================================================================

export function useComponentStates(
  initialType: ComponentType = 'button',
  initialSpec?: AnyComponentSpec
): UseComponentStatesReturn {
  const [componentType, setComponentType] = useState<ComponentType>(initialType);
  const [currentState, setCurrentState] = useState<ComponentState>('default');
  const [spec, setSpecInternal] = useState<AnyComponentSpec>(
    initialSpec || DEFAULT_SPECS[initialType]
  );

  // Get value for a property in current state
  const getStateValue = useCallback(
    (property: string): string => {
      const states = (spec as { states: Record<string, Record<string, string>> }).states;
      return states[currentState]?.[property] || '';
    },
    [spec, currentState]
  );

  // Set value for a property in current state
  const setStateValue = useCallback(
    (property: string, value: string) => {
      setSpecInternal((prev) => {
        const newSpec = { ...prev };
        const states = (newSpec as { states: Record<string, Record<string, string>> }).states;
        states[currentState] = {
          ...states[currentState],
          [property]: value,
        };
        return newSpec;
      });
    },
    [currentState]
  );

  // Copy all properties from one state to another
  const copyState = useCallback((fromState: ComponentState, toState: ComponentState) => {
    setSpecInternal((prev) => {
      const newSpec = { ...prev };
      const states = (newSpec as { states: Record<string, Record<string, string>> }).states;
      states[toState] = { ...states[fromState] };
      return newSpec;
    });
  }, []);

  // Reset a specific state to defaults
  const resetState = useCallback(
    (state: ComponentState) => {
      const defaultSpec = DEFAULT_SPECS[componentType];
      const defaultStates = (defaultSpec as { states: Record<string, Record<string, string>> })
        .states;

      setSpecInternal((prev) => {
        const newSpec = { ...prev };
        const states = (newSpec as { states: Record<string, Record<string, string>> }).states;
        states[state] = { ...defaultStates[state] };
        return newSpec;
      });
    },
    [componentType]
  );

  // Reset all states to defaults
  const resetAllStates = useCallback(() => {
    setSpecInternal(DEFAULT_SPECS[componentType]);
  }, [componentType]);

  // Update spec with partial values
  const updateSpec = useCallback((updates: Partial<AnyComponentSpec>) => {
    setSpecInternal((prev) => ({ ...prev, ...updates }) as AnyComponentSpec);
  }, []);

  // Set complete spec
  const setSpec = useCallback((newSpec: AnyComponentSpec) => {
    setSpecInternal(newSpec);
  }, []);

  // Handle component type change
  const handleSetComponentType = useCallback((type: ComponentType) => {
    setComponentType(type);
    setCurrentState('default');
    setSpecInternal(DEFAULT_SPECS[type]);
  }, []);

  // Memoized available properties and states
  const availableProperties = useMemo(() => PROPERTIES_BY_TYPE[componentType], [componentType]);

  const availableStates = useMemo(() => STATES_BY_TYPE[componentType], [componentType]);

  return {
    componentType,
    currentState,
    spec,
    getStateValue,
    setStateValue,
    copyState,
    resetState,
    resetAllStates,
    setComponentType: handleSetComponentType,
    setCurrentState,
    availableProperties,
    availableStates,
    updateSpec,
    setSpec,
  };
}

export default useComponentStates;

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

export { DEFAULT_SPECS, PROPERTIES_BY_TYPE, STATES_BY_TYPE };
