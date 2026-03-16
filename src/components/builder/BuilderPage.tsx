'use client';

import { BuilderProvider } from '@/contexts/BuilderContext';
import { LeftPanel } from './LeftPanel';
import { PreviewPanel } from './PreviewPanel';
import { ConceptDrawer } from './ConceptDrawer';
import { ModalManager } from './ModalManager';

export default function BuilderPage() {
  return (
    <BuilderProvider>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '40% 60%',
          height: '100vh',
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
        }}
      >
        <LeftPanel />
        <PreviewPanel />
      </div>
      <ConceptDrawer />
      <ModalManager />
    </BuilderProvider>
  );
}
