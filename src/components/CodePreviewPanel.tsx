'use client';

/**
 * Code Preview Panel Component
 *
 * Displays live code output for the current design:
 * - CSS Variables (globals.css)
 * - Tailwind Config extension
 * - TypeScript design tokens
 * - Copy to clipboard functionality
 * - Syntax highlighting
 */

import React, { useState, useMemo, useCallback } from 'react';
import type { LayoutDesign } from '@/types/layoutDesign';
import { generateDesignSystemFiles } from '@/utils/designSystemGenerator';

// ============================================================================
// TYPES
// ============================================================================

interface CodePreviewPanelProps {
  design: LayoutDesign;
  className?: string;
  defaultTab?: 'css' | 'tailwind' | 'tokens';
}

type CodeTab = 'css' | 'tailwind' | 'tokens';

// ============================================================================
// CONSTANTS
// ============================================================================

const TABS: { id: CodeTab; label: string; filename: string }[] = [
  { id: 'css', label: 'CSS Variables', filename: 'globals.css' },
  { id: 'tailwind', label: 'Tailwind', filename: 'tailwind.config.ts' },
  { id: 'tokens', label: 'Tokens', filename: 'design-tokens.ts' },
];

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Tab button component
 */
function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'text-white bg-slate-700 border-b-2 border-blue-500'
          : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800'
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Copy button with feedback
 */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`absolute top-2 right-2 px-2 py-1 rounded text-xs transition-all ${
        copied ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
      }`}
    >
      {copied ? (
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Copied!
        </span>
      ) : (
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          Copy
        </span>
      )}
    </button>
  );
}

/**
 * Simple syntax highlighter for CSS/TypeScript
 */
function SyntaxHighlighter({ code, language }: { code: string; language: 'css' | 'typescript' }) {
  const highlightedCode = useMemo(() => {
    if (language === 'css') {
      return highlightCSS(code);
    }
    return highlightTypeScript(code);
  }, [code, language]);

  return (
    <pre
      className="p-4 text-xs leading-relaxed overflow-auto font-mono"
      dangerouslySetInnerHTML={{ __html: highlightedCode }}
    />
  );
}

/**
 * Basic CSS syntax highlighting
 */
function highlightCSS(code: string): string {
  return (
    code
      // Comments
      .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="text-slate-500">$1</span>')
      // CSS variables
      .replace(/(--[\w-]+)/g, '<span class="text-purple-400">$1</span>')
      // Properties
      .replace(/(\s)([\w-]+)(\s*:)/g, '$1<span class="text-cyan-400">$2</span>$3')
      // Values with units
      .replace(/:\s*([^;{]+)(;|$)/g, ': <span class="text-green-400">$1</span>$2')
      // Selectors
      .replace(/^([.#]?[\w-]+)(\s*\{)/gm, '<span class="text-yellow-400">$1</span>$2')
      // @import and @tailwind
      .replace(/(@[\w-]+)/g, '<span class="text-pink-400">$1</span>')
      // :root selector
      .replace(/(:root)/g, '<span class="text-yellow-400">$1</span>')
  );
}

/**
 * Basic TypeScript syntax highlighting
 */
function highlightTypeScript(code: string): string {
  return (
    code
      // Comments
      .replace(/(\/\/.*$)/gm, '<span class="text-slate-500">$1</span>')
      .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="text-slate-500">$1</span>')
      // Keywords
      .replace(
        /\b(import|export|const|let|var|function|return|type|interface|as|from|default)\b/g,
        '<span class="text-purple-400">$1</span>'
      )
      // Strings
      .replace(/(["'`])([^"'`]*)\1/g, '<span class="text-green-400">$1$2$1</span>')
      // Numbers
      .replace(/\b(\d+\.?\d*)\b/g, '<span class="text-orange-400">$1</span>')
      // Object keys
      .replace(/(\w+)(\s*:)/g, '<span class="text-cyan-400">$1</span>$2')
      // Types
      .replace(
        /:\s*(string|number|boolean|Config|DesignTokens)\b/g,
        ': <span class="text-yellow-400">$1</span>'
      )
  );
}

/**
 * Line numbers component
 */
function LineNumbers({ count }: { count: number }) {
  return (
    <div className="select-none text-right pr-3 text-slate-600 text-xs leading-relaxed font-mono">
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>{i + 1}</div>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CodePreviewPanel({
  design,
  className = '',
  defaultTab = 'css',
}: CodePreviewPanelProps) {
  const [activeTab, setActiveTab] = useState<CodeTab>(defaultTab);
  const [showLineNumbers, setShowLineNumbers] = useState(true);

  // Generate code for all tabs
  const generatedCode = useMemo(() => {
    try {
      return generateDesignSystemFiles(design);
    } catch (error) {
      console.error('Error generating design files:', error);
      return {
        globalsCss: '/* Error generating CSS */',
        tailwindConfig: '// Error generating Tailwind config',
        designTokensTs: '// Error generating design tokens',
      };
    }
  }, [design]);

  // Get current tab's code
  const currentCode = useMemo(() => {
    switch (activeTab) {
      case 'css':
        return generatedCode.globalsCss;
      case 'tailwind':
        return generatedCode.tailwindConfig;
      case 'tokens':
        return generatedCode.designTokensTs;
    }
  }, [activeTab, generatedCode]);

  // Get language for syntax highlighting
  const currentLanguage = activeTab === 'css' ? 'css' : 'typescript';

  // Count lines for line numbers
  const lineCount = currentCode.split('\n').length;

  // Get current filename
  const currentFilename = TABS.find((t) => t.id === activeTab)?.filename || '';

  return (
    <div className={`bg-slate-900 rounded-lg overflow-hidden border border-slate-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between bg-slate-800 border-b border-slate-700">
        {/* Tabs */}
        <div className="flex">
          {TABS.map((tab) => (
            <TabButton
              key={tab.id}
              active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </TabButton>
          ))}
        </div>

        {/* Options */}
        <div className="flex items-center gap-2 pr-2">
          <button
            type="button"
            onClick={() => setShowLineNumbers(!showLineNumbers)}
            className={`p-1 rounded text-xs transition-colors ${
              showLineNumbers
                ? 'text-blue-400 bg-blue-500/10'
                : 'text-slate-500 hover:text-slate-400'
            }`}
            title="Toggle line numbers"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Filename bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/50 border-b border-slate-700/50">
        <span className="text-xs text-slate-500 font-mono">{currentFilename}</span>
        <span className="text-xs text-slate-600">{lineCount} lines</span>
      </div>

      {/* Code display */}
      <div className="relative max-h-96 overflow-auto">
        <div className="flex">
          {/* Line numbers */}
          {showLineNumbers && <LineNumbers count={lineCount} />}

          {/* Code with syntax highlighting */}
          <div className="flex-1 overflow-x-auto">
            <SyntaxHighlighter code={currentCode} language={currentLanguage} />
          </div>
        </div>

        {/* Copy button */}
        <CopyButton text={currentCode} />
      </div>

      {/* Footer with export options */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800/50 border-t border-slate-700">
        <div className="text-xs text-slate-500">
          Generated from <span className="text-slate-400">{design.name || 'Design'}</span>
        </div>
        <div className="flex gap-2">
          <DownloadButton filename={currentFilename} content={currentCode} />
          <DownloadAllButton generatedCode={generatedCode} designName={design.name} />
        </div>
      </div>
    </div>
  );
}

/**
 * Download single file button
 */
function DownloadButton({ filename, content }: { filename: string; content: string }) {
  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="px-2 py-1 text-xs text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 rounded transition-colors flex items-center gap-1"
    >
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
        />
      </svg>
      Download
    </button>
  );
}

/**
 * Download all files as ZIP button
 */
function DownloadAllButton({
  generatedCode,
  designName,
}: {
  generatedCode: ReturnType<typeof generateDesignSystemFiles>;
  designName: string;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDownloadAll = async () => {
    setIsLoading(true);

    try {
      // Dynamically import JSZip
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // Add files to zip
      zip.file('globals.css', generatedCode.globalsCss);
      zip.file('tailwind.config.ts', generatedCode.tailwindConfig);
      zip.file('design-tokens.ts', generatedCode.designTokensTs);

      // Add README
      zip.file(
        'README.md',
        `# Design System: ${designName}

## Files Included

- **globals.css** - CSS custom properties and base styles
- **tailwind.config.ts** - Tailwind CSS theme extension
- **design-tokens.ts** - TypeScript constants for programmatic access

## Usage

1. Copy \`globals.css\` to your \`app/globals.css\`
2. Merge \`tailwind.config.ts\` with your existing config
3. Import tokens from \`design-tokens.ts\` when needed in JS/TS

## CSS Variables

Use CSS variables in your styles:
\`\`\`css
.my-button {
  background-color: var(--color-primary);
  border-radius: var(--border-radius);
}
\`\`\`

## Tailwind Classes

Extended Tailwind classes available:
- \`bg-primary\`, \`text-primary\`, \`border-primary\`
- \`bg-surface\`, \`bg-background\`
- \`rounded-DEFAULT\`, \`shadow-DEFAULT\`

---
Generated by Layout Builder
`
      );

      // Generate and download
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${designName.toLowerCase().replace(/\s+/g, '-')}-design-system.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error creating ZIP:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownloadAll}
      disabled={isLoading}
      className="px-2 py-1 text-xs text-white bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 rounded transition-colors flex items-center gap-1"
    >
      {isLoading ? (
        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
          />
        </svg>
      )}
      Export All (.zip)
    </button>
  );
}

export default CodePreviewPanel;
