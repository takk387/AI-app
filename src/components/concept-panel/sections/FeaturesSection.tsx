'use client';

import { useState } from 'react';
import { PlusIcon, ChevronDownIcon, ChevronRightIcon } from '@/components/ui/Icons';
import type { AppConcept, Feature } from '@/types/appConcept';
import { FeatureCard } from '../FeatureCard';

interface FeaturesSectionProps {
  appConcept: AppConcept;
  onUpdate: (path: string, value: unknown) => void;
  readOnly?: boolean;
}

/**
 * Section for features with full list, add/remove, priority editing
 */
export function FeaturesSection({ appConcept, onUpdate, readOnly = false }: FeaturesSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const features = appConcept.coreFeatures || [];

  const handleUpdateFeature = (index: number, updates: Partial<Feature>) => {
    const updated = [...features];
    updated[index] = { ...updated[index], ...updates };
    onUpdate('coreFeatures', updated);
  };

  const handleDeleteFeature = (index: number) => {
    const updated = features.filter((_, i) => i !== index);
    onUpdate('coreFeatures', updated);
  };

  const handleAddFeature = () => {
    const newFeature: Feature = {
      id: `feature-${Date.now()}`,
      name: 'New Feature',
      description: '',
      priority: 'medium',
    };
    onUpdate('coreFeatures', [...features, newFeature]);
  };

  // Count by priority
  const highCount = features.filter((f) => f.priority === 'high').length;
  const mediumCount = features.filter((f) => f.priority === 'medium').length;
  const lowCount = features.filter((f) => f.priority === 'low').length;

  return (
    <div>
      {/* Header with toggle */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-left mb-2"
      >
        {isExpanded ? (
          <ChevronDownIcon size={14} className="text-zinc-400" />
        ) : (
          <ChevronRightIcon size={14} className="text-zinc-400" />
        )}
        <span className="text-xs text-zinc-500 uppercase tracking-wide">
          Features ({features.length})
        </span>
        {/* Priority summary */}
        <div className="flex gap-1 ml-auto">
          {highCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] bg-red-500/20 text-red-300 rounded">
              {highCount}
            </span>
          )}
          {mediumCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] bg-yellow-500/20 text-yellow-300 rounded">
              {mediumCount}
            </span>
          )}
          {lowCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] bg-green-500/20 text-green-300 rounded">
              {lowCount}
            </span>
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="space-y-2">
          {features.length === 0 ? (
            <p className="text-sm text-zinc-500 italic py-2">No features defined yet</p>
          ) : (
            features.map((feature, index) => (
              <FeatureCard
                key={feature.id || index}
                feature={feature}
                onUpdate={(updates) => handleUpdateFeature(index, updates)}
                onDelete={() => handleDeleteFeature(index)}
                readOnly={readOnly}
              />
            ))
          )}

          {/* Add feature button */}
          {!readOnly && (
            <button
              type="button"
              onClick={handleAddFeature}
              className="flex items-center gap-2 w-full py-2 px-3 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-lg border border-dashed border-zinc-700 hover:border-zinc-600 transition-colors"
            >
              <PlusIcon size={14} />
              Add Feature
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default FeaturesSection;
