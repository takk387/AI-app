/**
 * AnimationPanel Component
 *
 * Displays detected animations from video analysis with preview capabilities.
 * Allows editing animation parameters and applying them to the design.
 */

'use client';

import React, { useState } from 'react';
import {
  PlayIcon,
  PauseIcon,
  CopyIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ZapIcon,
  ClockIcon,
  XIcon,
  RefreshIcon,
} from './ui/Icons';
import type { DetectedAnimation, DetectedTransition } from '@/types/layoutDesign';

// ============================================================================
// TYPES
// ============================================================================

interface AnimationPanelProps {
  animations: DetectedAnimation[];
  transitions?: DetectedTransition[];
  onEditAnimation?: (id: string, updates: Partial<DetectedAnimation>) => void;
  onApplyAnimation?: (animation: DetectedAnimation, targetElement: string) => void;
  onRemoveAnimation?: (id: string) => void;
  onCreateCustom?: () => void;
  showCreateCustomButton?: boolean;
  className?: string;
}

type CodeFormat = 'css' | 'tailwind' | 'framer';

// ============================================================================
// ANIMATION PREVIEW COMPONENT
// ============================================================================

function AnimationPreview({
  animation,
  isPlaying,
}: {
  animation: DetectedAnimation;
  isPlaying: boolean;
}) {
  const getAnimationStyle = (): React.CSSProperties => {
    if (!isPlaying) return {};

    const baseStyle: React.CSSProperties = {
      animation: `preview-${animation.type} ${animation.duration} ${animation.easing} infinite`,
    };

    return baseStyle;
  };

  return (
    <div className="relative w-16 h-16 bg-slate-800 rounded-lg overflow-hidden flex items-center justify-center">
      <div
        className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded"
        style={getAnimationStyle()}
      />
      {/* CSS Keyframes injection */}
      <style jsx>{`
        @keyframes preview-fade {
          0%,
          100% {
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
        }
        @keyframes preview-slide {
          0%,
          100% {
            transform: translateX(-10px);
          }
          50% {
            transform: translateX(10px);
          }
        }
        @keyframes preview-scale {
          0%,
          100% {
            transform: scale(0.5);
          }
          50% {
            transform: scale(1);
          }
        }
        @keyframes preview-rotate {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        @keyframes preview-hover-effect {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }
        @keyframes preview-scroll-reveal {
          0%,
          100% {
            opacity: 0;
            transform: translateY(10px);
          }
          50% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// ANIMATION CARD COMPONENT
// ============================================================================

function AnimationCard({
  animation,
  onEdit,
  onApply,
  onRemove,
}: {
  animation: DetectedAnimation;
  onEdit?: (updates: Partial<DetectedAnimation>) => void;
  onApply?: (targetElement: string) => void;
  onRemove?: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [codeFormat, setCodeFormat] = useState<CodeFormat>('css');
  const [copiedCode, setCopiedCode] = useState(false);

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      fade: 'bg-blue-500/20 text-blue-400',
      slide: 'bg-green-500/20 text-green-400',
      scale: 'bg-purple-500/20 text-purple-400',
      rotate: 'bg-orange-500/20 text-orange-400',
      'hover-effect': 'bg-pink-500/20 text-pink-400',
      'scroll-reveal': 'bg-cyan-500/20 text-cyan-400',
    };
    return colors[type] || 'bg-slate-500/20 text-slate-400';
  };

  const generateCode = (): string => {
    switch (codeFormat) {
      case 'css':
        return `/* ${animation.type} animation */
@keyframes ${animation.id} {
  from {
    ${animation.property}: ${animation.fromValue};
  }
  to {
    ${animation.property}: ${animation.toValue};
  }
}

.element {
  animation: ${animation.id} ${animation.duration} ${animation.easing}${animation.delay ? ` ${animation.delay}` : ''};
}`;

      case 'tailwind':
        return `// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      keyframes: {
        '${animation.id}': {
          '0%': { ${animation.property}: '${animation.fromValue}' },
          '100%': { ${animation.property}: '${animation.toValue}' },
        },
      },
      animation: {
        '${animation.id}': '${animation.id} ${animation.duration} ${animation.easing}',
      },
    },
  },
}

// Usage: className="animate-${animation.id}"`;

      case 'framer':
        return `// Framer Motion
import { motion } from 'framer-motion';

const variants = {
  hidden: { ${animation.property}: '${animation.fromValue}' },
  visible: {
    ${animation.property}: '${animation.toValue}',
    transition: {
      duration: ${parseFloat(String(animation.duration)) / 1000 || 0.3},
      ease: '${animation.easing}'${animation.delay ? `,\n      delay: ${parseFloat(String(animation.delay)) / 1000}` : ''}
    }
  }
};

<motion.div
  variants={variants}
  initial="hidden"
  animate="visible"
>
  {content}
</motion.div>`;

      default:
        return '';
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generateCode());
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden bg-slate-800/50">
      {/* Header */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-800 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <ChevronDownIcon className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronRightIcon className="w-4 h-4 text-slate-400" />
        )}

        <AnimationPreview animation={animation} isPlaying={isPlaying} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(animation.type)}`}
            >
              {animation.type}
            </span>
            <span className="text-sm text-white truncate">{animation.element}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <ClockIcon className="w-3 h-3" />
              {animation.duration}
            </span>
            <span>{animation.easing}</span>
            <span className="text-purple-400">{Math.round(animation.confidence * 100)}% match</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1.5 hover:bg-slate-700 rounded transition-colors"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <PauseIcon className="w-4 h-4 text-slate-400" />
            ) : (
              <PlayIcon className="w-4 h-4 text-slate-400" />
            )}
          </button>
          {onRemove && (
            <button
              onClick={onRemove}
              className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
              title="Remove"
            >
              <XIcon className="w-4 h-4 text-slate-400 hover:text-red-400" />
            </button>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-white/10 p-4 space-y-4">
          {/* Animation Properties */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Property</label>
              <input
                type="text"
                value={animation.property}
                onChange={(e) => onEdit?.({ property: e.target.value })}
                className="w-full px-2 py-1.5 bg-slate-900 border border-white/10 rounded text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Duration</label>
              <input
                type="text"
                value={animation.duration}
                onChange={(e) => onEdit?.({ duration: e.target.value })}
                className="w-full px-2 py-1.5 bg-slate-900 border border-white/10 rounded text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">From Value</label>
              <input
                type="text"
                value={animation.fromValue}
                onChange={(e) => onEdit?.({ fromValue: e.target.value })}
                className="w-full px-2 py-1.5 bg-slate-900 border border-white/10 rounded text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">To Value</label>
              <input
                type="text"
                value={animation.toValue}
                onChange={(e) => onEdit?.({ toValue: e.target.value })}
                className="w-full px-2 py-1.5 bg-slate-900 border border-white/10 rounded text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Easing</label>
              <select
                value={animation.easing}
                onChange={(e) => onEdit?.({ easing: e.target.value })}
                className="w-full px-2 py-1.5 bg-slate-900 border border-white/10 rounded text-sm text-white"
              >
                <option value="ease">ease</option>
                <option value="ease-in">ease-in</option>
                <option value="ease-out">ease-out</option>
                <option value="ease-in-out">ease-in-out</option>
                <option value="linear">linear</option>
                <option value="cubic-bezier(0.4, 0, 0.2, 1)">smooth</option>
                <option value="cubic-bezier(0.68, -0.55, 0.265, 1.55)">bounce</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Delay</label>
              <input
                type="text"
                value={animation.delay || '0s'}
                onChange={(e) => onEdit?.({ delay: e.target.value })}
                className="w-full px-2 py-1.5 bg-slate-900 border border-white/10 rounded text-sm text-white"
              />
            </div>
          </div>

          {/* Code Output */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-slate-400">Generated Code</label>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCodeFormat('css')}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    codeFormat === 'css'
                      ? 'bg-purple-500/30 text-purple-400'
                      : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                  }`}
                >
                  CSS
                </button>
                <button
                  onClick={() => setCodeFormat('tailwind')}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    codeFormat === 'tailwind'
                      ? 'bg-purple-500/30 text-purple-400'
                      : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                  }`}
                >
                  Tailwind
                </button>
                <button
                  onClick={() => setCodeFormat('framer')}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    codeFormat === 'framer'
                      ? 'bg-purple-500/30 text-purple-400'
                      : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                  }`}
                >
                  Framer
                </button>
              </div>
            </div>
            <div className="relative">
              <pre className="p-3 bg-slate-900 rounded text-xs font-mono text-slate-300 overflow-x-auto max-h-48">
                {generateCode()}
              </pre>
              <button
                onClick={handleCopyCode}
                className="absolute top-2 right-2 p-1.5 bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                title="Copy code"
              >
                {copiedCode ? (
                  <CheckIcon className="w-4 h-4 text-green-400" />
                ) : (
                  <CopyIcon className="w-4 h-4 text-slate-400" />
                )}
              </button>
            </div>
          </div>

          {/* Apply Button */}
          {onApply && (
            <button
              onClick={() => onApply('selected-element')}
              className="w-full py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-sm font-medium text-white transition-colors"
            >
              Apply to Selected Element
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AnimationPanel({
  animations,
  transitions = [],
  onEditAnimation,
  onApplyAnimation,
  onRemoveAnimation,
  onCreateCustom,
  showCreateCustomButton = true,
  className = '',
}: AnimationPanelProps) {
  const [filter, setFilter] = useState<string>('all');

  const filteredAnimations =
    filter === 'all' ? animations : animations.filter((a) => a.type === filter);

  const animationTypes = [...new Set(animations.map((a) => a.type))];

  return (
    <div className={`flex flex-col h-full bg-slate-900 ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <ZapIcon className="w-5 h-5 text-purple-400" />
            Detected Animations
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">
              {animations.length} animation{animations.length !== 1 ? 's' : ''}
            </span>
            {showCreateCustomButton && onCreateCustom && (
              <button
                onClick={onCreateCustom}
                className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Create Custom
              </button>
            )}
          </div>
        </div>

        {/* Filter */}
        {animationTypes.length > 1 && (
          <div className="flex items-center gap-1 mt-3">
            <button
              onClick={() => setFilter('all')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                filter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            {animationTypes.map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  filter === type ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Animation List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredAnimations.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <RefreshIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No animations detected</p>
            <p className="text-xs mt-1">Upload a video to detect animations</p>
          </div>
        ) : (
          filteredAnimations.map((animation) => (
            <AnimationCard
              key={animation.id}
              animation={animation}
              onEdit={
                onEditAnimation ? (updates) => onEditAnimation(animation.id, updates) : undefined
              }
              onApply={
                onApplyAnimation ? (target) => onApplyAnimation(animation, target) : undefined
              }
              onRemove={onRemoveAnimation ? () => onRemoveAnimation(animation.id) : undefined}
            />
          ))
        )}

        {/* Transitions Section */}
        {transitions.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-white mb-3">
              Page Transitions ({transitions.length})
            </h4>
            <div className="space-y-2">
              {transitions.map((transition) => (
                <div
                  key={transition.id}
                  className="p-3 bg-slate-800/50 border border-white/10 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white">{transition.type}</span>
                    <span className="text-xs text-slate-400">{transition.duration}</span>
                  </div>
                  {transition.fromState && transition.toState && (
                    <div className="mt-2 text-xs text-slate-400">
                      {transition.fromState} → {transition.toState}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/10">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>
            Matched Presets: {animations.filter((a) => a.matchedPreset).length}/{animations.length}
          </span>
          <span>
            Avg Confidence:{' '}
            {Math.round(
              (animations.reduce((sum, a) => sum + a.confidence, 0) / animations.length) * 100
            ) || 0}
            %
          </span>
        </div>
      </div>
    </div>
  );
}

export default AnimationPanel;
