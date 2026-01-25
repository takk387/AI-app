'use client';

/**
 * PlanTab - Displays implementation plan snapshot
 */

import React from 'react';
import { LayersIcon, ClockIcon, GitBranchIcon } from '@/components/ui/Icons';
import type { PlanSnapshot } from '@/types/projectDocumentation';

interface PlanTabProps {
  snapshot: PlanSnapshot;
}

function ComplexityBadge({ complexity }: { complexity: string }) {
  const config: Record<string, { label: string; className: string }> = {
    simple: { label: 'Simple', className: 'bg-success-500/20 text-success-400' },
    moderate: { label: 'Moderate', className: 'bg-warning-500/20 text-warning-400' },
    complex: { label: 'Complex', className: 'bg-orange-500/20 text-orange-400' },
    enterprise: { label: 'Enterprise', className: 'bg-error-500/20 text-error-400' },
  };

  const conf = config[complexity] || config.moderate;

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${conf.className}`}>
      {conf.label}
    </span>
  );
}

function DomainBadge({ domain }: { domain: string }) {
  const domainColors: Record<string, string> = {
    setup: 'bg-garden-500/20 text-garden-400',
    auth: 'bg-gold-500/20 text-gold-400',
    database: 'bg-green-500/20 text-green-400',
    feature: 'bg-yellow-500/20 text-yellow-400',
    ui: 'bg-pink-500/20 text-pink-400',
    integration: 'bg-cyan-500/20 text-cyan-400',
    polish: 'bg-gray-500/20 text-gray-400',
  };

  const className = domainColors[domain] || 'bg-slate-500/20 text-slate-400';

  return <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${className}`}>{domain}</span>;
}

export function PlanTab({ snapshot }: PlanTabProps) {
  const { plan } = snapshot;

  return (
    <div className="p-4">
      {/* Summary Header */}
      <div className="mb-6 bg-slate-800/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-100">
            {plan.appName || 'Implementation Plan'}
          </h2>
          <ComplexityBadge complexity={snapshot.complexity} />
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
              <LayersIcon size={16} />
            </div>
            <div className="text-xl font-bold text-slate-100">{snapshot.totalPhases}</div>
            <div className="text-xs text-slate-500">Phases</div>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
              <ClockIcon size={16} />
            </div>
            <div className="text-xl font-bold text-slate-100">{snapshot.estimatedTime}</div>
            <div className="text-xs text-slate-500">Est. Time</div>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
              <LayersIcon size={16} />
            </div>
            <div className="text-xl font-bold text-slate-100">
              {Object.values(snapshot.featureBreakdown).reduce((a, b) => a + b, 0)}
            </div>
            <div className="text-xs text-slate-500">Features</div>
          </div>
        </div>

        <div className="text-xs text-slate-600 mt-3 text-center">
          Generated: {new Date(snapshot.capturedAt).toLocaleString()}
        </div>
      </div>

      {/* Feature Breakdown by Domain */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <GitBranchIcon size={16} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
            Feature Breakdown
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(snapshot.featureBreakdown).map(([domain, count]) => (
            <div
              key={domain}
              className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-1.5"
            >
              <DomainBadge domain={domain} />
              <span className="text-sm font-medium text-slate-300">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Phase List */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <LayersIcon size={16} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Phases</h3>
        </div>
        <div className="space-y-2">
          {plan.phases.map((phase, index) => (
            <div
              key={phase.number || index}
              className="bg-slate-800/30 rounded-lg p-3 border border-slate-800"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-700 text-xs font-medium text-slate-300">
                    {phase.number || index + 1}
                  </span>
                  <span className="text-sm font-medium text-slate-200">{phase.name}</span>
                </div>
                <DomainBadge domain={phase.domain} />
              </div>

              {phase.description && (
                <p className="text-xs text-slate-500 mb-2 ml-8">{phase.description}</p>
              )}

              {phase.features && phase.features.length > 0 && (
                <div className="ml-8">
                  <div className="flex flex-wrap gap-1">
                    {phase.features.slice(0, 5).map((feature, i) => (
                      <span
                        key={i}
                        className="px-1.5 py-0.5 bg-slate-700/50 rounded text-xs text-slate-400"
                      >
                        {feature}
                      </span>
                    ))}
                    {phase.features.length > 5 && (
                      <span className="px-1.5 py-0.5 text-xs text-slate-500">
                        +{phase.features.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {phase.dependencies && phase.dependencies.length > 0 && (
                <div className="ml-8 mt-2 text-xs text-slate-600">
                  Depends on: Phase {phase.dependencies.join(', ')}
                </div>
              )}

              <div className="ml-8 mt-2 flex items-center gap-3 text-xs text-slate-600">
                <span>~{phase.estimatedTokens?.toLocaleString() || '?'} tokens</span>
                <span>{phase.estimatedTime || '~2-3 min'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PlanTab;
