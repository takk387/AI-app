/**
 * Architecture Template Picker
 *
 * Modal for selecting architecture templates (from App Concept Wizard).
 * Maps architecture templates to layout structures for the Layout Builder.
 */

'use client';

import { useState, useMemo } from 'react';
import {
  architectureTemplates,
  getAllCategories,
  getCategoryDisplayName,
  filterTemplates,
} from '@/data/templates';
import type {
  FullTemplate,
  TemplateCategory,
  TemplateComplexity,
} from '@/types/architectureTemplates';

interface ArchitectureTemplatePickerProps {
  isOpen: boolean;
  onSelect: (template: FullTemplate) => void;
  onClose: () => void;
}

const complexityColors: Record<TemplateComplexity, string> = {
  simple: 'bg-green-500/20 text-green-400',
  moderate: 'bg-yellow-500/20 text-yellow-400',
  complex: 'bg-red-500/20 text-red-400',
};

const categoryIcons: Record<TemplateCategory, string> = {
  admin: '📊',
  commerce: '🛒',
  content: '📰',
  marketing: '📄',
  saas: '🚀',
};

export function ArchitectureTemplatePicker({
  isOpen,
  onSelect,
  onClose,
}: ArchitectureTemplatePickerProps) {
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [selectedComplexity, setSelectedComplexity] = useState<TemplateComplexity | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = getAllCategories();

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return filterTemplates({
      category: selectedCategory === 'all' ? undefined : selectedCategory,
      complexity: selectedComplexity === 'all' ? undefined : selectedComplexity,
      searchQuery: searchQuery.trim() || undefined,
    });
  }, [selectedCategory, selectedComplexity, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-slate-900/95 z-20 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <div>
          <h3 className="text-lg font-semibold text-white">Architecture Blueprints</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Choose a structure to pre-configure your layout
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Filters */}
      <div className="px-4 py-3 border-b border-slate-700/50 space-y-3">
        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search blueprints..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-800 border border-slate-600 rounded-lg text-slate-300 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Category filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 text-xs rounded-lg whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-300'
            }`}
          >
            All Types
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-300'
              }`}
            >
              <span>{categoryIcons[cat]}</span>
              {getCategoryDisplayName(cat)}
            </button>
          ))}
        </div>

        {/* Complexity filters */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Complexity:</span>
          {(['all', 'simple', 'moderate', 'complex'] as const).map((level) => (
            <button
              key={level}
              onClick={() => setSelectedComplexity(level)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                selectedComplexity === level
                  ? level === 'all'
                    ? 'bg-slate-600 text-white'
                    : complexityColors[level]
                  : 'bg-slate-800/50 text-slate-500 hover:text-slate-400'
              }`}
            >
              {level === 'all' ? 'Any' : level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Template grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <p>No blueprints found</p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSelectedComplexity('all');
                setSearchQuery('');
              }}
              className="mt-2 text-sm text-blue-400 hover:text-blue-300"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredTemplates.map((template) => (
              <TemplateCard key={template.id} template={template} onSelect={onSelect} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-700">
        <button
          onClick={onClose}
          className="text-sm text-slate-400 hover:text-white transition-colors"
        >
          Skip and design from scratch →
        </button>
      </div>
    </div>
  );
}

/**
 * Individual template card
 */
function TemplateCard({
  template,
  onSelect,
}: {
  template: FullTemplate;
  onSelect: (template: FullTemplate) => void;
}) {
  return (
    <button
      onClick={() => onSelect(template)}
      className="text-left p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl transition-all group"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{template.icon}</span>
          <div>
            <h4 className="font-medium text-white group-hover:text-blue-400 transition-colors">
              {template.name}
            </h4>
            <span className="text-xs text-slate-500">
              {getCategoryDisplayName(template.category)}
            </span>
          </div>
        </div>
        <span className={`px-2 py-0.5 text-xs rounded ${complexityColors[template.complexity]}`}>
          {template.complexity}
        </span>
      </div>

      {/* Description */}
      <p className="text-sm text-slate-400 mb-3 line-clamp-2">{template.description}</p>

      {/* Features preview */}
      <div className="flex flex-wrap gap-1 mb-3">
        {template.features.slice(0, 4).map((feature, i) => (
          <span key={i} className="px-2 py-0.5 text-[10px] bg-slate-700/50 text-slate-400 rounded">
            {feature}
          </span>
        ))}
        {template.features.length > 4 && (
          <span className="px-2 py-0.5 text-[10px] bg-slate-700/50 text-slate-500 rounded">
            +{template.features.length - 4} more
          </span>
        )}
      </div>

      {/* Layout info */}
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
            />
          </svg>
          {template.layoutStructure.type}
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          {template.estimatedComponents} components
        </span>
      </div>
    </button>
  );
}

export default ArchitectureTemplatePicker;
