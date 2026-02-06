/**
 * Planning Session Store
 *
 * Shared in-memory session store for the Dual AI Planning pipeline.
 * Used by both /api/planning/start and /api/planning/stream/[sessionId].
 *
 * In production, replace with Redis for multi-instance support.
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
