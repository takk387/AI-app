'use client';

import type { WizardState } from '@/types/wizardState';

interface ConceptSummaryPanelProps {
  wizardState: WizardState;
  onContinueToDesign: () => void;
}

/**
 * Side panel showing the concept summary
 */
export function ConceptSummaryPanel({ wizardState, onContinueToDesign }: ConceptSummaryPanelProps) {
  const isConceptReady = !!(wizardState.name && wizardState.features.length > 0);

  return (
    <div
      className="flex-1 flex flex-col"
      style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}
    >
      <div className="p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
          Concept Summary
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {wizardState.isComplete ? 'Concept complete' : 'In progress...'}
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {/* App Name */}
        <div>
          <label className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            App Name
          </label>
          <p className="mt-1" style={{ color: 'var(--text-primary)' }}>
            {wizardState.name || '—'}
          </p>
        </div>

        {/* Description */}
        {wizardState.description && (
          <div>
            <label
              className="text-xs uppercase tracking-wide"
              style={{ color: 'var(--text-muted)' }}
            >
              Description
            </label>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {wizardState.description}
            </p>
          </div>
        )}

        {/* Target Users */}
        {wizardState.targetUsers && (
          <div>
            <label
              className="text-xs uppercase tracking-wide"
              style={{ color: 'var(--text-muted)' }}
            >
              Target Users
            </label>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {wizardState.targetUsers}
            </p>
          </div>
        )}

        {/* Roles */}
        {wizardState.roles && wizardState.roles.length > 0 && (
          <div>
            <label
              className="text-xs uppercase tracking-wide"
              style={{ color: 'var(--text-muted)' }}
            >
              User Roles
            </label>
            <ul className="mt-1 space-y-1">
              {wizardState.roles.map((role) => (
                <li key={role.name} className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>{role.name}:</strong>{' '}
                  {role.capabilities.slice(0, 2).join(', ')}
                  {role.capabilities.length > 2 && ` +${role.capabilities.length - 2} more`}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Features */}
        {wizardState.features.length > 0 && (
          <div>
            <label
              className="text-xs uppercase tracking-wide"
              style={{ color: 'var(--text-muted)' }}
            >
              Features ({wizardState.features.length})
            </label>
            <ul className="mt-1 space-y-1">
              {wizardState.features.slice(0, 6).map((feature) => (
                <li
                  key={feature.id || feature.name}
                  className="text-sm flex items-center gap-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      feature.priority === 'high'
                        ? 'bg-error-400'
                        : feature.priority === 'medium'
                          ? 'bg-warning-400'
                          : 'bg-success-400'
                    }`}
                  />
                  {feature.name}
                </li>
              ))}
              {wizardState.features.length > 6 && (
                <li className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  +{wizardState.features.length - 6} more features
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Technical */}
        {Object.values(wizardState.technical).some((v) => v !== undefined) && (
          <div>
            <label
              className="text-xs uppercase tracking-wide"
              style={{ color: 'var(--text-muted)' }}
            >
              Technical
            </label>
            <div className="mt-1 flex flex-wrap gap-1">
              {wizardState.technical.needsAuth && (
                <span className="px-2 py-0.5 bg-garden-600/20 text-garden-300 rounded text-xs">
                  Auth
                </span>
              )}
              {wizardState.technical.needsDatabase && (
                <span className="px-2 py-0.5 bg-success-600/20 text-success-300 rounded text-xs">
                  Database
                </span>
              )}
              {wizardState.technical.needsRealtime && (
                <span className="px-2 py-0.5 bg-gold-600/20 text-gold-300 rounded text-xs">
                  Real-time
                </span>
              )}
              {wizardState.technical.needsFileUpload && (
                <span className="px-2 py-0.5 bg-orange-600/20 text-orange-300 rounded text-xs">
                  Files
                </span>
              )}
              {wizardState.technical.needsAPI && (
                <span className="px-2 py-0.5 bg-pink-600/20 text-pink-300 rounded text-xs">
                  API
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Button */}
      {isConceptReady && (
        <div className="p-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <button onClick={onContinueToDesign} className="btn-primary w-full py-2.5">
            Continue to Design
          </button>
        </div>
      )}
    </div>
  );
}

export default ConceptSummaryPanel;
