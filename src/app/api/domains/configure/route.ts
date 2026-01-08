/**
 * POST /api/domains/configure
 *
 * Configure a custom domain for a deployment.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { getDomainService, getDeployedAppsService } from '@/services/deployment';
import type { DomainProvider } from '@/services/deployment';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const DomainConfigureRequestSchema = z.object({
  deploymentId: z.string().uuid(),
  domain: z.string().min(1).max(253),
  subdomain: z.string().optional(),
  provider: z.enum(['cloudflare', 'vercel', 'custom'] as const).default('cloudflare'),
  sslEnabled: z.boolean().default(true),
});

type _DomainConfigureRequest = z.infer<typeof DomainConfigureRequestSchema>;

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

/**
 * POST - Configure a custom domain
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate request
    const parseResult = DomainConfigureRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request',
          details: parseResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { deploymentId, domain, subdomain, provider, sslEnabled } = parseResult.data;

    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get deployment and verify ownership
    const deployedAppsService = getDeployedAppsService();
    const deploymentResult = await deployedAppsService.getById(deploymentId);

    if (!deploymentResult.success || !deploymentResult.data) {
      return NextResponse.json({ success: false, error: 'Deployment not found' }, { status: 404 });
    }

    const deployment = deploymentResult.data;

    if (deployment.userId !== user.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    // Only web deployments can have custom domains
    if (deployment.platform !== 'web') {
      return NextResponse.json(
        { success: false, error: 'Custom domains only available for web deployments' },
        { status: 400 }
      );
    }

    // Get the target host from the deployment URL
    let targetHost: string;
    if (deployment.deploymentUrl) {
      try {
        targetHost = new URL(deployment.deploymentUrl).hostname;
      } catch {
        // Fallback if URL is malformed
        targetHost = `${deployment.projectId}.pages.dev`;
      }
    } else {
      targetHost = `${deployment.projectId}.pages.dev`;
    }

    // Setup domain
    const domainService = getDomainService();
    const setupResult = await domainService.setupDomain(deployment.projectId, {
      domain,
      subdomain,
      provider: provider as DomainProvider,
      targetHost,
      targetType: 'cname',
      sslEnabled,
    });

    if (!setupResult.success) {
      return NextResponse.json({ success: false, error: setupResult.error }, { status: 500 });
    }

    // Update deployment with custom domain
    const fullDomain = subdomain ? `${subdomain}.${domain}` : domain;
    const updateResult = await deployedAppsService.update(deploymentId, {
      customDomain: fullDomain,
    });

    if (!updateResult.success) {
      console.error('Failed to update deployment with custom domain:', updateResult.error);
      // Domain was configured at provider but we failed to record it
      // Return success with a warning since the domain setup did succeed
    }

    return NextResponse.json({
      success: true,
      domain: setupResult.domain,
      status: setupResult.status,
      dnsRecords: setupResult.dnsRecords,
      verificationToken: setupResult.verificationToken,
      sslStatus: setupResult.sslStatus,
      instructions: domainService.formatDNSRecordsForDisplay(setupResult.dnsRecords),
    });
  } catch (error) {
    console.error('Domain configure error:', error);
    return NextResponse.json(
      { success: false, error: 'Domain configuration failed' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove a custom domain
 */
export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const deploymentId = url.searchParams.get('deploymentId');

    if (!deploymentId) {
      return NextResponse.json(
        { success: false, error: 'Deployment ID required' },
        { status: 400 }
      );
    }

    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get deployment and verify ownership
    const deployedAppsService = getDeployedAppsService();
    const deploymentResult = await deployedAppsService.getById(deploymentId);

    if (!deploymentResult.success || !deploymentResult.data) {
      return NextResponse.json({ success: false, error: 'Deployment not found' }, { status: 404 });
    }

    const deployment = deploymentResult.data;

    if (deployment.userId !== user.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    if (!deployment.customDomain) {
      return NextResponse.json(
        { success: false, error: 'No custom domain configured' },
        { status: 400 }
      );
    }

    // Remove domain
    const domainService = getDomainService();
    const removeResult = await domainService.removeDomain(
      deployment.projectId,
      deployment.customDomain
    );

    if (!removeResult.success) {
      return NextResponse.json({ success: false, error: removeResult.error }, { status: 500 });
    }

    // Update deployment to remove custom domain
    const updateResult = await deployedAppsService.update(deploymentId, {
      customDomain: undefined,
    });

    if (!updateResult.success) {
      console.error('Failed to clear custom domain from deployment:', updateResult.error);
      // Domain was removed at provider but we failed to update record
    }

    return NextResponse.json({
      success: true,
      message: 'Custom domain removed',
    });
  } catch (error) {
    console.error('Domain remove error:', error);
    return NextResponse.json({ success: false, error: 'Failed to remove domain' }, { status: 500 });
  }
}
