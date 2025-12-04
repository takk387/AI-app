import { createClient as createBrowserClient } from './client';

/**
 * Storage utility for managing files in Supabase Storage
 * Supports user uploads, generated apps, and app assets
 * Note: All functions use the browser client for client-side operations
 */

// Storage bucket names
export const STORAGE_BUCKETS = {
  USER_UPLOADS: 'user-uploads',
  GENERATED_APPS: 'generated-apps',
  APP_ASSETS: 'app-assets',
} as const;

/**
 * Upload a file to a storage bucket (client-side)
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: File,
  options?: {
    cacheControl?: string;
    contentType?: string;
    upsert?: boolean;
  }
) {
  const supabase = createBrowserClient();

  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: options?.cacheControl || '3600',
    contentType: options?.contentType || file.type,
    upsert: options?.upsert || false,
  });

  if (error) {
    console.error('Upload error:', error);
    throw error;
  }

  return data;
}

/**
 * Download a file from storage
 */
export async function downloadFile(bucket: string, path: string) {
  const supabase = createBrowserClient();

  const { data, error } = await supabase.storage.from(bucket).download(path);

  if (error) {
    console.error('Download error:', error);
    throw error;
  }

  return data;
}

/**
 * Get a public URL for a file
 */
export function getPublicUrl(bucket: string, path: string) {
  const supabase = createBrowserClient();

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);

  return data.publicUrl;
}

/**
 * Create a signed URL for private file access
 */
export async function createSignedUrl(bucket: string, path: string, expiresIn: number = 3600) {
  const supabase = createBrowserClient();

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);

  if (error) {
    console.error('Signed URL error:', error);
    throw error;
  }

  return data.signedUrl;
}

/**
 * Delete a file from storage
 */
export async function deleteFile(bucket: string, paths: string[]) {
  const supabase = createBrowserClient();

  const { data, error } = await supabase.storage.from(bucket).remove(paths);

  if (error) {
    console.error('Delete error:', error);
    throw error;
  }

  return data;
}

/**
 * List files in a bucket
 */
export async function listFiles(
  bucket: string,
  path: string = '',
  options?: {
    limit?: number;
    offset?: number;
    sortBy?: { column: string; order: 'asc' | 'desc' };
  }
) {
  const supabase = createBrowserClient();

  const { data, error } = await supabase.storage.from(bucket).list(path, {
    limit: options?.limit || 100,
    offset: options?.offset || 0,
    sortBy: options?.sortBy || { column: 'name', order: 'asc' },
  });

  if (error) {
    console.error('List files error:', error);
    throw error;
  }

  return data;
}

/**
 * Move/rename a file
 */
export async function moveFile(bucket: string, fromPath: string, toPath: string) {
  const supabase = createBrowserClient();

  const { data, error } = await supabase.storage.from(bucket).move(fromPath, toPath);

  if (error) {
    console.error('Move file error:', error);
    throw error;
  }

  return data;
}

/**
 * Copy a file
 */
export async function copyFile(bucket: string, fromPath: string, toPath: string) {
  const supabase = createBrowserClient();

  const { data, error } = await supabase.storage.from(bucket).copy(fromPath, toPath);

  if (error) {
    console.error('Copy file error:', error);
    throw error;
  }

  return data;
}
