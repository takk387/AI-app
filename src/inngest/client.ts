/**
 * Inngest Client Configuration
 *
 * Central Inngest client for background job processing.
 * Used for long-running deployment tasks like mobile/desktop builds
 * and large database migrations.
 */

import { Inngest } from 'inngest';

/**
 * Event types for type-safe event sending
 */
export type Events = {
  // Mobile build events
  'deploy/mobile.requested': {
    data: {
      projectId: string;
      userId: string;
      platform: 'ios' | 'android';
      appName: string;
      bundleId: string;
      transformedCode: string;
      easProfile: 'development' | 'preview' | 'production';
    };
  };

  // Desktop build events
  'deploy/desktop.requested': {
    data: {
      projectId: string;
      userId: string;
      platform: 'windows' | 'macos' | 'linux';
      appName: string;
      identifier: string;
      transformedCode: string;
    };
  };

  // Database migration events
  'deploy/database.migrate': {
    data: {
      projectId: string;
      userId: string;
      sourceData: string; // JSON serialized browser SQLite data
      targetProvider: 'turso' | 'neon';
      targetConnectionUrl: string;
    };
  };

  // Status update events (for notifying users)
  'deploy/status.updated': {
    data: {
      projectId: string;
      userId: string;
      platform: string;
      status: string;
      message: string;
      progress: number;
      artifactUrl?: string;
      error?: string;
    };
  };

  // Cancel events (for stopping in-progress builds)
  'deploy/mobile.cancelled': {
    data: {
      projectId: string;
      userId: string;
    };
  };

  'deploy/desktop.cancelled': {
    data: {
      projectId: string;
      userId: string;
    };
  };

  'deploy/database.cancelled': {
    data: {
      projectId: string;
      userId: string;
    };
  };
};

/**
 * Inngest client instance
 *
 * Configuration:
 * - id: Unique identifier for this app
 * - eventKey: Used for sending events (from INNGEST_EVENT_KEY env var)
 */
export const inngest = new Inngest({
  id: 'ai-app-builder',
  schemas: new Map() as never, // Type workaround for events
});

/**
 * Helper to send deployment status updates
 */
export async function sendStatusUpdate(
  projectId: string,
  userId: string,
  platform: string,
  status: string,
  message: string,
  progress: number,
  options?: { artifactUrl?: string; error?: string }
): Promise<void> {
  await inngest.send({
    name: 'deploy/status.updated',
    data: {
      projectId,
      userId,
      platform,
      status,
      message,
      progress,
      ...options,
    },
  });
}

/**
 * Helper to trigger mobile build
 */
export async function triggerMobileBuild(params: {
  projectId: string;
  userId: string;
  platform: 'ios' | 'android';
  appName: string;
  bundleId: string;
  transformedCode: string;
  easProfile?: 'development' | 'preview' | 'production';
}): Promise<void> {
  await inngest.send({
    name: 'deploy/mobile.requested',
    data: {
      ...params,
      easProfile: params.easProfile || 'production',
    },
  });
}

/**
 * Helper to trigger desktop build
 */
export async function triggerDesktopBuild(params: {
  projectId: string;
  userId: string;
  platform: 'windows' | 'macos' | 'linux';
  appName: string;
  identifier: string;
  transformedCode: string;
}): Promise<void> {
  await inngest.send({
    name: 'deploy/desktop.requested',
    data: params,
  });
}

/**
 * Helper to trigger database migration
 */
export async function triggerDatabaseMigration(params: {
  projectId: string;
  userId: string;
  sourceData: string;
  targetProvider: 'turso' | 'neon';
  targetConnectionUrl: string;
}): Promise<void> {
  await inngest.send({
    name: 'deploy/database.migrate',
    data: params,
  });
}

/**
 * Helper to cancel a mobile build
 */
export async function cancelMobileBuild(params: {
  projectId: string;
  userId: string;
}): Promise<void> {
  await inngest.send({
    name: 'deploy/mobile.cancelled',
    data: params,
  });
}

/**
 * Helper to cancel a desktop build
 */
export async function cancelDesktopBuild(params: {
  projectId: string;
  userId: string;
}): Promise<void> {
  await inngest.send({
    name: 'deploy/desktop.cancelled',
    data: params,
  });
}

/**
 * Helper to cancel a database migration
 */
export async function cancelDatabaseMigration(params: {
  projectId: string;
  userId: string;
}): Promise<void> {
  await inngest.send({
    name: 'deploy/database.cancelled',
    data: params,
  });
}
