'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface ConsolePanelProps {
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
}

type LogFilter = 'all' | 'error' | 'warn' | 'info' | 'log';

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

// Filter button component
function FilterButton({
  filter,
  activeFilter,
  onClick,
  count,
}: {
  filter: LogFilter;
  activeFilter: LogFilter;
  onClick: (filter: LogFilter) => void;
  count?: number;
}) {
  const labels: Record<LogFilter, string> = {
    all: 'All',
    error: '❌',
    warn: '⚠️',
    info: 'ℹ️',
    log: '📝',
  };

  const colors: Record<LogFilter, string> = {
    all: 'text-zinc-300',
    error: 'text-red-400',
    warn: 'text-yellow-400',
    info: 'text-blue-400',
    log: 'text-zinc-400',
  };

  const isActive = activeFilter === filter;

  return (
    <button
      onClick={() => onClick(filter)}
      className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
        isActive ? 'bg-zinc-700 text-white' : `${colors[filter]} hover:bg-zinc-800`
      }`}
      title={`Filter: ${filter}`}
    >
      <span>{labels[filter]}</span>
      {count !== undefined && count > 0 && (
        <span
          className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
            filter === 'error'
              ? 'bg-red-500/20 text-red-300'
              : filter === 'warn'
                ? 'bg-yellow-500/20 text-yellow-300'
                : 'bg-zinc-700 text-zinc-300'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// Resize handle component with cleanup on unmount
function ResizeHandle({ onResize }: { onResize: (deltaX: number) => void }) {
  const cleanupRef = useRef<(() => void) | null>(null);

  // Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => cleanupRef.current?.();
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = startX - moveEvent.clientX;
        onResize(deltaX);
      };

      const cleanup = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', cleanup);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        cleanupRef.current = null;
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', cleanup);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
      cleanupRef.current = cleanup;
    },
    [onResize]
  );

  return (
    <div
      className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize group"
      onMouseDown={handleMouseDown}
    >
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-zinc-700 group-hover:bg-blue-500 transition-colors" />
    </div>
  );
}

// Console header component
function ConsoleHeader({
  onClear,
  onClose,
  activeFilter,
  onFilterChange,
  logCounts,
}: {
  onClear: () => void;
  onClose: () => void;
  activeFilter: LogFilter;
  onFilterChange: (filter: LogFilter) => void;
  logCounts: Record<string, number>;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-zinc-900 border-b border-zinc-800">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-zinc-300">📟 Console</span>

        {/* Filter buttons */}
        <div className="flex items-center gap-1 ml-2">
          <FilterButton filter="all" activeFilter={activeFilter} onClick={onFilterChange} />
          <FilterButton
            filter="error"
            activeFilter={activeFilter}
            onClick={onFilterChange}
            count={logCounts.error || 0}
          />
          <FilterButton
            filter="warn"
            activeFilter={activeFilter}
            onClick={onFilterChange}
            count={logCounts.warn || 0}
          />
          <FilterButton filter="info" activeFilter={activeFilter} onClick={onFilterChange} />
          <FilterButton filter="log" activeFilter={activeFilter} onClick={onFilterChange} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Clear button */}
        <button
          onClick={onClear}
          className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
          title="Clear console"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          <span>Clear</span>
        </button>

        {/* Close button */}
        <button
          onClick={onClose}
          className="flex items-center justify-center w-6 h-6 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
          title="Close console"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Collapsed sidebar indicator
function CollapsedIndicator({
  onClick,
  errorCount,
  warnCount,
}: {
  onClick: () => void;
  errorCount: number;
  warnCount: number;
}) {
  const hasErrors = errorCount > 0;
  const hasWarnings = warnCount > 0;

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-10 h-full border-l transition-colors ${
        hasErrors
          ? 'border-red-500/50 bg-red-500/10 hover:bg-red-500/20'
          : hasWarnings
            ? 'border-yellow-500/50 bg-yellow-500/10 hover:bg-yellow-500/20'
            : 'border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800'
      }`}
      title="Open console"
    >
      <span className="text-lg mb-1">📟</span>

      {hasErrors && (
        <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
          {errorCount}
        </span>
      )}
      {!hasErrors && hasWarnings && (
        <span className="px-1.5 py-0.5 rounded-full bg-yellow-500 text-black text-[10px] font-bold">
          {warnCount}
        </span>
      )}

      <svg
        className="w-4 h-4 text-zinc-500 mt-2"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
    </button>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ConsolePanel({
  isOpen,
  onToggle,
  className = '',
  defaultWidth = 320,
  minWidth = 200,
  maxWidth = 500,
}: ConsolePanelProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [activeFilter, setActiveFilter] = useState<LogFilter>('all');
  const [clearCounter, setClearCounter] = useState(0);
  const [logCounts, setLogCounts] = useState<Record<string, number>>({});

  // Handle resize
  const handleResize = useCallback(
    (deltaX: number) => {
      setWidth((prev) => Math.min(maxWidth, Math.max(minWidth, prev + deltaX)));
    },
    [minWidth, maxWidth]
  );

  // Handle clear
  const handleClear = useCallback(() => {
    setClearCounter((prev) => prev + 1);
    setLogCounts({});
  }, []);

  // Collapsed state
  if (!isOpen) {
    return (
      <CollapsedIndicator
        onClick={onToggle}
        errorCount={logCounts.error || 0}
        warnCount={logCounts.warn || 0}
      />
    );
  }

  return (
    <div
      className={`relative flex flex-col h-full bg-zinc-950 border-l border-zinc-800 ${className}`}
      style={{ width }}
    >
      {/* Resize handle */}
      <ResizeHandle onResize={handleResize} />

      {/* Header */}
      <ConsoleHeader
        onClear={handleClear}
        onClose={onToggle}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        logCounts={logCounts}
      />

      {/* Console content */}
      <div className="flex-1 overflow-hidden">
        <ConsolePanelContent
          key={clearCounter}
          activeFilter={activeFilter}
          onLogCountsChange={setLogCounts}
        />
      </div>
    </div>
  );
}

// Console log entry type
interface ConsoleLogEntry {
  id: string;
  type: 'log' | 'error' | 'warn' | 'info';
  message: string;
  timestamp: Date;
}

// Console content component - captures browser console messages
function ConsolePanelContent({
  activeFilter,
  onLogCountsChange,
}: {
  activeFilter: LogFilter;
  onLogCountsChange: (counts: Record<string, number>) => void;
}) {
  const [logs, setLogs] = useState<ConsoleLogEntry[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Listen for console messages from preview iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'console') {
        const newLog: ConsoleLogEntry = {
          id: `${Date.now()}-${Math.random()}`,
          type: event.data.method || 'log',
          message: event.data.message || '',
          timestamp: new Date(),
        };
        setLogs((prev) => [...prev, newLog]);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Update log counts when logs change
  useEffect(() => {
    const counts: Record<string, number> = {};
    logs.forEach((log) => {
      counts[log.type] = (counts[log.type] || 0) + 1;
    });
    onLogCountsChange(counts);
  }, [logs, onLogCountsChange]);

  // Auto-scroll to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Filter logs
  const filteredLogs =
    activeFilter === 'all' ? logs : logs.filter((log) => log.type === activeFilter);

  const getLogColor = (type: string) => {
    switch (type) {
      case 'error':
        return 'text-red-400 bg-red-500/10';
      case 'warn':
        return 'text-yellow-400 bg-yellow-500/10';
      case 'info':
        return 'text-blue-400';
      default:
        return 'text-zinc-300';
    }
  };

  if (filteredLogs.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
        No console output yet
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-2 font-mono text-xs">
      {filteredLogs.map((log) => (
        <div key={log.id} className={`py-1 px-2 rounded ${getLogColor(log.type)}`}>
          <span className="text-zinc-500 mr-2">{log.timestamp.toLocaleTimeString()}</span>
          <span>{log.message}</span>
        </div>
      ))}
      <div ref={logsEndRef} />
    </div>
  );
}

export default ConsolePanel;
