/**
 * Hash Utilities - Cross-environment hashing functions
 * Works in both Node.js and browser environments
 */

/**
 * Generate a simple hash string from content
 * Uses djb2 algorithm - fast and produces good distribution
 * Works in both browser and Node.js
 */
export function simpleHash(content: string): string {
  let hash = 5381;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) + hash) ^ char;
  }
  // Convert to positive hex string
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Generate a content hash for change detection
 * Returns a 16-character hex string
 */
export function contentHash(content: string): string {
  // Use multiple hash seeds for better collision resistance
  const hash1 = simpleHash(content);
  const hash2 = simpleHash(content.split('').reverse().join(''));
  return hash1 + hash2;
}

/**
 * Check if running in Node.js environment
 */
export function isNodeEnvironment(): boolean {
  return (
    typeof process !== 'undefined' && process.versions != null && process.versions.node != null
  );
}

/**
 * Generate SHA-256 hash if in Node.js, fallback to simple hash in browser
 * Returns a 16-character hex string
 */
export async function secureHash(content: string): Promise<string> {
  // Try Node.js crypto first
  if (isNodeEnvironment()) {
    try {
      const { createHash } = await import('crypto');
      return createHash('sha256').update(content).digest('hex').substring(0, 16);
    } catch {
      // Fallback if crypto not available
    }
  }

  // Try Web Crypto API (available in modern browsers and Node 15+)
  if (typeof globalThis.crypto?.subtle !== 'undefined') {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(content);
      const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
        .substring(0, 16);
    } catch {
      // Fallback if Web Crypto fails
    }
  }

  // Final fallback to simple hash
  return contentHash(content);
}

/**
 * Synchronous hash function for use where async is not possible
 * Uses simple hash algorithm, works everywhere
 */
export function hashSync(content: string): string {
  return contentHash(content);
}
