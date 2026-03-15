/**
 * Planning Session Store
 *
 * WARNING: IN-MEMORY STORE
 * ========================
 * This Map lives in the Node.js process and is NOT shared between instances.
 *
 * Consequences:
 * - All sessions are lost on process restart / deploy
 * - No authentication — any caller with a sessionId can read/write
 * - Will NOT work with horizontal scaling (multiple Railway instances)
 *
 * Migration path → Redis:
 *   1. Replace `sessions` Map with ioredis client
 *   2. Serialize PlanningSession to JSON (strip non-serializable fields)
 *   3. Use SETEX with SESSION_TTL_MS for automatic expiry
 *   4. Remove setInterval cleanup (Redis handles TTL natively)
 *
 * Shared in-memory session store for the Dual AI Planning pipeline.
 * Used by both /api/planning/start and /api/planning/stream/[sessionId].
 */

import type { PlanningSession } from '@/types/dualPlanning';

const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour

// Module-level singleton Map
const sessions = new Map<string, PlanningSession>();

export function getSession(sessionId: string): PlanningSession | undefined {
  return sessions.get(sessionId);
}

export function setSession(sessionId: string, session: PlanningSession): void {
  sessions.set(sessionId, session);
}

export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId);
}

export function updateSessionStatus(sessionId: string, status: PlanningSession['status']): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.status = status;
  }
}

export function cleanupExpiredSessions(): void {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - session.createdAt > SESSION_TTL_MS) {
      sessions.delete(id);
    }
  }
}

// Auto-cleanup: run every 10 minutes instead of only on new requests
const sessionCleanupInterval = setInterval(cleanupExpiredSessions, 10 * 60 * 1000);
if (
  sessionCleanupInterval &&
  typeof sessionCleanupInterval === 'object' &&
  'unref' in sessionCleanupInterval
) {
  sessionCleanupInterval.unref();
}
