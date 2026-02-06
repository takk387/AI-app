/**
 * ConsensusResultView
 *
 * Displays the architecture planning results after consensus is reached.
 * Shows agreements, compromises, negotiation rounds, and architecture summary.
 */

'use client';

import React, { useState } from 'react';
import type { FinalValidatedArchitecture } from '@/types/dualPlanning';

interface ConsensusResultViewProps {
  architecture: FinalValidatedArchitecture;
}

export function ConsensusResultView({ architecture }: ConsensusResultViewProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary']));

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const { consensusReport, validation } = architecture;

  return (
    <div className="space-y-4">
      {/* Consensus header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Architecture Plan
        </h3>
        <div className="flex items-center gap-3 text-sm">
          <span
            className="px-2 py-1 rounded"
            style={{
              background: 'var(--success-muted, rgba(34, 197, 94, 0.1))',
              color: 'var(--success-primary, #22c55e)',
            }}
          >
            {consensusReport.rounds} round{consensusReport.rounds !== 1 ? 's' : ''}
          </span>
          <span
            className="px-2 py-1 rounded"
            style={{
              background: 'var(--accent-muted)',
              color: 'var(--accent-primary)',
            }}
          >
            {validation.coverage}% coverage
          </span>
        </div>
      </div>

      {/* Architecture Summary */}
      <CollapsibleSection
        title="Architecture Summary"
        sectionKey="summary"
        expanded={expandedSections.has('summary')}
        onToggle={toggleSection}
      >
        <div className="grid grid-cols-2 gap-3">
          <InfoCard
            label="Database"
            value={`${architecture.database.provider} (${architecture.database.models?.length ?? 0} models)`}
          />
          <InfoCard label="API Style" value={architecture.api.style} />
          <InfoCard
            label="Auth"
            value={`${architecture.auth.provider} / ${architecture.auth.strategy}`}
          />
          <InfoCard
            label="Realtime"
            value={architecture.realtime.enabled ? architecture.realtime.technology : 'None'}
          />
          <InfoCard label="Framework" value={architecture.techStack.framework} />
          <InfoCard label="ORM" value={architecture.techStack.orm} />
        </div>
      </CollapsibleSection>

      {/* Agentic Workflows */}
      {architecture.agentic.enabled && (
        <CollapsibleSection
          title={`Agentic Workflows (${architecture.agentic.workflows.length})`}
          sectionKey="agentic"
          expanded={expandedSections.has('agentic')}
          onToggle={toggleSection}
        >
          <div className="space-y-2">
            {architecture.agentic.workflows.map((workflow, idx) => (
              <div
                key={idx}
                className="p-3 rounded"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {workflow.name}
                  </span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{
                      background: 'var(--blossom-bg, rgba(192, 108, 132, 0.1))',
                      color: 'var(--blossom-text, #C06C84)',
                    }}
                  >
                    {workflow.orchestration}
                  </span>
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {workflow.description}
                </p>
                {workflow.agents.length > 0 && (
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {workflow.agents.map((agent, i) => (
                      <span
                        key={i}
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{
                          background: 'var(--bg-tertiary)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {agent.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Framework: {architecture.agentic.framework}
            </p>
          </div>
        </CollapsibleSection>
      )}

      {/* Agreements */}
      {consensusReport.finalAgreements.length > 0 && (
        <CollapsibleSection
          title={`Agreements (${consensusReport.finalAgreements.length})`}
          sectionKey="agreements"
          expanded={expandedSections.has('agreements')}
          onToggle={toggleSection}
        >
          <ul className="space-y-1">
            {consensusReport.finalAgreements.map((agreement, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                <span
                  className="mt-0.5 flex-shrink-0"
                  style={{ color: 'var(--success-primary, #22c55e)' }}
                >
                  •
                </span>
                {agreement}
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}

      {/* Compromises */}
      {consensusReport.compromises.length > 0 && (
        <CollapsibleSection
          title={`Compromises (${consensusReport.compromises.length})`}
          sectionKey="compromises"
          expanded={expandedSections.has('compromises')}
          onToggle={toggleSection}
        >
          <ul className="space-y-1">
            {consensusReport.compromises.map((compromise, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                <span
                  className="mt-0.5 flex-shrink-0"
                  style={{ color: 'var(--warning-primary, #f59e0b)' }}
                >
                  •
                </span>
                {compromise}
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}

      {/* Tech Stack & Libraries */}
      <CollapsibleSection
        title="Tech Stack"
        sectionKey="techstack"
        expanded={expandedSections.has('techstack')}
        onToggle={toggleSection}
      >
        <div className="flex flex-wrap gap-1.5">
          {architecture.techStack.libraries.map((lib, idx) => (
            <span
              key={idx}
              className="text-xs px-2 py-1 rounded"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
              }}
            >
              {lib}
            </span>
          ))}
        </div>
      </CollapsibleSection>

      {/* Scaling */}
      <CollapsibleSection
        title="Scaling Strategy"
        sectionKey="scaling"
        expanded={expandedSections.has('scaling')}
        onToggle={toggleSection}
      >
        <div className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Caching:</span>{' '}
            {architecture.scaling.caching.strategy}
            {architecture.scaling.caching.layers.length > 0 && (
              <span style={{ color: 'var(--text-muted)' }}>
                {' '}
                ({architecture.scaling.caching.layers.join(', ')})
              </span>
            )}
          </div>
          {architecture.scaling.optimization.techniques.length > 0 && (
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Optimizations:</span>{' '}
              {architecture.scaling.optimization.techniques.join(', ')}
            </div>
          )}
        </div>
      </CollapsibleSection>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function CollapsibleSection({
  title,
  sectionKey,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  sectionKey: string;
  expanded: boolean;
  onToggle: (key: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-color)' }}>
      <button
        onClick={() => onToggle(sectionKey)}
        className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
        style={{ color: 'var(--text-primary)' }}
      >
        <span className="text-sm font-medium">{title}</span>
        <span style={{ color: 'var(--text-muted)' }} className="text-sm">
          {expanded ? '▾' : '▸'}
        </span>
      </button>
      {expanded && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 rounded" style={{ background: 'var(--bg-tertiary)' }}>
      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
      <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
        {value}
      </div>
    </div>
  );
}
