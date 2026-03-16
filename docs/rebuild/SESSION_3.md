# Session 3: LeftPanel + InputBar

## Your Job

Build the left side of the Builder page: `LeftPanel.tsx`, `PanelHeader.tsx`, `MessageList.tsx`, and `InputBar.tsx`. These are the chat interface components.

## Read These Files First

1. `src/contexts/BuilderContext.tsx` — the provider. All data comes from `useBuilder()`.
2. `src/components/ChatPanel.tsx` — the OLD chat panel you're replacing. Read it to understand message rendering patterns, but don't copy its structure. Build fresh.

## Components

### PanelHeader.tsx

Simple bar at the top. Shows app name and a button to toggle the ConceptDrawer.

```typescript
import { useBuilder } from '@/contexts/BuilderContext';

export function PanelHeader() {
  const { appConcept, toggleConceptDrawer } = useBuilder();

  return (
    <div style={{
      padding: '12px 16px',
      borderBottom: '1px solid var(--border-color)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: 'var(--bg-secondary)',
    }}>
      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
        {appConcept?.name || 'New App'}
      </span>
      <button onClick={toggleConceptDrawer} /* style as icon button */>
        ☰
      </button>
    </div>
  );
}
```

No mode toggle. No PLAN/ACT switch. Just the app name and drawer button.

### MessageList.tsx

Scrollable list of chat messages. Auto-scrolls when new messages arrive.

```typescript
import { useBuilder } from '@/contexts/BuilderContext';

export function MessageList() {
  const { messages, isGenerating, generationProgress } = useBuilder();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
      {messages.map((msg, i) => {
        switch (msg.type) {
          case 'user': return <UserMessage key={i} message={msg} />;
          case 'assistant': return <AssistantMessage key={i} message={msg} />;
          case 'system': return <SystemMessage key={i} message={msg} />;
          case 'phaseComplete': return <PhaseCompletionCard key={i} message={msg} />;
        }
      })}
      {isGenerating && <StreamingIndicator progress={generationProgress} />}
      <div ref={bottomRef} />
    </div>
  );
}
```

Message sub-components (UserMessage, AssistantMessage, etc.) are small — define them in the same file or as local components. Keep them simple:

- UserMessage: right-aligned bubble, user's text
- AssistantMessage: left-aligned, AI response with markdown rendering
- SystemMessage: centered, muted text
- PhaseCompletionCard: a card showing "Phase N complete — X files created"
- StreamingIndicator: pulsing dots or progress text

### InputBar.tsx

Text input with image upload and send button.

```typescript
import { useBuilder } from '@/contexts/BuilderContext';

export function InputBar() {
  const { sendMessage, uploadImage, isGenerating } = useBuilder();
  const [text, setText] = useState('');

  const handleSend = () => {
    if (!text.trim() || isGenerating) return;
    sendMessage(text.trim());
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{
      padding: '12px 16px',
      borderTop: '1px solid var(--border-color)',
      background: 'var(--bg-secondary)',
      display: 'flex',
      gap: '8px',
      alignItems: 'flex-end',
    }}>
      <button onClick={() => /* trigger file input */} disabled={isGenerating}>
        📎
      </button>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask anything, or tell me what to build..."
        disabled={isGenerating}
        rows={1}
        style={{
          flex: 1,
          resize: 'none',
          background: 'var(--bg-tertiary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '8px 12px',
        }}
      />
      <button onClick={handleSend} disabled={!text.trim() || isGenerating}>
        ➤
      </button>
    </div>
  );
}
```

Enter sends. Shift+Enter adds newline. Send disabled when generating.

### LeftPanel.tsx

Composes the above:

```typescript
export function LeftPanel() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      borderRight: '1px solid var(--border-color)',
      background: 'var(--bg-primary)',
    }}>
      <PanelHeader />
      <PhaseStatusBar />  {/* Session 4 — will be a placeholder for now */}
      <MessageList />
      <InputBar />
    </div>
  );
}
```

## Verify

1. LeftPanel renders inside BuilderPage's left grid column
2. Messages display correctly (test with mock data if needed)
3. Typing + Enter sends a message (calls `sendMessage`)
4. Shift+Enter adds newline (doesn't send)
5. Send button disabled while `isGenerating` is true
6. Auto-scrolls on new messages
7. `npm run typecheck && npm run lint`

## Do NOT

- Build PhaseStatusBar (that's Session 4 — import the placeholder)
- Modify BuilderContext or BuilderPage
- Add a mode toggle anywhere
- Use hardcoded Tailwind color classes
