import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { deployments } from '../../deploy/route';
import { DeploymentIdSchema } from '@/types/railway';
import { logger } from '@/utils/logger';

// Railway GraphQL API endpoint
const RAILWAY_API_URL = 'https://backboard.railway.app/graphql/v2';

// Module-level logger
const log = logger.child({ route: '/api/railway/status' });

// ============================================================================
// RAILWAY API HELPER
// ============================================================================

async function railwayQuery(query: string, variables?: Record<string, unknown>) {
  const token = process.env.RAILWAY_API_TOKEN;
  if (!token) {
    throw new Error('RAILWAY_API_TOKEN not configured');
  }

  const response = await fetch(RAILWAY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  const result = await response.json();

  if (result.errors) {
    log.error('Railway API error', undefined, { errors: result.errors });
    throw new Error(result.errors[0]?.message || 'Railway API error');
  }

  return result.data;
}

/**
 * Get deployment status from Railway
 */
async function getDeploymentStatus(
  serviceId: string,
  cachedPreviewUrl: string | null
): Promise<{
  status: string;
  previewUrl: string | null;
  buildLogs: string[];
  error?: string;
}> {
  try {
    log.debug('Fetching deployment status', { serviceId });

    // Get service details including deployments
    // Using a simpler query that's more reliable
    const data = await railwayQuery(
      `query GetService($serviceId: String!) {
        service(id: $serviceId) {
          id
          name
          deployments(first: 1, orderBy: { createdAt: DESC }) {
            edges {
              node {
                id
                status
                createdAt
              }
            }
          }
        }
      }`,
      { serviceId }
    );

    log.debug('Railway API response', { data: JSON.stringify(data) });

    const service = data.service;
    if (!service) {
      log.warn('Service not found', { serviceId });
      return {
        status: 'error',
        previewUrl: null,
        buildLogs: [],
        error: 'Service not found',
      };
    }

    // Get latest deployment
    const railwayDeployments = service.deployments?.edges || [];
    const latestDeployment = railwayDeployments[0]?.node;

    log.debug('Deployment info', {
      hasDeployment: !!latestDeployment,
      deploymentCount: railwayDeployments.length,
      latestStatus: latestDeployment?.status,
    });

    if (!latestDeployment) {
      return {
        status: 'building',
        previewUrl: cachedPreviewUrl,
        buildLogs: ['Waiting for deployment to start...'],
      };
    }

    // Map Railway status to our status
    // Railway uses lowercase status values like "BUILDING", "SUCCESS", etc.
    const railwayStatus = (latestDeployment.status || 'BUILDING').toUpperCase();
    let status: string;

    switch (railwayStatus) {
      case 'SUCCESS':
        status = 'ready';
        break;
      case 'FAILED':
      case 'CRASHED':
      case 'REMOVED':
        status = 'error';
        break;
      case 'BUILDING':
      case 'INITIALIZING':
      case 'WAITING':
      case 'QUEUED':
        status = 'building';
        break;
      case 'DEPLOYING':
      case 'SLEEPING':
        status = 'deploying';
        break;
      default:
        log.debug('Unknown Railway status, treating as building', { railwayStatus });
        status = 'building';
    }

    log.debug('Mapped status', { railwayStatus, mappedStatus: status });

    return {
      status,
      previewUrl: cachedPreviewUrl, // Use the URL we created during deploy
      buildLogs: [`Deployment status: ${railwayStatus}`],
      error: status === 'error' ? `Deployment failed with status: ${railwayStatus}` : undefined,
    };
  } catch (error) {
    log.error('Error fetching Railway status', error, { serviceId });
    return {
      status: 'error',
      previewUrl: null,
      buildLogs: [],
      error: error instanceof Error ? error.message : 'Failed to get status',
    };
  }
}

// ============================================================================
// ROUTE HANDLER
// ============================================================================

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Authentication check
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;

    // Validate ID format
    const idValidation = DeploymentIdSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json({ error: 'Invalid deployment ID format' }, { status: 400 });
    }

    // Check user ownership and get cached data
    const deployment = deployments.get(id);
    if (deployment && deployment.userId !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to access this deployment' },
        { status: 403 }
      );
    }

    // Get cached preview URL from our in-memory store
    const cachedPreviewUrl = deployment?.previewUrl || null;

    const status = await getDeploymentStatus(id, cachedPreviewUrl);

    // Update our cached deployment record with the latest status
    if (deployment) {
      deployment.status = status.status as typeof deployment.status;
      if (status.previewUrl) {
        deployment.previewUrl = status.previewUrl;
      }
    }

    return NextResponse.json({
      id,
      ...status,
    });
  } catch (error) {
    log.error('Railway status error', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get status' },
      { status: 500 }
    );
  }
}
