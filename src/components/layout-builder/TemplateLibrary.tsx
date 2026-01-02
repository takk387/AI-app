'use client';

import { useState, useCallback, useMemo } from 'react';

export interface DesignTemplate {
  id: string;
  name: string;
  category: 'header' | 'footer' | 'sidebar' | 'hero' | 'full-page' | 'component';
  description?: string;
  thumbnail?: string;
  design: Record<string, unknown>;
  tags?: string[];
  isPublic?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TemplateLibraryProps {
  /** Available templates */
  templates: DesignTemplate[];
  /** Whether templates are loading */
  isLoading?: boolean;
  /** Callback when template is selected to preview */
  onPreview?: (template: DesignTemplate) => void;
  /** Callback when template is applied */
  onApply: (template: DesignTemplate) => void;
  /** Callback to save current design as template */
  onSave?: (name: string, category: DesignTemplate['category']) => void;
  /** Callback to delete a template */
  onDelete?: (templateId: string) => void;
  /** Optional class name */
  className?: string;
}

const CATEGORY_LABELS: Record<DesignTemplate['category'], string> = {
  header: 'Headers',
  footer: 'Footers',
  sidebar: 'Sidebars',
  hero: 'Hero Sections',
  'full-page': 'Full Pages',
  component: 'Components',
};

const CATEGORY_ICONS: Record<DesignTemplate['category'], string> = {
  header: '📑',
  footer: '📋',
  sidebar: '📊',
  hero: '🖼️',
  'full-page': '📄',
  component: '🧩',
};

/**
 * TemplateLibrary Component
 *
 * Browse, preview, and apply design templates.
 * Supports saving current designs as new templates.
 */
export function TemplateLibrary({
  templates,
  isLoading = false,
  onPreview,
  onApply,
  onSave,
  onDelete,
  className = '',
}: TemplateLibraryProps) {
  const [selectedCategory, setSelectedCategory] = useState<DesignTemplate['category'] | 'all'>(
    'all'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] =
    useState<DesignTemplate['category']>('full-page');
  const [previewTemplate, setPreviewTemplate] = useState<DesignTemplate | null>(null);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let result = templates;

    // Filter by category
    if (selectedCategory !== 'all') {
      result = result.filter((t) => t.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query) ||
          t.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    return result;
  }, [templates, selectedCategory, searchQuery]);

  // Group templates by category
  const groupedTemplates = useMemo(() => {
    if (selectedCategory !== 'all') {
      return { [selectedCategory]: filteredTemplates };
    }

    const groups: Partial<Record<DesignTemplate['category'], DesignTemplate[]>> = {};
    filteredTemplates.forEach((template) => {
      if (!groups[template.category]) {
        groups[template.category] = [];
      }
      groups[template.category]!.push(template);
    });
    return groups;
  }, [filteredTemplates, selectedCategory]);

  const handlePreview = useCallback(
    (template: DesignTemplate) => {
      setPreviewTemplate(template);
      onPreview?.(template);
    },
    [onPreview]
  );

  const handleApply = useCallback(
    (template: DesignTemplate) => {
      onApply(template);
      setPreviewTemplate(null);
    },
    [onApply]
  );

  const handleSave = useCallback(() => {
    if (onSave && newTemplateName.trim()) {
      onSave(newTemplateName.trim(), newTemplateCategory);
      setShowSaveModal(false);
      setNewTemplateName('');
    }
  }, [onSave, newTemplateName, newTemplateCategory]);

  const handleDelete = useCallback(
    (templateId: string) => {
      if (onDelete && window.confirm('Are you sure you want to delete this template?')) {
        onDelete(templateId);
      }
    },
    [onDelete]
  );

  const categories: (DesignTemplate['category'] | 'all')[] = [
    'all',
    'full-page',
    'header',
    'hero',
    'sidebar',
    'footer',
    'component',
  ];

  return (
    <div className={`flex flex-col h-full bg-slate-900 ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-white">Template Library</h3>
          {onSave && (
            <button
              type="button"
              onClick={() => setShowSaveModal(true)}
              className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Save Current
            </button>
          )}
        </div>

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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 px-4 py-2 border-b border-slate-700 overflow-x-auto">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setSelectedCategory(category)}
            className={`px-3 py-1.5 text-xs rounded-md whitespace-nowrap transition-colors ${
              selectedCategory === category
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {category === 'all' ? 'All' : CATEGORY_LABELS[category]}
          </button>
        ))}
      </div>

      {/* Template grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-400 mt-3">Loading templates...</p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-3">
              <svg
                className="w-6 h-6 text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <p className="text-sm text-slate-400">No templates found</p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-2 text-xs text-blue-400 hover:text-blue-300"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
              <div key={category}>
                {selectedCategory === 'all' && (
                  <div className="flex items-center gap-2 mb-3">
                    <span>{CATEGORY_ICONS[category as DesignTemplate['category']]}</span>
                    <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                      {CATEGORY_LABELS[category as DesignTemplate['category']]}
                    </h4>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {categoryTemplates?.map((template) => (
                    <div
                      key={template.id}
                      className="group relative rounded-lg border border-slate-700 bg-slate-800/50 overflow-hidden hover:border-slate-600 transition-colors"
                    >
                      {/* Thumbnail */}
                      <div
                        className="aspect-video bg-slate-900 cursor-pointer"
                        onClick={() => handlePreview(template)}
                      >
                        {template.thumbnail ? (
                          <img
                            src={template.thumbnail}
                            alt={template.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-3xl">{CATEGORY_ICONS[template.category]}</span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-3">
                        <h5 className="text-sm font-medium text-white truncate">{template.name}</h5>
                        {template.description && (
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                            {template.description}
                          </p>
                        )}
                        {template.tags && template.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {template.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="px-1.5 py-0.5 text-xs bg-slate-700 text-slate-300 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Actions overlay */}
                      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-slate-900 via-slate-900/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleApply(template)}
                            className="flex-1 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors"
                          >
                            Apply
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePreview(template)}
                            className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded-md transition-colors"
                          >
                            Preview
                          </button>
                          {onDelete && (
                            <button
                              type="button"
                              onClick={() => handleDelete(template.id)}
                              className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-3xl mx-4 bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
            {/* Preview header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
              <div>
                <h3 className="text-sm font-medium text-white">{previewTemplate.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {CATEGORY_LABELS[previewTemplate.category]}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="p-1 text-slate-400 hover:text-white transition-colors"
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

            {/* Preview content */}
            <div className="aspect-video bg-slate-800">
              {previewTemplate.thumbnail ? (
                <img
                  src={previewTemplate.thumbnail}
                  alt={previewTemplate.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-6xl">{CATEGORY_ICONS[previewTemplate.category]}</span>
                </div>
              )}
            </div>

            {/* Preview footer */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700">
              <div className="flex items-center gap-2">
                {previewTemplate.tags?.map((tag) => (
                  <span key={tag} className="px-2 py-1 text-xs bg-slate-800 text-slate-300 rounded">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewTemplate(null)}
                  className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleApply(previewTemplate)}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                >
                  Apply Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-md mx-4 bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
              <h3 className="text-sm font-medium text-white">Save as Template</h3>
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="p-1 text-slate-400 hover:text-white transition-colors"
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

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Template Name</label>
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="My awesome design..."
                  className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Category</label>
                <select
                  value={newTemplateCategory}
                  onChange={(e) =>
                    setNewTemplateCategory(e.target.value as DesignTemplate['category'])
                  }
                  className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-700">
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!newTemplateName.trim()}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-lg transition-colors"
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TemplateLibrary;
