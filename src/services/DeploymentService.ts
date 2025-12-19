/**
 * DeploymentService
 * Handles Vercel deployment via API
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { decrypt } from './TokenEncryption';
import type { Database } from '@/types/supabase';
import type { DeploymentResult, DeploymentStatus } from '@/types/deployment';

type SupabaseClientType = SupabaseClient<Database>;

interface VercelDeploymentResponse {
  id: string;
  url: string;
  readyState: string;
  error?: {
    message: string;
    code: string;
  };
}

interface VercelDeploymentFile {
  file: string;
  data: string;
  encoding: 'base64' | 'utf-8';
}

export class DeploymentService {
  /**
   * Get decrypted Vercel token for a user
   */
  static async getVercelToken(
    supabase: SupabaseClientType,
    userId: string
  ): Promise<string | null> {
    const { data, error } = await supabase
      .from('user_integrations')
      .select('access_token_encrypted, token_expires_at')
      .eq('user_id', userId)
      .eq('provider', 'vercel')
      .single();

    if (error || !data) {
      return null;
    }

    // Check if token is expired
    if (data.token_expires_at) {
      const expiresAt = new Date(data.token_expires_at);
      if (expiresAt < new Date()) {
        console.warn('Vercel token expired');
        // In a production app, we'd refresh the token here
        return null;
      }
    }

    try {
      return decrypt(data.access_token_encrypted);
    } catch (err) {
      console.error('Failed to decrypt token:', err);
      return null;
    }
  }

  /**
   * Check if user has Vercel connected
   */
  static async isVercelConnected(supabase: SupabaseClientType, userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('user_integrations')
      .select('id')
      .eq('user_id', userId)
      .eq('provider', 'vercel')
      .single();

    return !error && !!data;
  }

  /**
   * Deploy app to Vercel
   */
  static async deployToVercel(params: {
    token: string;
    projectName: string;
    files: Record<string, string>;
    teamId?: string;
  }): Promise<DeploymentResult> {
    const { token, projectName, files, teamId } = params;

    try {
      // Prepare files for Vercel API
      const deploymentFiles: VercelDeploymentFile[] = Object.entries(files).map(
        ([path, content]) => ({
          file: path,
          data: Buffer.from(content).toString('base64'),
          encoding: 'base64',
        })
      );

      // Build deployment URL with optional team
      const deployUrl = teamId
        ? `https://api.vercel.com/v13/deployments?teamId=${teamId}`
        : 'https://api.vercel.com/v13/deployments';

      // Create deployment using Vercel API
      const response = await fetch(deployUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: projectName,
          files: deploymentFiles,
          projectSettings: {
            framework: 'nextjs',
          },
          target: 'production',
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error('Vercel deployment error:', responseData);
        return {
          success: false,
          error: responseData.error?.message || 'Deployment failed',
        };
      }

      const deployment = responseData as VercelDeploymentResponse;

      return {
        success: true,
        deploymentId: deployment.id,
        url: `https://${deployment.url}`,
        status: this.mapVercelStatus(deployment.readyState),
      };
    } catch (error) {
      console.error('Deployment error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create deployment',
      };
    }
  }

  /**
   * Check deployment status
   */
  static async getDeploymentStatus(
    token: string,
    deploymentId: string
  ): Promise<{ status: DeploymentStatus; url?: string; error?: string }> {
    try {
      const response = await fetch(`https://api.vercel.com/v13/deployments/${deploymentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        return { status: 'error', error: 'Failed to fetch deployment status' };
      }

      const deployment = (await response.json()) as VercelDeploymentResponse;

      return {
        status: this.mapVercelStatus(deployment.readyState),
        url: deployment.url ? `https://${deployment.url}` : undefined,
      };
    } catch (error) {
      console.error('Status check error:', error);
      return { status: 'error', error: 'Failed to check status' };
    }
  }

  /**
   * Map Vercel readyState to our DeploymentStatus
   */
  private static mapVercelStatus(readyState: string): DeploymentStatus {
    switch (readyState) {
      case 'QUEUED':
      case 'INITIALIZING':
        return 'pending';
      case 'BUILDING':
        return 'building';
      case 'READY':
        return 'ready';
      case 'ERROR':
        return 'error';
      case 'CANCELED':
        return 'canceled';
      default:
        return 'pending';
    }
  }

  /**
   * Get user's Vercel account info
   */
  static async getVercelAccountInfo(token: string): Promise<{
    id: string;
    username: string;
    name: string | null;
    email: string | null;
  } | null> {
    try {
      const response = await fetch('https://api.vercel.com/v2/user', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return {
        id: data.user.id,
        username: data.user.username,
        name: data.user.name || null,
        email: data.user.email || null,
      };
    } catch {
      return null;
    }
  }
}
