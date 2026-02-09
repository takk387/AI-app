/**
 * ArchitectureReviewDialog (formerly ConsensusEscalationDialog)
 *
 * Full-screen modal shown ALWAYS after the planning pipeline completes.
 * Displays both AI architectures side-by-side and lets the user choose:
 *
 * When consensus WAS reached:
 * - "Accept Consensus" (recommended), "Use Claude's", "Use Gemini's", or "Merge Both"
 *
 * When consensus was NOT reached (escalation):
 * - "Use Claude's", "Use Gemini's", or "Merge Both"
 *
 * This ensures the user always reviews and confirms the architecture
 * before moving on to the builder.
 */

'use client';

import React from 'react';
import type { ArchitecturePosition, EscalationData, Disagreement } from '@/types/dualPlanning';

interface ArchitectureReviewDialogProps {
  claudeArchitecture: ArchitecturePosition;
  geminiArchitecture: ArchitecturePosition;
  negotiationRounds: number;
  /** If consensus was reached, this is true. Shows "Accept Consensus" as recommended. */
  consensusReached: boolean;
  /** Escalation data (only present if consensus was NOT reached) */
  escalation?: EscalationData | null;
  onResolve: (choice: 'claude' | 'gemini' | 'merge' | 'consensus') => void;
}

// Keep old export name for backward compatibility
export function ConsensusEscalationDialog(props: {
  escalation: EscalationData;
  onResolve: (choice: 'claude' | 'gemini' | 'merge') => void;
}) {
  return (
    <ArchitectureReviewDialog
      claudeArchitecture={props.escalation.claudeArchitecture}
      geminiArchitecture={props.escalation.geminiArchitecture}
      negotiationRounds={props.escalation.negotiationRounds}
      consensusReached={false}
      escalation={props.escalation}
      onResolve={(choice) => {
        if (choice === 'consensus') return; // shouldn't happen for escalation-only
        props.onResolve(choice);
      }}
    />
  );
}

export function ArchitectureReviewDialog({
  claudeArchitecture,
  geminiArchitecture,
  negotiationRounds,
  consensusReached,
  escalation,
  onResolve,
}: ArchitectureReviewDialogProps) {
  const divergentIssues: Disagreement[] = escalation?.divergentIssues ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
        }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 px-6 py-4"
          style={{
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                background: consensusReached
                  ? 'var(--success-muted, rgba(34, 197, 94, 0.1))'
                  : 'var(--warning-muted, rgba(245, 158, 11, 0.1))',
              }}
            >
              <span
                style={{
                  color: consensusReached
                    ? 'var(--success-primary, #22c55e)'
                    : 'var(--warning-primary, #f59e0b)',
                }}
                className="text-lg"
              >
                {consensusReached ? '✓' : '⚡'}
              </span>
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                {consensusReached ? 'Review Architecture Plan' : 'Consensus Not Reached'}
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {consensusReached
                  ? `Both AIs agreed after ${negotiationRounds} round${negotiationRounds !== 1 ? 's' : ''}. Review their proposals and confirm.`
                  : `After ${negotiationRounds} round${negotiationRounds !== 1 ? 's' : ''}: ${escalation?.reason ?? 'AIs could not reach consensus'}`}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Consensus info banner */}
          {consensusReached && (
            <div
              className="p-4 rounded-lg"
              style={{
                background: 'var(--success-muted, rgba(34, 197, 94, 0.1))',
                border: '1px solid var(--success-muted, rgba(34, 197, 94, 0.2))',
              }}
            >
              <p className="text-sm" style={{ color: 'var(--success-primary, #22c55e)' }}>
                ✓ Both AIs reached consensus. You can accept the agreed architecture or choose one
                AI&apos;s individual proposal instead.
              </p>
            </div>
          )}

          {/* Divergent Issues (only when escalation) */}
          {divergentIssues.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Divergent Issues
              </h3>
              {divergentIssues.map((issue, idx) => (
                <div
                  key={idx}
                  className="rounded-lg overflow-hidden"
                  style={{ border: '1px solid var(--border-color)' }}
                >
                  <div className="px-4 py-2" style={{ background: 'var(--bg-tertiary)' }}>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {issue.topic}
                    </span>
                  </div>
                  <div className="grid grid-cols-2">
                    {/* Claude's stance */}
                    <div className="p-4" style={{ borderRight: '1px solid var(--border-color)' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ background: 'var(--claude-primary)' }}
                        />
                        <span
                          className="text-xs font-medium"
                          style={{ color: 'var(--claude-primary)' }}
                        >
                          Claude Opus 4.6
                        </span>
                      </div>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {issue.claudeStance}
                      </p>
                      {issue.reasoning.claude && (
                        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                          {issue.reasoning.claude}
                        </p>
                      )}
                    </div>
                    {/* Gemini's stance */}
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ background: 'var(--gemini-primary)' }}
                        />
                        <span
                          className="text-xs font-medium"
                          style={{ color: 'var(--gemini-primary)' }}
                        >
                          Gemini 3 Pro
                        </span>
                      </div>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {issue.geminiStance}
                      </p>
                      {issue.reasoning.gemini && (
                        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                          {issue.reasoning.gemini}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Architecture Comparison Summary */}
          <div className="grid grid-cols-2 gap-4">
            <ArchitectureSummary
              title="Claude's Architecture"
              color="blue"
              arch={claudeArchitecture}
            />
            <ArchitectureSummary
              title="Gemini's Architecture"
              color="purple"
              arch={geminiArchitecture}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div
          className="sticky bottom-0 px-6 py-4"
          style={{
            background: 'var(--bg-secondary)',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {consensusReached
                ? 'Accept the consensus or choose a specific architecture'
                : 'Choose which architecture to proceed with'}
            </p>
            <div className="flex gap-3">
              {/* Accept Consensus — only when consensus was reached */}
              {consensusReached && (
                <button
                  onClick={() => onResolve('consensus')}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    background: 'var(--accent-primary)',
                    color: 'white',
                  }}
                >
                  ✓ Accept Consensus
                </button>
              )}
              {/* Claude button */}
              <button
                onClick={() => onResolve('claude')}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: 'var(--claude-bg)',
                  color: 'var(--claude-primary)',
                }}
              >
                Use Claude&apos;s
              </button>
              {/* Gemini button */}
              <button
                onClick={() => onResolve('gemini')}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: 'var(--gemini-bg)',
                  color: 'var(--gemini-primary)',
                }}
              >
                Use Gemini&apos;s
              </button>
              {/* Merge button — themed */}
              <button
                onClick={() => onResolve('merge')}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: 'var(--success-muted, rgba(34, 197, 94, 0.1))',
                  color: 'var(--success-primary, #22c55e)',
                }}
              >
                Merge Both
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function ArchitectureSummary({
  title,
  color,
  arch,
}: {
  title: string;
  color: 'blue' | 'purple';
  arch: {
    database: { provider: string };
    api: { style: string };
    auth: { provider: string; strategy: string };
    agentic: { enabled: boolean; framework: string };
    realtime: { enabled: boolean; technology: string };
  };
}) {
  const primaryVar = color === 'blue' ? '--claude-primary' : '--gemini-primary';
  const borderVar = color === 'blue' ? '--claude-border' : '--gemini-border';

  return (
    <div
      className="p-4 rounded-lg"
      style={{
        background: 'var(--bg-tertiary)',
        border: `1px solid var(${borderVar})`,
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full" style={{ background: `var(${primaryVar})` }} />
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {title}
        </span>
      </div>
      <div className="space-y-1.5 text-xs">
        <Row label="Database" value={arch.database.provider} />
        <Row label="API" value={arch.api.style} />
        <Row label="Auth" value={`${arch.auth.provider} / ${arch.auth.strategy}`} />
        <Row label="Agentic" value={arch.agentic.enabled ? arch.agentic.framework : 'None'} />
        <Row label="Realtime" value={arch.realtime.enabled ? arch.realtime.technology : 'None'} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ color: 'var(--text-secondary)' }}>{value}</span>
    </div>
  );
}
