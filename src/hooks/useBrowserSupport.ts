'use client';

import { useMemo } from 'react';

/**
 * Browser support information for WebContainers
 */
export interface BrowserSupport {
  /** Whether the browser supports WebContainers */
  supportsWebContainers: boolean;
  /** Browser name for display */
  browserName: string;
  /** Reason if not supported */
  reason?: string;
}

/**
 * Get browser name from user agent
 */
function getBrowserName(): string {
  if (typeof navigator === 'undefined') return 'Unknown';

  const ua = navigator.userAgent;

  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';

  return 'Unknown';
}

/**
 * Hook to detect browser support for WebContainers
 *
 * WebContainers requires:
 * 1. Chrome 89+ or Firefox 89+ (full support)
 * 2. SharedArrayBuffer support (requires COOP/COEP headers)
 * 3. Service Worker support
 *
 * @returns Browser support information
 *
 * @example
 * ```tsx
 * const { supportsWebContainers, browserName, reason } = useBrowserSupport();
 *
 * if (!supportsWebContainers) {
 *   return <Warning>WebContainers not supported: {reason}</Warning>;
 * }
 * ```
 */
export function useBrowserSupport(): BrowserSupport {
  return useMemo(() => {
    // Server-side rendering - assume not supported
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return {
        supportsWebContainers: false,
        browserName: 'Unknown',
        reason: 'Server-side rendering',
      };
    }

    const browserName = getBrowserName();

    // Check for SharedArrayBuffer support (requires COOP/COEP headers)
    const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
    if (!hasSharedArrayBuffer) {
      return {
        supportsWebContainers: false,
        browserName,
        reason: 'SharedArrayBuffer not available (COOP/COEP headers may be missing)',
      };
    }

    // Check for Service Worker support
    const hasServiceWorker = 'serviceWorker' in navigator;
    if (!hasServiceWorker) {
      return {
        supportsWebContainers: false,
        browserName,
        reason: 'Service Workers not supported',
      };
    }

    // Check for supported browsers
    const isChrome = browserName === 'Chrome' || browserName === 'Edge' || browserName === 'Opera';
    const isFirefox = browserName === 'Firefox';

    if (!isChrome && !isFirefox) {
      return {
        supportsWebContainers: false,
        browserName,
        reason: `WebContainers requires Chrome or Firefox (current: ${browserName})`,
      };
    }

    // All checks passed
    return {
      supportsWebContainers: true,
      browserName,
    };
  }, []);
}

export default useBrowserSupport;
