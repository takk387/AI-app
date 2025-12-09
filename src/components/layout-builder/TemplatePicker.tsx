'use client';

import { DESIGN_TEMPLATES, type DesignTemplate } from '@/data/designTemplates';

interface TemplatePickerProps {
  isOpen: boolean;
  onSelect: (template: DesignTemplate) => void;
  onClose: () => void;
}

/**
 * Template picker component for quick start
 */
export function TemplatePicker({ isOpen, onSelect, onClose }: TemplatePickerProps) {
  if (!isOpen) return null;

  const getCategoryIcon = (category: DesignTemplate['category']) => {
    switch (category) {
      case 'business':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        );
      case 'creative':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
            />
          </svg>
        );
      case 'commerce':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        );
      case 'utility':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        );
    }
  };

  return (
    <div className="absolute inset-0 bg-slate-900/95 z-20 flex flex-col">
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Choose a Template</h3>
          <p className="text-sm text-slate-400">Start with a pre-designed layout</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-white transition-colors"
          aria-label="Close template picker"
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
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-4">
          {DESIGN_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => onSelect(template)}
              className="text-left p-4 bg-slate-800 border border-slate-700 rounded-xl hover:border-blue-500 hover:bg-slate-750 transition-all group"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-slate-400 group-hover:text-blue-400 transition-colors">
                  {getCategoryIcon(template.category)}
                </span>
                <span className="text-sm font-medium text-white">{template.name}</span>
              </div>
              <p className="text-xs text-slate-400 line-clamp-2">{template.description}</p>
              <div className="mt-3 flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    template.design.basePreferences?.colorScheme === 'dark'
                      ? 'bg-slate-700 text-slate-300'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {template.design.basePreferences?.colorScheme}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                  {template.design.basePreferences?.layout}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="p-4 border-t border-slate-700">
        <button
          onClick={onClose}
          className="w-full py-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          Skip and start from scratch
        </button>
      </div>
    </div>
  );
}

export default TemplatePicker;
