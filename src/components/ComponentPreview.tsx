"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { sanitizeHtml } from '../utils/sanitizeHtml';

interface ComponentPreviewProps {
  code: string;
  theme?: 'light' | 'dark';
  mode?: 'desktop' | 'tablet' | 'mobile';
  props?: Record<string, any>;
  livePreview?: boolean;
}

interface PreviewError {
  message: string;
  details?: string;
}

export default function ComponentPreview({
  code,
  theme = 'light',
  mode = 'desktop',
  props = {},
  livePreview = false
}: ComponentPreviewProps) {
  const [previewContent, setPreviewContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Responsive dimensions
  const dimensions = useMemo(() => {
    switch (mode) {
      case 'mobile':
        return { width: '375px', height: '667px', label: 'iPhone SE' };
      case 'tablet':
        return { width: '768px', height: '1024px', label: 'iPad' };
      case 'desktop':
      default:
        return { width: '100%', height: '100%', label: 'Desktop' };
    }
  }, [mode]);

  // Theme colors
  const themeColors = useMemo(() => {
    if (theme === 'dark') {
      return {
        bg: '#0f172a',
        text: '#e2e8f0',
        border: '#334155',
        accent: '#3b82f6'
      };
    }
    return {
      bg: '#ffffff',
      text: '#1e293b',
      border: '#e2e8f0',
      accent: '#3b82f6'
    };
  }, [theme]);

  // Helper function to extract JSX from code using multiple patterns
  const extractJSX = useCallback((code: string): string => {
    // Try patterns in order of specificity
    const patterns = [
      // Pattern 1: Demo function's return
      /function\s+Demo\s*\([^)]*\)\s*\{[\s\S]*?return\s*\(\s*([\s\S]*?)\s*\);?\s*\}/,
      // Pattern 2: Default export function's return
      /export\s+default\s+function[^{]*\{[\s\S]*?return\s*\(\s*([\s\S]*?)\s*\);?\s*\}/,
      // Pattern 3: return <...>
      /return\s+(<[\s\S]*?>[\s\S]*?<\/\w+>)/
    ];
    
    for (const pattern of patterns) {
      const match = code.match(pattern);
      if (match) return match[1].trim();
    }
    
    // Pattern 4: Last return statement in the code
    const allReturns = code.match(/return\s*\(\s*([\s\S]*?)\s*\);/g);
    if (allReturns && allReturns.length > 0) {
      const lastReturn = allReturns[allReturns.length - 1];
      const match = lastReturn.match(/return\s*\(\s*([\s\S]*?)\s*\);/);
      if (match) return match[1].trim();
    }
    
    return '';
  }, []);

  // Memoized function to handle JSX to HTML conversion
  const convertJsxToHtml = useCallback((jsxCode: string, props: Record<string, any>): string => {
    try {
      let html = extractJSX(jsxCode);
      if (!html) return '';

      // Convert JSX className to class
      html = html.replace(/className=/g, 'class=');
      html = html.replace(/className:/g, 'class:');

      // Replace prop values
      Object.entries(props).forEach(([key, value]) => {
        html = html.replace(
          new RegExp(`\\{${key}\\}`, 'g'),
          typeof value === 'string' ? value : JSON.stringify(value)
        );
      });

      // Convert JSX style objects to CSS strings
      html = html.replace(/style=\{\{([^}]+)\}\}/g, (match, styleObj) => {
        try {
          const cleanedStyle = styleObj.replace(/,\s*$/, '');
          const styleEntries = cleanedStyle.split(',').map((pair: string) => {
            const [key, value] = pair.split(':').map((s: string) => s.trim());
            const cssKey = key.replace(/[A-Z]/g, (m: string) => `-${m.toLowerCase()}`);
            const cssValue = value.replace(/['"]/g, '');
            return `${cssKey}: ${cssValue}`;
          });
          return `style="${styleEntries.join('; ')}"`;
        } catch (err) {
          console.error('Style conversion error:', err);
          return '';
        }
      });

      // Remove remaining React-specific syntax (surgically)
      // Remove standalone variable references
      html = html.replace(/\{([a-zA-Z_$][a-zA-Z0-9_$]*)\}/g, '');
      // Remove simple property access
      html = html.replace(/\{([a-zA-Z_$][a-zA-Z0-9_$]*\.[a-zA-Z_$][a-zA-Z0-9_$]*)\}/g, '');
      // Remove function calls without JSX
      html = html.replace(/\{([a-zA-Z_$][a-zA-Z0-9_$]*\([^)]*\))\}/g, '');
      
      // Remove event handlers
      html = html.replace(/\s+on[A-Z]\w+={[^}]+}/g, '');
      
      // Clean up self-closing tags
      html = html.replace(/<(\w+)([^>]*?)\s*\/>/g, '<$1$2></$1>');

      return html;
    } catch (err) {
      console.error('JSX to HTML conversion error:', err);
      return '';
    }
  }, [extractJSX]);

  // Function to render preview content
  useEffect(() => {
    try {
      if (!code || code.trim() === '') {
        // Show empty state
        const emptyState = `
          <div style="
            width: 100%;
            height: 100%;
            background: ${themeColors.bg};
            color: ${themeColors.text};
            padding: 32px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            border: 2px dashed ${themeColors.border};
            border-radius: 12px;
            box-sizing: border-box;
          ">
            <div style="font-size: 48px; margin-bottom: 20px;">📋</div>
            <div style="font-size: 20px; font-weight: 600; margin-bottom: 12px;">
              No Component Generated Yet
            </div>
            <div style="font-size: 14px; opacity: 0.7; text-align: center;">
              Enter a prompt and click Generate to see your component here
            </div>
          </div>
        `;
        setPreviewContent(sanitizeHtml(emptyState));
        return;
      }

      // Extract JSX/HTML from the code for preview
      let htmlContent = '';

      // Try to render with improved JSX to HTML conversion
      if (livePreview) {
        try {
          let jsx = extractJSX(code);
          
          if (jsx) {
            
            // Convert className to class (multiple patterns)
            jsx = jsx.replace(/className=/g, 'class=');
            jsx = jsx.replace(/className\s*=\s*"/g, 'class="');
            jsx = jsx.replace(/className\s*=\s*'/g, "class='");
            jsx = jsx.replace(/className\s*=\s*\{/g, 'class={');
            
            // Handle icon components (Lucide React icons) - convert to emoji or SVG placeholders
            const iconMap: { [key: string]: string } = {
              'Sparkles': '✨',
              'Star': '⭐',
              'Heart': '❤️',
              'Check': '✓',
              'X': '✕',
              'Plus': '+',
              'Minus': '-',
              'Search': '🔍',
              'Menu': '☰',
              'User': '👤',
              'Settings': '⚙️',
              'Home': '🏠',
              'Mail': '✉️',
              'Phone': '📞',
              'Calendar': '📅',
              'Clock': '🕐',
              'Lock': '🔒',
              'Unlock': '🔓',
              'Eye': '👁️',
              'EyeOff': '🙈',
              'ChevronRight': '›',
              'ChevronLeft': '‹',
              'ChevronUp': '⌃',
              'ChevronDown': '⌄',
              'ArrowRight': '→',
              'ArrowLeft': '←',
              'ArrowUp': '↑',
              'ArrowDown': '↓',
              'Download': '⬇',
              'Upload': '⬆',
              'Trash': '🗑️',
              'Edit': '✏️',
              'Save': '💾',
              'Share': '🔗',
              'Copy': '📋',
              'Info': 'ℹ️',
              'Alert': '⚠️',
              'Bell': '🔔',
              'Sun': '☀️',
              'Moon': '🌙',
              'Cloud': '☁️',
              'Zap': '⚡',
              'Gift': '🎁',
              'Flag': '🚩',
              'Database': '🗄️',
              'Server': '🖥️',
              'Code': '💻',
              'Terminal': '⌨️',
              'Folder': '📁',
              'File': '📄',
              'Image': '🖼️',
              'Video': '📹',
              'Music': '🎵',
              'Book': '📖',
              'Bookmark': '🔖',
              'Tag': '🏷️',
              'Package': '📦',
              'Inbox': '📥',
              'Send': '📤',
              'Paperclip': '📎',
              'Link': '🔗',
              'ExternalLink': '↗️',
              'Maximize': '⛶',
              'Minimize': '−',
              'MoreVertical': '⋮',
              'MoreHorizontal': '⋯',
              'Filter': '⚗️',
              'Sort': '⇅',
              'Refresh': '↻',
              'Play': '▶',
              'Pause': '⏸',
              'Stop': '⏹',
              'Volume': '🔊',
              'Camera': '📷',
              'Printer': '🖨️',
              'Wifi': '📶',
              'Bluetooth': '🔵',
              'Battery': '🔋',
              'Power': '⚡',
              'Shield': '🛡️',
              'Award': '🏆',
              'Trophy': '🏆',
              'Target': '🎯',
              'Compass': '🧭',
              'Map': '🗺️'
            };
            
            // Replace icon components with emoji/symbols
            jsx = jsx.replace(/<([A-Z][a-z]+(?:[A-Z][a-z]+)*)([^>]*?)\/>/g, (match, compName, attrs) => {
              const emoji = iconMap[compName];
              
              if (emoji) {
                // Extract className if present
                const classMatch = attrs.match(/class(?:Name)?\s*=\s*"([^"]*)"/);
                const className = classMatch ? classMatch[1] : '';
                return `<span class="${className}">${emoji}</span>`;
              }
              
              // Fallback for unmapped icons
              const classMatch = attrs.match(/class(?:Name)?\s*=\s*"([^"]*)"/);
              const className = classMatch ? classMatch[1] : 'inline-block w-4 h-4 text-gray-400';
              return `<span class="${className}" title="${compName} icon">⬜</span>`;
            });
            
            // Handle component instances - convert to divs with their class
            // Example: <Button label="Click" onClick={...} /> becomes the button HTML
            jsx = jsx.replace(/<([A-Z]\w+)([^>]*?)\/>/g, (match, compName, attrs) => {
              // Extract label/children prop if present
              const labelMatch = attrs.match(/label\s*=\s*"([^"]*)"/);
              const label = labelMatch ? labelMatch[1] : compName;
              
              // Extract className if present
              const classMatch = attrs.match(/class(?:Name)?\s*=\s*"([^"]*)"/);
              const className = classMatch ? classMatch[1] : 'p-4 bg-gray-100 rounded';
              
              return `<div class="${className}">${label}</div>`;
            });
            
            // Handle component instances with children
            jsx = jsx.replace(/<([A-Z]\w+)([^>]*?)>([\s\S]*?)<\/\1>/g, (match, compName, attrs, children) => {
              const classMatch = attrs.match(/class(?:Name)?\s*=\s*"([^"]*)"/);
              const className = classMatch ? classMatch[1] : 'p-4 bg-gray-100 rounded';
              return `<div class="${className}">${children}</div>`;
            });
            
            // Handle template literals with specific patterns
            jsx = jsx.replace(/\{price\}/gi, '29.99');
            jsx = jsx.replace(/\{price\.toFixed\(2\)\}/gi, '29.99');
            jsx = jsx.replace(/\{\$\{price\}\}/g, '$29.99');
            jsx = jsx.replace(/\{\$\{price\.toFixed\(2\)\}\}/g, '$29.99');
            jsx = jsx.replace(/\$\{price\}/g, '29.99');
            jsx = jsx.replace(/\$\{price\.toFixed\(2\)\}/g, '29.99');
            
            // Surgically remove simple variable references (preserves React patterns)
            // Remove standalone variable references
            jsx = jsx.replace(/\{([a-zA-Z_$][a-zA-Z0-9_$]*)\}/g, '');
            // Remove simple property access
            jsx = jsx.replace(/\{([a-zA-Z_$][a-zA-Z0-9_$]*\.[a-zA-Z_$][a-zA-Z0-9_$]*)\}/g, '');
            // Remove function calls without JSX
            jsx = jsx.replace(/\{([a-zA-Z_$][a-zA-Z0-9_$]*\([^)]*\))\}/g, '');
            
            // Handle self-closing tags
            jsx = jsx.replace(/<(\w+)([^>]*?)\s*\/>/g, '<$1$2></$1>');
            
            // Remove ALL event handlers (onClick, onChange, etc.)
            jsx = jsx.replace(/\s+on[A-Z]\w+\s*=\s*\{[^}]*\}/g, '');
            jsx = jsx.replace(/\s+on[A-Z]\w+\s*=\s*"[^"]*"/g, '');
            jsx = jsx.replace(/\s+on[A-Z]\w+\s*=\s*'[^']*'/g, '');
            
            // Handle inline styles - convert object notation to CSS
            jsx = jsx.replace(/style\s*=\s*\{\{([^}]+)\}\}/g, (match, styleContent) => {
              try {
                const cssProps = styleContent
                  .split(',')
                  .map((prop: string) => {
                    const [key, value] = prop.split(':').map((s: string) => s.trim());
                    if (!key || !value) return '';
                    const cssKey = key.replace(/[A-Z]/g, (m: string) => `-${m.toLowerCase()}`);
                    const cssValue = value.replace(/['"]/g, '');
                    return `${cssKey}: ${cssValue}`;
                  })
                  .filter(Boolean)
                  .join('; ');
                return `style="${cssProps}"`;
              } catch (err) {
                console.error('Style conversion error:', err);
                return '';
              }
            });
            
            htmlContent = jsx;
          }
        } catch (err) {
          console.error('JSX conversion error:', err);
        }
      }

      // If live preview failed or is disabled, use static preview
      if (!htmlContent) {
        htmlContent = convertJsxToHtml(code, props);
      }

      // If we still don't have content, show the fallback message
      if (!htmlContent.trim()) {
        htmlContent = `
          <div style="
            padding: 32px;
            background: ${themeColors.bg};
            color: ${themeColors.text};
            border-radius: 12px;
          ">
            <h2 style="margin-bottom: 16px;">Generated Component</h2>
            <p style="opacity: 0.8;">Component code has been generated successfully!</p>
            <p style="margin-top: 12px; font-size: 14px; opacity: 0.6;">
              Switch to the Code tab to view the full implementation.
            </p>
          </div>
        `;
      }

      const sanitized = sanitizeHtml(htmlContent);
      
      // Wrap the content in a container div
      const containerHtml = `
        <div style="
          width: 100%;
          height: 100%;
          background: ${themeColors.bg};
          color: ${themeColors.text};
          padding: 24px;
          box-sizing: border-box;
          overflow: auto;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            width: 100%;
            max-width: ${mode === 'desktop' ? '100%' : dimensions.width};
          ">
            ${sanitized}
          </div>
        </div>
      `;

      setPreviewContent(containerHtml);
      setError(null);
    } catch (err) {
      console.error('Preview error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to render preview';
      setError(errorMessage);

      const errorHtml = `
        <div style="
          width: 100%;
          height: 100%;
          background: ${themeColors.bg};
          color: #ef4444;
          padding: 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 2px solid #ef4444;
          border-radius: 12px;
          box-sizing: border-box;
        ">
          <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
          <div style="font-size: 20px; font-weight: 600; margin-bottom: 12px;">
            Preview Error
          </div>
          <div style="font-size: 14px; opacity: 0.8; text-align: center; max-width: 500px;">
            ${sanitizeHtml(errorMessage)}
          </div>
        </div>
      `;

      setPreviewContent(errorHtml);
    }
  }, [code, theme, mode, props, livePreview, themeColors]);

  return (
    <div className="h-full flex flex-col bg-white/5 rounded-lg border border-white/10">
      {/* Preview Info Bar */}
      <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between bg-black/20">
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${livePreview ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`}></span>
            {livePreview ? 'Live' : 'Static'}
          </span>
          <span>|</span>
          <span>{dimensions.label}</span>
          <span>|</span>
          <span className="capitalize">{theme} Theme</span>
        </div>
        {error && (
          <span className="text-xs text-red-400">⚠️ {error}</span>
        )}
      </div>

      {/* Preview Container */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
        <div
          style={{
            width: dimensions.width,
            height: mode !== 'desktop' ? dimensions.height : '100%',
            minHeight: mode === 'desktop' ? '400px' : dimensions.height,
            maxWidth: '100%',
            transition: 'all 0.3s ease',
            boxShadow: mode !== 'desktop' ? '0 20px 60px rgba(0,0,0,0.3)' : 'none',
            background: themeColors.bg,
          }}
          className={`rounded-lg overflow-hidden relative ${error ? 'border-2 border-red-500' : ''}`}
        >
          {/* Preview Frame */}
          <div
            className="w-full h-full"
            dangerouslySetInnerHTML={{ __html: previewContent }}
          />
          
          {/* Responsive Overlay */}
          {mode !== 'desktop' && (
            <div className="absolute top-0 left-0 right-0 bg-black/20 backdrop-blur-sm px-4 py-2 flex items-center justify-between text-xs text-slate-300">
              <span>{dimensions.label}</span>
              <span>{dimensions.width} × {dimensions.height}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
