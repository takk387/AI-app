/**
 * Mobile Deployment Types
 *
 * Type definitions for iOS and Android deployment via Capacitor and EAS Build.
 */

// ============================================================================
// CAPACITOR TYPES
// ============================================================================

/**
 * Capacitor platform
 */
export type CapacitorPlatform = 'ios' | 'android';

/**
 * Capacitor configuration
 */
export interface CapacitorConfig {
  appId: string;
  appName: string;
  webDir: string;
  server?: {
    url?: string;
    cleartext?: boolean;
    androidScheme?: string;
    iosScheme?: string;
  };
  plugins?: Record<string, unknown>;
  ios?: {
    scheme?: string;
    contentInset?: 'automatic' | 'always' | 'never' | 'scrollableAxes';
    allowsLinkPreview?: boolean;
    scrollEnabled?: boolean;
    preferredContentMode?: 'mobile' | 'desktop' | 'recommended';
  };
  android?: {
    allowMixedContent?: boolean;
    captureInput?: boolean;
    webContentsDebuggingEnabled?: boolean;
    loggingBehavior?: 'none' | 'debug' | 'production';
    overrideUserAgent?: string;
    appendUserAgent?: string;
    backgroundColor?: string;
  };
}

/**
 * Capacitor sync result
 */
export interface CapacitorSyncResult {
  success: boolean;
  platform: CapacitorPlatform;
  errors?: string[];
  warnings?: string[];
}

// ============================================================================
// EAS BUILD TYPES
// ============================================================================

/**
 * EAS build profile type
 */
export type EASBuildProfile = 'development' | 'preview' | 'production';

/**
 * EAS build platform
 */
export type EASBuildPlatform = 'ios' | 'android' | 'all';

/**
 * EAS build status
 */
export type EASBuildStatus =
  | 'new'
  | 'in_queue'
  | 'in_progress'
  | 'pending_cancel'
  | 'canceled'
  | 'finished'
  | 'errored';

/**
 * iOS distribution type
 */
export type IOSDistribution = 'store' | 'internal' | 'ad-hoc' | 'development' | 'simulator';

/**
 * Android build type
 */
export type AndroidBuildType = 'apk' | 'aab' | 'app-bundle';

/**
 * EAS build profile configuration
 */
export interface EASBuildProfileConfig {
  distribution?: IOSDistribution;
  channel?: string;
  developmentClient?: boolean;
  ios?: {
    simulator?: boolean;
    enterpriseProvisioning?: 'universal' | 'adhoc';
    autoIncrement?: boolean | 'version' | 'buildNumber';
    image?: string;
    resourceClass?: 'default' | 'medium' | 'large' | 'intel-medium';
  };
  android?: {
    buildType?: AndroidBuildType;
    gradleCommand?: string;
    autoIncrement?: boolean | 'version' | 'versionCode';
    image?: string;
    resourceClass?: 'default' | 'medium' | 'large';
  };
  env?: Record<string, string>;
  cache?: {
    disabled?: boolean;
    key?: string;
    customPaths?: string[];
  };
}

/**
 * EAS configuration (eas.json)
 */
export interface EASConfig {
  cli?: {
    version?: string;
    requireCommit?: boolean;
  };
  build?: {
    development?: EASBuildProfileConfig;
    preview?: EASBuildProfileConfig;
    production?: EASBuildProfileConfig;
    [profile: string]: EASBuildProfileConfig | undefined;
  };
  submit?: {
    production?: {
      ios?: {
        appleId?: string;
        ascAppId?: string;
        appleTeamId?: string;
      };
      android?: {
        serviceAccountKeyPath?: string;
        track?: 'production' | 'beta' | 'alpha' | 'internal';
        releaseStatus?: 'draft' | 'completed' | 'halted' | 'inProgress';
      };
    };
  };
}

/**
 * EAS build artifact
 */
export interface EASBuildArtifact {
  buildUrl?: string;
  logsUrl?: string;
}

/**
 * EAS build result
 */
export interface EASBuild {
  id: string;
  status: EASBuildStatus;
  platform: EASBuildPlatform;
  profile: EASBuildProfile;
  distribution?: IOSDistribution;
  sdkVersion?: string;
  appVersion?: string;
  appBuildVersion?: string;
  runtimeVersion?: string;
  gitCommitHash?: string;
  gitCommitMessage?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  expirationDate?: string;
  artifacts?: EASBuildArtifact;
  error?: {
    message: string;
    errorCode: string;
  };
  metrics?: {
    buildDuration?: number;
    buildWaitTime?: number;
  };
}

/**
 * EAS build request
 */
export interface EASBuildRequest {
  platform: EASBuildPlatform;
  profile: EASBuildProfile;
  message?: string;
  clearCache?: boolean;
  autoSubmit?: boolean;
}

// ============================================================================
// APP STORE CONNECT TYPES
// ============================================================================

/**
 * iOS app info
 */
export interface IOSAppInfo {
  bundleId: string;
  name: string;
  version: string;
  buildNumber: string;
  minimumOSVersion: string;
  teamId?: string;
  appStoreConnectApiKeyId?: string;
}

/**
 * TestFlight build
 */
export interface TestFlightBuild {
  id: string;
  version: string;
  buildNumber: string;
  processingState: 'PROCESSING' | 'FAILED' | 'INVALID' | 'VALID';
  uploadedDate: string;
  expirationDate?: string;
  usesNonExemptEncryption?: boolean;
}

// ============================================================================
// GOOGLE PLAY TYPES
// ============================================================================

/**
 * Android app info
 */
export interface AndroidAppInfo {
  packageName: string;
  name: string;
  versionCode: number;
  versionName: string;
  minSdkVersion: number;
  targetSdkVersion: number;
}

/**
 * Play Store track
 */
export type PlayStoreTrack = 'internal' | 'alpha' | 'beta' | 'production';

/**
 * Play Store release status
 */
export type PlayStoreReleaseStatus = 'draft' | 'completed' | 'halted' | 'inProgress';

/**
 * Play Store release
 */
export interface PlayStoreRelease {
  name: string;
  versionCodes: number[];
  status: PlayStoreReleaseStatus;
  userFraction?: number;
  releaseNotes?: {
    language: string;
    text: string;
  }[];
}

// ============================================================================
// SERVICE TYPES
// ============================================================================

/**
 * Mobile build request
 */
export interface MobileBuildRequest {
  projectId: string;
  platform: CapacitorPlatform | 'both';
  profile: EASBuildProfile;
  bundleId: string;
  appName: string;
  version: string;
  buildNumber?: string;
  environmentVars?: Record<string, string>;
}

/**
 * Mobile build result
 */
export interface MobileBuildResult {
  success: boolean;
  builds?: {
    ios?: EASBuild;
    android?: EASBuild;
  };
  error?: string;
}

/**
 * Mobile build status
 */
export interface MobileBuildStatus {
  ios?: {
    status: EASBuildStatus;
    buildId: string;
    downloadUrl?: string;
    error?: string;
  };
  android?: {
    status: EASBuildStatus;
    buildId: string;
    downloadUrl?: string;
    error?: string;
  };
  overallStatus: 'pending' | 'building' | 'completed' | 'failed';
}

/**
 * App submission request
 */
export interface AppSubmissionRequest {
  projectId: string;
  platform: CapacitorPlatform;
  buildId: string;
  releaseNotes?: string;
  track?: PlayStoreTrack;
}

/**
 * App submission result
 */
export interface AppSubmissionResult {
  success: boolean;
  submissionId?: string;
  error?: string;
}
