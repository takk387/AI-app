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
      <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
        AI Setup
      </h3>

      {/* Tier Selection */}
      <div className="grid grid-cols-3 gap-3">
        {Object.values(AI_SETUP_TIERS).map((tier) => {
          const isSelected = selectedTier === tier.key;
          return (
            <button
              key={tier.key}
              onClick={() => handleTierSelect(tier.key)}
              className="p-4 rounded-lg text-left transition-all"
              style={
                isSelected
                  ? {
                      border: '1px solid var(--accent-primary)',
                      background: 'var(--accent-muted)',
                    }
                  : {
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-tertiary)',
                    }
              }
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-sm font-semibold"
                  style={{
                    color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                  }}
                >
                  {tier.label}
                </span>
                {tier.key === 'hybrid' && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{
                      background: 'var(--accent-muted)',
                      color: 'var(--accent-primary)',
                    }}
                  >
                    Recommended
                  </span>
                )}
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {tier.description}
              </p>
              <div className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                Est. cost: {Math.round(tier.estimatedCostMultiplier * 100)}% of max
              </div>

              {/* Model assignments for this tier */}
              {isSelected && (
                <div
                  className="mt-3 pt-3 space-y-1"
                  style={{ borderTop: '1px solid var(--border-color)' }}
                >
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
            <h4 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Per-Feature AI Models
            </h4>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
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
                  className="p-3 rounded-lg"
                  style={{
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                  }}
                >
                  <div className="mb-2">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {feature.featureName}
                    </span>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {feature.reason}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {MODEL_CATALOG.map((model) => {
                      const isModelSelected = selection?.selectedModels.includes(model.id) ?? false;
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
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-colors"
                          style={
                            isModelSelected
                              ? {
                                  background: 'var(--accent-muted)',
                                  color: 'var(--accent-primary)',
                                  border: '1px solid var(--accent-primary)',
                                }
                              : {
                                  background: 'var(--bg-tertiary)',
                                  color: 'var(--text-muted)',
                                  border: '1px solid var(--border-color)',
                                }
                          }
                        >
                          {/* Cost tier dots — semantic indicators, kept as-is */}
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
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ color: 'var(--text-secondary)' }}>{model?.name ?? modelId}</span>
    </div>
  );
}
