'use client';

/**
 * EasingCurveEditor Component
 *
 * Visual cubic-bezier curve editor with draggable control points,
 * preset curves, and animation preview.
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  type EasingFunction,
  EASING_PRESETS,
  getEasingBezier,
  getEasingValue,
} from '@/utils/keyframeUtils';

// ============================================================================
// TYPES
// ============================================================================

interface EasingCurveEditorProps {
  value: EasingFunction;
  onChange: (easing: EasingFunction) => void;
  className?: string;
  showPreview?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

interface Point {
  x: number;
  y: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PRESET_CATEGORIES = [
  {
    name: 'Basic',
    presets: ['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out'],
  },
  {
    name: 'Quad',
    presets: ['ease-in-quad', 'ease-out-quad', 'ease-in-out-quad'],
  },
  {
    name: 'Cubic',
    presets: ['ease-in-cubic', 'ease-out-cubic', 'ease-in-out-cubic'],
  },
  {
    name: 'Quart',
    presets: ['ease-in-quart', 'ease-out-quart', 'ease-in-out-quart'],
  },
  {
    name: 'Back',
    presets: ['ease-in-back', 'ease-out-back', 'ease-in-out-back'],
  },
  {
    name: 'Special',
    presets: ['ease-out-bounce'],
  },
];

const SIZE_CONFIGS = {
  sm: { width: 150, height: 150, padding: 20 },
  md: { width: 200, height: 200, padding: 25 },
  lg: { width: 280, height: 280, padding: 30 },
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function PresetButton({
  preset,
  isSelected,
  onClick,
}: {
  preset: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  const presetData = EASING_PRESETS.find((p) => p.id === preset);
  if (!presetData) return null;

  return (
    <button
      onClick={onClick}
      className={`
        px-2 py-1 text-[10px] rounded transition-all
        ${
          isSelected
            ? 'bg-blue-600 text-white'
            : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
        }
      `}
      title={presetData.label}
    >
      {presetData.label.replace('Ease ', '').replace(' ', '')}
    </button>
  );
}

function AnimationPreviewBall({
  bezier,
  isPlaying,
  duration = 1000,
}: {
  bezier: [number, number, number, number];
  isPlaying: boolean;
  duration?: number;
}) {
  const [progress, setProgress] = useState(0);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (isPlaying) {
      startTimeRef.current = performance.now();

      const animate = (timestamp: number) => {
        const elapsed = timestamp - startTimeRef.current;
        const linearProgress = (elapsed % duration) / duration;
        setProgress(linearProgress);
        animationRef.current = requestAnimationFrame(animate);
      };

      animationRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    } else {
      setProgress(0);
    }
  }, [isPlaying, duration]);

  const easedProgress = getEasingValue(progress, bezier);

  return (
    <div className="relative h-10 bg-slate-800 rounded-lg overflow-hidden">
      {/* Track */}
      <div className="absolute inset-y-0 left-2 right-2 flex items-center">
        <div className="w-full h-1 bg-slate-700 rounded" />
      </div>

      {/* Ball */}
      <div
        className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full shadow-lg transition-none"
        style={{
          left: `calc(8px + ${easedProgress * (100 - 16)}%)`,
        }}
      />

      {/* Progress indicator */}
      <div className="absolute bottom-1 left-2 right-2 h-0.5 bg-slate-700 rounded overflow-hidden">
        <div className="h-full bg-blue-500/50" style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  );
}

function CurveCanvas({
  bezier,
  onChange,
  width,
  height,
  padding,
}: {
  bezier: [number, number, number, number];
  onChange: (bezier: [number, number, number, number]) => void;
  width: number;
  height: number;
  padding: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<'p1' | 'p2' | null>(null);

  const [x1, y1, x2, y2] = bezier;

  // Convert bezier coordinates to SVG coordinates
  const toSvg = useCallback(
    (x: number, y: number): Point => ({
      x: padding + x * (width - 2 * padding),
      y: height - padding - y * (height - 2 * padding),
    }),
    [width, height, padding]
  );

  // Convert SVG coordinates to bezier coordinates
  const toBezier = useCallback(
    (svgX: number, svgY: number): Point => ({
      x: Math.max(0, Math.min(1, (svgX - padding) / (width - 2 * padding))),
      y: Math.max(-0.5, Math.min(1.5, (height - padding - svgY) / (height - 2 * padding))),
    }),
    [width, height, padding]
  );

  // Control points in SVG coordinates
  const p0 = toSvg(0, 0);
  const p1 = toSvg(x1, y1);
  const p2 = toSvg(x2, y2);
  const p3 = toSvg(1, 1);

  // Path for the bezier curve
  const curvePath = `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`;

  // Handle mouse events
  const handleMouseDown = (point: 'p1' | 'p2') => (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(point);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging || !svgRef.current) return;

      const rect = svgRef.current.getBoundingClientRect();
      const svgX = e.clientX - rect.left;
      const svgY = e.clientY - rect.top;
      const point = toBezier(svgX, svgY);

      if (dragging === 'p1') {
        onChange([point.x, point.y, x2, y2]);
      } else {
        onChange([x1, y1, point.x, point.y]);
      }
    },
    [dragging, toBezier, onChange, x1, y1, x2, y2]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  // Generate curve preview points
  const curvePoints = useMemo(() => {
    const points: Point[] = [];
    for (let t = 0; t <= 1; t += 0.02) {
      const easedY = getEasingValue(t, bezier);
      points.push(toSvg(t, easedY));
    }
    return points;
  }, [bezier, toSvg]);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      className="bg-slate-900 rounded-lg cursor-crosshair"
    >
      {/* Grid */}
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#334155" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect
        x={padding}
        y={padding}
        width={width - 2 * padding}
        height={height - 2 * padding}
        fill="url(#grid)"
      />

      {/* Diagonal reference line */}
      <line
        x1={p0.x}
        y1={p0.y}
        x2={p3.x}
        y2={p3.y}
        stroke="#475569"
        strokeWidth="1"
        strokeDasharray="4"
      />

      {/* Control point lines */}
      <line x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke="#F59E0B" strokeWidth="1.5" />
      <line x1={p3.x} y1={p3.y} x2={p2.x} y2={p2.y} stroke="#10B981" strokeWidth="1.5" />

      {/* Bezier curve */}
      <path d={curvePath} fill="none" stroke="#3B82F6" strokeWidth="3" />

      {/* Curve preview (actual easing) */}
      <polyline
        points={curvePoints.map((p) => `${p.x},${p.y}`).join(' ')}
        fill="none"
        stroke="#60A5FA"
        strokeWidth="1"
        strokeDasharray="3"
        opacity={0.5}
      />

      {/* Endpoint circles */}
      <circle cx={p0.x} cy={p0.y} r="4" fill="#64748B" />
      <circle cx={p3.x} cy={p3.y} r="4" fill="#64748B" />

      {/* Control point 1 */}
      <circle
        cx={p1.x}
        cy={p1.y}
        r={dragging === 'p1' ? 10 : 8}
        fill="#F59E0B"
        stroke="#FCD34D"
        strokeWidth="2"
        className="cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown('p1')}
      />

      {/* Control point 2 */}
      <circle
        cx={p2.x}
        cy={p2.y}
        r={dragging === 'p2' ? 10 : 8}
        fill="#10B981"
        stroke="#6EE7B7"
        strokeWidth="2"
        className="cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown('p2')}
      />

      {/* Labels */}
      <text x={padding - 5} y={height - padding + 15} className="text-[10px] fill-slate-500">
        0
      </text>
      <text
        x={width - padding - 5}
        y={height - padding + 15}
        className="text-[10px] fill-slate-500"
      >
        1
      </text>
      <text x={padding - 15} y={height - padding + 3} className="text-[10px] fill-slate-500">
        0
      </text>
      <text x={padding - 15} y={padding + 3} className="text-[10px] fill-slate-500">
        1
      </text>
    </svg>
  );
}

function BezierInputs({
  bezier,
  onChange,
}: {
  bezier: [number, number, number, number];
  onChange: (bezier: [number, number, number, number]) => void;
}) {
  const [x1, y1, x2, y2] = bezier;

  const handleChange = (index: number, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;

    const newBezier: [number, number, number, number] = [...bezier];
    // x values clamped to 0-1, y values can be -0.5 to 1.5 for overshoot
    if (index === 0 || index === 2) {
      newBezier[index] = Math.max(0, Math.min(1, num));
    } else {
      newBezier[index] = Math.max(-0.5, Math.min(1.5, num));
    }
    onChange(newBezier);
  };

  return (
    <div className="grid grid-cols-4 gap-2">
      {[
        { label: 'x1', value: x1, color: 'amber' },
        { label: 'y1', value: y1, color: 'amber' },
        { label: 'x2', value: x2, color: 'emerald' },
        { label: 'y2', value: y2, color: 'emerald' },
      ].map(({ label, value, color }, i) => (
        <div key={label}>
          <label className={`text-[10px] text-${color}-400 block mb-0.5`}>{label}</label>
          <input
            type="number"
            value={value.toFixed(2)}
            onChange={(e) => handleChange(i, e.target.value)}
            step={0.05}
            min={i % 2 === 0 ? 0 : -0.5}
            max={i % 2 === 0 ? 1 : 1.5}
            className="w-full px-2 py-1.5 text-sm bg-slate-800 border border-slate-600 rounded text-slate-200 text-center focus:border-blue-500 focus:outline-none"
          />
        </div>
      ))}
    </div>
  );
}

function CSSOutput({ bezier }: { bezier: [number, number, number, number] }) {
  const cssValue = `cubic-bezier(${bezier.map((v) => v.toFixed(2)).join(', ')})`;

  const handleCopy = () => {
    navigator.clipboard.writeText(cssValue);
  };

  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 px-3 py-2 text-xs bg-slate-800 rounded-lg text-slate-300 font-mono overflow-x-auto">
        {cssValue}
      </code>
      <button
        onClick={handleCopy}
        className="px-3 py-2 text-xs bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
      >
        Copy
      </button>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function EasingCurveEditor({
  value,
  onChange,
  className = '',
  showPreview = true,
  size = 'md',
}: EasingCurveEditorProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Basic');

  // Get current bezier values
  const bezier = useMemo(() => getEasingBezier(value), [value]);

  // Handle bezier change
  const handleBezierChange = useCallback(
    (newBezier: [number, number, number, number]) => {
      onChange({ type: 'cubic-bezier', values: newBezier });
    },
    [onChange]
  );

  // Handle preset selection
  const handlePresetSelect = useCallback(
    (preset: string) => {
      onChange(preset as EasingFunction);
    },
    [onChange]
  );

  // Check if current value matches a preset
  const currentPreset = useMemo(() => {
    if (typeof value === 'string') return value;

    for (const preset of EASING_PRESETS) {
      const presetBezier = getEasingBezier(preset.id);
      if (
        Math.abs(presetBezier[0] - bezier[0]) < 0.01 &&
        Math.abs(presetBezier[1] - bezier[1]) < 0.01 &&
        Math.abs(presetBezier[2] - bezier[2]) < 0.01 &&
        Math.abs(presetBezier[3] - bezier[3]) < 0.01
      ) {
        return preset.id as string;
      }
    }
    return null;
  }, [value, bezier]);

  const sizeConfig = SIZE_CONFIGS[size];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Preset categories */}
      <div>
        <div className="flex gap-1 mb-2">
          {PRESET_CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setSelectedCategory(cat.name)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                selectedCategory === cat.name
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Presets */}
        <div className="flex flex-wrap gap-1">
          {PRESET_CATEGORIES.find((c) => c.name === selectedCategory)?.presets.map((preset) => (
            <PresetButton
              key={preset}
              preset={preset}
              isSelected={currentPreset === preset}
              onClick={() => handlePresetSelect(preset)}
            />
          ))}
        </div>
      </div>

      {/* Curve editor */}
      <div className="flex justify-center">
        <CurveCanvas
          bezier={bezier}
          onChange={handleBezierChange}
          width={sizeConfig.width}
          height={sizeConfig.height}
          padding={sizeConfig.padding}
        />
      </div>

      {/* Bezier inputs */}
      <BezierInputs bezier={bezier} onChange={handleBezierChange} />

      {/* CSS output */}
      <CSSOutput bezier={bezier} />

      {/* Animation preview */}
      {showPreview && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-slate-400">Preview</label>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                isPlaying ? 'bg-red-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-500'
              }`}
            >
              {isPlaying ? 'Stop' : 'Play'}
            </button>
          </div>
          <AnimationPreviewBall bezier={bezier} isPlaying={isPlaying} />
        </div>
      )}

      {/* Help text */}
      <div className="text-xs text-slate-500 p-3 bg-slate-800/30 rounded-lg">
        <p className="mb-1">
          <strong className="text-slate-400">Drag</strong> the control points to adjust the curve
        </p>
        <p>
          <span className="inline-block w-2 h-2 bg-amber-500 rounded-full mr-1" />
          First handle controls ease-in
          <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full mx-1 ml-2" />
          Second handle controls ease-out
        </p>
      </div>
    </div>
  );
}

export default EasingCurveEditor;
