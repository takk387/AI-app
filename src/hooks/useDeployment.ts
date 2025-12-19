/**
 * useDeployment Hook
 * Manages deployment state and operations
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { UserIntegration, DeploymentResult, DeploymentStatus } from '@/types/deployment';

export interface UseDeploymentOptions {
  onError?: (error: string) => void;
  onSuccess?: (url: string) => void;
  pollInterval?: number;
}

export interface UseDeploymentReturn {
  // Connection state
  isVercelConnected: boolean;
  vercelAccount: { name: string; id: string } | null;
  integrations: UserIntegration[];
  isLoadingIntegrations: boolean;

  // Actions
  connectVercel: () => void;
  disconnectVercel: () => Promise<void>;
  refreshIntegrations: () => Promise<void>;

  // Deployment
  deployToVercel: (appId: string, projectName?: string) => Promise<DeploymentResult>;
  checkDeploymentStatus: (deploymentId: string) => Promise<void>;
  deploymentStatus: DeploymentStatus | null;
  deploymentUrl: string | null;
  deploymentId: string | null;
  isDeploying: boolean;

  // Error state
  error: string | null;
  clearError: () => void;
}

export function useDeployment(options?: UseDeploymentOptions): UseDeploymentReturn {
  const { onError, onSuccess, pollInterval = 3000 } = options || {};

  const [integrations, setIntegrations] = useState<UserIntegration[]>([]);
  const [isLoadingIntegrations, setIsLoadingIntegrations] = useState(true);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus | null>(null);
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null);
  const [deploymentId, setDeploymentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearError = useCallback(() => setError(null), []);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // Fetch integrations on mount
  const refreshIntegrations = useCallback(async () => {
    setIsLoadingIntegrations(true);
    try {
      const response = await fetch('/api/integrations/status');
      const data = await response.json();

      if (data.success) {
        setIntegrations(data.integrations);
      }
    } catch {
      // Silent fail - user may not be logged in
    } finally {
      setIsLoadingIntegrations(false);
    }
  }, []);

  useEffect(() => {
    refreshIntegrations();
  }, [refreshIntegrations]);

  // Check for OAuth callback params in URL
  useEffect(() => {
    const url = new URL(window.location.href);
    const vercelConnected = url.searchParams.get('vercel_connected');
    const oauthError = url.searchParams.get('error');

    if (vercelConnected === 'true') {
      // Refresh integrations after successful OAuth
      refreshIntegrations();
      // Clean up URL
      url.searchParams.delete('vercel_connected');
      window.history.replaceState({}, '', url.toString());
    }

    if (oauthError?.startsWith('vercel_')) {
      setError(`Vercel connection failed: ${oauthError.replace('vercel_', '').replace(/_/g, ' ')}`);
      // Clean up URL
      url.searchParams.delete('error');
      window.history.replaceState({}, '', url.toString());
    }
  }, [refreshIntegrations]);

  // Derived state
  const vercelIntegration = integrations.find((i) => i.provider === 'vercel');
  const isVercelConnected = !!vercelIntegration;
  const vercelAccount = vercelIntegration
    ? { name: vercelIntegration.accountName || 'Unknown', id: vercelIntegration.accountId || '' }
    : null;

  // Connect to Vercel (redirect to OAuth)
  const connectVercel = useCallback(() => {
    window.location.href = '/api/integrations/vercel/authorize';
  }, []);

  // Disconnect Vercel
  const disconnectVercel = useCallback(async () => {
    try {
      const response = await fetch('/api/integrations/vercel/disconnect', {
        method: 'DELETE',
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      await refreshIntegrations();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to disconnect';
      setError(message);
      onError?.(message);
    }
  }, [refreshIntegrations, onError]);

  // Check deployment status
  const checkDeploymentStatus = useCallback(
    async (depId: string) => {
      try {
        const response = await fetch(`/api/deploy/vercel?deploymentId=${depId}`);
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error);
        }

        setDeploymentStatus(data.status);
        if (data.url) {
          setDeploymentUrl(data.url);
        }

        // Stop polling if deployment is complete or errored
        if (data.status === 'ready') {
          stopPolling();
          setIsDeploying(false);
          if (data.url) {
            onSuccess?.(data.url);
          }
        } else if (data.status === 'error' || data.status === 'canceled') {
          stopPolling();
          setIsDeploying(false);
          setError('Deployment failed');
          onError?.('Deployment failed');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to check status';
        setError(message);
        stopPolling();
        setIsDeploying(false);
      }
    },
    [onError, onSuccess, stopPolling]
  );

  // Deploy to Vercel
  const deployToVercel = useCallback(
    async (appId: string, projectName?: string): Promise<DeploymentResult> => {
      setIsDeploying(true);
      setError(null);
      setDeploymentStatus('pending');
      setDeploymentUrl(null);
      setDeploymentId(null);
      stopPolling();

      try {
        const response = await fetch('/api/deploy/vercel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appId, projectName }),
        });

        const result: DeploymentResult = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Deployment failed');
        }

        setDeploymentStatus(result.status || 'building');
        setDeploymentId(result.deploymentId || null);

        if (result.url) {
          setDeploymentUrl(result.url);
        }

        // Start polling for status updates
        if (result.deploymentId && result.status !== 'ready') {
          pollIntervalRef.current = setInterval(() => {
            checkDeploymentStatus(result.deploymentId!);
          }, pollInterval);
        } else if (result.status === 'ready' && result.url) {
          setIsDeploying(false);
          onSuccess?.(result.url);
        }

        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Deployment failed';
        setError(message);
        setDeploymentStatus('error');
        setIsDeploying(false);
        onError?.(message);
        return { success: false, error: message };
      }
    },
    [checkDeploymentStatus, onError, onSuccess, pollInterval, stopPolling]
  );

  return {
    isVercelConnected,
    vercelAccount,
    integrations,
    isLoadingIntegrations,
    connectVercel,
    disconnectVercel,
    refreshIntegrations,
    deployToVercel,
    checkDeploymentStatus,
    deploymentStatus,
    deploymentUrl,
    deploymentId,
    isDeploying,
    error,
    clearError,
  };
}
