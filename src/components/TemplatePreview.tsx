'use client';

import React from 'react';
import type { FullTemplate } from '../types/architectureTemplates';
import { getCategoryDisplayName } from '../data/templates';

interface TemplatePreviewProps {
  template: FullTemplate;
  onClose: () => void;
  onSelect: () => void;
}

/**
 * TemplatePreview Component
 * Shows detailed preview of a template with all its features and components
 */
export function TemplatePreview({ template, onClose, onSelect }: TemplatePreviewProps) {
  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'simple': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'moderate': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'complex': return 'bg-red-500/20 text-red-300 border-red-500/30';
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const getLayoutIcon = (type: string) => {
    switch (type) {
      case 'sidebar': return '📊';
      case 'topnav': return '📑';
      case 'minimal': return '📄';
      case 'split': return '📐';
      default: return '📱';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl border border-white/10 max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-slate-800/50 flex items-center justify-center text-3xl">
                {template.icon}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{template.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-slate-400">
                    {getCategoryDisplayName(template.category)}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${getComplexityColor(template.complexity)}`}>
                    {template.complexity}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-xs text-slate-400">
                    ~{template.estimatedComponents} components
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-all"
            >
              <span className="text-slate-400 text-xl">✕</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Description */}
          <div className="mb-6">
            <p className="text-slate-300">{template.description}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Layout Structure */}
              <div className="p-4 rounded-xl bg-slate-800/50 border border-white/10">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <span>{getLayoutIcon(template.layoutStructure.type)}</span>
                  Layout Structure
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Type:</span>
                    <span className="text-sm text-white capitalize">{template.layoutStructure.type}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {template.layoutStructure.regions.map((region, index) => (
                      <span
                        key={index}
                        className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300"
                      >
                        {region}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Technical Requirements */}
              <div className="p-4 rounded-xl bg-slate-800/50 border border-white/10">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <span>⚙️</span>
                  Technical Requirements
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className={`flex items-center gap-2 p-2 rounded-lg ${template.technicalRequirements.needsAuth ? 'bg-blue-500/10' : 'bg-slate-700/30'}`}>
                    <span className={template.technicalRequirements.needsAuth ? 'text-blue-400' : 'text-slate-500'}>
                      {template.technicalRequirements.needsAuth ? '✓' : '○'}
                    </span>
                    <span className={`text-sm ${template.technicalRequirements.needsAuth ? 'text-blue-200' : 'text-slate-500'}`}>
                      Authentication
                    </span>
                  </div>
                  <div className={`flex items-center gap-2 p-2 rounded-lg ${template.technicalRequirements.needsDatabase ? 'bg-purple-500/10' : 'bg-slate-700/30'}`}>
                    <span className={template.technicalRequirements.needsDatabase ? 'text-purple-400' : 'text-slate-500'}>
                      {template.technicalRequirements.needsDatabase ? '✓' : '○'}
                    </span>
                    <span className={`text-sm ${template.technicalRequirements.needsDatabase ? 'text-purple-200' : 'text-slate-500'}`}>
                      Database
                    </span>
                  </div>
                  <div className={`flex items-center gap-2 p-2 rounded-lg ${template.technicalRequirements.needsAPI ? 'bg-green-500/10' : 'bg-slate-700/30'}`}>
                    <span className={template.technicalRequirements.needsAPI ? 'text-green-400' : 'text-slate-500'}>
                      {template.technicalRequirements.needsAPI ? '✓' : '○'}
                    </span>
                    <span className={`text-sm ${template.technicalRequirements.needsAPI ? 'text-green-200' : 'text-slate-500'}`}>
                      API
                    </span>
                  </div>
                  <div className={`flex items-center gap-2 p-2 rounded-lg ${template.technicalRequirements.needsFileUpload ? 'bg-orange-500/10' : 'bg-slate-700/30'}`}>
                    <span className={template.technicalRequirements.needsFileUpload ? 'text-orange-400' : 'text-slate-500'}>
                      {template.technicalRequirements.needsFileUpload ? '✓' : '○'}
                    </span>
                    <span className={`text-sm ${template.technicalRequirements.needsFileUpload ? 'text-orange-200' : 'text-slate-500'}`}>
                      File Upload
                    </span>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="p-4 rounded-xl bg-slate-800/50 border border-white/10">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <span>✨</span>
                  Features
                </h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-xs text-slate-400 block mb-2">Required Features</span>
                    <div className="flex flex-wrap gap-1.5">
                      {template.requiredFeatures.map((feature, index) => (
                        <span
                          key={index}
                          className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-200 border border-blue-500/30"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block mb-2">Suggested Features</span>
                    <div className="flex flex-wrap gap-1.5">
                      {template.suggestedFeatures.map((feature, index) => (
                        <span
                          key={index}
                          className="text-xs px-2 py-1 rounded-full bg-white/5 text-slate-400 border border-white/10"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Components List */}
              <div className="p-4 rounded-xl bg-slate-800/50 border border-white/10">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <span>🧩</span>
                  Components ({template.components.length})
                </h3>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {template.components.map((component, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg bg-slate-700/30 border border-white/5"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-white text-sm">{component.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          component.priority === 'core' 
                            ? 'bg-green-500/20 text-green-300' 
                            : 'bg-slate-600/30 text-slate-400'
                        }`}>
                          {component.priority}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{component.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Base Prompt Preview */}
              <div className="p-4 rounded-xl bg-slate-800/50 border border-white/10">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <span>📝</span>
                  AI Prompt Preview
                </h3>
                <div className="p-3 rounded-lg bg-slate-900/50 border border-white/5 max-h-[200px] overflow-y-auto">
                  <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
                    {template.basePrompt}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-slate-900/50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onSelect}
            className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium transition-all shadow-lg"
          >
            Use This Template
          </button>
        </div>
      </div>
    </div>
  );
}

export default TemplatePreview;
