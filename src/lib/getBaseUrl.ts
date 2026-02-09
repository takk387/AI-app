/**
 * Returns the base URL for this application.
 *
 * Use this for all internal API calls (e.g., fetch(`${getBaseUrl()}/api/...`)).
 * This app deploys to Railway — do NOT use VERCEL_URL here.
 * VERCEL_URL is only relevant for user-facing Vercel integration features.
 */
export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  return 'http://localhost:3000';
}
