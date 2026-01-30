/**
 * CSSParticleEffect
 *
 * Lightweight, zero-dependency particle effect using CSS animations.
 * Generates a configurable number of animated particles as absolutely
 * positioned elements with randomized keyframe animations.
 *
 * Designed as a drop-in replacement path for @tsparticles if heavier
 * particle systems are needed later.
 */

import React, { useMemo } from 'react';
import type { VisualEffect } from '@/types/layoutDesign';

interface CSSParticleEffectProps {
  config: NonNullable<VisualEffect['particleConfig']>;
  colors: string[];
  /** Unique ID for scoping keyframe names */
  effectId: string;
}

interface Particle {
  id: number;
  x: number; // start x position (%)
  y: number; // start y position (%)
  size: number; // px
  color: string;
  duration: number; // seconds
  delay: number; // seconds
  dx: number; // end x offset (%)
  dy: number; // end y offset (%)
  opacityStart: number;
  opacityEnd: number;
}

/**
 * Generate random particles based on the config.
 */
function generateParticles(
  config: NonNullable<VisualEffect['particleConfig']>,
  colors: string[],
  count: number
): Particle[] {
  const particles: Particle[] = [];
  const sizeMin = config.size?.min ?? 2;
  const sizeMax = config.size?.max ?? 8;
  const opStart = config.opacity?.start ?? 1;
  const opEnd = config.opacity?.end ?? 0;
  const speed = config.speed ?? 'medium';
  const direction = config.direction ?? 'random';

  // Speed → duration mapping
  const baseDuration = speed === 'slow' ? 4 : speed === 'fast' ? 1.5 : 2.5;

  for (let i = 0; i < count; i++) {
    const rand = () => Math.random();
    const color = colors[Math.floor(rand() * colors.length)] || '#ffffff';
    const size = sizeMin + rand() * (sizeMax - sizeMin);
    const duration = baseDuration + rand() * baseDuration * 0.6;
    const delay = rand() * duration; // Stagger start times

    // Direction → end offset
    let dx = 0;
    let dy = 0;
    const distance = 30 + rand() * 40; // 30-70% travel distance
    switch (direction) {
      case 'up':
        dy = -distance;
        dx = (rand() - 0.5) * 20;
        break;
      case 'down':
        dy = distance;
        dx = (rand() - 0.5) * 20;
        break;
      case 'left':
        dx = -distance;
        dy = (rand() - 0.5) * 20;
        break;
      case 'right':
        dx = distance;
        dy = (rand() - 0.5) * 20;
        break;
      case 'radial':
        const angle = rand() * Math.PI * 2;
        dx = Math.cos(angle) * distance;
        dy = Math.sin(angle) * distance;
        break;
      case 'random':
      default:
        dx = (rand() - 0.5) * distance * 2;
        dy = (rand() - 0.5) * distance * 2;
        break;
    }

    particles.push({
      id: i,
      x: 10 + rand() * 80, // Start within 10-90% of container
      y: 10 + rand() * 80,
      size,
      color,
      duration,
      delay,
      dx,
      dy,
      opacityStart: opStart,
      opacityEnd: opEnd,
    });
  }

  return particles;
}

/**
 * Build the CSS keyframes and styles for all particles in a single <style> tag.
 */
function buildParticleCSS(particles: Particle[], effectId: string): string {
  const rules: string[] = [];

  for (const p of particles) {
    const name = `particle-${effectId}-${p.id}`;
    rules.push(`
@keyframes ${name} {
  0% {
    transform: translate(0, 0) scale(1);
    opacity: ${p.opacityStart};
  }
  100% {
    transform: translate(${p.dx}px, ${p.dy}px) scale(0.5);
    opacity: ${p.opacityEnd};
  }
}`);
  }

  return rules.join('\n');
}

/**
 * Get the border-radius for a particle shape.
 */
function getShapeBorderRadius(shape: string | undefined): string {
  switch (shape) {
    case 'circle':
      return '50%';
    case 'square':
      return '0';
    case 'star':
      return '2px'; // Approximate — true stars would need clip-path
    default:
      return '50%';
  }
}

export const CSSParticleEffect: React.FC<CSSParticleEffectProps> = ({
  config,
  colors,
  effectId,
}) => {
  // Cap particle count to prevent excessive DOM elements and CSS rules
  const count = Math.min(Math.max(config.count ?? 15, 0), 100);

  const { particles, cssText } = useMemo(() => {
    const generated = generateParticles(config, colors, count);
    const css = buildParticleCSS(generated, effectId);
    return { particles: generated, cssText: css };
    // effectId is stable per component, config/colors change when Gemini re-analyzes
  }, [config, colors, count, effectId]);

  const borderRadius = getShapeBorderRadius(config.shape);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: cssText }} />
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            borderRadius,
            pointerEvents: 'none',
            animation: `particle-${effectId}-${p.id} ${p.duration}s ease-out ${p.delay}s infinite`,
            willChange: 'transform, opacity',
          }}
        />
      ))}
    </>
  );
};
