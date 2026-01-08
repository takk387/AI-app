/**
 * Inngest Webhook Handler
 *
 * This route serves as the webhook endpoint for Inngest to invoke functions.
 * Inngest sends events to this endpoint, which then routes them to the
 * appropriate background job functions.
 *
 * Environment Variables Required:
 * - INNGEST_EVENT_KEY: For sending events
 * - INNGEST_SIGNING_KEY: For verifying webhook signatures
 */

import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import { mobileBuild, desktopBuild, databaseMigration } from '@/inngest/functions';

/**
 * Create the Inngest serve handler with all registered functions
 *
 * This exports handlers for:
 * - GET: Inngest dashboard/dev server UI
 * - POST: Webhook endpoint for function invocations
 * - PUT: Function registration
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [mobileBuild, desktopBuild, databaseMigration],
});
