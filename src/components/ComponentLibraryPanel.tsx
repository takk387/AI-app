/**
 * Component Library Panel
 *
 * A collapsible panel for browsing and selecting UI component patterns.
 * When a pattern is selected, it sends a suggested message to the chat.
 */

'use client';

import { useState, useMemo } from 'react';
import {
  componentPatterns,
  getCategories,
  getCategoryDisplayName,
  getPatternsByCategory,
  searchPatterns,
  type ComponentCategory,
  type ComponentPattern,
} from '@/data/componentPatterns';

interface ComponentLibraryPanelProps {
  /** Called when a pattern is selected - sends the suggested message */
  onSelectPattern: (pattern: ComponentPattern) => void;
  /** Called to close/collapse the panel */
  onClose?: () => void;
  /** Additional class names */
  className?: string;
}

export function ComponentLibraryPanel({
  onSelectPattern,
  onClose,
  className = '',
}: ComponentLibraryPanelProps) {
  const [activeCategory, setActiveCategory] = useState<ComponentCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = getCategories();

  // Filter patterns based on category and search
  const filteredPatterns = useMemo(() => {
    let patterns =
      activeCategory === 'all' ? componentPatterns : getPatternsByCategory(activeCategory);

    if (searchQuery.trim()) {
      const searchResults = searchPatterns(searchQuery);
      patterns = patterns.filter((p) => searchResults.includes(p));
    }

    return patterns;
  }, [activeCategory, searchQuery]);

  // Group patterns by category for display
  const groupedPatterns = useMemo(() => {
    if (activeCategory !== 'all') {
      return { [activeCategory]: filteredPatterns };
    }

    const groups: Record<string, ComponentPattern[]> = {};
    for (const pattern of filteredPatterns) {
      if (!groups[pattern.category]) {
        groups[pattern.category] = [];
      }
      groups[pattern.category].push(pattern);
    }
    return groups;
  }, [filteredPatterns, activeCategory]);

  return (
    <div
      className={`border-t border-slate-700 bg-slate-800/50 ${className}`}
      style={{ maxHeight: '280px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-300">Components</span>
          <span className="text-xs px-1.5 py-0.5 bg-slate-700 text-slate-400 rounded">
            {filteredPatterns.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-32 px-2 py-1 text-xs bg-slate-900 border border-slate-600 rounded text-slate-300 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          {/* Close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-slate-500 hover:text-slate-300 rounded"
              title="Close panel"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

      {/* Category tabs */}
      <div className="flex items-center gap-1 px-3 py-2 overflow-x-auto border-b border-slate-700/50 scrollbar-thin scrollbar-thumb-slate-600">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap transition-colors ${
            activeCategory === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-300'
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap transition-colors ${
              activeCategory === cat
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-300'
            }`}
          >
            {getCategoryDisplayName(cat)}
          </button>
        ))}
      </div>

      {/* Pattern grid */}
      <div className="overflow-y-auto p-3" style={{ maxHeight: '180px' }}>
        {filteredPatterns.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-sm">
            No patterns found{searchQuery ? ` for "${searchQuery}"` : ''}
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedPatterns).map(([category, patterns]) => (
              <div key={category}>
                {activeCategory === 'all' && (
                  <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                    {getCategoryDisplayName(category as ComponentCategory)}
                  </h4>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {patterns.map((pattern) => (
                    <button
                      key={pattern.id}
                      onClick={() => onSelectPattern(pattern)}
                      className="flex items-start gap-2 p-2 rounded-lg bg-slate-700/30 hover:bg-slate-700/60 border border-slate-600/50 hover:border-slate-500 transition-colors text-left group"
                      title={pattern.description}
                    >
                      <span className="text-lg flex-shrink-0">{pattern.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-slate-300 group-hover:text-white truncate">
                          {pattern.name}
                        </div>
                        <div className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">
                          {pattern.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ComponentLibraryPanel;
