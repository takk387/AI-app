/**
 * SpecSheetPanel Component
 *
 * Displays extracted design specifications and provides export functionality
 * to CSS Variables, Tailwind Config, Figma Tokens, and JSON formats.
 */

'use client';

import React, { useState, useCallback } from 'react';
import {
  DownloadIcon,
  CopyIcon,
  CheckIcon,
  FileIcon,
  CodeIcon,
  SparklesIcon,
  LayersIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  XIcon,
} from './ui/Icons';
import type { CompleteDesignAnalysis } from '@/types/layoutDesign';
import {
  exportSpecSheet,
  generateCSSVariables,
  generateTailwindConfig,
  generateFigmaTokens,
} from '@/utils/specSheetExport';

// ============================================================================
// TYPES
// ============================================================================

interface SpecSheetPanelProps {
  analysis: CompleteDesignAnalysis;
  onExport?: (format: ExportFormat, content: string) => void;
  onClose?: () => void;
  className?: string;
}

type ExportFormat = 'json' | 'css' | 'tailwind' | 'figma';

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

// ============================================================================
// COLLAPSIBLE SECTION COMPONENT
// ============================================================================

function CollapsibleSection({ title, icon, children, defaultOpen = true }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-slate-800/50 hover:bg-slate-800 transition-colors text-left"
      >
        {isOpen ? (
          <ChevronDownIcon className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronRightIcon className="w-4 h-4 text-slate-400" />
        )}
        <span className="text-slate-400">{icon}</span>
        <span className="font-medium text-white">{title}</span>
      </button>
      {isOpen && <div className="p-4 bg-slate-900/50">{children}</div>}
    </div>
  );
}

// ============================================================================
// COLOR SWATCH COMPONENT
// ============================================================================

function ColorSwatch({ color, label }: { color: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(color);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className="group flex items-center gap-2 p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
      title={`Click to copy: ${color}`}
    >
      <div
        className="w-8 h-8 rounded border border-white/20 shadow-inner"
        style={{ backgroundColor: color }}
      />
      <div className="text-left">
        <div className="text-xs text-slate-400">{label}</div>
        <div className="text-sm font-mono text-white group-hover:text-purple-400 transition-colors">
          {copied ? <CheckIcon className="w-4 h-4 text-green-400" /> : color}
        </div>
      </div>
    </button>
  );
}

// ============================================================================
// TYPOGRAPHY DISPLAY COMPONENT
// ============================================================================

function TypographyDisplay({
  label,
  fontFamily,
  size,
  weight,
  lineHeight,
}: {
  label: string;
  fontFamily?: string;
  size?: string;
  weight?: number;
  lineHeight?: number;
}) {
  return (
    <div className="p-3 rounded-lg bg-slate-800/50">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div
        className="text-white truncate"
        style={{
          fontFamily: fontFamily || 'inherit',
          fontSize: size || '16px',
          fontWeight: weight || 400,
          lineHeight: lineHeight || 1.5,
        }}
      >
        The quick brown fox
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        {fontFamily && (
          <span className="px-2 py-0.5 bg-slate-700 rounded text-slate-300">{fontFamily}</span>
        )}
        {size && <span className="px-2 py-0.5 bg-slate-700 rounded text-slate-300">{size}</span>}
        {weight && (
          <span className="px-2 py-0.5 bg-slate-700 rounded text-slate-300">{weight}</span>
        )}
        {lineHeight && (
          <span className="px-2 py-0.5 bg-slate-700 rounded text-slate-300">LH: {lineHeight}</span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// EXPORT BUTTON COMPONENT
// ============================================================================

function ExportButton({
  format,
  label,
  icon,
  onClick,
  disabled,
}: {
  format: ExportFormat;
  label: string;
  icon: React.ReactNode;
  onClick: (format: ExportFormat) => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={() => onClick(format)}
      disabled={disabled}
      className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors text-sm font-medium text-white"
    >
      {icon}
      {label}
    </button>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SpecSheetPanel({
  analysis,
  onExport,
  onClose,
  className = '',
}: SpecSheetPanelProps) {
  const [copiedFormat, setCopiedFormat] = useState<ExportFormat | null>(null);
  const [previewFormat, setPreviewFormat] = useState<ExportFormat | null>(null);
  const [previewContent, setPreviewContent] = useState<string>('');

  // Generate export content
  const handleExport = useCallback(
    (format: ExportFormat) => {
      let content = '';

      switch (format) {
        case 'json':
          content = JSON.stringify(analysis, null, 2);
          break;
        case 'css':
          content = generateCSSVariables(analysis);
          break;
        case 'tailwind':
          content = generateTailwindConfig(analysis);
          break;
        case 'figma':
          content = generateFigmaTokens(analysis);
          break;
      }

      // Copy to clipboard
      navigator.clipboard.writeText(content);
      setCopiedFormat(format);
      setTimeout(() => setCopiedFormat(null), 2000);

      // Call external handler
      onExport?.(format, content);
    },
    [analysis, onExport]
  );

  // Preview export content
  const handlePreview = useCallback(
    (format: ExportFormat) => {
      if (previewFormat === format) {
        setPreviewFormat(null);
        setPreviewContent('');
        return;
      }

      let content = '';
      switch (format) {
        case 'json':
          content = JSON.stringify(analysis, null, 2);
          break;
        case 'css':
          content = generateCSSVariables(analysis);
          break;
        case 'tailwind':
          content = generateTailwindConfig(analysis);
          break;
        case 'figma':
          content = generateFigmaTokens(analysis);
          break;
      }

      setPreviewFormat(format);
      setPreviewContent(content);
    },
    [analysis, previewFormat]
  );

  // Download as file
  const handleDownload = useCallback(
    (format: ExportFormat) => {
      const specs = exportSpecSheet(analysis);
      let content = '';
      let filename = '';
      let mimeType = 'text/plain';

      switch (format) {
        case 'json':
          content = specs.json;
          filename = 'design-specs.json';
          mimeType = 'application/json';
          break;
        case 'css':
          content = specs.css;
          filename = 'design-variables.css';
          mimeType = 'text/css';
          break;
        case 'tailwind':
          content = specs.tailwindConfig;
          filename = 'tailwind.config.extension.js';
          mimeType = 'application/javascript';
          break;
        case 'figma':
          content = specs.figmaTokens;
          filename = 'figma-tokens.json';
          mimeType = 'application/json';
          break;
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [analysis]
  );

  return (
    <div className={`flex flex-col h-full bg-slate-900 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h3 className="font-semibold text-white">Design Specifications</h3>
        {onClose && (
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded transition-colors">
            <XIcon className="w-5 h-5 text-slate-400" />
          </button>
        )}
      </div>

      {/* Export Actions */}
      <div className="p-4 border-b border-white/10 space-y-3">
        <div className="text-sm text-slate-400 mb-2">Export As</div>
        <div className="flex flex-wrap gap-2">
          <ExportButton
            format="css"
            label={copiedFormat === 'css' ? 'Copied!' : 'CSS Variables'}
            icon={
              copiedFormat === 'css' ? (
                <CheckIcon className="w-4 h-4" />
              ) : (
                <CodeIcon className="w-4 h-4" />
              )
            }
            onClick={handleExport}
          />
          <ExportButton
            format="tailwind"
            label={copiedFormat === 'tailwind' ? 'Copied!' : 'Tailwind Config'}
            icon={
              copiedFormat === 'tailwind' ? (
                <CheckIcon className="w-4 h-4" />
              ) : (
                <CodeIcon className="w-4 h-4" />
              )
            }
            onClick={handleExport}
          />
          <ExportButton
            format="figma"
            label={copiedFormat === 'figma' ? 'Copied!' : 'Figma Tokens'}
            icon={
              copiedFormat === 'figma' ? (
                <CheckIcon className="w-4 h-4" />
              ) : (
                <LayersIcon className="w-4 h-4" />
              )
            }
            onClick={handleExport}
          />
          <ExportButton
            format="json"
            label={copiedFormat === 'json' ? 'Copied!' : 'JSON'}
            icon={
              copiedFormat === 'json' ? (
                <CheckIcon className="w-4 h-4" />
              ) : (
                <FileIcon className="w-4 h-4" />
              )
            }
            onClick={handleExport}
          />
        </div>

        {/* Download buttons */}
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            onClick={() => handleDownload('css')}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 rounded transition-colors text-slate-300"
          >
            <DownloadIcon className="w-3 h-3" />
            Download CSS
          </button>
          <button
            onClick={() => handleDownload('tailwind')}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 rounded transition-colors text-slate-300"
          >
            <DownloadIcon className="w-3 h-3" />
            Download Tailwind
          </button>
          <button
            onClick={() => handleDownload('json')}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 rounded transition-colors text-slate-300"
          >
            <DownloadIcon className="w-3 h-3" />
            Download JSON
          </button>
        </div>
      </div>

      {/* Preview Panel (if active) */}
      {previewFormat && previewContent && (
        <div className="p-4 border-b border-white/10 bg-slate-950">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-white">
              Preview: {previewFormat.toUpperCase()}
            </span>
            <button
              onClick={() => setPreviewFormat(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Close Preview
            </button>
          </div>
          <pre className="max-h-48 overflow-auto p-3 bg-slate-900 rounded text-xs font-mono text-slate-300">
            {previewContent.slice(0, 2000)}
            {previewContent.length > 2000 && '...'}
          </pre>
        </div>
      )}

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Colors Section */}
        <CollapsibleSection
          title="Colors"
          icon={<SparklesIcon className="w-4 h-4" />}
          defaultOpen={true}
        >
          <div className="grid grid-cols-2 gap-2">
            {analysis.colors.primary && (
              <ColorSwatch color={analysis.colors.primary} label="Primary" />
            )}
            {analysis.colors.secondary && (
              <ColorSwatch color={analysis.colors.secondary} label="Secondary" />
            )}
            {analysis.colors.accent && (
              <ColorSwatch color={analysis.colors.accent} label="Accent" />
            )}
            {analysis.colors.background && (
              <ColorSwatch color={analysis.colors.background} label="Background" />
            )}
            {analysis.colors.surface && (
              <ColorSwatch color={analysis.colors.surface} label="Surface" />
            )}
            {analysis.colors.text && <ColorSwatch color={analysis.colors.text} label="Text" />}
            {analysis.colors.textMuted && (
              <ColorSwatch color={analysis.colors.textMuted} label="Text Muted" />
            )}
            {analysis.colors.border && (
              <ColorSwatch color={analysis.colors.border} label="Border" />
            )}
            {analysis.colors.success && (
              <ColorSwatch color={analysis.colors.success} label="Success" />
            )}
            {analysis.colors.warning && (
              <ColorSwatch color={analysis.colors.warning} label="Warning" />
            )}
            {analysis.colors.error && <ColorSwatch color={analysis.colors.error} label="Error" />}
          </div>

          {/* Gradients */}
          {analysis.colors.gradients && analysis.colors.gradients.length > 0 && (
            <div className="mt-4">
              <div className="text-xs text-slate-400 mb-2">Gradients</div>
              <div className="space-y-2">
                {analysis.colors.gradients.map((gradient, i) => (
                  <div key={i} className="p-2 bg-slate-800/50 rounded-lg">
                    <div className="h-8 rounded mb-2" style={{ background: gradient.css }} />
                    <code className="text-xs text-slate-400 break-all">{gradient.css}</code>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CollapsibleSection>

        {/* Typography Section */}
        <CollapsibleSection
          title="Typography"
          icon={<CodeIcon className="w-4 h-4" />}
          defaultOpen={true}
        >
          <div className="space-y-3">
            {analysis.typography.headingFont && (
              <TypographyDisplay
                label="Heading Font"
                fontFamily={analysis.typography.headingFont.family}
                weight={analysis.typography.headingFont.weights?.[0]}
              />
            )}
            {analysis.typography.bodyFont && (
              <TypographyDisplay
                label="Body Font"
                fontFamily={analysis.typography.bodyFont.family}
                weight={analysis.typography.bodyFont.weights?.[0]}
              />
            )}

            {/* Type Scale */}
            {analysis.typography.displaySizes && (
              <div className="mt-4">
                <div className="text-xs text-slate-400 mb-2">Type Scale</div>
                <div className="space-y-2">
                  {Object.entries(analysis.typography.displaySizes).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between p-2 bg-slate-800/50 rounded"
                    >
                      <span className="text-sm text-white font-medium">{key.toUpperCase()}</span>
                      <span className="text-xs text-slate-400 font-mono">
                        {value.size} / {value.weight} / {value.lineHeight}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Spacing Section */}
        <CollapsibleSection
          title="Spacing"
          icon={<LayersIcon className="w-4 h-4" />}
          defaultOpen={false}
        >
          <div className="space-y-3">
            {analysis.spacing.baseUnit && (
              <div className="flex items-center justify-between p-2 bg-slate-800/50 rounded">
                <span className="text-sm text-white">Base Unit</span>
                <span className="text-sm font-mono text-purple-400">
                  {analysis.spacing.baseUnit}px
                </span>
              </div>
            )}
            {analysis.spacing.containerMaxWidth && (
              <div className="flex items-center justify-between p-2 bg-slate-800/50 rounded">
                <span className="text-sm text-white">Container Max Width</span>
                <span className="text-sm font-mono text-purple-400">
                  {analysis.spacing.containerMaxWidth}
                </span>
              </div>
            )}
            {analysis.spacing.scale && (
              <div className="p-2 bg-slate-800/50 rounded">
                <div className="text-xs text-slate-400 mb-2">Scale</div>
                <div className="flex flex-wrap gap-1">
                  {analysis.spacing.scale.map((val, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-slate-700 rounded text-xs font-mono text-slate-300"
                    >
                      {val}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Effects Section */}
        <CollapsibleSection
          title="Effects"
          icon={<SparklesIcon className="w-4 h-4" />}
          defaultOpen={false}
        >
          <div className="space-y-4">
            {/* Border Radius */}
            {analysis.effects.borderRadius && (
              <div>
                <div className="text-xs text-slate-400 mb-2">Border Radius</div>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(analysis.effects.borderRadius).map(([key, value]) => (
                    <div key={key} className="p-2 bg-slate-800/50 rounded text-center">
                      <div
                        className="w-8 h-8 mx-auto bg-purple-500/30 border border-purple-500/50 mb-1"
                        style={{ borderRadius: value }}
                      />
                      <div className="text-xs text-slate-400">{key}</div>
                      <div className="text-xs font-mono text-white">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Shadows */}
            {analysis.effects.shadows && (
              <div>
                <div className="text-xs text-slate-400 mb-2">Shadows</div>
                <div className="space-y-2">
                  {Object.entries(analysis.effects.shadows).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-3 p-2 bg-slate-800/50 rounded">
                      <div
                        className="w-10 h-10 bg-slate-600 rounded"
                        style={{ boxShadow: value }}
                      />
                      <div>
                        <div className="text-sm text-white">{key}</div>
                        <code className="text-xs text-slate-400 break-all">{value}</code>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Analysis Metadata */}
        <div className="p-3 bg-slate-800/30 rounded-lg">
          <div className="text-xs text-slate-500 mb-2">Analysis Info</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-400">Confidence:</span>{' '}
              <span className="text-white">{Math.round(analysis.confidence * 100)}%</span>
            </div>
            <div>
              <span className="text-slate-400">Source:</span>{' '}
              <span className="text-white">{analysis.sourceType}</span>
            </div>
            <div>
              <span className="text-slate-400">Analyzed:</span>{' '}
              <span className="text-white">
                {new Date(analysis.analyzedAt).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SpecSheetPanel;
