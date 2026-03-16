'use client';

import { PanelHeader } from './PanelHeader';
import { PhaseStatusBar } from './PhaseStatusBar';
import { MessageList } from './MessageList';
import { InputBar } from './InputBar';

export function LeftPanel() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        borderRight: '1px solid var(--border-color)',
        background: 'var(--bg-primary)',
      }}
    >
      <PanelHeader />
      <PhaseStatusBar />
      <MessageList />
      <InputBar />
    </div>
  );
}
