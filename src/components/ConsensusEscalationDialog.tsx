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
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-zinc-900 border-b border-zinc-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
              <span className="text-orange-400 text-lg">⚡</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">Consensus Not Reached</h2>
              <p className="text-sm text-zinc-500">
                After {negotiationRounds} round{negotiationRounds !== 1 ? 's' : ''}: {reason}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Divergent Issues */}
          {divergentIssues.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-zinc-300">Divergent Issues</h3>
              {divergentIssues.map((issue, idx) => (
                <div key={idx} className="rounded-lg border border-zinc-800 overflow-hidden">
                  <div className="px-4 py-2 bg-zinc-800/50">
                    <span className="text-sm font-medium text-zinc-200">{issue.topic}</span>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-zinc-800">
                    {/* Claude's stance */}
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                        <span className="text-xs font-medium text-blue-400">Claude Opus 4.6</span>
                      </div>
                      <p className="text-sm text-zinc-400">{issue.claudeStance}</p>
                      {issue.reasoning.claude && (
                        <p className="text-xs text-zinc-600 mt-2">{issue.reasoning.claude}</p>
                      )}
                    </div>
                    {/* Gemini's stance */}
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 rounded-full bg-purple-400" />
                        <span className="text-xs font-medium text-purple-400">Gemini 3 Pro</span>
                      </div>
                      <p className="text-sm text-zinc-400">{issue.geminiStance}</p>
                      {issue.reasoning.gemini && (
                        <p className="text-xs text-zinc-600 mt-2">{issue.reasoning.gemini}</p>
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
        <div className="sticky bottom-0 bg-zinc-900 border-t border-zinc-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500">Choose which architecture to proceed with</p>
            <div className="flex gap-3">
              <button
                onClick={() => onResolve('claude')}
                className="px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 text-sm font-medium transition-colors"
              >
                Use Claude&apos;s
              </button>
              <button
                onClick={() => onResolve('gemini')}
                className="px-4 py-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 text-sm font-medium transition-colors"
              >
                Use Gemini&apos;s
              </button>
              <button
                onClick={() => onResolve('merge')}
                className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-sm font-medium transition-colors"
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
  const dotColor = color === 'blue' ? 'bg-blue-400' : 'bg-purple-400';
  const borderColor = color === 'blue' ? 'border-blue-500/30' : 'border-purple-500/30';

  return (
    <div className={`p-4 rounded-lg border ${borderColor} bg-zinc-800/30`}>
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
        <span className="text-sm font-medium text-zinc-300">{title}</span>
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
      <span className="text-zinc-500">{label}</span>
      <span className="text-zinc-400">{value}</span>
    </div>
  );
}
