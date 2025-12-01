'use client';

import React, { useState, useMemo } from 'react';
import type { FullTemplate, TemplateCategory, TemplateComplexity } from '../types/architectureTemplates';
import { 
  architectureTemplates, 
  filterTemplates, 
  getAllCategories, 
  getCategoryDisplayName,
  getRecommendedTemplates 
} from '../data/templates';
import TemplatePreview from './TemplatePreview';

interface TemplateSelectorProps {
  onSelect: (template: FullTemplate) => void;
  onSkip?: () => void;
  userDescription?: string;
}

/**
 * TemplateSelector Component
 * Displays available architecture templates for user selection
 */
export function TemplateSelector({ onSelect, onSkip, userDescription }: TemplateSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [selectedComplexity, setSelectedComplexity] = useState<TemplateComplexity | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState<FullTemplate | null>(null);

  // Get recommended templates if user description is provided
  const recommendedTemplates = useMemo(() => {
    if (userDescription) {
      return getRecommendedTemplates(userDescription);
    }
    return [];
  }, [userDescription]);

  // Filter templates based on current filters
  const filteredTemplates = useMemo(() => {
    return filterTemplates({
      category: selectedCategory === 'all' ? undefined : selectedCategory,
      complexity: selectedComplexity === 'all' ? undefined : selectedComplexity,
      searchQuery: searchQuery || undefined
    });
  }, [selectedCategory, selectedComplexity, searchQuery]);

  const categories = getAllCategories();

  const getComplexityColor = (complexity: TemplateComplexity) => {
    switch (complexity) {
      case 'simple': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'moderate': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'complex': return 'bg-red-500/20 text-red-300 border-red-500/30';
    }
  };

  const getCategoryColor = (category: TemplateCategory) => {
    switch (category) {
      case 'admin': return 'bg-blue-500/20 text-blue-300';
      case 'commerce': return 'bg-purple-500/20 text-purple-300';
      case 'content': return 'bg-orange-500/20 text-orange-300';
      case 'marketing': return 'bg-pink-500/20 text-pink-300';
      case 'saas': return 'bg-cyan-500/20 text-cyan-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Choose a Template</h2>
        <p className="text-slate-400">
          Select a pre-built architecture pattern to accelerate your development
        </p>
      </div>

      {/* Recommended Templates */}
      {recommendedTemplates.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
            <span>✨</span>
            <span>Recommended for you</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendedTemplates.slice(0, 3).map((template) => (
              <button
                key={template.id}
                onClick={() => onSelect(template)}
                className="p-4 rounded-xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30 hover:border-blue-500/50 text-left transition-all group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{template.icon}</span>
                  <span className="font-semibold text-white group-hover:text-blue-200 transition-colors">
                    {template.name}
                  </span>
                  <span className="ml-auto text-xs bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded-full">
                    Recommended
                  </span>
                </div>
                <p className="text-sm text-slate-400 line-clamp-2">{template.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 pb-4 border-b border-white/10">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value as TemplateCategory | 'all')}
          className="px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {getCategoryDisplayName(cat)}
            </option>
          ))}
        </select>

        {/* Complexity Filter */}
        <select
          value={selectedComplexity}
          onChange={(e) => setSelectedComplexity(e.target.value as TemplateComplexity | 'all')}
          className="px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        >
          <option value="all">All Complexities</option>
          <option value="simple">Simple</option>
          <option value="moderate">Moderate</option>
          <option value="complex">Complex</option>
        </select>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className="p-5 rounded-xl bg-slate-800/50 border border-white/10 hover:border-white/20 transition-all group relative"
          >
            {/* Header */}
            <div className="flex items-start gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-slate-700/50 flex items-center justify-center text-2xl">
                {template.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white group-hover:text-blue-200 transition-colors">
                  {template.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(template.category)}`}>
                    {getCategoryDisplayName(template.category)}
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            <p 
              className="text-sm text-slate-400 mb-4 line-clamp-2"
              title={template.description}
            >
              {template.description}
            </p>

            {/* Features */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {template.features.slice(0, 4).map((feature, index) => (
                <span
                  key={index}
                  className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/5"
                >
                  {feature}
                </span>
              ))}
              {template.features.length > 4 && (
                <span className="text-xs px-2 py-0.5 text-slate-500">
                  +{template.features.length - 4} more
                </span>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-white/5">
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full border ${getComplexityColor(template.complexity)}`}>
                  {template.complexity}
                </span>
                <span className="text-xs text-slate-500">
                  ~{template.estimatedComponents} components
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPreviewTemplate(template)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                >
                  Preview
                </button>
                <button
                  onClick={() => onSelect(template)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
                >
                  Select
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-lg font-medium text-white mb-2">No templates found</h3>
          <p className="text-slate-400">Try adjusting your filters or search query</p>
        </div>
      )}

      {/* Skip Option */}
      {onSkip && (
        <div className="text-center pt-6 border-t border-white/10">
          <button
            onClick={onSkip}
            className="text-sm text-slate-400 hover:text-slate-300 transition-colors"
          >
            Skip template selection and start from scratch →
          </button>
        </div>
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <TemplatePreview
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onSelect={() => {
            onSelect(previewTemplate);
            setPreviewTemplate(null);
          }}
        />
      )}
    </div>
  );
}

export default TemplateSelector;
