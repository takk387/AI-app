'use client';

import { useState } from 'react';
import type { ArchitectureSpec } from '@/types/architectureSpec';

interface ArchitectureReviewPanelProps {
  architectureSpec: ArchitectureSpec;
  isGenerating: boolean;
  onProceed: () => void;
  onRegenerate: () => void;
}

/**
 * Side panel component to display and review generated backend architecture
 * Shows database schema, API routes, auth strategy, and architecture decisions
 */
export function ArchitectureReviewPanel({
  architectureSpec,
  isGenerating,
  onProceed,
  onRegenerate,
}: ArchitectureReviewPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    database: true,
    api: false,
    auth: false,
    decisions: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div
      className="w-96 border-l flex flex-col"
      style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}
    >
      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <h2
          className="font-semibold flex items-center gap-2"
          style={{ color: 'var(--text-primary)' }}
        >
          <span className="text-lg">🏗️</span>
          Backend Architecture
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Review the generated architecture
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Database Section */}
        <CollapsibleSection
          title="Database Schema"
          icon="📊"
          badge={`${architectureSpec.database?.tables?.length || 0} tables`}
          isExpanded={expandedSections.database}
          onToggle={() => toggleSection('database')}
        >
          {architectureSpec.database?.prismaSchema ? (
            <div
              className="rounded overflow-hidden"
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}
            >
              <div
                className="px-3 py-1.5 flex items-center justify-between"
                style={{
                  background: 'var(--bg-secondary)',
                  borderBottom: '1px solid var(--border-color)',
                }}
              >
                <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                  schema.prisma
                </span>
              </div>
              <pre
                className="p-3 text-xs font-mono overflow-x-auto max-h-64 overflow-y-auto"
                style={{ color: 'var(--text-secondary)' }}
              >
                {architectureSpec.database.prismaSchema}
              </pre>
            </div>
          ) : (
            <div className="space-y-2">
              {architectureSpec.database?.tables?.map((table) => (
                <div
                  key={table.name}
                  className="p-2 rounded"
                  style={{ background: 'var(--bg-tertiary)' }}
                >
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {table.name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {table.fields?.length || 0} fields
                  </p>
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>

        {/* API Routes Section */}
        <CollapsibleSection
          title="API Routes"
          icon="🔌"
          badge={`${architectureSpec.api?.routes?.length || 0} endpoints`}
          isExpanded={expandedSections.api}
          onToggle={() => toggleSection('api')}
        >
          <div className="space-y-1">
            {architectureSpec.api?.routes?.map((route, idx) => (
              <div
                key={`${route.method}-${route.path}-${idx}`}
                className="p-2 rounded flex items-start gap-2"
                style={{ background: 'var(--bg-tertiary)' }}
              >
                <span
                  className={`px-1.5 py-0.5 rounded text-xs font-mono font-medium ${getMethodColor(route.method)}`}
                >
                  {route.method}
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-mono truncate"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {route.path}
                  </p>
                  {route.description && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {route.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* Authentication Section */}
        {architectureSpec.auth && (
          <CollapsibleSection
            title="Authentication"
            icon="🔐"
            badge={architectureSpec.auth.strategy || 'NextAuth'}
            isExpanded={expandedSections.auth}
            onToggle={() => toggleSection('auth')}
          >
            <div className="space-y-3">
              <div>
                <label
                  className="text-xs uppercase tracking-wide"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Strategy
                </label>
                <p className="mt-0.5 text-sm" style={{ color: 'var(--text-primary)' }}>
                  {architectureSpec.auth.strategy || 'NextAuth.js'}
                </p>
              </div>

              {architectureSpec.auth.providers && architectureSpec.auth.providers.length > 0 && (
                <div>
                  <label
                    className="text-xs uppercase tracking-wide"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Providers
                  </label>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {architectureSpec.auth.providers.map((provider, idx) => (
                      <span
                        key={`${provider.type}-${provider.provider || idx}`}
                        className="px-2 py-0.5 bg-garden-600/20 text-garden-300 rounded text-xs"
                      >
                        {provider.provider || provider.type}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {architectureSpec.auth.rbac?.roles && architectureSpec.auth.rbac.roles.length > 0 && (
                <div>
                  <label
                    className="text-xs uppercase tracking-wide"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Roles (RBAC)
                  </label>
                  <div className="mt-1 space-y-1">
                    {architectureSpec.auth.rbac.roles.map((role) => {
                      // Find permissions for this role from rolePermissions
                      const rolePerms = architectureSpec.auth?.rbac?.rolePermissions?.find(
                        (rp) => rp.role === role.name
                      )?.permissions;
                      return (
                        <div
                          key={role.name}
                          className="p-2 rounded"
                          style={{ background: 'var(--bg-tertiary)' }}
                        >
                          <p
                            className="text-sm font-medium"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {role.name}
                          </p>
                          {rolePerms && rolePerms.length > 0 && (
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                              {rolePerms.slice(0, 3).join(', ')}
                              {rolePerms.length > 3 && ` +${rolePerms.length - 3} more`}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* Architecture Decisions Section */}
        {architectureSpec.architectureReasoning?.decisions &&
          architectureSpec.architectureReasoning.decisions.length > 0 && (
            <CollapsibleSection
              title="Key Decisions"
              icon="💡"
              badge={`${architectureSpec.architectureReasoning.decisions.length} decisions`}
              isExpanded={expandedSections.decisions}
              onToggle={() => toggleSection('decisions')}
            >
              <div className="space-y-2">
                {architectureSpec.architectureReasoning.decisions.map((decision, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded"
                    style={{ background: 'var(--bg-tertiary)' }}
                  >
                    <p
                      className="text-xs uppercase tracking-wide"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {decision.area}
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--text-primary)' }}>
                      {decision.decision}
                    </p>
                    {decision.reasoning && (
                      <p className="text-xs mt-1 italic" style={{ color: 'var(--text-muted)' }}>
                        {decision.reasoning}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}
      </div>

      {/* Action Buttons */}
      <div className="p-4 border-t space-y-2" style={{ borderColor: 'var(--border-color)' }}>
        <button
          onClick={onProceed}
          disabled={isGenerating}
          className="btn-primary w-full py-2.5 disabled:opacity-50"
        >
          Proceed to Phases
        </button>
        <button
          onClick={onRegenerate}
          disabled={isGenerating}
          className="w-full py-2 text-sm transition-colors disabled:opacity-50"
          style={{ color: 'var(--text-muted)' }}
        >
          {isGenerating ? 'Regenerating...' : 'Regenerate Architecture'}
        </button>
      </div>
    </div>
  );
}

/**
 * Collapsible section component for organizing architecture details
 */
function CollapsibleSection({
  title,
  icon,
  badge,
  isExpanded,
  onToggle,
  children,
}: {
  title: string;
  icon: string;
  badge?: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b" style={{ borderColor: 'var(--border-color)' }}>
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between transition-colors"
        style={{ color: 'var(--text-primary)' }}
      >
        <div className="flex items-center gap-2">
          <span>{icon}</span>
          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
            {title}
          </span>
          {badge && (
            <span
              className="px-1.5 py-0.5 rounded text-xs"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
            >
              {badge}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          style={{ color: 'var(--text-muted)' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isExpanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

/**
 * Get color class for HTTP method badge
 */
function getMethodColor(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET':
      return 'bg-success-600/20 text-success-300';
    case 'POST':
      return 'bg-garden-600/20 text-garden-300';
    case 'PUT':
    case 'PATCH':
      return 'bg-warning-600/20 text-warning-300';
    case 'DELETE':
      return 'bg-error-600/20 text-error-300';
    default:
      return 'bg-slate-600/20 text-slate-300';
  }
}

export default ArchitectureReviewPanel;
