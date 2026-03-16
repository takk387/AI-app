'use client';

import { useBuilder } from '@/contexts/BuilderContext';
import { MenuIcon } from '@/components/ui/Icons';

export function PanelHeader() {
  const { appConcept, toggleConceptDrawer } = useBuilder();

  return (
    <div
      style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--bg-secondary)',
      }}
    >
      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>
        {appConcept?.name || 'New App'}
      </span>
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
        title="Toggle concept drawer"
      >
        <MenuIcon size={18} />
      </button>
    </div>
  );
}
