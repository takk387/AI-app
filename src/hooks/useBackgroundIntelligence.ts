/**
 * useBackgroundIntelligence Hook
 *
 * Starts intelligence gathering (Stage 2 of Dual AI Planning) in the background
 * while the user is on the Design page. The result is cached in Zustand and
 * passed to the planning pipeline when the AI Plan page starts, skipping
 * the 15-30 second intelligence gathering step.
 *
 * Idempotent: won't re-run if intelligence is already cached or in progress.
 * Invalidates cache if the appConcept changes (by comparing concept name + features hash).
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';

/**
 * Generate a simple hash of the concept to detect meaningful changes.
 * Uses concept name + feature names as the fingerprint.
 */
function conceptFingerprint(
  concept: { name?: string; coreFeatures?: { name: string }[] } | null
): string {
  if (!concept) return '';
  const featureNames =
    concept.coreFeatures
      ?.map((f) => f.name)
      .sort()
      .join(',') ?? '';
  return `${concept.name ?? ''}|${featureNames}`;
}

export function useBackgroundIntelligence(): {
  isGathering: boolean;
  hasCache: boolean;
} {
  const appConcept = useAppStore((s) => s.appConcept);
  const cachedIntelligence = useAppStore((s) => s.cachedIntelligence);
  const setCachedIntelligence = useAppStore((s) => s.setCachedIntelligence);

  const [isGathering, setIsGathering] = useState(false);
  const isGatheringRef = useRef(false);
  const lastFingerprintRef = useRef<string>('');

  useEffect(() => {
    // Must have concept with features to gather intelligence
    if (!appConcept?.coreFeatures?.length) return;

    const fingerprint = conceptFingerprint(appConcept);

    // Skip if already gathering
    if (isGatheringRef.current) return;

    // Skip if already cached for this exact concept
    if (cachedIntelligence && lastFingerprintRef.current === fingerprint) return;

    // If fingerprint is unchanged and we have cache, nothing to do
    // (handles the case where cachedIntelligence just arrived from our own fetch)
    if (lastFingerprintRef.current === fingerprint && cachedIntelligence) return;

    // Invalidate stale cache if concept changed since last gather
    if (
      cachedIntelligence &&
      lastFingerprintRef.current &&
      lastFingerprintRef.current !== fingerprint
    ) {
      setCachedIntelligence(null);
    }

    // Mark as gathering before async work
    isGatheringRef.current = true;
    lastFingerprintRef.current = fingerprint;
    setIsGathering(true);

    const abortController = new AbortController();

    fetch('/api/planning/intelligence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ concept: appConcept }),
      signal: abortController.signal,
    })
      .then((res) => {
        if (res.ok) return res.json();
        console.warn('[useBackgroundIntelligence] Failed:', res.status);
        return null;
      })
      .then((data) => {
        if (data?.intelligence) {
          setCachedIntelligence(data.intelligence);
        }
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.warn('[useBackgroundIntelligence] Error:', err);
      })
      .finally(() => {
        isGatheringRef.current = false;
        setIsGathering(false);
      });

    return () => {
      abortController.abort();
    };
    // Only re-run when concept changes — cachedIntelligence is intentionally excluded
    // to prevent re-render loops when we set it ourselves
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appConcept, setCachedIntelligence]);

  return {
    isGathering,
    hasCache: cachedIntelligence !== null,
  };
}
