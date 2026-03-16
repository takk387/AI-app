'use client';

import { useState, useCallback } from 'react';
import { useBuilder } from '@/contexts/BuilderContext';
import { useToast } from '@/components/Toast';
import { XIcon, CheckCircleIcon, LoaderIcon } from '@/components/ui/Icons';
import type { DynamicPhase } from '@/types/dynamicPhases';

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <h3
        style={{
          fontSize: '12px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--text-muted)',
          marginBottom: '8px',
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function EditableField({
  value,
  onChange,
  multiline,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  const [localValue, setLocalValue] = useState(value);
  const { showToast } = useToast();

  const handleBlur = useCallback(() => {
    if (localValue !== value) {
      onChange(localValue);
      showToast('success', 'Updated');
    }
  }, [localValue, value, onChange, showToast]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !multiline) {
        e.preventDefault();
        (e.target as HTMLElement).blur();
      }
    },
    [multiline]
  );

  const sharedStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    fontSize: '14px',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    outline: 'none',
    fontFamily: 'inherit',
    resize: multiline ? 'vertical' : 'none',
  };

  if (multiline) {
    return (
      <textarea
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        rows={3}
        style={sharedStyle}
      />
    );
  }

  return (
    <input
      type="text"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      style={sharedStyle}
    />
  );
}

function FeatureItem({ name, description }: { name: string; description: string }) {
  return (
    <div
      style={{
        padding: '8px 12px',
        borderRadius: '6px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        marginBottom: '6px',
      }}
    >
      <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{name}</div>
      {description && (
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
          {description}
        </div>
      )}
    </div>
  );
}

function PhaseRow({
  phase,
  index,
  onClick,
}: {
  phase: DynamicPhase;
  index: number;
  onClick: () => void;
}) {
  const statusIcon =
    phase.status === 'completed' ? (
      <CheckCircleIcon size={16} className="text-garden-400" />
    ) : phase.status === 'in-progress' ? (
      <LoaderIcon size={16} className="text-garden-500" />
    ) : (
      <span
        style={{
          display: 'inline-block',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          border: '2px solid var(--border-color)',
        }}
      />
    );

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        width: '100%',
        padding: '10px 12px',
        borderRadius: '6px',
        border: '1px solid var(--border-color)',
        background: 'var(--bg-secondary)',
        cursor: 'pointer',
        textAlign: 'left',
        marginBottom: '6px',
        transition: 'background 0.1s ease',
      }}
    >
      {statusIcon}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
          Phase {index}: {phase.name}
        </div>
        <div
          style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            marginTop: '2px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {phase.features.slice(0, 3).join(', ')}
          {phase.features.length > 3 && ` +${phase.features.length - 3} more`}
        </div>
      </div>
    </button>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ConceptDrawer() {
  const { isConceptDrawerOpen, toggleConceptDrawer, appConcept, updateConcept, phases } =
    useBuilder();
  const { showToast } = useToast();

  if (!isConceptDrawerOpen) return null;

  const techCapabilities: string[] = [];
  if (appConcept?.technical) {
    const t = appConcept.technical;
    if (t.needsAuth) techCapabilities.push(`Auth (${t.authType || 'simple'})`);
    if (t.needsDatabase) techCapabilities.push('Database');
    if (t.needsAPI) techCapabilities.push('API');
    if (t.needsFileUpload) techCapabilities.push('File Upload');
    if (t.needsRealtime) techCapabilities.push('Realtime');
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={toggleConceptDrawer}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 40,
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: '360px',
          background: 'var(--bg-primary)',
          borderRight: '1px solid var(--border-color)',
          zIndex: 41,
          overflowY: 'auto',
          padding: '24px',
          animation: 'slideInLeft 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          <h2
            style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 600, margin: 0 }}
          >
            App Concept
          </h2>
          <button
            onClick={toggleConceptDrawer}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <XIcon size={18} />
          </button>
        </div>

        {!appConcept ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            No concept loaded. Start a conversation to create one.
          </p>
        ) : (
          <>
            <Section title="Name">
              <EditableField
                value={appConcept.name || ''}
                onChange={(v) => updateConcept('name', v)}
                placeholder="App name"
              />
            </Section>

            <Section title="Description">
              <EditableField
                value={appConcept.description || ''}
                onChange={(v) => updateConcept('description', v)}
                multiline
                placeholder="Describe your app"
              />
            </Section>

            <Section title="Purpose">
              <EditableField
                value={appConcept.purpose || ''}
                onChange={(v) => updateConcept('purpose', v)}
                multiline
                placeholder="What problem does this solve?"
              />
            </Section>

            <Section title="Target Users">
              <EditableField
                value={appConcept.targetUsers || ''}
                onChange={(v) => updateConcept('targetUsers', v)}
                placeholder="Who is this for?"
              />
            </Section>

            {appConcept.coreFeatures && appConcept.coreFeatures.length > 0 && (
              <Section title={`Features (${appConcept.coreFeatures.length})`}>
                {appConcept.coreFeatures.map((f) => (
                  <FeatureItem key={f.id} name={f.name} description={f.description} />
                ))}
              </Section>
            )}

            {techCapabilities.length > 0 && (
              <Section title="Tech Stack">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {techCapabilities.map((cap) => (
                    <span
                      key={cap}
                      style={{
                        padding: '4px 10px',
                        fontSize: '12px',
                        borderRadius: '12px',
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {phases.length > 0 && (
              <Section title={`Phase Plan (${phases.length})`}>
                {phases.map((phase, i) => (
                  <PhaseRow
                    key={phase.number}
                    phase={phase}
                    index={i + 1}
                    onClick={() => {
                      showToast('info', `Phase ${i + 1}: ${phase.name}`);
                    }}
                  />
                ))}
              </Section>
            )}
          </>
        )}
      </div>
    </>
  );
}
