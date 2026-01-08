'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// TYPES
// ============================================================================

export type LogLevel = 'info' | 'success' | 'warning' | 'error' | 'debug';

export interface DeploymentLogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  step?: string;
  details?: Record<string, unknown>;
}

export interface DeploymentLogsViewerProps {
  logs: DeploymentLogEntry[];
  isLive?: boolean;
  maxHeight?: string;
  showTimestamps?: boolean;
  showLevelFilter?: boolean;
  onClear?: () => void;
  onDownload?: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LEVEL_CONFIG: Record<LogLevel, { color: string; bgColor: string; icon: string }> = {
  info: {
    color: 'var(--text-secondary)',
    bgColor: 'transparent',
    icon: 'i',
  },
  success: {
    color: 'var(--success)',
    bgColor: 'color-mix(in srgb, var(--success) 10%, transparent)',
    icon: '✓',
  },
  warning: {
    color: 'var(--warning)',
    bgColor: 'color-mix(in srgb, var(--warning) 10%, transparent)',
    icon: '⚠',
  },
  error: {
    color: 'var(--error)',
    bgColor: 'color-mix(in srgb, var(--error) 10%, transparent)',
    icon: '✕',
  },
  debug: {
    color: 'var(--text-muted)',
    bgColor: 'transparent',
    icon: '•',
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/**
 * Safely stringify an object, handling circular references
 */
function safeStringify(obj: unknown): string {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return '[Object with circular reference]';
  }
}

function formatLogForDownload(logs: DeploymentLogEntry[]): string {
  return logs
    .map((log) => {
      const time = new Date(log.timestamp).toISOString();
      const level = log.level.toUpperCase().padEnd(7);
      const step = log.step ? `[${log.step}] ` : '';
      const details = log.details ? `\n  ${safeStringify(log.details)}` : '';
      return `${time} ${level} ${step}${log.message}${details}`;
    })
    .join('\n');
}

// ============================================================================
// LOG ENTRY COMPONENT
// ============================================================================

interface LogEntryProps {
  log: DeploymentLogEntry;
  showTimestamp: boolean;
  isNew?: boolean;
}

function LogEntry({ log, showTimestamp, isNew }: LogEntryProps) {
  const [expanded, setExpanded] = useState(false);
  const config = LEVEL_CONFIG[log.level];

  return (
    <motion.div
      initial={isNew ? { opacity: 0, x: -10 } : false}
      animate={{ opacity: 1, x: 0 }}
      className="font-mono text-xs leading-relaxed py-1 px-2 rounded"
      style={{
        background: config.bgColor,
        borderLeft:
          log.level === 'error' || log.level === 'warning' ? `2px solid ${config.color}` : 'none',
      }}
    >
      <div className="flex items-start gap-2">
        {/* Timestamp */}
        {showTimestamp && (
          <span className="flex-shrink-0 opacity-50" style={{ color: 'var(--text-muted)' }}>
            {formatTimestamp(log.timestamp)}
          </span>
        )}

        {/* Level Icon */}
        <span className="flex-shrink-0 w-4 text-center" style={{ color: config.color }}>
          {config.icon}
        </span>

        {/* Step Badge */}
        {log.step && (
          <span
            className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-muted)',
            }}
          >
            {log.step}
          </span>
        )}

        {/* Message */}
        <span className="flex-1 break-words" style={{ color: config.color }}>
          {log.message}
        </span>

        {/* Expand Details Button */}
        {log.details && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
            style={{ color: 'var(--text-muted)' }}
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse log details' : 'Expand log details'}
          >
            {expanded ? '▼' : '▶'}
          </button>
        )}
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && log.details && (
          <motion.pre
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 ml-6 p-2 rounded text-[10px] overflow-x-auto"
            style={{
              background: 'var(--bg-primary)',
              color: 'var(--text-muted)',
            }}
          >
            {safeStringify(log.details)}
          </motion.pre>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DeploymentLogsViewer({
  logs,
  isLive = false,
  maxHeight = '400px',
  showTimestamps = true,
  showLevelFilter = true,
  onClear,
  onDownload,
}: DeploymentLogsViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Set<LogLevel>>(
    new Set(['info', 'success', 'warning', 'error'])
  );
  const [newLogIds, setNewLogIds] = useState<Set<string>>(new Set());
  const previousLogsLength = useRef(logs.length);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }

    // Mark new logs for animation
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (logs.length > previousLogsLength.current) {
      const newIds = new Set(logs.slice(previousLogsLength.current).map((log) => log.id));
      setNewLogIds(newIds);

      // Clear new status after animation
      timeoutId = setTimeout(() => {
        setNewLogIds(new Set());
      }, 500);
    }
    previousLogsLength.current = logs.length;

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [logs, autoScroll]);

  // Handle scroll to detect if user scrolled up
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isAtBottom);
  }, []);

  // Toggle level filter
  const toggleFilter = (level: LogLevel) => {
    const newFilters = new Set(activeFilters);
    if (newFilters.has(level)) {
      newFilters.delete(level);
    } else {
      newFilters.add(level);
    }
    setActiveFilters(newFilters);
  };

  // Filter logs with memoization for performance
  const filteredLogs = useMemo(() => {
    const query = searchQuery.toLowerCase();

    return logs.filter((log) => {
      // Level filter
      if (!activeFilters.has(log.level)) return false;

      // Search filter - only stringify details if we're actually searching
      if (query) {
        if (log.message.toLowerCase().includes(query)) return true;
        if (log.step?.toLowerCase().includes(query)) return true;
        // Only stringify details if message/step didn't match (expensive operation)
        if (log.details && safeStringify(log.details).toLowerCase().includes(query)) return true;
        return false;
      }

      return true;
    });
  }, [logs, activeFilters, searchQuery]);

  // Handle download
  const handleDownload = () => {
    if (onDownload) {
      onDownload();
      return;
    }

    const content = formatLogForDownload(logs);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // Use format that's valid on all OS (no colons)
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    a.download = `deployment-logs-${timestamp}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Count logs by level (memoized)
  const logCounts = useMemo(() => {
    return logs.reduce(
      (acc, log) => {
        acc[log.level] = (acc[log.level] || 0) + 1;
        return acc;
      },
      {} as Record<LogLevel, number>
    );
  }, [logs]);

  return (
    <div
      className="rounded-lg overflow-hidden relative"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: '1px solid var(--border-color)' }}
      >
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Deployment Logs
          </h4>

          {/* Live indicator */}
          {isLive && (
            <span
              className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
              style={{
                background: 'color-mix(in srgb, var(--success) 10%, transparent)',
                color: 'var(--success)',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: 'var(--success)' }}
              />
              Live
            </span>
          )}

          {/* Log count */}
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {filteredLogs.length} / {logs.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Auto-scroll toggle */}
          <button
            type="button"
            onClick={() => setAutoScroll(!autoScroll)}
            className="text-xs px-2 py-1 rounded transition-colors"
            style={{
              color: autoScroll ? 'var(--accent-primary)' : 'var(--text-muted)',
              background: autoScroll
                ? 'color-mix(in srgb, var(--accent-primary) 20%, transparent)'
                : 'var(--bg-tertiary)',
            }}
            title={autoScroll ? 'Auto-scroll enabled' : 'Auto-scroll disabled'}
          >
            Auto-scroll
          </button>

          {/* Clear button */}
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="text-xs px-2 py-1 rounded transition-all hover:opacity-80"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-muted)',
              }}
            >
              Clear
            </button>
          )}

          {/* Download button */}
          <button
            type="button"
            onClick={handleDownload}
            className="text-xs px-2 py-1 rounded transition-all hover:opacity-80"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-muted)',
            }}
          >
            Download
          </button>
        </div>
      </div>

      {/* Filters */}
      {showLevelFilter && (
        <div
          className="flex items-center gap-2 px-3 py-2"
          style={{ borderBottom: '1px solid var(--border-color)' }}
        >
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search logs..."
              className="w-full text-xs px-3 py-1.5 rounded pl-8 outline-none transition-all focus:ring-2 ring-[var(--accent-primary)]"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-light)',
              }}
              aria-label="Search deployment logs"
            />
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3"
              style={{ color: 'var(--text-muted)' }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* Level filters */}
          <div className="flex items-center gap-1" role="group" aria-label="Filter by log level">
            {(Object.keys(LEVEL_CONFIG) as LogLevel[]).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => toggleFilter(level)}
                className={`text-xs px-2 py-1 rounded transition-all ${
                  activeFilters.has(level) ? 'opacity-100' : 'opacity-40'
                }`}
                style={{
                  background: activeFilters.has(level)
                    ? LEVEL_CONFIG[level].bgColor || 'var(--bg-tertiary)'
                    : 'var(--bg-tertiary)',
                  color: LEVEL_CONFIG[level].color,
                  border: `1px solid ${
                    activeFilters.has(level) ? LEVEL_CONFIG[level].color : 'transparent'
                  }`,
                }}
                aria-pressed={activeFilters.has(level)}
                aria-label={`Filter ${level} logs`}
              >
                {level}
                {logCounts[level] > 0 && (
                  <span className="ml-1 opacity-60">({logCounts[level]})</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Log entries */}
      <div
        ref={containerRef}
        className="overflow-y-auto p-2 space-y-0.5"
        style={{ maxHeight }}
        onScroll={handleScroll}
        role="log"
        aria-live="polite"
        aria-label="Deployment logs"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
            {logs.length === 0 ? 'No logs yet...' : 'No logs match the current filters'}
          </div>
        ) : (
          filteredLogs.map((log) => (
            <LogEntry
              key={log.id}
              log={log}
              showTimestamp={showTimestamps}
              isNew={newLogIds.has(log.id)}
            />
          ))
        )}
      </div>

      {/* Scroll to bottom button */}
      {!autoScroll && logs.length > 0 && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          type="button"
          onClick={() => {
            setAutoScroll(true);
            containerRef.current?.scrollTo({
              top: containerRef.current.scrollHeight,
              behavior: 'smooth',
            });
          }}
          className="absolute bottom-4 right-4 text-xs px-3 py-1.5 rounded-full shadow-lg transition-opacity hover:opacity-90"
          style={{
            background: 'var(--accent-primary)',
            color: 'white',
          }}
          aria-label="Scroll to bottom of logs"
        >
          ↓ Scroll to bottom
        </motion.button>
      )}
    </div>
  );
}

// ============================================================================
// HELPER HOOK FOR MANAGING LOGS
// ============================================================================

export function useDeploymentLogs() {
  const [logs, setLogs] = useState<DeploymentLogEntry[]>([]);

  const addLog = useCallback(
    (
      level: LogLevel,
      message: string,
      options?: { step?: string; details?: Record<string, unknown> }
    ) => {
      const entry: DeploymentLogEntry = {
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        level,
        message,
        step: options?.step,
        details: options?.details,
      };

      setLogs((prev) => [...prev, entry]);
      return entry;
    },
    []
  );

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const info = useCallback(
    (message: string, options?: { step?: string; details?: Record<string, unknown> }) => {
      return addLog('info', message, options);
    },
    [addLog]
  );

  const success = useCallback(
    (message: string, options?: { step?: string; details?: Record<string, unknown> }) => {
      return addLog('success', message, options);
    },
    [addLog]
  );

  const warning = useCallback(
    (message: string, options?: { step?: string; details?: Record<string, unknown> }) => {
      return addLog('warning', message, options);
    },
    [addLog]
  );

  const error = useCallback(
    (message: string, options?: { step?: string; details?: Record<string, unknown> }) => {
      return addLog('error', message, options);
    },
    [addLog]
  );

  const debug = useCallback(
    (message: string, options?: { step?: string; details?: Record<string, unknown> }) => {
      return addLog('debug', message, options);
    },
    [addLog]
  );

  return {
    logs,
    addLog,
    clearLogs,
    info,
    success,
    warning,
    error,
    debug,
  };
}

export default DeploymentLogsViewer;
