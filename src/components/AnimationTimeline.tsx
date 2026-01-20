'use client';

/**
 * AnimationTimeline Component
 *
 * Visual keyframe timeline editor with playhead scrubbing,
 * property tracks, and animation preview.
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  type CustomAnimation,
  type Keyframe,
  type KeyframeProperties,
  type EasingFunction,
  PROPERTY_TRACKS,
  DEFAULT_ANIMATION,
  addKeyframe,
  removeKeyframe,
  updateKeyframe,
  interpolateKeyframes,
  propertiesToStyle,
  generateAnimationCSS,
  generateKeyframeId,
} from '@/utils/keyframeUtils';

// NOTE: Animation presets removed - animations are AI-generated based on design description

// ============================================================================
// TYPES
// ============================================================================

interface AnimationTimelineProps {
  animation?: CustomAnimation;
  onChange?: (animation: CustomAnimation) => void;
  onExport?: (css: string) => void;
  className?: string;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function TimelineRuler({
  duration,
  currentTime,
  onClick,
}: {
  duration: number;
  currentTime: number;
  onClick: (time: number) => void;
}) {
  const rulerRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / rect.width) * 100;
    onClick(Math.max(0, Math.min(100, time)));
  };

  // Generate time markers
  const markers = useMemo(() => {
    const count = 11; // 0%, 10%, 20%, ..., 100%
    return Array.from({ length: count }, (_, i) => ({
      percent: i * 10,
      ms: Math.round((i / 10) * duration),
    }));
  }, [duration]);

  return (
    <div
      ref={rulerRef}
      onClick={handleClick}
      className="relative h-8 bg-slate-800 border-b border-slate-700 cursor-pointer select-none"
    >
      {/* Time markers */}
      {markers.map(({ percent, ms }) => (
        <div
          key={percent}
          className="absolute top-0 bottom-0 flex flex-col items-center"
          style={{ left: `${percent}%` }}
        >
          <div className="w-px h-3 bg-slate-600" />
          <span className="text-[9px] text-slate-500 mt-0.5">
            {percent === 0 ? '0' : percent === 100 ? `${ms}ms` : `${percent}%`}
          </span>
        </div>
      ))}

      {/* Playhead */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
        style={{ left: `${currentTime}%` }}
      >
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rotate-45" />
      </div>
    </div>
  );
}

function PropertyTrack({
  property,
  label,
  keyframes,
  currentTime,
  selectedKeyframeId,
  onKeyframeSelect,
  onKeyframeMove,
  onAddKeyframe,
}: {
  property: keyof KeyframeProperties;
  label: string;
  keyframes: Keyframe[];
  currentTime: number;
  selectedKeyframeId: string | null;
  onKeyframeSelect: (id: string) => void;
  onKeyframeMove: (id: string, time: number) => void;
  onAddKeyframe: (time: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  // Get keyframes that have this property
  const relevantKeyframes = keyframes.filter((kf) => kf.properties[property] !== undefined);

  const handleMouseDown = (e: React.MouseEvent, kfId: string) => {
    e.stopPropagation();
    setDragging(kfId);
    onKeyframeSelect(kfId);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging || !trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const time = Math.max(0, Math.min(100, (x / rect.width) * 100));
      onKeyframeMove(dragging, Math.round(time));
    },
    [dragging, onKeyframeMove]
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

  const handleTrackClick = (e: React.MouseEvent) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = Math.round((x / rect.width) * 100);
    onAddKeyframe(time);
  };

  return (
    <div className="flex items-center border-b border-slate-800">
      {/* Track label */}
      <div className="w-28 px-3 py-2 text-xs text-slate-400 bg-slate-900/50 border-r border-slate-800 flex-shrink-0">
        {label}
      </div>

      {/* Track area */}
      <div
        ref={trackRef}
        onClick={handleTrackClick}
        className="flex-1 h-10 bg-slate-900/30 relative cursor-crosshair"
      >
        {/* Current time indicator */}
        <div
          className="absolute top-0 bottom-0 w-px bg-red-500/30"
          style={{ left: `${currentTime}%` }}
        />

        {/* Keyframe diamonds */}
        {relevantKeyframes.map((kf) => (
          <div
            key={kf.id}
            onMouseDown={(e) => handleMouseDown(e, kf.id)}
            className={`
              absolute top-1/2 -translate-y-1/2 -translate-x-1/2
              w-4 h-4 rotate-45 cursor-move transition-all
              ${
                selectedKeyframeId === kf.id
                  ? 'bg-garden-500 ring-2 ring-garden-300 scale-110'
                  : 'bg-gold-400 hover:bg-gold-300'
              }
              ${dragging === kf.id ? 'scale-125' : ''}
            `}
            style={{ left: `${kf.time}%` }}
            title={`${kf.time}%`}
          />
        ))}
      </div>
    </div>
  );
}

function PlaybackControls({
  isPlaying,
  speed,
  loop,
  onPlayPause,
  onStop,
  onSpeedChange,
  onLoopToggle,
}: {
  isPlaying: boolean;
  speed: number;
  loop: boolean;
  onPlayPause: () => void;
  onStop: () => void;
  onSpeedChange: (speed: number) => void;
  onLoopToggle: () => void;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 border-b border-slate-700">
      {/* Play/Pause */}
      <button
        onClick={onPlayPause}
        className={`p-2 rounded-lg transition-colors ${
          isPlaying ? 'bg-red-600 text-white' : 'bg-garden-600 text-white hover:bg-garden-500'
        }`}
      >
        {isPlaying ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Stop */}
      <button
        onClick={onStop}
        className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <rect x="6" y="6" width="12" height="12" />
        </svg>
      </button>

      {/* Speed selector */}
      <div className="flex items-center gap-1 ml-2">
        <span className="text-xs text-slate-500">Speed:</span>
        <select
          value={speed}
          onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
          className="text-xs bg-slate-800 border border-slate-600 rounded px-2 py-1 text-slate-300"
        >
          <option value={0.25}>0.25x</option>
          <option value={0.5}>0.5x</option>
          <option value={1}>1x</option>
          <option value={2}>2x</option>
        </select>
      </div>

      {/* Loop toggle */}
      <button
        onClick={onLoopToggle}
        className={`p-2 rounded-lg transition-colors ${
          loop ? 'bg-gold-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'
        }`}
        title="Loop"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </button>
    </div>
  );
}

function AnimationPreview({
  animation,
  currentTime,
  isPlaying,
}: {
  animation: CustomAnimation;
  currentTime: number;
  isPlaying: boolean;
}) {
  const style = useMemo(() => {
    const properties = interpolateKeyframes(animation.keyframes, currentTime);
    return propertiesToStyle(properties);
  }, [animation.keyframes, currentTime]);

  return (
    <div className="p-6 bg-slate-900 rounded-lg border border-slate-700 flex items-center justify-center min-h-[120px]">
      <div
        className="w-16 h-16 bg-gradient-to-br from-garden-500 to-gold-400 rounded-lg shadow-lg"
        style={style}
      />
    </div>
  );
}

function AnimationSettings({
  animation,
  onChange,
}: {
  animation: CustomAnimation;
  onChange: (updates: Partial<CustomAnimation>) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="block text-xs text-slate-400 mb-1">Name</label>
        <input
          type="text"
          value={animation.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="w-full px-3 py-1.5 text-sm bg-slate-800 border border-slate-600 rounded-lg text-slate-200 focus:border-garden-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-400 mb-1">Duration (ms)</label>
        <input
          type="number"
          value={animation.duration}
          onChange={(e) => onChange({ duration: parseInt(e.target.value) || 500 })}
          min={100}
          max={10000}
          step={100}
          className="w-full px-3 py-1.5 text-sm bg-slate-800 border border-slate-600 rounded-lg text-slate-200 focus:border-garden-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-400 mb-1">Delay (ms)</label>
        <input
          type="number"
          value={animation.delay}
          onChange={(e) => onChange({ delay: parseInt(e.target.value) || 0 })}
          min={0}
          max={5000}
          step={100}
          className="w-full px-3 py-1.5 text-sm bg-slate-800 border border-slate-600 rounded-lg text-slate-200 focus:border-garden-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-400 mb-1">Iterations</label>
        <select
          value={animation.iterationCount === 'infinite' ? 'infinite' : animation.iterationCount}
          onChange={(e) =>
            onChange({
              iterationCount: e.target.value === 'infinite' ? 'infinite' : parseInt(e.target.value),
            })
          }
          className="w-full px-3 py-1.5 text-sm bg-slate-800 border border-slate-600 rounded-lg text-slate-200 focus:border-garden-500 focus:outline-none"
        >
          <option value={1}>1</option>
          <option value={2}>2</option>
          <option value={3}>3</option>
          <option value={5}>5</option>
          <option value="infinite">Infinite</option>
        </select>
      </div>
      <div>
        <label className="block text-xs text-slate-400 mb-1">Direction</label>
        <select
          value={animation.direction}
          onChange={(e) => onChange({ direction: e.target.value as CustomAnimation['direction'] })}
          className="w-full px-3 py-1.5 text-sm bg-slate-800 border border-slate-600 rounded-lg text-slate-200 focus:border-garden-500 focus:outline-none"
        >
          <option value="normal">Normal</option>
          <option value="reverse">Reverse</option>
          <option value="alternate">Alternate</option>
          <option value="alternate-reverse">Alternate Reverse</option>
        </select>
      </div>
      <div>
        <label className="block text-xs text-slate-400 mb-1">Fill Mode</label>
        <select
          value={animation.fillMode}
          onChange={(e) => onChange({ fillMode: e.target.value as CustomAnimation['fillMode'] })}
          className="w-full px-3 py-1.5 text-sm bg-slate-800 border border-slate-600 rounded-lg text-slate-200 focus:border-garden-500 focus:outline-none"
        >
          <option value="none">None</option>
          <option value="forwards">Forwards</option>
          <option value="backwards">Backwards</option>
          <option value="both">Both</option>
        </select>
      </div>
    </div>
  );
}

function AIGeneratedNote() {
  return (
    <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 text-center">
      <p className="text-sm text-slate-400">
        Animations are generated by AI based on your design description.
      </p>
      <p className="text-xs text-slate-500 mt-2">
        Use the timeline below to customize the generated animation.
      </p>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AnimationTimeline({
  animation: initialAnimation,
  onChange,
  onExport,
  className = '',
}: AnimationTimelineProps) {
  const [animation, setAnimation] = useState<CustomAnimation>(
    initialAnimation || { ...DEFAULT_ANIMATION, id: generateKeyframeId() }
  );
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [loop, setLoop] = useState(false);
  const [selectedKeyframeId, setSelectedKeyframeId] = useState<string | null>(null);
  const [activeProperties, setActiveProperties] = useState<Set<keyof KeyframeProperties>>(
    new Set(['opacity', 'translateY', 'scale'])
  );

  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Playback logic
  useEffect(() => {
    if (isPlaying) {
      startTimeRef.current = performance.now() - (currentTime / 100) * animation.duration;

      const animate = (timestamp: number) => {
        const elapsed = (timestamp - startTimeRef.current) * speed;
        const progress = (elapsed / animation.duration) * 100;

        if (progress >= 100) {
          if (loop || animation.iterationCount === 'infinite') {
            startTimeRef.current = timestamp;
            setCurrentTime(0);
          } else {
            setIsPlaying(false);
            setCurrentTime(100);
            return;
          }
        } else {
          setCurrentTime(progress);
        }

        animationRef.current = requestAnimationFrame(animate);
      };

      animationRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [isPlaying, animation.duration, speed, loop, animation.iterationCount, currentTime]);

  // Update parent when animation changes
  useEffect(() => {
    onChange?.(animation);
  }, [animation, onChange]);

  // Update animation
  const updateAnimation = useCallback((updates: Partial<CustomAnimation>) => {
    setAnimation((prev) => ({ ...prev, ...updates }));
  }, []);

  // Add keyframe
  const handleAddKeyframe = useCallback(
    (time: number) => {
      const newKeyframes = addKeyframe(animation.keyframes, time);
      updateAnimation({ keyframes: newKeyframes });
    },
    [animation.keyframes, updateAnimation]
  );

  // Remove selected keyframe
  const handleRemoveKeyframe = useCallback(() => {
    if (!selectedKeyframeId) return;
    const newKeyframes = removeKeyframe(animation.keyframes, selectedKeyframeId);
    updateAnimation({ keyframes: newKeyframes });
    setSelectedKeyframeId(null);
  }, [selectedKeyframeId, animation.keyframes, updateAnimation]);

  // Move keyframe
  const handleKeyframeMove = useCallback(
    (id: string, time: number) => {
      const newKeyframes = updateKeyframe(animation.keyframes, id, { time });
      updateAnimation({ keyframes: newKeyframes });
    },
    [animation.keyframes, updateAnimation]
  );

  // Update keyframe property
  const handleKeyframePropertyChange = useCallback(
    (property: keyof KeyframeProperties, value: number | string) => {
      if (!selectedKeyframeId) return;
      const keyframe = animation.keyframes.find((kf) => kf.id === selectedKeyframeId);
      if (!keyframe) return;

      const newKeyframes = updateKeyframe(animation.keyframes, selectedKeyframeId, {
        properties: { ...keyframe.properties, [property]: value },
      });
      updateAnimation({ keyframes: newKeyframes });
    },
    [selectedKeyframeId, animation.keyframes, updateAnimation]
  );

  // Update keyframe easing
  const handleEasingChange = useCallback(
    (easing: EasingFunction) => {
      if (!selectedKeyframeId) return;
      const newKeyframes = updateKeyframe(animation.keyframes, selectedKeyframeId, { easing });
      updateAnimation({ keyframes: newKeyframes });
    },
    [selectedKeyframeId, animation.keyframes, updateAnimation]
  );

  // Playback controls
  const handlePlayPause = () => setIsPlaying(!isPlaying);
  const handleStop = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  // Toggle property track
  const togglePropertyTrack = (property: keyof KeyframeProperties) => {
    setActiveProperties((prev) => {
      const next = new Set(prev);
      if (next.has(property)) {
        next.delete(property);
      } else {
        next.add(property);
      }
      return next;
    });
  };

  // Export CSS
  const handleExport = () => {
    const css = generateAnimationCSS(animation);
    onExport?.(css);
    navigator.clipboard.writeText(css);
  };

  // Get selected keyframe
  const selectedKeyframe = animation.keyframes.find((kf) => kf.id === selectedKeyframeId);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* AI-Generated Note */}
      <AIGeneratedNote />

      {/* Preview */}
      <div>
        <label className="block text-xs text-slate-400 mb-2">Preview</label>
        <AnimationPreview animation={animation} currentTime={currentTime} isPlaying={isPlaying} />
      </div>

      {/* Settings */}
      <div>
        <label className="block text-xs text-slate-400 mb-2">Animation Settings</label>
        <AnimationSettings animation={animation} onChange={updateAnimation} />
      </div>

      {/* Timeline */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-slate-400">Timeline</label>
          <span className="text-xs text-slate-500">
            {Math.round(currentTime)}% / {animation.duration}ms
          </span>
        </div>

        <div className="border border-slate-700 rounded-lg overflow-hidden">
          {/* Playback controls */}
          <PlaybackControls
            isPlaying={isPlaying}
            speed={speed}
            loop={loop}
            onPlayPause={handlePlayPause}
            onStop={handleStop}
            onSpeedChange={setSpeed}
            onLoopToggle={() => setLoop(!loop)}
          />

          {/* Ruler */}
          <TimelineRuler
            duration={animation.duration}
            currentTime={currentTime}
            onClick={setCurrentTime}
          />

          {/* Property tracks */}
          <div className="max-h-48 overflow-y-auto">
            {PROPERTY_TRACKS.filter((track) => activeProperties.has(track.property)).map(
              (track) => (
                <PropertyTrack
                  key={track.property}
                  property={track.property}
                  label={track.label}
                  keyframes={animation.keyframes}
                  currentTime={currentTime}
                  selectedKeyframeId={selectedKeyframeId}
                  onKeyframeSelect={setSelectedKeyframeId}
                  onKeyframeMove={handleKeyframeMove}
                  onAddKeyframe={handleAddKeyframe}
                />
              )
            )}
          </div>
        </div>

        {/* Track toggles */}
        <div className="flex flex-wrap gap-1 mt-2">
          {PROPERTY_TRACKS.map((track) => (
            <button
              key={track.property}
              onClick={() => togglePropertyTrack(track.property)}
              className={`px-2 py-1 text-[10px] rounded transition-colors ${
                activeProperties.has(track.property)
                  ? 'bg-garden-600 text-white'
                  : 'bg-slate-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              {track.label}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Keyframe Editor */}
      {selectedKeyframe && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-slate-400">Keyframe at {selectedKeyframe.time}%</label>
            <button
              onClick={handleRemoveKeyframe}
              className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
            >
              Delete
            </button>
          </div>

          <div className="bg-slate-800/30 rounded-lg p-3 space-y-3">
            {/* Time */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">Time (%)</label>
              <input
                type="number"
                value={selectedKeyframe.time}
                onChange={(e) =>
                  handleKeyframeMove(selectedKeyframe.id, parseInt(e.target.value) || 0)
                }
                min={0}
                max={100}
                className="w-full px-3 py-1.5 text-sm bg-slate-800 border border-slate-600 rounded-lg text-slate-200 focus:border-garden-500 focus:outline-none"
              />
            </div>

            {/* Properties */}
            <div className="grid grid-cols-2 gap-2">
              {PROPERTY_TRACKS.filter((track) => activeProperties.has(track.property)).map(
                (track) => (
                  <div key={track.property}>
                    <label className="block text-xs text-slate-500 mb-1">{track.label}</label>
                    {track.type === 'color' ? (
                      <input
                        type="color"
                        value={(selectedKeyframe.properties[track.property] as string) || '#000000'}
                        onChange={(e) =>
                          handleKeyframePropertyChange(track.property, e.target.value)
                        }
                        className="w-full h-8 rounded cursor-pointer"
                      />
                    ) : track.type === 'number' ? (
                      <input
                        type="number"
                        value={(selectedKeyframe.properties[track.property] as number) ?? ''}
                        onChange={(e) =>
                          handleKeyframePropertyChange(
                            track.property,
                            parseFloat(e.target.value) || 0
                          )
                        }
                        min={track.min}
                        max={track.max}
                        step={track.step || 1}
                        placeholder={`Enter ${track.label.toLowerCase()}`}
                        className="w-full px-3 py-1.5 text-sm bg-slate-800 border border-slate-600 rounded-lg text-slate-200 focus:border-garden-500 focus:outline-none"
                      />
                    ) : (
                      <input
                        type="text"
                        value={(selectedKeyframe.properties[track.property] as string) || ''}
                        onChange={(e) =>
                          handleKeyframePropertyChange(track.property, e.target.value)
                        }
                        placeholder={`Enter ${track.label.toLowerCase()}`}
                        className="w-full px-3 py-1.5 text-sm bg-slate-800 border border-slate-600 rounded-lg text-slate-200 focus:border-garden-500 focus:outline-none"
                      />
                    )}
                  </div>
                )
              )}
            </div>

            {/* Easing */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">Easing to Next</label>
              <select
                value={
                  typeof selectedKeyframe.easing === 'string' ? selectedKeyframe.easing : 'ease'
                }
                onChange={(e) => handleEasingChange(e.target.value as EasingFunction)}
                className="w-full px-3 py-1.5 text-sm bg-slate-800 border border-slate-600 rounded-lg text-slate-200 focus:border-garden-500 focus:outline-none"
              >
                <option value="linear">Linear</option>
                <option value="ease">Ease</option>
                <option value="ease-in">Ease In</option>
                <option value="ease-out">Ease Out</option>
                <option value="ease-in-out">Ease In Out</option>
                <option value="ease-in-cubic">Ease In Cubic</option>
                <option value="ease-out-cubic">Ease Out Cubic</option>
                <option value="ease-in-out-cubic">Ease In Out Cubic</option>
                <option value="ease-out-back">Ease Out Back</option>
                <option value="ease-out-bounce">Ease Out Bounce</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Export */}
      <div className="flex gap-2">
        <button
          onClick={handleExport}
          className="flex-1 px-4 py-2 bg-garden-600 text-white rounded-lg hover:bg-garden-500 transition-colors font-medium"
        >
          Export CSS
        </button>
        <button
          onClick={() => {
            const css = generateAnimationCSS(animation);
            const blob = new Blob([css], { type: 'text/css' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${animation.name}.css`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
        >
          Download
        </button>
      </div>
    </div>
  );
}

export default AnimationTimeline;
