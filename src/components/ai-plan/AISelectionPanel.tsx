/**
 * AISelectionPanel
 *
 * Three-tier card selector (Cost Effective / High Quality / Hybrid)
 * plus per-feature AI model multi-select when the app concept requires multiple AIs.
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import type { AppConcept } from '@/types/appConcept';
import type {
  UserAISelection,
  AIFeatureSelection,
  FinalValidatedArchitecture,
} from '@/types/dualPlanning';
import {
  AI_SETUP_TIERS,
  MODEL_CATALOG,
  getModelById,
  type AISetupTierKey,
  type ModelId,
} from '@/constants/aiModels';

interface AISelectionPanelProps {
  concept: AppConcept;
  architecture: FinalValidatedArchitecture;
  initialSelection: UserAISelection | null;
  onSelectionChange: (selection: UserAISelection) => void;
}

export function AISelectionPanel({
  concept,
  architecture,
  initialSelection,
  onSelectionChange,
}: AISelectionPanelProps) {
  const [selectedTier, setSelectedTier] = useState<AISetupTierKey>(
    initialSelection?.selectedTier ?? 'hybrid'
  );
  const [featureSelections, setFeatureSelections] = useState<AIFeatureSelection[]>(
    initialSelection?.featureSelections ?? []
  );

  // Detect features that need AI model selection
  const aiFeaturesNeeded = useMemo(() => {
    const features: { featureId: string; featureName: string; reason: string }[] = [];

    if (architecture.agentic.enabled) {
      for (const workflow of architecture.agentic.workflows) {
        features.push({
          featureId: `agentic-${workflow.name.toLowerCase().replace(/\s+/g, '-')}`,
          featureName: workflow.name,
          reason: `Agentic workflow: ${workflow.description}`,
        });
      }
    }

    // Check concept features that might need AI
    const aiKeywords = [
      'ai',
      'intelligent',
      'smart',
      'automated',
      'generate',
      'recommend',
      'analyze',
      'classify',
    ];
    for (const feature of concept.coreFeatures ?? []) {
      const text = `${feature.name} ${feature.description}`.toLowerCase();
      if (aiKeywords.some((kw) => text.includes(kw))) {
        const id = `feature-${feature.id}`;
        if (!features.some((f) => f.featureId === id)) {
          features.push({
            featureId: id,
            featureName: feature.name,
            reason: feature.description,
          });
        }
      }
    }

    return features;
  }, [architecture, concept]);

  const emitChange = useCallback(
    (tier: AISetupTierKey, features: AIFeatureSelection[]) => {
      onSelectionChange({
        selectedTier: tier,
        featureSelections: features,
        customOverrides: {},
      });
    },
    [onSelectionChange]
  );

  const handleTierSelect = useCallback(
    (tier: AISetupTierKey) => {
      setSelectedTier(tier);
      emitChange(tier, featureSelections);
    },
    [featureSelections, emitChange]
  );

  const handleFeatureModelToggle = useCallback(
    (featureId: string, featureName: string, modelId: ModelId) => {
      setFeatureSelections((prev) => {
        const existing = prev.find((f) => f.featureId === featureId);
        let updated: AIFeatureSelection[];

        if (existing) {
          const hasModel = existing.selectedModels.includes(modelId);
          const newModels = hasModel
            ? existing.selectedModels.filter((m) => m !== modelId)
            : [...existing.selectedModels, modelId];

          updated = prev.map((f) =>
            f.featureId === featureId ? { ...f, selectedModels: newModels } : f
          );
        } else {
          updated = [
            ...prev,
            {
              featureId,
              featureName,
              selectedModels: [modelId],
              recommendedModels: [],
            },
          ];
        }

        emitChange(selectedTier, updated);
        return updated;
      });
    },
    [selectedTier, emitChange]
  );

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-zinc-100">AI Setup</h3>

      {/* Tier Selection */}
      <div className="grid grid-cols-3 gap-3">
        {Object.values(AI_SETUP_TIERS).map((tier) => {
          const isSelected = selectedTier === tier.key;
          return (
            <button
              key={tier.key}
              onClick={() => handleTierSelect(tier.key)}
              className={`p-4 rounded-lg border text-left transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-sm font-semibold ${isSelected ? 'text-blue-400' : 'text-zinc-300'}`}
                >
                  {tier.label}
                </span>
                {tier.key === 'hybrid' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                    Recommended
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">{tier.description}</p>
              <div className="mt-3 text-xs text-zinc-600">
                Est. cost: {Math.round(tier.estimatedCostMultiplier * 100)}% of max
              </div>

              {/* Model assignments for this tier */}
              {isSelected && (
                <div className="mt-3 pt-3 border-t border-zinc-700/50 space-y-1">
                  <TierModelRow label="Architecture" modelId={tier.models.architecturePlanning} />
                  <TierModelRow label="Code Gen" modelId={tier.models.codeGeneration} />
                  <TierModelRow label="Review" modelId={tier.models.codeReview} />
                  <TierModelRow label="Testing" modelId={tier.models.testing} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Per-Feature AI Model Selection */}
      {aiFeaturesNeeded.length > 0 && (
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-medium text-zinc-300">Per-Feature AI Models</h4>
            <p className="text-xs text-zinc-500 mt-1">
              Your app has {aiFeaturesNeeded.length} feature
              {aiFeaturesNeeded.length !== 1 ? 's' : ''} that use AI. Select which models each
              feature should support.
            </p>
          </div>

          <div className="space-y-3">
            {aiFeaturesNeeded.map((feature) => {
              const selection = featureSelections.find((f) => f.featureId === feature.featureId);
              return (
                <div
                  key={feature.featureId}
                  className="p-3 rounded-lg border border-zinc-800 bg-zinc-800/30"
                >
                  <div className="mb-2">
                    <span className="text-sm font-medium text-zinc-200">{feature.featureName}</span>
                    <p className="text-xs text-zinc-500">{feature.reason}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {MODEL_CATALOG.map((model) => {
                      const isSelected = selection?.selectedModels.includes(model.id) ?? false;
                      return (
                        <button
                          key={model.id}
                          onClick={() =>
                            handleFeatureModelToggle(
                              feature.featureId,
                              feature.featureName,
                              model.id
                            )
                          }
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-colors ${
                            isSelected
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                              : 'bg-zinc-800 text-zinc-500 border border-zinc-700 hover:border-zinc-600'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              model.costTier === 'high'
                                ? 'bg-amber-400'
                                : model.costTier === 'medium'
                                  ? 'bg-blue-400'
                                  : 'bg-emerald-400'
                            }`}
                          />
                          {model.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function TierModelRow({ label, modelId }: { label: string; modelId: ModelId }) {
  const model = getModelById(modelId);
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-zinc-500">{label}</span>
      <span className="text-zinc-400">{model?.name ?? modelId}</span>
    </div>
  );
}
