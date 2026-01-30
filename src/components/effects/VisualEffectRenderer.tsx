/**
 * VisualEffectRenderer
 *
 * Renders a visual effect overlay layer INSIDE a positioned component.
 * Routes effects to the appropriate renderer based on type:
 *
 * - css-animation → Handled by KeyframeInjector (no overlay needed here)
 * - particle-system → CSSParticleEffect overlay
 * - canvas-effect → Future: Canvas-based rendering
 *
 * IMPORTANT: This component must be rendered as a CHILD of a positioned element
 * (position: absolute or relative). The overlay uses absolute inset-0 to cover
 * the parent component. pointer-events: none ensures clicks pass through.
 */

import React from 'react';
import type { VisualEffect } from '@/types/layoutDesign';
import { CSSParticleEffect } from './CSSParticleEffect';

interface VisualEffectRendererProps {
  effects: VisualEffect[];
  /** Component ID for generating unique effect IDs */
  componentId: string;
}

/**
 * VisualEffectRenderer component.
 * Renders an overlay div with particle/canvas effects positioned over the parent.
 * Must be placed inside a positioned parent (the component's main div).
 * CSS animations are handled separately by KeyframeInjector at the layout level.
 */
export const VisualEffectRenderer: React.FC<VisualEffectRendererProps> = ({
  effects,
  componentId,
}) => {
  // Filter to only effects that need an overlay (particle-system, canvas-effect)
  // css-animation effects are handled by KeyframeInjector + inline style.animation
  const overlayEffects = effects.filter(
    (e) => e.type === 'particle-system' || e.type === 'canvas-effect'
  );

  // No overlay effects — render nothing
  if (overlayEffects.length === 0) {
    return null;
  }

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-visible"
      style={{ zIndex: 9999 }}
      aria-hidden="true"
    >
      {overlayEffects.map((effect, index) => {
        if (effect.type === 'particle-system' && effect.particleConfig) {
          return (
            <CSSParticleEffect
              key={`${componentId}-effect-${index}`}
              config={effect.particleConfig}
              colors={effect.particleConfig.colors || ['#ffffff']}
              effectId={`${componentId}-${index}`}
            />
          );
        }

        // canvas-effect: future implementation
        // For now, render nothing — the effect type is recognized but not yet supported
        if (effect.type === 'canvas-effect') {
          if (process.env.NODE_ENV === 'development') {
            console.log(
              `[VisualEffectRenderer] Canvas effect not yet supported: ${effect.description}`
            );
          }
          return null;
        }

        return null;
      })}
    </div>
  );
};
