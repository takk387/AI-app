/**
 * GeminiAnalysisPanel
 *
 * Displays Gemini's visual analysis in a collapsible panel.
 * Shows the "Creative Director's" interpretation of the design:
 * - Layout type detection
 * - Color palette extraction
 * - Typography analysis
 * - Spacing and density
 * - Effects and vibe
 */

'use client';

import React, { useState } from 'react';
import type { VisualAnalysis } from '@/services/GeminiLayoutService';

interface GeminiAnalysisPanelProps {
  analysis: VisualAnalysis | null;
  isVisible?: boolean;
  onClose?: () => void;
  className?: string;
}

/**
 * Color swatch component for displaying extracted colors
 */
function ColorSwatch({
  color,
  label,
  size = 'md',
}: {
  color: string;
  label: string;
  size?: 'sm' | 'md';
}) {
  const sizeClasses = size === 'sm' ? 'w-6 h-6' : 'w-8 h-8';

  return (
    <div className="flex items-center gap-2">
      <div
        className={`${sizeClasses} rounded-md border border-white/20 shadow-sm`}
        style={{ backgroundColor: color }}
        title={color}
      />
      <div className="flex flex-col">
        <span className="text-xs text-slate-400">{label}</span>
        <span className="text-xs font-mono text-slate-300">{color}</span>
      </div>
    </div>
  );
}

/**
 * Section header for analysis categories
 */
function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-sm">{icon}</span>
      <h4 className="text-sm font-medium text-slate-200">{title}</h4>
    </div>
  );
}

/**
 * Badge for displaying vibe keywords
 */
function VibeBadge({ keyword }: { keyword: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
      {keyword}
    </span>
  );
}

/**
 * Detail row for typography/spacing info
 */
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-xs font-medium text-slate-300">{value}</span>
    </div>
  );
}

export function GeminiAnalysisPanel({
  analysis,
  isVisible = true,
  onClose,
  className = '',
}: GeminiAnalysisPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeSection, setActiveSection] = useState<
    'colors' | 'typography' | 'spacing' | 'effects'
  >('colors');

  if (!analysis || !isVisible) {
    return null;
  }

  return (
    <div
      className={`bg-slate-800/95 backdrop-blur-sm border border-slate-700 rounded-lg shadow-xl ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎨</span>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Creative Director Analysis</h3>
            <p className="text-xs text-slate-400">Powered by Gemini</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            <svg
              className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-700 rounded transition-colors"
              title="Close"
            >
              <svg
                className="w-4 h-4 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Layout Type & Vibe */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-medium rounded border border-indigo-500/30">
                {analysis.layoutType}
              </span>
              <span className="text-xs text-slate-400">
                Confidence: {Math.round(analysis.confidence * 100)}%
              </span>
            </div>
            {analysis.vibe && (
              <p className="text-sm text-slate-300 italic">&quot;{analysis.vibe}&quot;</p>
            )}
            {analysis.vibeKeywords && analysis.vibeKeywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {analysis.vibeKeywords.map((keyword, i) => (
                  <VibeBadge key={i} keyword={keyword} />
                ))}
              </div>
            )}
          </div>

          {/* Section Tabs */}
          <div className="flex border-b border-slate-700">
            {(['colors', 'typography', 'spacing', 'effects'] as const).map((section) => (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={`px-3 py-2 text-xs font-medium transition-colors ${
                  activeSection === section
                    ? 'text-indigo-400 border-b-2 border-indigo-400'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                {section.charAt(0).toUpperCase() + section.slice(1)}
              </button>
            ))}
          </div>

          {/* Colors Section */}
          {activeSection === 'colors' && analysis.colorPalette && (
            <div className="space-y-3">
              <SectionHeader icon="🎨" title="Extracted Colors" />
              <div className="grid grid-cols-2 gap-3">
                <ColorSwatch color={analysis.colorPalette.primary} label="Primary" />
                <ColorSwatch color={analysis.colorPalette.secondary} label="Secondary" />
                <ColorSwatch color={analysis.colorPalette.accent} label="Accent" />
                <ColorSwatch color={analysis.colorPalette.background} label="Background" />
                <ColorSwatch color={analysis.colorPalette.surface} label="Surface" />
                <ColorSwatch color={analysis.colorPalette.text} label="Text" />
                {analysis.colorPalette.textMuted && (
                  <ColorSwatch color={analysis.colorPalette.textMuted} label="Text Muted" />
                )}
              </div>
            </div>
          )}

          {/* Typography Section */}
          {activeSection === 'typography' && analysis.typography && (
            <div className="space-y-3">
              <SectionHeader icon="🔤" title="Typography" />
              <div className="space-y-1 bg-slate-900/50 rounded-md p-3">
                {analysis.typography.estimatedHeadingFont && (
                  <DetailRow
                    label="Heading Font"
                    value={analysis.typography.estimatedHeadingFont}
                  />
                )}
                {analysis.typography.estimatedBodyFont && (
                  <DetailRow label="Body Font" value={analysis.typography.estimatedBodyFont} />
                )}
                <DetailRow label="Heading Weight" value={analysis.typography.headingWeight} />
                <DetailRow label="Body Weight" value={analysis.typography.bodyWeight} />
                {analysis.typography.headingStyle && (
                  <div className="pt-2 border-t border-slate-700 mt-2">
                    <p className="text-xs text-slate-400">{analysis.typography.headingStyle}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Spacing Section */}
          {activeSection === 'spacing' && analysis.spacing && (
            <div className="space-y-3">
              <SectionHeader icon="📐" title="Spacing & Density" />
              <div className="space-y-1 bg-slate-900/50 rounded-md p-3">
                <DetailRow label="Density" value={analysis.spacing.density} />
                <DetailRow label="Section Padding" value={analysis.spacing.sectionPadding} />
                <DetailRow label="Component Gap" value={analysis.spacing.componentGap} />
              </div>
            </div>
          )}

          {/* Effects Section */}
          {activeSection === 'effects' && analysis.effects && (
            <div className="space-y-3">
              <SectionHeader icon="✨" title="Visual Effects" />
              <div className="space-y-1 bg-slate-900/50 rounded-md p-3">
                <DetailRow label="Border Radius" value={analysis.effects.borderRadius} />
                <DetailRow label="Shadows" value={analysis.effects.shadows} />
                <DetailRow label="Gradients" value={analysis.effects.hasGradients ? 'Yes' : 'No'} />
                <DetailRow label="Blur Effects" value={analysis.effects.hasBlur ? 'Yes' : 'No'} />
                <DetailRow
                  label="Animations"
                  value={analysis.effects.hasAnimations ? 'Yes' : 'No'}
                />
              </div>
            </div>
          )}

          {/* Detected Components */}
          {analysis.components && analysis.components.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-700">
              <SectionHeader icon="🧩" title="Detected Components" />
              <div className="flex flex-wrap gap-1.5">
                {analysis.components.map((comp, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-slate-700/50 text-slate-300 text-xs rounded border border-slate-600"
                  >
                    {comp.type}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GeminiAnalysisPanel;
