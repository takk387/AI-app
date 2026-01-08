/**
 * useUnifiedDeployment Hook
 *
 * Manages deployment configuration and state for web, mobile, and desktop platforms.
 */

import { useState, useCallback } from 'react';
import type {
  DeploymentPlatform,
  DeploymentProgress,
  WebDeployConfig,
  MobileDeployConfig,
  DesktopDeployConfig,
  UseUnifiedDeploymentReturn,
  DeploymentStep,
} from '@/types/deployment/unified';
import {
  DEFAULT_WEB_CONFIG,
  DEFAULT_MOBILE_CONFIG,
  DEFAULT_DESKTOP_CONFIG,
  DEFAULT_DEPLOYMENT_PROGRESS,
  WEB_DEPLOYMENT_STEPS,
  MOBILE_DEPLOYMENT_STEPS,
  DESKTOP_DEPLOYMENT_STEPS,
} from '@/types/deployment/unified';

/**
 * Initialize deployment steps with pending status
 */
function initializeSteps(steps: Omit<DeploymentStep, 'status'>[]): DeploymentStep[] {
  return steps.map((step) => ({ ...step, status: 'pending' as const }));
}

/**
 * Validate web deployment configuration
 */
function validateWebConfig(config: WebDeployConfig): boolean {
  if (config.database === 'byo' && !config.databaseUrl) {
    return false;
  }
  return true;
}

/**
 * Validate mobile deployment configuration
 */
function validateMobileConfig(config: MobileDeployConfig): boolean {
  if (!config.bundleId.trim()) {
    return false;
  }

  // Validate bundle ID format
  const bundleIdRegex = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/i;
  if (config.bundleId && !bundleIdRegex.test(config.bundleId)) {
    return false;
  }

  // Validate version format (semver: x.y.z)
  const versionRegex = /^\d+\.\d+\.\d+$/;
  if (!versionRegex.test(config.version)) {
    return false;
  }

  return true;
}

/**
 * Validate desktop deployment configuration
 */
function validateDesktopConfig(config: DesktopDeployConfig): boolean {
  if (!config.appId.trim()) {
    return false;
  }

  if (config.platforms.length === 0) {
    return false;
  }

  // Validate version format
  const versionRegex = /^\d+\.\d+\.\d+$/;
  if (!versionRegex.test(config.version)) {
    return false;
  }

  return true;
}

/**
 * useUnifiedDeployment - Main deployment management hook
 */
export function useUnifiedDeployment(_projectId: string): UseUnifiedDeploymentReturn {
  // Configuration state
  const [webConfig, setWebConfig] = useState<WebDeployConfig>(DEFAULT_WEB_CONFIG);
  const [mobileConfig, setMobileConfig] = useState<MobileDeployConfig>(DEFAULT_MOBILE_CONFIG);
  const [desktopConfig, setDesktopConfig] = useState<DesktopDeployConfig>(DEFAULT_DESKTOP_CONFIG);

  // Deployment state
  const [progress, setProgress] = useState<DeploymentProgress>(DEFAULT_DEPLOYMENT_PROGRESS);
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Config updaters
  const updateWebConfig = useCallback((updates: Partial<WebDeployConfig>) => {
    setWebConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const updateMobileConfig = useCallback((updates: Partial<MobileDeployConfig>) => {
    setMobileConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const updateDesktopConfig = useCallback((updates: Partial<DesktopDeployConfig>) => {
    setDesktopConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  // Validation
  const isConfigValid = useCallback(
    (platform: DeploymentPlatform): boolean => {
      switch (platform) {
        case 'web':
          return validateWebConfig(webConfig);
        case 'ios':
        case 'android':
          return validateMobileConfig(mobileConfig);
        case 'windows':
        case 'macos':
        case 'linux':
          return validateDesktopConfig(desktopConfig);
        default:
          return false;
      }
    },
    [webConfig, mobileConfig, desktopConfig]
  );

  // Update a step's status
  const updateStepStatus = useCallback(
    (stepId: string, status: DeploymentStep['status'], message?: string, stepError?: string) => {
      setProgress((prev) => {
        return {
          ...prev,
          steps: prev.steps.map((step) =>
            step.id === stepId
              ? {
                  ...step,
                  status,
                  message,
                  error: stepError,
                  ...(status === 'in_progress' ? { startedAt: new Date().toISOString() } : {}),
                  ...(status === 'completed' || status === 'failed'
                    ? { completedAt: new Date().toISOString() }
                    : {}),
                }
              : step
          ),
          currentStep: status === 'in_progress' ? stepId : prev.currentStep,
        };
      });
    },
    []
  );

  // Calculate overall progress
  const calculateProgress = useCallback((steps: DeploymentStep[]): number => {
    if (steps.length === 0) return 0;
    const completed = steps.filter(
      (s) => s.status === 'completed' || s.status === 'skipped'
    ).length;
    return Math.round((completed / steps.length) * 100);
  }, []);

  // Start deployment
  const deploy = useCallback(
    async (platform: DeploymentPlatform) => {
      if (!isConfigValid(platform) || isDeploying) return;

      setIsDeploying(true);
      setError(null);

      // Initialize progress based on platform
      let steps: DeploymentStep[];
      switch (platform) {
        case 'web':
          steps = initializeSteps(WEB_DEPLOYMENT_STEPS);
          break;
        case 'ios':
        case 'android':
          steps = initializeSteps(MOBILE_DEPLOYMENT_STEPS);
          break;
        default:
          steps = initializeSteps(DESKTOP_DEPLOYMENT_STEPS);
      }

      setProgress({
        platform,
        status: 'configuring',
        steps,
        overallProgress: 0,
        startedAt: new Date().toISOString(),
      });

      try {
        let deploymentResult: { success: boolean; deploymentUrl?: string; error?: string };

        // Call the appropriate deployment API based on platform
        if (platform === 'web') {
          const response = await fetch('/api/deploy/web', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: _projectId,
              config: webConfig,
            }),
          });
          deploymentResult = await response.json();
        } else if (platform === 'ios' || platform === 'android') {
          const response = await fetch('/api/deploy/mobile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: _projectId,
              config: {
                ...mobileConfig,
                platform: platform === 'ios' ? 'ios' : 'android',
              },
            }),
          });
          deploymentResult = await response.json();
        } else {
          // Desktop platforms
          const response = await fetch('/api/deploy/desktop', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: _projectId,
              config: desktopConfig,
            }),
          });
          deploymentResult = await response.json();
        }

        if (!deploymentResult.success) {
          throw new Error(deploymentResult.error || 'Deployment failed');
        }

        // Mark all steps as completed
        setProgress((prev) => ({
          ...prev,
          status: 'completed',
          overallProgress: 100,
          completedAt: new Date().toISOString(),
          deploymentUrl: deploymentResult.deploymentUrl,
          steps: prev.steps.map((step) => ({ ...step, status: 'completed' as const })),
        }));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Deployment failed';
        setError(errorMessage);
        setProgress((prev) => ({
          ...prev,
          status: 'failed',
          error: errorMessage,
          completedAt: new Date().toISOString(),
        }));
      } finally {
        setIsDeploying(false);
      }
    },
    [_projectId, isConfigValid, isDeploying, webConfig, mobileConfig, desktopConfig]
  );

  // Cancel deployment
  const cancel = useCallback(() => {
    // TODO: Implement actual cancellation logic
    setIsDeploying(false);
    setError('Deployment cancelled by user');
    setProgress((prev) => {
      return {
        ...prev,
        status: 'failed',
        error: 'Deployment cancelled by user',
        completedAt: new Date().toISOString(),
      };
    });
  }, []);

  // Reset deployment
  const reset = useCallback(() => {
    setProgress(DEFAULT_DEPLOYMENT_PROGRESS);
    setIsDeploying(false);
    setError(null);
  }, []);

  return {
    // Configs
    webConfig,
    updateWebConfig,
    mobileConfig,
    updateMobileConfig,
    desktopConfig,
    updateDesktopConfig,

    // Deployment
    progress,
    isDeploying,
    error,
    deploy,
    cancel,
    reset,

    // Validation
    isConfigValid,
  };
}
