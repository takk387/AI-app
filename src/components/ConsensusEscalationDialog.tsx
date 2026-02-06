/**
 * ConsensusEscalationDialog
 *
 * Full-screen modal shown when Claude and Gemini cannot reach consensus.
 * Displays divergent issues side-by-side and lets the user choose
 * Claude's architecture, Gemini's, or a merge of both.
 */

'use client';

import React from 'react';
import type { EscalationData } from '@/types/dualPlanning';

interface ConsensusEscalationDialogProps {
  escalation: EscalationData;
  onResolve: (choice: 'claude' | 'gemini' | 'merge') => void;
}

export function ConsensusEscalationDialog({
  escalation,
  onResolve,
}: ConsensusEscalationDialogProps) {
  const { reason, divergentIssues, claudeArchitecture, geminiArchitecture, negotiationRounds } =
    escalation;

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
              style={{ background: 'var(--warning-muted, rgba(245, 158, 11, 0.1))' }}
            >
              <span style={{ color: 'var(--warning-primary, #f59e0b)' }} className="text-lg">
                ⚡
              </span>
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Consensus Not Reached
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                After {negotiationRounds} round{negotiationRounds !== 1 ? 's' : ''}: {reason}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Divergent Issues */}
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
                    {/* Claude's stance — brand blue kept */}
                    <div className="p-4" style={{ borderRight: '1px solid var(--border-color)' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                        <span className="text-xs font-medium text-blue-400">Claude Opus 4.6</span>
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
                    {/* Gemini's stance — brand purple kept */}
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 rounded-full bg-purple-400" />
                        <span className="text-xs font-medium text-purple-400">Gemini 3 Pro</span>
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
              Choose which architecture to proceed with
            </p>
            <div className="flex gap-3">
              {/* Claude button — brand blue kept */}
              <button
                onClick={() => onResolve('claude')}
                className="px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 text-sm font-medium transition-colors"
              >
                Use Claude&apos;s
              </button>
              {/* Gemini button — brand purple kept */}
              <button
                onClick={() => onResolve('gemini')}
                className="px-4 py-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 text-sm font-medium transition-colors"
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
  // Brand colors kept for Claude (blue) and Gemini (purple)
  const dotColor = color === 'blue' ? 'bg-blue-400' : 'bg-purple-400';
  const borderColor = color === 'blue' ? 'border-blue-500/30' : 'border-purple-500/30';

  return (
    <div
      className={`p-4 rounded-lg border ${borderColor}`}
      style={{ background: 'var(--bg-tertiary)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
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
