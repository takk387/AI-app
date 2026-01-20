'use client';

/**
 * StatePreview Component
 *
 * Interactive preview for component states.
 * Shows buttons, inputs, cards, and links with CSS transitions between states.
 */

import React, { useState, useMemo, CSSProperties } from 'react';
import type {
  ComponentType,
  ComponentState,
  AnyComponentSpec,
  LinkSpec,
} from '@/hooks/useComponentStates';
import type { ButtonSpec, InputSpec, CardSpec } from '@/types/layoutDesign';

// ============================================================================
// TYPES
// ============================================================================

interface StatePreviewProps {
  componentType: ComponentType;
  spec: AnyComponentSpec;
  forcedState?: ComponentState;
  className?: string;
  label?: string;
}

// ============================================================================
// STYLE BUILDERS
// ============================================================================

function buildButtonStyle(spec: ButtonSpec, state: ComponentState): CSSProperties {
  const states = spec.states as Record<string, Record<string, string>>;
  const stateStyles = states[state] || spec.states.default;

  // NOTE: Using neutral gray as fallback - actual colors are AI-generated based on design description
  return {
    background: stateStyles.background || '#6B7280',
    color: stateStyles.color || '#FFFFFF',
    borderColor: stateStyles.borderColor || 'transparent',
    borderWidth: stateStyles.borderWidth || '0px',
    borderStyle: 'solid',
    boxShadow: stateStyles.boxShadow || 'none',
    transform: stateStyles.transform || 'none',
    opacity: stateStyles.opacity ? parseFloat(stateStyles.opacity) : 1,
    borderRadius: spec.borderRadius || '8px',
    padding: spec.padding || '12px 24px',
    fontSize: spec.fontSize || '14px',
    fontWeight: spec.fontWeight || 500,
    transition: spec.transition || 'all 0.2s ease',
    cursor: state === 'disabled' ? 'not-allowed' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    outline: 'none',
    textDecoration: 'none',
  };
}

function buildInputStyle(spec: InputSpec, state: ComponentState): CSSProperties {
  const states = spec.states as Record<string, Record<string, string>>;
  const stateStyles = states[state] || spec.states.default;

  return {
    background: stateStyles.background || 'transparent',
    color: stateStyles.color || '#F8FAFC',
    borderColor: stateStyles.borderColor || '#334155',
    borderWidth: stateStyles.borderWidth || '1px',
    borderStyle: 'solid',
    boxShadow: stateStyles.boxShadow || 'none',
    opacity: stateStyles.opacity ? parseFloat(stateStyles.opacity) : 1,
    borderRadius: spec.borderRadius || '8px',
    padding: spec.padding || '10px 14px',
    fontSize: spec.fontSize || '14px',
    transition: 'all 0.2s ease',
    width: '100%',
    outline: 'none',
  };
}

function buildCardStyle(spec: CardSpec, state: ComponentState): CSSProperties {
  const states = spec.states as Record<string, Record<string, string>>;
  const stateStyles = states[state] || spec.states.default;

  return {
    background: stateStyles.background || spec.background || '#1E293B',
    borderColor: stateStyles.borderColor || '#334155',
    borderWidth: stateStyles.borderWidth || '1px',
    borderStyle: 'solid',
    boxShadow: stateStyles.boxShadow || spec.shadow || 'none',
    transform: stateStyles.transform || 'none',
    borderRadius: spec.borderRadius || '12px',
    padding: spec.padding || '20px',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
  };
}

function buildLinkStyle(spec: LinkSpec, state: ComponentState): CSSProperties {
  const states = spec.states as Record<string, Record<string, string>>;
  const stateStyles = states[state] || spec.states.default;

  // NOTE: Using neutral gray as fallback - actual colors are AI-generated based on design description
  return {
    color: stateStyles.color || '#6B7280',
    textDecoration: stateStyles.textDecoration || 'none',
    opacity: stateStyles.opacity ? parseFloat(stateStyles.opacity) : 1,
    background: stateStyles.background || 'transparent',
    fontSize: spec.fontSize || '14px',
    fontWeight: spec.fontWeight || 500,
    transition: spec.transition || 'all 0.15s ease',
    cursor: 'pointer',
    display: 'inline-block',
    padding: '2px 4px',
    borderRadius: '2px',
  };
}

// ============================================================================
// PREVIEW COMPONENTS
// ============================================================================

function ButtonPreview({ spec, forcedState }: { spec: ButtonSpec; forcedState?: ComponentState }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const currentState = useMemo((): ComponentState => {
    if (forcedState) return forcedState;
    if (isActive) return 'active';
    if (isFocused) return 'focus';
    if (isHovered) return 'hover';
    return 'default';
  }, [forcedState, isActive, isFocused, isHovered]);

  const style = useMemo(() => buildButtonStyle(spec, currentState), [spec, currentState]);

  return (
    <button
      type="button"
      style={style}
      disabled={forcedState === 'disabled'}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsActive(false);
      }}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onMouseDown={() => setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
    >
      <span>Button</span>
    </button>
  );
}

function InputPreview({ spec, forcedState }: { spec: InputSpec; forcedState?: ComponentState }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const currentState = useMemo((): ComponentState => {
    if (forcedState) return forcedState;
    if (isFocused) return 'focus';
    if (isHovered) return 'hover';
    return 'default';
  }, [forcedState, isFocused, isHovered]);

  const style = useMemo(() => buildInputStyle(spec, currentState), [spec, currentState]);
  const labelStyle = spec.labelStyle || { color: '#94A3B8', fontSize: '12px' };

  return (
    <div className="space-y-1.5 w-full">
      <label style={labelStyle as CSSProperties}>Label</label>
      <input
        type="text"
        placeholder="Enter text..."
        style={style}
        disabled={forcedState === 'disabled'}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
      {forcedState === 'error' && (
        <span className="text-xs text-red-400">This field has an error</span>
      )}
    </div>
  );
}

function CardPreview({ spec, forcedState }: { spec: CardSpec; forcedState?: ComponentState }) {
  const [isHovered, setIsHovered] = useState(false);

  const currentState = useMemo((): ComponentState => {
    if (forcedState) return forcedState;
    if (isHovered) return 'hover';
    return 'default';
  }, [forcedState, isHovered]);

  const style = useMemo(() => buildCardStyle(spec, currentState), [spec, currentState]);

  return (
    <div
      style={style}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-garden-500 to-gold-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-slate-200 truncate">Card Title</h4>
          <p className="text-sm text-slate-400 mt-1">
            Card description text that shows the preview.
          </p>
        </div>
      </div>
    </div>
  );
}

function LinkPreview({ spec, forcedState }: { spec: LinkSpec; forcedState?: ComponentState }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const currentState = useMemo((): ComponentState => {
    if (forcedState) return forcedState;
    if (isActive) return 'active';
    if (isFocused) return 'focus';
    if (isHovered) return 'hover';
    return 'default';
  }, [forcedState, isActive, isFocused, isHovered]);

  const style = useMemo(() => buildLinkStyle(spec, currentState), [spec, currentState]);

  return (
    <a
      href="#"
      style={style}
      onClick={(e) => e.preventDefault()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsActive(false);
      }}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onMouseDown={() => setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
    >
      Click this link
    </a>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function StatePreview({
  componentType,
  spec,
  forcedState,
  className = '',
  label,
}: StatePreviewProps) {
  const renderPreview = () => {
    switch (componentType) {
      case 'button':
        return <ButtonPreview spec={spec as ButtonSpec} forcedState={forcedState} />;
      case 'input':
        return <InputPreview spec={spec as InputSpec} forcedState={forcedState} />;
      case 'card':
        return <CardPreview spec={spec as CardSpec} forcedState={forcedState} />;
      case 'link':
        return <LinkPreview spec={spec as LinkSpec} forcedState={forcedState} />;
      default:
        return null;
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center min-h-[120px] ${className}`}>
      {label && <div className="text-xs text-slate-500 mb-2">{label}</div>}
      {renderPreview()}
      {!forcedState && (
        <div className="text-xs text-slate-600 mt-3">Hover, click, or focus to see states</div>
      )}
    </div>
  );
}

/**
 * Multi-state preview grid showing all states at once
 */
export function StatePreviewGrid({
  componentType,
  spec,
  states,
  className = '',
}: {
  componentType: ComponentType;
  spec: AnyComponentSpec;
  states: ComponentState[];
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 gap-4 ${className}`}>
      {states.map((state) => (
        <div key={state} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
          <div className="text-xs text-slate-500 mb-2 uppercase tracking-wide">{state}</div>
          <StatePreview componentType={componentType} spec={spec} forcedState={state} />
        </div>
      ))}
    </div>
  );
}

export default StatePreview;
