'use client';

/**
 * DocumentationExport Component
 *
 * Export configuration panel for generating design system documentation
 * in HTML, Markdown, or JSON formats.
 */

import React, { useState, useCallback, useMemo } from 'react';
import type { LayoutDesign, CompleteDesignAnalysis } from '@/types/layoutDesign';
import {
  generateDocumentation,
  DEFAULT_SECTIONS,
  type ExportFormat,
  type DocumentationSection,
  type DocumentationConfig,
} from '@/utils/documentationGenerator';

// ============================================================================
// TYPES
// ============================================================================

interface DocumentationExportProps {
  design: Partial<LayoutDesign>;
  analysis?: CompleteDesignAnalysis;
  onExport?: (content: string, format: ExportFormat) => void;
  className?: string;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function FormatSelector({
  selected,
  onSelect,
}: {
  selected: ExportFormat;
  onSelect: (format: ExportFormat) => void;
}) {
  const formats: { value: ExportFormat; label: string; icon: string; description: string }[] = [
    { value: 'html', label: 'HTML', icon: '🌐', description: 'Interactive documentation site' },
    { value: 'markdown', label: 'Markdown', icon: '📝', description: 'README-ready format' },
    { value: 'json', label: 'JSON', icon: '📦', description: 'Raw data export' },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {formats.map((format) => (
        <button
          key={format.value}
          onClick={() => onSelect(format.value)}
          className={`
            p-3 rounded-lg border text-left transition-all
            ${
              selected === format.value
                ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30'
                : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
            }
          `}
        >
          <div className="flex items-center gap-2 mb-1">
            <span>{format.icon}</span>
            <span className="font-medium text-slate-200">{format.label}</span>
          </div>
          <p className="text-xs text-slate-500">{format.description}</p>
        </button>
      ))}
    </div>
  );
}

function SectionToggle({
  section,
  enabled,
  onToggle,
}: {
  section: DocumentationSection;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-slate-300">{section.title}</span>
      <button
        onClick={onToggle}
        className={`
          w-10 h-5 rounded-full transition-colors relative
          ${enabled ? 'bg-blue-600' : 'bg-slate-700'}
        `}
      >
        <span
          className={`
            absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform
            ${enabled ? 'left-5' : 'left-0.5'}
          `}
        />
      </button>
    </div>
  );
}

function PreviewPane({ content, format }: { content: string; format: ExportFormat }) {
  const [showPreview, setShowPreview] = useState(false);

  if (format === 'html' && showPreview) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-400">Preview</label>
          <button
            onClick={() => setShowPreview(false)}
            className="text-xs text-slate-500 hover:text-white"
          >
            Show Code
          </button>
        </div>
        <div className="border border-slate-700 rounded-lg overflow-hidden bg-white">
          <iframe
            srcDoc={content}
            className="w-full h-80"
            title="Documentation Preview"
            sandbox="allow-scripts"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs text-slate-400">Output</label>
        {format === 'html' && (
          <button
            onClick={() => setShowPreview(true)}
            className="text-xs text-slate-500 hover:text-white"
          >
            Show Preview
          </button>
        )}
      </div>
      <pre className="p-3 bg-slate-900 rounded-lg text-xs text-slate-300 overflow-auto max-h-64 border border-slate-700">
        <code>
          {content.slice(0, 2000)}
          {content.length > 2000 ? '\n...(truncated)' : ''}
        </code>
      </pre>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DocumentationExport({
  design,
  analysis,
  onExport,
  className = '',
}: DocumentationExportProps) {
  const [format, setFormat] = useState<ExportFormat>('html');
  const [sections, setSections] = useState<DocumentationSection[]>(DEFAULT_SECTIONS);
  const [config, setConfig] = useState<Partial<DocumentationConfig>>({
    title: design.name || 'Design System Documentation',
    version: '1.0.0',
    includeCodeSnippets: true,
    includeTailwindConfig: true,
    includeCSSVariables: true,
  });

  // Toggle section
  const toggleSection = useCallback((sectionId: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, enabled: !s.enabled } : s))
    );
  }, []);

  // Generate documentation
  const generatedContent = useMemo(() => {
    return generateDocumentation(format, design, analysis, {
      ...config,
      sections,
    });
  }, [format, design, analysis, config, sections]);

  // Handle download
  const handleDownload = useCallback(() => {
    const mimeTypes: Record<ExportFormat, string> = {
      html: 'text/html',
      markdown: 'text/markdown',
      json: 'application/json',
    };

    const extensions: Record<ExportFormat, string> = {
      html: 'html',
      markdown: 'md',
      json: 'json',
    };

    const blob = new Blob([generatedContent], { type: mimeTypes[format] });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `design-system.${extensions[format]}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    onExport?.(generatedContent, format);
  }, [generatedContent, format, onExport]);

  // Handle copy
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(generatedContent);
  }, [generatedContent]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Format Selection */}
      <div>
        <label className="block text-xs text-slate-400 mb-2">Export Format</label>
        <FormatSelector selected={format} onSelect={setFormat} />
      </div>

      {/* Configuration */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Title</label>
          <input
            type="text"
            value={config.title || ''}
            onChange={(e) => setConfig({ ...config, title: e.target.value })}
            className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-600 rounded-lg text-slate-200 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Version</label>
          <input
            type="text"
            value={config.version || ''}
            onChange={(e) => setConfig({ ...config, version: e.target.value })}
            className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-600 rounded-lg text-slate-200 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Sections Toggle */}
      <div>
        <label className="block text-xs text-slate-400 mb-2">Include Sections</label>
        <div className="bg-slate-800/30 rounded-lg p-3 divide-y divide-slate-700/50">
          {sections.map((section) => (
            <SectionToggle
              key={section.id}
              section={section}
              enabled={section.enabled}
              onToggle={() => toggleSection(section.id)}
            />
          ))}
        </div>
      </div>

      {/* Options */}
      <div>
        <label className="block text-xs text-slate-400 mb-2">Options</label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.includeCSSVariables}
              onChange={(e) => setConfig({ ...config, includeCSSVariables: e.target.checked })}
              className="rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-300">Include CSS Variables</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.includeTailwindConfig}
              onChange={(e) => setConfig({ ...config, includeTailwindConfig: e.target.checked })}
              className="rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-300">Include Tailwind Config</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.includeCodeSnippets}
              onChange={(e) => setConfig({ ...config, includeCodeSnippets: e.target.checked })}
              className="rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-300">Include Code Snippets</span>
          </label>
        </div>
      </div>

      {/* Preview */}
      <PreviewPane content={generatedContent} format={format} />

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleDownload}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors font-medium"
        >
          Download {format.toUpperCase()}
        </button>
        <button
          onClick={handleCopy}
          className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
        >
          Copy to Clipboard
        </button>
      </div>

      {/* Stats */}
      <div className="text-xs text-slate-500 p-3 bg-slate-800/30 rounded-lg">
        <div className="flex justify-between">
          <span>Output size:</span>
          <span>{(generatedContent.length / 1024).toFixed(1)} KB</span>
        </div>
        <div className="flex justify-between">
          <span>Sections included:</span>
          <span>
            {sections.filter((s) => s.enabled).length} of {sections.length}
          </span>
        </div>
      </div>
    </div>
  );
}

export default DocumentationExport;
