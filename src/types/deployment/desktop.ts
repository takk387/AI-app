/**
 * Desktop Deployment Types
 *
 * Type definitions for desktop deployment via Tauri.
 */

// ============================================================================
// TAURI CONFIGURATION TYPES
// ============================================================================

/**
 * Tauri target platform
 */
export type TauriPlatform = 'windows' | 'macos' | 'linux';

/**
 * Tauri target architecture
 */
export type TauriArch = 'x86_64' | 'aarch64' | 'i686' | 'armv7';

/**
 * Tauri build target
 */
export interface TauriBuildTarget {
  platform: TauriPlatform;
  arch: TauriArch;
}

/**
 * Window configuration
 */
export interface TauriWindowConfig {
  title: string;
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  resizable?: boolean;
  fullscreen?: boolean;
  focus?: boolean;
  transparent?: boolean;
  decorations?: boolean;
  alwaysOnTop?: boolean;
  visible?: boolean;
  center?: boolean;
  x?: number;
  y?: number;
  skipTaskbar?: boolean;
  fileDropEnabled?: boolean;
  url?: string;
}

/**
 * Bundle configuration
 */
export interface TauriBundleConfig {
  active?: boolean;
  targets?: ('all' | 'app' | 'dmg' | 'deb' | 'rpm' | 'appimage' | 'nsis' | 'msi' | 'wix')[];
  identifier: string;
  icon?: string[];
  resources?: string[];
  externalBin?: string[];
  copyright?: string;
  category?: string;
  shortDescription?: string;
  longDescription?: string;
  deb?: {
    depends?: string[];
    files?: Record<string, string>;
    desktopTemplate?: string;
  };
  macOS?: {
    frameworks?: string[];
    minimumSystemVersion?: string;
    exceptionDomain?: string;
    signingIdentity?: string;
    providerShortName?: string;
    entitlements?: string;
    license?: string;
  };
  windows?: {
    digestAlgorithm?: string;
    certificateThumbprint?: string;
    timestampUrl?: string;
    webviewInstallMode?: {
      type:
        | 'downloadBootstrapper'
        | 'embedBootstrapper'
        | 'offlineInstaller'
        | 'fixedRuntime'
        | 'skip';
      path?: string;
    };
    allowDowngrades?: boolean;
    nsis?: {
      template?: string;
      license?: string;
      headerImage?: string;
      sidebarImage?: string;
      installerIcon?: string;
      installMode?: 'currentUser' | 'perMachine' | 'both';
      languages?: string[];
      displayLanguageSelector?: boolean;
    };
    wix?: {
      template?: string;
      language?: string | string[];
      license?: string;
      enableElevatedPrivilege?: boolean;
    };
  };
}

/**
 * Security configuration
 */
export interface TauriSecurityConfig {
  csp?: string | null;
  devCsp?: string | null;
  freezePrototype?: boolean;
  dangerousDisableAssetCspModification?: boolean | string[];
  assetProtocol?: {
    scope?: string[];
    enable?: boolean;
  };
}

/**
 * Build configuration
 */
export interface TauriBuildConfig {
  devPath?: string;
  distDir?: string;
  beforeDevCommand?: string;
  beforeBuildCommand?: string;
  beforeBundleCommand?: string;
  features?: string[];
  withGlobalTauri?: boolean;
}

/**
 * Tauri configuration (tauri.conf.json)
 */
export interface TauriConfig {
  $schema?: string;
  productName?: string;
  version?: string;
  identifier?: string;
  build?: TauriBuildConfig;
  bundle?: TauriBundleConfig;
  security?: TauriSecurityConfig;
  windows?: TauriWindowConfig[];
  plugins?: Record<string, unknown>;
}

// ============================================================================
// BUILD STATUS TYPES
// ============================================================================

/**
 * Build status
 */
export type TauriBuildStatus =
  | 'queued'
  | 'preparing'
  | 'building'
  | 'packaging'
  | 'signing'
  | 'uploading'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Build artifact type
 */
export type TauriArtifactType =
  | 'msi'
  | 'exe'
  | 'nsis'
  | 'wix'
  | 'dmg'
  | 'app'
  | 'pkg'
  | 'appimage'
  | 'deb'
  | 'rpm';

/**
 * Build artifact
 */
export interface TauriBuildArtifact {
  type: TauriArtifactType;
  platform: TauriPlatform;
  arch: TauriArch;
  filename: string;
  size: number;
  downloadUrl: string;
  sha256?: string;
  createdAt: string;
}

/**
 * Build result
 */
export interface TauriBuildResult {
  id: string;
  status: TauriBuildStatus;
  platform: TauriPlatform;
  arch: TauriArch;
  version: string;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  artifacts: TauriBuildArtifact[];
  error?: {
    message: string;
    code?: string;
    logs?: string;
  };
}

// ============================================================================
// CODE SIGNING TYPES
// ============================================================================

/**
 * Code signing certificate type
 */
export type SigningCertificateType =
  | 'windows-authenticode'
  | 'macos-developer-id'
  | 'macos-distribution';

/**
 * Code signing certificate
 */
export interface SigningCertificate {
  id: string;
  name: string;
  type: SigningCertificateType;
  platform: TauriPlatform;
  expiresAt: string;
  isValid: boolean;
}

/**
 * Signing configuration
 */
export interface SigningConfig {
  enabled: boolean;
  certificateId?: string;
  timestampUrl?: string;
  notarize?: boolean; // macOS only
}

// ============================================================================
// AUTO-UPDATE TYPES
// ============================================================================

/**
 * Update endpoint configuration
 */
export interface UpdateEndpointConfig {
  url: string;
  pubkey: string;
}

/**
 * Update manifest
 */
export interface UpdateManifest {
  version: string;
  notes?: string;
  pubDate: string;
  platforms: {
    [key: string]: {
      url: string;
      signature: string;
    };
  };
}

// ============================================================================
// SERVICE TYPES
// ============================================================================

/**
 * Desktop build request
 */
export interface DesktopBuildRequest {
  projectId: string;
  platforms: TauriPlatform[];
  appId: string;
  appName: string;
  version: string;
  windowsFormat?: 'msi' | 'exe' | 'portable';
  macosFormat?: 'dmg' | 'app' | 'pkg';
  linuxFormat?: 'appimage' | 'deb' | 'rpm';
  signing?: SigningConfig;
  autoUpdate?: boolean;
  environmentVars?: Record<string, string>;
}

/**
 * Desktop build response
 */
export interface DesktopBuildResponse {
  success: boolean;
  buildId?: string;
  builds?: {
    windows?: TauriBuildResult;
    macos?: TauriBuildResult;
    linux?: TauriBuildResult;
  };
  error?: string;
}

/**
 * Desktop build status
 */
export interface DesktopBuildStatus {
  buildId: string;
  overallStatus: TauriBuildStatus;
  platforms: {
    [platform in TauriPlatform]?: {
      status: TauriBuildStatus;
      progress?: number;
      artifacts?: TauriBuildArtifact[];
      error?: string;
    };
  };
  startedAt: string;
  completedAt?: string;
  estimatedCompletion?: string;
}

/**
 * Generated Tauri config result
 */
export interface GenerateTauriConfigResult {
  success: boolean;
  config?: TauriConfig;
  cargoToml?: string;
  error?: string;
}

/**
 * Tauri project initialization request
 */
export interface InitTauriProjectRequest {
  projectId: string;
  appId: string;
  appName: string;
  version: string;
  description?: string;
  window?: Partial<TauriWindowConfig>;
}

/**
 * Tauri project initialization result
 */
export interface InitTauriProjectResult {
  success: boolean;
  tauriConfig?: TauriConfig;
  error?: string;
}
