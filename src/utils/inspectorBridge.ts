/**
 * Inspector Bridge
 *
 * PostMessage bridge between the Sandpack iframe preview and the main app.
 * Enables click-to-select on components rendered in the preview by injecting
 * an inspector script that listens for clicks on [data-id] elements.
 *
 * Two exports:
 *   1. createInspectorFileContent() — JS string to inject as a hidden Sandpack file
 *   2. useInspectorBridge() — React hook that listens for postMessage events
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { InspectorBridgeState, InspectorMessage } from '@/types/titanPipeline';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Path for the hidden inspector file in Sandpack */
export const INSPECTOR_FILE_PATH = '/src/inspector.ts';

/** Message type used by the inspector script */
export const INSPECTOR_MESSAGE_TYPE = 'COMPONENT_SELECTED';

// ============================================================================
// INSPECTOR SCRIPT (injected into Sandpack)
// ============================================================================

/**
 * Returns the JS content for the inspector file.
 * This file is added to Sandpack's files prop and imported in index.tsx.
 * It adds click/hover listeners on all [data-id] elements.
 */
export function createInspectorFileContent(): string {
  return `
// Inspector script — injected by the layout builder for click-to-select
(function initInspector() {
  let currentHighlight = null;

  // Create highlight overlay element
  const overlay = document.createElement('div');
  overlay.id = '__inspector-overlay';
  overlay.style.cssText = 'position:fixed;pointer-events:none;border:2px solid #3b82f6;border-radius:4px;z-index:99999;transition:all 0.15s ease;opacity:0;';
  document.body.appendChild(overlay);

  function getDataIdElement(target) {
    let el = target;
    while (el && el !== document.body) {
      if (el.getAttribute && el.getAttribute('data-id')) return el;
      el = el.parentElement;
    }
    return null;
  }

  // Click handler — select component
  document.addEventListener('click', function(e) {
    // 1. CHECK FOR ALT KEY: If Alt is held, let the click pass through (Interact Mode)
    if (e.altKey) return; 

    const el = getDataIdElement(e.target);
    if (!el) return;

    // 2. Otherwise, intercept for editing
    e.preventDefault();
    e.stopPropagation();

    const rect = el.getBoundingClientRect();
    window.parent.postMessage({
      type: '${INSPECTOR_MESSAGE_TYPE}',
      id: el.getAttribute('data-id'),
      tagName: el.tagName.toLowerCase(),
      outerHTML: el.outerHTML,
      rect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      }
    }, '*');
  }, true);

  // Hover handler — highlight component
  document.addEventListener('mouseover', function(e) {
    // 3. Disable highlight if Alt is held (cleaner visual)
    if (e.altKey) {
      if (currentHighlight) {
        currentHighlight = null;
        overlay.style.opacity = '0';
      }
      return;
    }

    const el = getDataIdElement(e.target);
    if (el && el !== currentHighlight) {
      currentHighlight = el;
      const rect = el.getBoundingClientRect();
      overlay.style.top = rect.top + 'px';
      overlay.style.left = rect.left + 'px';
      overlay.style.width = rect.width + 'px';
      overlay.style.height = rect.height + 'px';
      overlay.style.opacity = '1';
    }
  }, true);

  document.addEventListener('mouseout', function(e) {
    const el = getDataIdElement(e.target);
    if (el === currentHighlight) {
      currentHighlight = null;
      overlay.style.opacity = '0';
    }
  }, true);

  // Prevent navigation for anchor tags
  document.addEventListener('click', function(e) {
    if (e.altKey) return; // Allow navigation/interaction if Alt is held
    if (e.target.tagName === 'A' || e.target.closest('a')) {
      e.preventDefault();
    }
  }, true);
})();
`;
}

// ============================================================================
// REACT HOOK
// ============================================================================

/**
 * React hook that listens for postMessage events from the Sandpack iframe.
 * Returns the currently selected component's data-id, HTML, and bounding rect.
 */
export function useInspectorBridge(): InspectorBridgeState {
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [selectedHTML, setSelectedHTML] = useState<string | null>(null);
  const [selectedTagName, setSelectedTagName] = useState<string | null>(null);
  const [selectedRect, setSelectedRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  const clearSelection = useCallback(() => {
    setSelectedComponentId(null);
    setSelectedHTML(null);
    setSelectedTagName(null);
    setSelectedRect(null);
  }, []);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      const data = event.data as InspectorMessage;
      if (data && data.type === INSPECTOR_MESSAGE_TYPE) {
        setSelectedComponentId(data.id);
        setSelectedHTML(data.outerHTML);
        setSelectedTagName(data.tagName);
        setSelectedRect(data.rect);
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return {
    selectedComponentId,
    selectedHTML,
    selectedTagName,
    selectedRect,
    clearSelection,
  };
}
