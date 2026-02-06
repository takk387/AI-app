'use client';

/**
 * AI Plan Card - Displays architecture planning summary for review page
 *
 * Shows: consensus status, key architecture decisions, AI setup tier,
 * agentic workflows. Edit link navigates back to /app/ai-plan.
 * Pattern matches existing ConceptCard.tsx.
 */

import { ArrowRight, Brain, CheckCircle, AlertTriangle } from 'lucide-react';
import type { FinalValidatedArchitecture, UserAISelection } from '@/types/dualPlanning';

interface AIPlanCardProps {
  architecture: FinalValidatedArchitecture;
  aiSelection: UserAISelection | null;
  onEdit: () => void;
}

export function AIPlanCard({ architecture, aiSelection, onEdit }: AIPlanCardProps) {
  const consensusRounds = architecture.consensusReport?.rounds ?? 0;
  const coverage = architecture.validation?.coverage ?? 0;
  const hasAgentic = architecture.agentic?.enabled && architecture.agentic.workflows.length > 0;

  return (
    <div
      className="p-6 rounded-xl"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            AI Architecture Plan
          </h2>
        </div>
        <button
          onClick={onEdit}
          className="flex items-center gap-1 text-sm font-medium transition-colors hover:opacity-80"
          style={{ color: 'var(--accent-primary)' }}
        >
          Edit Plan
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="space-y-3">
        {/* Consensus Status */}
        <div className="flex items-center gap-2">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Consensus reached in {consensusRounds} round{consensusRounds !== 1 ? 's' : ''}
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
            {coverage}% coverage
          </span>
        </div>

        {/* Key Architecture Decisions */}
        <div>
          <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Architecture
          </span>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <ArchBadge label={architecture.database?.provider ?? 'DB'} />
            <ArchBadge label={architecture.api?.style ?? 'API'} />
            <ArchBadge label={architecture.auth?.provider ?? 'Auth'} />
            {architecture.realtime?.enabled && (
              <ArchBadge label={architecture.realtime.technology} />
            )}
            {hasAgentic && <ArchBadge label={architecture.agentic.framework} accent />}
          </div>
        </div>

        {/* Agentic Workflows */}
        {hasAgentic && (
          <div>
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              Agentic Workflows
            </span>
            <ul className="mt-1 space-y-0.5">
              {architecture.agentic.workflows.slice(0, 3).map((wf) => (
                <li
                  key={wf.name}
                  className="text-xs flex items-start gap-1.5"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <span className="mt-0.5 w-1 h-1 rounded-full bg-purple-400 flex-shrink-0" />
                  {wf.name}
                </li>
              ))}
              {architecture.agentic.workflows.length > 3 && (
                <li className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  +{architecture.agentic.workflows.length - 3} more
                </li>
              )}
            </ul>
          </div>
        )}

        {/* AI Setup Tier */}
        {aiSelection && (
          <div>
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              AI Setup
            </span>
            <p className="text-sm capitalize" style={{ color: 'var(--text-primary)' }}>
              {aiSelection.selectedTier.replace('-', ' ')} tier
            </p>
            {aiSelection.featureSelections.length > 0 && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {aiSelection.featureSelections.length} feature
                {aiSelection.featureSelections.length !== 1 ? 's' : ''} with custom AI
              </p>
            )}
          </div>
        )}

        {/* Validation Status */}
        {architecture.validation?.replanAttempts > 0 && (
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {architecture.validation.replanAttempts} replan attempt
              {architecture.validation.replanAttempts !== 1 ? 's' : ''} during validation
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function ArchBadge({ label, accent }: { label: string; accent?: boolean }) {
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full ${
        accent ? 'bg-purple-500/10 text-purple-400' : 'bg-zinc-500/10 text-zinc-400'
      }`}
      style={
        !accent
          ? {
              background: 'var(--bg-tertiary, rgba(113,113,122,0.1))',
              color: 'var(--text-secondary)',
            }
          : undefined
      }
    >
      {label}
    </span>
  );
}

export default AIPlanCard;
