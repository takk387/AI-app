/**
 * EnvironmentService
 *
 * Service for secure environment variable management.
 * Handles encryption, validation, and safe storage of sensitive configuration.
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Environment variable type
 */
export type EnvVarType = 'string' | 'number' | 'boolean' | 'json' | 'secret';

/**
 * Environment variable definition
 */
export interface EnvVarDefinition {
  key: string;
  value: string;
  type: EnvVarType;
  description?: string;
  required?: boolean;
  sensitive?: boolean;
}

/**
 * Encrypted environment variable
 */
export interface EncryptedEnvVar {
  key: string;
  encryptedValue: string;
  iv: string;
  type: EnvVarType;
  sensitive: boolean;
}

/**
 * Environment validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: { key: string; message: string }[];
  warnings: { key: string; message: string }[];
}

/**
 * Environment file format
 */
export type EnvFileFormat = 'dotenv' | 'json' | 'yaml';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Encryption algorithm
 */
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

/**
 * Auth tag length
 */
const AUTH_TAG_LENGTH = 16;

/**
 * Common sensitive key patterns
 */
const SENSITIVE_PATTERNS = [
  /^.*_KEY$/i,
  /^.*_SECRET$/i,
  /^.*_TOKEN$/i,
  /^.*_PASSWORD$/i,
  /^.*_CREDENTIAL$/i,
  /^.*_API_KEY$/i,
  /^DATABASE_URL$/i,
  /^.*_CONNECTION_STRING$/i,
  /^JWT_SECRET$/i,
  /^AUTH_.*/i,
];

/**
 * Required environment variables for common services
 */
const REQUIRED_ENV_VARS: Record<string, string[]> = {
  nextjs: ['NODE_ENV'],
  database: ['DATABASE_URL'],
  auth: ['NEXTAUTH_SECRET', 'NEXTAUTH_URL'],
  supabase: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
  stripe: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
};

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class EnvironmentService {
  private encryptionKey: Buffer;

  constructor(encryptionKey?: string) {
    const key = encryptionKey || process.env.CREDENTIALS_ENCRYPTION_KEY;

    if (!key) {
      // Generate a key for development (not secure for production)
      console.warn('No encryption key provided. Using generated key (not for production).');
      this.encryptionKey = randomBytes(32);
    } else {
      // Derive a 32-byte key from the provided key
      this.encryptionKey = createHash('sha256').update(key).digest();
    }
  }

  // --------------------------------------------------------------------------
  // PUBLIC API
  // --------------------------------------------------------------------------

  /**
   * Encrypt environment variables
   */
  encryptEnvVars(envVars: Record<string, string>): EncryptedEnvVar[] {
    return Object.entries(envVars).map(([key, value]) => {
      const sensitive = this.isSensitive(key);
      const type = this.inferType(value);

      if (sensitive) {
        const { encrypted, iv } = this.encrypt(value);
        return {
          key,
          encryptedValue: encrypted,
          iv,
          type,
          sensitive: true,
        };
      }

      return {
        key,
        encryptedValue: value, // Not encrypted for non-sensitive values
        iv: '',
        type,
        sensitive: false,
      };
    });
  }

  /**
   * Decrypt environment variables
   */
  decryptEnvVars(encryptedVars: EncryptedEnvVar[]): Record<string, string> {
    const result: Record<string, string> = {};

    for (const envVar of encryptedVars) {
      if (envVar.sensitive && envVar.iv) {
        result[envVar.key] = this.decrypt(envVar.encryptedValue, envVar.iv);
      } else {
        result[envVar.key] = envVar.encryptedValue;
      }
    }

    return result;
  }

  /**
   * Validate environment variables
   */
  validate(envVars: Record<string, string>, requiredServices?: string[]): ValidationResult {
    const errors: { key: string; message: string }[] = [];
    const warnings: { key: string; message: string }[] = [];

    // Check for required variables based on services
    if (requiredServices) {
      for (const service of requiredServices) {
        const required = REQUIRED_ENV_VARS[service] || [];
        for (const key of required) {
          if (!envVars[key]) {
            errors.push({
              key,
              message: `Required for ${service}: ${key} is missing`,
            });
          }
        }
      }
    }

    // Validate each variable
    for (const [key, value] of Object.entries(envVars)) {
      // Check for empty values
      if (value === '') {
        warnings.push({
          key,
          message: `${key} has an empty value`,
        });
      }

      // Check for placeholder values
      if (this.isPlaceholder(value)) {
        errors.push({
          key,
          message: `${key} appears to contain a placeholder value`,
        });
      }

      // Validate specific formats
      const formatError = this.validateFormat(key, value);
      if (formatError) {
        errors.push({ key, message: formatError });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Parse environment file content
   */
  parseEnvFile(content: string, format: EnvFileFormat = 'dotenv'): Record<string, string> {
    switch (format) {
      case 'dotenv':
        return this.parseDotEnv(content);
      case 'json':
        return this.parseJson(content);
      case 'yaml':
        return this.parseYaml(content);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Generate environment file content
   */
  generateEnvFile(envVars: Record<string, string>, format: EnvFileFormat = 'dotenv'): string {
    switch (format) {
      case 'dotenv':
        return this.generateDotEnv(envVars);
      case 'json':
        return JSON.stringify(envVars, null, 2);
      case 'yaml':
        return this.generateYaml(envVars);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Merge environment variables with defaults
   */
  mergeWithDefaults(
    envVars: Record<string, string>,
    defaults: Record<string, string>
  ): Record<string, string> {
    return { ...defaults, ...envVars };
  }

  /**
   * Get environment variables for a specific environment
   */
  getEnvForEnvironment(
    baseEnv: Record<string, string>,
    environment: 'development' | 'preview' | 'production'
  ): Record<string, string> {
    const result = { ...baseEnv };

    // Set NODE_ENV
    result.NODE_ENV = environment === 'development' ? 'development' : 'production';

    // Remove development-only variables in production
    if (environment === 'production') {
      delete result.DEBUG;
      delete result.VERBOSE;
    }

    return result;
  }

  /**
   * Check if a key is sensitive
   */
  isSensitive(key: string): boolean {
    return SENSITIVE_PATTERNS.some((pattern) => pattern.test(key));
  }

  /**
   * Mask sensitive value for display
   */
  maskValue(value: string, showChars: number = 4): string {
    if (value.length <= showChars * 2) {
      return '•'.repeat(value.length);
    }

    const start = value.substring(0, showChars);
    const end = value.substring(value.length - showChars);
    const middle = '•'.repeat(Math.min(value.length - showChars * 2, 20));

    return `${start}${middle}${end}`;
  }

  // --------------------------------------------------------------------------
  // PRIVATE METHODS
  // --------------------------------------------------------------------------

  private encrypt(value: string): { encrypted: string; iv: string } {
    const iv = randomBytes(16);
    const cipher = createCipheriv(ENCRYPTION_ALGORITHM, this.encryptionKey, iv);

    let encrypted = cipher.update(value, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    // Combine encrypted data and auth tag
    const combined = Buffer.concat([Buffer.from(encrypted, 'base64'), authTag]).toString('base64');

    return {
      encrypted: combined,
      iv: iv.toString('base64'),
    };
  }

  private decrypt(encryptedValue: string, ivString: string): string {
    const iv = Buffer.from(ivString, 'base64');
    const combined = Buffer.from(encryptedValue, 'base64');

    // Extract encrypted data and auth tag
    const encrypted = combined.subarray(0, combined.length - AUTH_TAG_LENGTH);
    const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH);

    const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted.toString('base64'), 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  private inferType(value: string): EnvVarType {
    // Check for boolean
    if (value === 'true' || value === 'false') {
      return 'boolean';
    }

    // Check for number
    if (/^-?\d+(\.\d+)?$/.test(value)) {
      return 'number';
    }

    // Check for JSON
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === 'object') {
        return 'json';
      }
    } catch {
      // Not JSON
    }

    return 'string';
  }

  private isPlaceholder(value: string): boolean {
    const placeholderPatterns = [
      /^your[_-]?/i,
      /^xxx+$/i,
      /^placeholder$/i,
      /^<.*>$/,
      /^\[.*\]$/,
      /^change[_-]?me$/i,
      /^TODO/i,
    ];

    return placeholderPatterns.some((pattern) => pattern.test(value));
  }

  private validateFormat(key: string, value: string): string | null {
    // URL validation
    if (key.includes('URL') || key.includes('URI')) {
      try {
        new URL(value);
      } catch {
        return `${key} is not a valid URL`;
      }
    }

    // Port validation
    if (key.includes('PORT')) {
      const port = parseInt(value, 10);
      if (isNaN(port) || port < 1 || port > 65535) {
        return `${key} is not a valid port number`;
      }
    }

    return null;
  }

  private parseDotEnv(content: string): Record<string, string> {
    const result: Record<string, string> = {};
    const lines = content.split('\n');

    for (const line of lines) {
      // Skip comments and empty lines
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      // Parse key=value
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;

      const key = trimmed.substring(0, eqIndex).trim();
      let value = trimmed.substring(eqIndex + 1).trim();

      // Remove quotes
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      result[key] = value;
    }

    return result;
  }

  private parseJson(content: string): Record<string, string> {
    const parsed = JSON.parse(content);
    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(parsed)) {
      result[key] = typeof value === 'string' ? value : JSON.stringify(value);
    }

    return result;
  }

  private parseYaml(content: string): Record<string, string> {
    // Simple YAML parser for flat key-value pairs
    const result: Record<string, string> = {};
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) continue;

      const key = trimmed.substring(0, colonIndex).trim();
      let value = trimmed.substring(colonIndex + 1).trim();

      // Remove quotes
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      result[key] = value;
    }

    return result;
  }

  private generateDotEnv(envVars: Record<string, string>): string {
    return Object.entries(envVars)
      .map(([key, value]) => {
        // Quote values with special characters
        if (value.includes(' ') || value.includes('=') || value.includes('#')) {
          return `${key}="${value}"`;
        }
        return `${key}=${value}`;
      })
      .join('\n');
  }

  private generateYaml(envVars: Record<string, string>): string {
    return Object.entries(envVars)
      .map(([key, value]) => {
        // Quote values with special characters
        if (value.includes(':') || value.includes('#') || value.includes("'")) {
          return `${key}: "${value}"`;
        }
        return `${key}: ${value}`;
      })
      .join('\n');
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let environmentServiceInstance: EnvironmentService | null = null;

/**
 * Get or create the environment service instance
 */
export function getEnvironmentService(encryptionKey?: string): EnvironmentService {
  if (!environmentServiceInstance) {
    environmentServiceInstance = new EnvironmentService(encryptionKey);
  }
  return environmentServiceInstance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetEnvironmentService(): void {
  environmentServiceInstance = null;
}
