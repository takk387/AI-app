'use client';

/**
 * DebugPanel - Development-only debug overlay
 *
 * Shows real-time information about:
 * - Zustand store state (all slices)
 * - Recent API requests with timing
 * - SSE stream events
 * - Token usage statistics
 *
 * Only renders when NEXT_PUBLIC_DEBUG_PANEL=true in development
 */

import React, { useState, useEffect, useCallback } from 'react';
import { DEBUG } from '@/utils/debug';
import { useAppStore } from '@/store/useAppStore';

// Types for tracking
interface APIRequest {
  id: string;
  method: string;
  route: string;
  status: 'pending' | 'success' | 'error';
  duration?: number;
  timestamp: Date;
}

interface SSEEvent {
  id: string;
  type: string;
  data: string;
  timestamp: Date;
}

interface TokenUsage {
  route: string;
  input: number;
  output: number;
  cached: number;
  timestamp: Date;
}

// In-memory storage for debug data (not persisted)
const debugStore = {
  apiRequests: [] as APIRequest[],
  sseEvents: [] as SSEEvent[],
  tokenUsage: [] as TokenUsage[],
};

/**
 * Add an API request to the debug store
 */
export function trackAPIRequest(request: Omit<APIRequest, 'id' | 'timestamp'>): string {
  const id = `api_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  debugStore.apiRequests.unshift({
    ...request,
    id,
    timestamp: new Date(),
  });
  // Keep only last 50 requests
  if (debugStore.apiRequests.length > 50) {
    debugStore.apiRequests.pop();
  }
  return id;
}

/**
 * Update an API request status
 */
export function updateAPIRequest(
  id: string,
  update: Partial<Pick<APIRequest, 'status' | 'duration'>>
): void {
  const request = debugStore.apiRequests.find((r) => r.id === id);
  if (request) {
    Object.assign(request, update);
  }
}

/**
 * Track an SSE event
 */
export function trackSSEEvent(type: string, data: unknown): void {
  debugStore.sseEvents.unshift({
    id: `sse_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type,
    data: typeof data === 'string' ? data : JSON.stringify(data).slice(0, 200),
    timestamp: new Date(),
  });
  // Keep only last 100 events
  if (debugStore.sseEvents.length > 100) {
    debugStore.sseEvents.pop();
  }
}

/**
 * Track token usage
 */
export function trackTokenUsage(
  route: string,
  usage: { input: number; output: number; cached?: number }
): void {
  debugStore.tokenUsage.unshift({
    route,
    input: usage.input,
    output: usage.output,
    cached: usage.cached || 0,
    timestamp: new Date(),
  });
  // Keep only last 50 entries
  if (debugStore.tokenUsage.length > 50) {
    debugStore.tokenUsage.pop();
  }
}

/**
 * DebugPanel Component
 */
export function DebugPanel(): React.ReactElement | null {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'state' | 'api' | 'sse' | 'tokens'>('state');
  const [refreshKey, setRefreshKey] = useState(0);

  // Get store state
  const storeState = useAppStore();

  // Force refresh every second when open - MUST be called before any conditional returns
  useEffect(() => {
    if (!isOpen || !DEBUG.SHOW_PANEL) return;
    const interval = setInterval(() => setRefreshKey((k) => k + 1), 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const formatTime = useCallback((date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }, []);

  // Don't render in production or if debug panel is disabled
  // This MUST come after all hooks
  if (!DEBUG.SHOW_PANEL) {
    return null;
  }

  // Collapsed state - just show toggle button
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-[9999] bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg hover:bg-gray-800 transition font-mono text-sm"
        title="Open Debug Panel"
      >
        🔧 Debug
      </button>
    );
  }

  // Extract relevant state for display
  const stateSnapshot = {
    mode: storeState.currentMode,
    isGenerating: storeState.isGenerating,
    messagesCount: storeState.chatMessages?.length || 0,
    componentsCount: storeState.components?.length || 0,
    undoStackSize: storeState.undoStack?.length || 0,
    redoStackSize: storeState.redoStack?.length || 0,
    hasPendingChange: !!storeState.pendingChange,
    hasPendingDiff: !!storeState.pendingDiff,
    hasAppConcept: !!storeState.appConcept,
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-96 max-h-[70vh] bg-gray-900 text-white rounded-lg shadow-2xl overflow-hidden font-mono text-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
        <span className="font-semibold">🔧 Debug Panel</span>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-white transition"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        {(['state', 'api', 'sse', 'tokens'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-2 py-1.5 text-center transition ${
              activeTab === tab
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {tab === 'state' && '📦'}
            {tab === 'api' && '🌐'}
            {tab === 'sse' && '📡'}
            {tab === 'tokens' && '🎫'}
            <span className="ml-1 capitalize">{tab}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-3 overflow-auto max-h-[50vh]">
        {/* State Tab */}
        {activeTab === 'state' && (
          <div className="space-y-2">
            <div className="text-gray-400 text-[10px] uppercase tracking-wide mb-2">
              Store Snapshot
            </div>
            {Object.entries(stateSnapshot).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-gray-400">{key}:</span>
                <span
                  className={
                    typeof value === 'boolean'
                      ? value
                        ? 'text-green-400'
                        : 'text-gray-500'
                      : 'text-blue-400'
                  }
                >
                  {String(value)}
                </span>
              </div>
            ))}
            <div className="mt-4 pt-2 border-t border-gray-700">
              <div className="text-gray-400 text-[10px] uppercase tracking-wide mb-2">
                Active Modals
              </div>
              <div className="text-gray-500 text-[10px]">
                {[
                  storeState.showLibrary && 'Library',
                  storeState.showApprovalModal && 'Approval',
                  storeState.showVersionHistory && 'VersionHistory',
                  storeState.showDeploymentModal && 'Deployment',
                ]
                  .filter(Boolean)
                  .join(', ') || 'None'}
              </div>
            </div>
          </div>
        )}

        {/* API Tab */}
        {activeTab === 'api' && (
          <div className="space-y-2">
            <div className="text-gray-400 text-[10px] uppercase tracking-wide mb-2">
              Recent Requests ({debugStore.apiRequests.length})
            </div>
            {debugStore.apiRequests.length === 0 ? (
              <div className="text-gray-500 text-center py-4">No requests yet</div>
            ) : (
              debugStore.apiRequests.slice(0, 20).map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between py-1 border-b border-gray-800"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        req.status === 'pending'
                          ? 'bg-yellow-500 animate-pulse'
                          : req.status === 'success'
                            ? 'bg-green-500'
                            : 'bg-red-500'
                      }`}
                    />
                    <span className="text-gray-300">{req.route}</span>
                  </div>
                  <div className="text-gray-500">{req.duration ? `${req.duration}ms` : '...'}</div>
                </div>
              ))
            )}
          </div>
        )}

        {/* SSE Tab */}
        {activeTab === 'sse' && (
          <div className="space-y-2">
            <div className="text-gray-400 text-[10px] uppercase tracking-wide mb-2">
              SSE Events ({debugStore.sseEvents.length})
            </div>
            {debugStore.sseEvents.length === 0 ? (
              <div className="text-gray-500 text-center py-4">No events yet</div>
            ) : (
              debugStore.sseEvents.slice(0, 30).map((evt) => (
                <div key={evt.id} className="py-1 border-b border-gray-800">
                  <div className="flex items-center justify-between">
                    <span className="text-purple-400">{evt.type}</span>
                    <span className="text-gray-600">{formatTime(evt.timestamp)}</span>
                  </div>
                  <div className="text-gray-500 truncate text-[10px]">{evt.data}</div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tokens Tab */}
        {activeTab === 'tokens' && (
          <div className="space-y-2">
            <div className="text-gray-400 text-[10px] uppercase tracking-wide mb-2">
              Token Usage
            </div>
            {debugStore.tokenUsage.length === 0 ? (
              <div className="text-gray-500 text-center py-4">No usage tracked yet</div>
            ) : (
              <>
                {/* Summary */}
                <div className="bg-gray-800 rounded p-2 mb-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-400">Total Input:</span>
                    <span className="text-blue-400">
                      {debugStore.tokenUsage.reduce((sum, u) => sum + u.input, 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-400">Total Output:</span>
                    <span className="text-green-400">
                      {debugStore.tokenUsage.reduce((sum, u) => sum + u.output, 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Cached:</span>
                    <span className="text-yellow-400">
                      {debugStore.tokenUsage.reduce((sum, u) => sum + u.cached, 0).toLocaleString()}
                    </span>
                  </div>
                </div>
                {/* Per-request */}
                {debugStore.tokenUsage.slice(0, 15).map((usage, i) => (
                  <div key={i} className="py-1 border-b border-gray-800">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 truncate max-w-[200px]">{usage.route}</span>
                      <span className="text-gray-600">{formatTime(usage.timestamp)}</span>
                    </div>
                    <div className="flex gap-3 text-[10px]">
                      <span className="text-blue-400">in: {usage.input}</span>
                      <span className="text-green-400">out: {usage.output}</span>
                      {usage.cached > 0 && (
                        <span className="text-yellow-400">cached: {usage.cached}</span>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 bg-gray-800 border-t border-gray-700 text-[10px] text-gray-500">
        Refresh: {refreshKey} | Press Ctrl+Shift+D to toggle
      </div>
    </div>
  );
}

export default DebugPanel;
