/**
 * Compressed full-stack app rules
 * Fix 4: Converted to function with conditional rules based on app type
 */

export type AppType = 'FRONTEND_ONLY' | 'FULL_STACK';

const BASE_RULES = `
FULL-STACK APPS (Next.js App Router):

SANDBOX VS LOCAL:
- Sandbox (Preview): RUNS CLIENT-SIDE ONLY. No file system, no database, no API routes.
- Local Dev: RUNS FULL STACK. Database, API routes, Auth, File System.

PREVIEW COMPATIBILITY (CRITICAL):
- Main entry (page.tsx) MUST use 'use client' and be simple UI.
- Use mock data for preview; connect real API calls only in useEffect.
- NO async Server Components in page.tsx (causes preview crash).
- NO Next.js-specific components: <Link>, <Image>, useRouter, next/font.
- Use <a> for navigation, <img> for images, regular React hooks.

FILE STRUCTURE:
===FILE:app/page.tsx=== (with 'use client' and mock data)
===FILE:app/api/[endpoint]/route.ts=== (API handlers)
===FILE:prisma/schema.prisma=== (DB schema)
===FILE:lib/db.ts=== (Prisma client)
===FILE:.env.example=== (Environment template)

BACKEND CAPABILITIES:
- Database: Prisma (PostgreSQL, MySQL, MongoDB, SQLite)
- Auth: NextAuth.js, JWT, protected routes
- API Routes: RESTful, validation (Zod), error handling
- File Uploads: Local or cloud (S3, Cloudinary)
- Real-time: Pusher, server-sent events
- Email: Nodemailer/Resend

Preview shows mock data; full features available locally.
`.trim();

const FULLSTACK_PRODUCTION_RULES = `

## Full-Stack Production Patterns (Local Dev Required)

PRODUCTION CODE PATTERNS:
- USE Next.js Link component for navigation (local dev)
- USE Next.js Image component for optimized images (local dev)
- USE Server Components for data fetching where appropriate
- USE proper async/await patterns in API routes
- GENERATE real database queries, not mock data
- INCLUDE proper error boundaries and loading states

API ROUTE REQUIREMENTS:
- Every API route MUST have proper error handling (try/catch)
- Every API route MUST validate input with Zod
- Protected routes MUST check authentication first
- Return appropriate HTTP status codes (200, 201, 400, 401, 404, 500)

DATABASE PATTERNS:
- Use Prisma transactions for related operations
- Include proper indexes in schema for query performance
- Handle unique constraint violations gracefully
- Use soft deletes where appropriate (deletedAt field)

AUTH INTEGRATION:
- All protected API routes call requireAuthAPI() at start
- Frontend checks session before showing protected content
- Handle token refresh and session expiry gracefully

NOTE: This full-stack app requires local development. Preview will show:
"This full-stack app requires local setup. Run 'npm install && npx prisma migrate dev && npm run dev' to test."
`.trim();

/**
 * Get fullstack rules based on app type (Fix 4)
 *
 * @param appType - Whether this is a frontend-only or full-stack app
 * @returns Appropriate rules for the app type
 */
export function getFullstackRules(appType: AppType = 'FRONTEND_ONLY'): string {
  if (appType === 'FULL_STACK') {
    return `${BASE_RULES}\n\n${FULLSTACK_PRODUCTION_RULES}`;
  }

  // FRONTEND_ONLY — no fullstack rules needed
  return '';
}

/**
 * @deprecated Use getFullstackRules(appType) instead
 * Kept for backward compatibility
 */
export const FULLSTACK_RULES_COMPRESSED = BASE_RULES;
