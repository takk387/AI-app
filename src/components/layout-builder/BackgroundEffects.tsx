'use client';

import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import type {
  BackgroundEffectConfig,
  ParticlesConfig,
  FloatingShapesConfig,
  GradientAnimationConfig,
  AuroraConfig,
  WavesConfig,
  CustomImageConfig,
  AnyBackgroundEffectConfig,
} from '@/types/layoutDesign';

interface BackgroundEffectsProps {
  config: AnyBackgroundEffectConfig;
  className?: string;
}

// ============================================================================
// Utility Functions
// ============================================================================

function getIntensityValue(intensity: 'subtle' | 'medium' | 'strong'): number {
  switch (intensity) {
    case 'subtle':
      return 0.3;
    case 'medium':
      return 0.6;
    case 'strong':
      return 1.0;
    default:
      return 0.6;
  }
}

function getParticleCount(intensity: 'subtle' | 'medium' | 'strong'): number {
  switch (intensity) {
    case 'subtle':
      return 20;
    case 'medium':
      return 50;
    case 'strong':
      return 100;
    default:
      return 50;
  }
}

function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})`;
  }
  return `rgba(100, 100, 100, ${alpha})`;
}

// ============================================================================
// Particles Effect
// ============================================================================

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
}

function ParticlesEffect({ config }: { config: ParticlesConfig }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number | undefined>(undefined);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  const opacity = config.opacity ?? 0.6;

  const initParticles = useCallback(
    (width: number, height: number) => {
      const count = config.count ?? getParticleCount(config.intensity);
      const colors = config.colors || ['#6B7280', '#9CA3AF', '#D1D5DB'];
      const speed = config.speed ?? 1;
      const sizeRange = config.sizeRange || [2, 6];

      particlesRef.current = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        size: sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]),
        color: colors[Math.floor(Math.random() * colors.length)],
      }));
    },
    [config.count, config.colors, config.speed, config.sizeRange, config.intensity]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      initParticles(canvas.width, canvas.height);
    };

    resize();
    window.addEventListener('resize', resize);

    const handleMouseMove = (e: MouseEvent) => {
      if (!config.interactive) return;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    canvas.addEventListener('mousemove', handleMouseMove);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((particle, i) => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Bounce off edges
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

        // Interactive: push particles away from mouse
        if (config.interactive) {
          const dx = particle.x - mouseRef.current.x;
          const dy = particle.y - mouseRef.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            particle.vx += (dx / dist) * 0.5;
            particle.vy += (dy / dist) * 0.5;
          }
          // Damping
          particle.vx *= 0.99;
          particle.vy *= 0.99;
        }

        // Draw particle
        ctx.beginPath();
        if (config.shape === 'square') {
          ctx.rect(
            particle.x - particle.size / 2,
            particle.y - particle.size / 2,
            particle.size,
            particle.size
          );
        } else if (config.shape === 'triangle') {
          ctx.moveTo(particle.x, particle.y - particle.size);
          ctx.lineTo(particle.x - particle.size, particle.y + particle.size);
          ctx.lineTo(particle.x + particle.size, particle.y + particle.size);
          ctx.closePath();
        } else if (config.shape === 'star') {
          const spikes = 5;
          const outerRadius = particle.size;
          const innerRadius = particle.size / 2;
          let rot = (Math.PI / 2) * 3;
          const step = Math.PI / spikes;
          ctx.moveTo(particle.x, particle.y - outerRadius);
          for (let j = 0; j < spikes; j++) {
            ctx.lineTo(
              particle.x + Math.cos(rot) * outerRadius,
              particle.y + Math.sin(rot) * outerRadius
            );
            rot += step;
            ctx.lineTo(
              particle.x + Math.cos(rot) * innerRadius,
              particle.y + Math.sin(rot) * innerRadius
            );
            rot += step;
          }
          ctx.closePath();
        } else {
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        }
        ctx.fillStyle = hexToRgba(particle.color, opacity);
        ctx.fill();

        // Draw connecting lines
        if (config.connectLines) {
          const lineDistance = config.lineDistance ?? 100;
          for (let j = i + 1; j < particlesRef.current.length; j++) {
            const other = particlesRef.current[j];
            const dx = particle.x - other.x;
            const dy = particle.y - other.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < lineDistance) {
              ctx.beginPath();
              ctx.moveTo(particle.x, particle.y);
              ctx.lineTo(other.x, other.y);
              ctx.strokeStyle = hexToRgba(
                particle.color,
                (1 - dist / lineDistance) * opacity * 0.5
              );
              ctx.stroke();
            }
          }
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [config, initParticles, opacity]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-auto" />;
}

// ============================================================================
// Floating Shapes Effect
// ============================================================================

function FloatingShapesEffect({ config }: { config: FloatingShapesConfig }) {
  const opacity = config.opacity ?? 0.4;
  const shouldBlur = config.blur ?? true;

  const items = useMemo(() => {
    const count = config.count ?? getParticleCount(config.intensity);
    const colors = config.colors || ['#6B7280', '#9CA3AF', '#D1D5DB', '#E5E7EB'];
    const shapes = config.shapes || ['circle', 'square', 'blob'];
    const speed = config.speed ?? 1;

    return Array.from({ length: count }, (_, i) => ({
      id: i,
      shape: shapes[i % shapes.length],
      color: colors[i % colors.length],
      size: 20 + Math.random() * 80,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: (15 + Math.random() * 20) / speed,
      delay: Math.random() * -20,
      // Pre-compute random float offsets for consistent animation
      floatX: (Math.random() - 0.5) * 100,
      floatY: (Math.random() - 0.5) * 100,
    }));
  }, [config.count, config.colors, config.shapes, config.speed, config.intensity]);

  const renderShape = (shape: string, color: string, size: number) => {
    const style: React.CSSProperties = {
      width: size,
      height: size,
      backgroundColor: hexToRgba(color, opacity),
      filter: shouldBlur ? `blur(${size / 4}px)` : undefined,
    };

    switch (shape) {
      case 'square':
        return <div style={{ ...style, borderRadius: '10%' }} />;
      case 'triangle':
        return (
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: `${size / 2}px solid transparent`,
              borderRight: `${size / 2}px solid transparent`,
              borderBottom: `${size}px solid ${hexToRgba(color, opacity)}`,
              filter: shouldBlur ? `blur(${size / 6}px)` : undefined,
            }}
          />
        );
      case 'blob':
        return (
          <div
            style={{
              ...style,
              borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
            }}
          />
        );
      default: // circle
        return <div style={{ ...style, borderRadius: '50%' }} />;
    }
  };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {items.map((item) => (
        <div
          key={item.id}
          className="absolute animate-float"
          style={
            {
              left: `${item.x}%`,
              top: `${item.y}%`,
              animationDuration: `${item.duration}s`,
              animationDelay: `${item.delay}s`,
              '--float-x': `${item.floatX}px`,
              '--float-y': `${item.floatY}px`,
            } as React.CSSProperties
          }
        >
          {renderShape(item.shape, item.color, item.size)}
        </div>
      ))}
      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translate(0, 0) rotate(0deg);
          }
          25% {
            transform: translate(var(--float-x), var(--float-y)) rotate(90deg);
          }
          50% {
            transform: translate(calc(var(--float-x) * -0.5), calc(var(--float-y) * 1.5))
              rotate(180deg);
          }
          75% {
            transform: translate(calc(var(--float-x) * -1), calc(var(--float-y) * -0.5))
              rotate(270deg);
          }
        }
        .animate-float {
          animation: float linear infinite;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Gradient Animation Effect
// ============================================================================

function GradientAnimationEffect({ config }: { config: GradientAnimationConfig }) {
  const colors = config.colors || ['#6B7280', '#9CA3AF', '#D1D5DB', '#E5E7EB'];
  const speed = config.speed ?? 1;
  const opacity = config.opacity ?? 0.6;
  const animationType = config.animationType || 'shift';
  const angle = config.angle ?? 45;

  const gradientColors = colors.join(', ');
  const duration = 10 / speed;

  const getAnimation = () => {
    switch (animationType) {
      case 'rotate':
        return `gradient-rotate ${duration}s linear infinite`;
      case 'pulse':
        return `gradient-pulse ${duration}s ease-in-out infinite`;
      case 'wave':
        return `gradient-wave ${duration}s ease-in-out infinite`;
      default: // shift
        return `gradient-shift ${duration}s linear infinite`;
    }
  };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(${angle}deg, ${gradientColors})`,
          backgroundSize: animationType === 'shift' ? '400% 400%' : '100% 100%',
          opacity,
          animation: getAnimation(),
        }}
      />
      <style jsx>{`
        @keyframes gradient-shift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        @keyframes gradient-rotate {
          0% {
            filter: hue-rotate(0deg);
          }
          100% {
            filter: hue-rotate(360deg);
          }
        }
        @keyframes gradient-pulse {
          0%,
          100% {
            opacity: ${opacity * 0.5};
            transform: scale(1);
          }
          50% {
            opacity: ${opacity};
            transform: scale(1.05);
          }
        }
        @keyframes gradient-wave {
          0%,
          100% {
            transform: translateY(0) scaleY(1);
          }
          50% {
            transform: translateY(-2%) scaleY(1.02);
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Parallax Dots Effect
// ============================================================================

function ParallaxDotsEffect({ config }: { config: BackgroundEffectConfig }) {
  const opacity = config.opacity ?? 0.4;

  const dotLayers = useMemo(() => {
    const intensity = getIntensityValue(config.intensity);
    const colors = config.colors || ['#6B7280', '#9CA3AF'];

    return [
      { size: 2, spacing: 30, speed: 0.5, color: colors[0] },
      { size: 3, spacing: 50, speed: 1, color: colors[1] || colors[0] },
      { size: 4, spacing: 80, speed: 1.5, color: colors[0] },
    ].slice(0, Math.ceil(intensity * 3));
  }, [config.intensity, config.colors]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {dotLayers.map((layer, i) => (
        <div
          key={i}
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle, ${hexToRgba(layer.color, opacity)} ${layer.size / 2}px, transparent ${layer.size / 2}px)`,
            backgroundSize: `${layer.spacing}px ${layer.spacing}px`,
            animation: `parallax-scroll ${20 / layer.speed}s linear infinite`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes parallax-scroll {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(-100px);
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Mesh Gradient Effect
// ============================================================================

function MeshGradientEffect({ config }: { config: BackgroundEffectConfig }) {
  const opacity = config.opacity ?? 0.5;
  const speed = config.speed ?? 1;
  const duration = 20 / speed;

  const blobs = useMemo(() => {
    const colors = config.colors || ['#6B7280', '#9CA3AF', '#D1D5DB', '#E5E7EB'];

    return colors.map((color, i) => ({
      color,
      x: 20 + (i % 2) * 60,
      y: 20 + Math.floor(i / 2) * 60,
      size: 40 + Math.random() * 30,
      delay: i * -5,
    }));
  }, [config.colors]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0" style={{ filter: 'blur(60px)' }}>
        {blobs.map((blob, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${blob.x}%`,
              top: `${blob.y}%`,
              width: `${blob.size}%`,
              height: `${blob.size}%`,
              backgroundColor: hexToRgba(blob.color, opacity),
              animation: `mesh-move ${duration}s ease-in-out infinite`,
              animationDelay: `${blob.delay}s`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}
      </div>
      <style jsx>{`
        @keyframes mesh-move {
          0%,
          100% {
            transform: translate(-50%, -50%) scale(1);
          }
          33% {
            transform: translate(-30%, -70%) scale(1.2);
          }
          66% {
            transform: translate(-70%, -30%) scale(0.8);
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Aurora Effect
// ============================================================================

function AuroraEffect({ config }: { config: AuroraConfig }) {
  const colors = config.colors || ['#6B7280', '#9CA3AF', '#D1D5DB', '#E5E7EB'];
  const waves = config.waves ?? 3;
  const speed = config.speed ?? 1;
  const opacity = config.opacity ?? 0.4;

  const duration = 15 / speed;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: waves }, (_, i) => (
        <div
          key={i}
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, transparent 0%, ${hexToRgba(colors[i % colors.length], opacity)} 50%, transparent 100%)`,
            animation: `aurora-wave ${duration + i * 2}s ease-in-out infinite`,
            animationDelay: `${i * -5}s`,
            transform: `translateY(${i * 10}%)`,
            filter: 'blur(30px)',
          }}
        />
      ))}
      <style jsx>{`
        @keyframes aurora-wave {
          0%,
          100% {
            transform: translateX(-20%) translateY(0) scaleX(1.5);
            opacity: ${opacity * 0.5};
          }
          50% {
            transform: translateX(20%) translateY(-10%) scaleX(1.2);
            opacity: ${opacity};
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Waves Effect
// ============================================================================

function WavesEffect({ config }: { config: WavesConfig }) {
  const colors = config.colors || ['#6B7280', '#9CA3AF', '#D1D5DB'];
  const layers = config.layers ?? 3;
  const speed = config.speed ?? 1;
  const opacity = config.opacity ?? 0.3;
  const amplitude = config.amplitude ?? 'medium';

  const amplitudeValue = amplitude === 'small' ? 10 : amplitude === 'large' ? 30 : 20;
  const duration = 8 / speed;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg
        className="absolute bottom-0 w-full"
        style={{ height: '40%' }}
        viewBox="0 0 1200 200"
        preserveAspectRatio="none"
      >
        {Array.from({ length: layers }, (_, i) => {
          const yOffset = 150 - i * 20;
          const color = colors[i % colors.length];
          return (
            <path
              key={i}
              fill={hexToRgba(color, opacity - i * 0.05)}
              style={{
                animation: `wave-path ${duration + i}s ease-in-out infinite`,
                animationDelay: `${i * -2}s`,
              }}
              d={`M0,${yOffset}
                 C150,${yOffset - amplitudeValue} 350,${yOffset + amplitudeValue} 600,${yOffset}
                 C850,${yOffset - amplitudeValue} 1050,${yOffset + amplitudeValue} 1200,${yOffset}
                 L1200,200 L0,200 Z`}
            />
          );
        })}
      </svg>
      <style jsx>{`
        @keyframes wave-path {
          0%,
          100% {
            d: path(
              'M0,150 C150,120 350,180 600,150 C850,120 1050,180 1200,150 L1200,200 L0,200 Z'
            );
          }
          50% {
            d: path(
              'M0,150 C150,180 350,120 600,150 C850,180 1050,120 1200,150 L1200,200 L0,200 Z'
            );
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Custom Image Effect
// ============================================================================

function CustomImageEffect({ config }: { config: CustomImageConfig }) {
  const opacity = config.opacity ?? 1;
  const size = config.size || 'cover';
  const position = config.position || 'center';
  const attachment = config.attachment || 'scroll';
  const blend = config.blend || 'normal';

  if (!config.imageUrl) {
    return null;
  }

  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundImage: `url(${config.imageUrl})`,
        backgroundSize: size,
        backgroundPosition: position,
        backgroundAttachment: attachment,
        backgroundRepeat: 'no-repeat',
        opacity,
        mixBlendMode: blend,
      }}
    />
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function BackgroundEffects({ config, className = '' }: BackgroundEffectsProps) {
  if (!config.enabled || config.type === 'none') {
    return null;
  }

  const renderEffect = () => {
    switch (config.type) {
      case 'particles':
        return <ParticlesEffect config={config as ParticlesConfig} />;
      case 'floating-shapes':
        return <FloatingShapesEffect config={config as FloatingShapesConfig} />;
      case 'gradient-animation':
        return <GradientAnimationEffect config={config as GradientAnimationConfig} />;
      case 'parallax-dots':
        return <ParallaxDotsEffect config={config} />;
      case 'mesh-gradient':
        return <MeshGradientEffect config={config} />;
      case 'aurora':
        return <AuroraEffect config={config as AuroraConfig} />;
      case 'waves':
        return <WavesEffect config={config as WavesConfig} />;
      case 'custom-image':
        return <CustomImageEffect config={config as CustomImageConfig} />;
      default:
        return null;
    }
  };

  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none z-0 ${className}`}
      aria-hidden="true"
    >
      {renderEffect()}
    </div>
  );
}

export default BackgroundEffects;
