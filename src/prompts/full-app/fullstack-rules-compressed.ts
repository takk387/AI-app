/**
 * Compressed full-stack app rules
 * Fix 4: Converted to function with conditional rules based on app type
 */

export type AppType = 'FRONTEND_ONLY' | 'FULL_STACK';

const BASE_RULES = `
FULL-STACK APPS (Next.js App Router):

RUNTIME: WebContainers — real Node.js runs in the browser.
API routes, npm install, and Next.js dev server all work in preview.
Generate REAL working code, not mock data.

FILE STRUCTURE (Next.js App Router):
===FILE:app/page.tsx=== (main page — can be Server or Client Component)
===FILE:app/layout.tsx=== (root layout with metadata, fonts, ErrorBoundary)
===FILE:app/api/[endpoint]/route.ts=== (API route handlers)
===FILE:lib/db.ts=== (database client — Prisma or in-memory for preview)
===FILE:app/globals.css=== (Tailwind + custom styles)
===FILE:.env.example=== (environment template if needed)

IMPORTANT:
- Use Next.js Link, Image, useRouter — they work in WebContainers
- Server Components work — use async data fetching where appropriate
- API routes work — pages should fetch from /api/ endpoints, not use mock data
- For database: use SQLite with Prisma (works in WebContainers, no external DB needed)
- If no database needed, use in-memory arrays in API routes

BACKEND CAPABILITIES:
- Database: Prisma with SQLite (preview-compatible) or PostgreSQL (production)
- Auth: NextAuth.js, JWT, protected routes
- API Routes: RESTful, validation (Zod), error handling
- File Uploads: Local filesystem in preview
- Real-time: Server-sent events
`.trim();

const FULLSTACK_PRODUCTION_RULES = `

## Full-Stack Production Patterns

PRODUCTION CODE PATTERNS:
- USE Next.js Link for navigation, Image for optimized images
- USE Server Components for data fetching where appropriate
- USE proper async/await patterns in API routes
- GENERATE real database queries with Prisma
- INCLUDE proper error boundaries and loading states

API ROUTE REQUIREMENTS:
- Every API route MUST have proper error handling (try/catch)
- Every API route MUST validate input with Zod
- Protected routes MUST check authentication first
- Return appropriate HTTP status codes (200, 201, 400, 401, 404, 500)

DATABASE PATTERNS:
- Use Prisma with SQLite for preview compatibility (file-based, no external server)
- Include proper indexes in schema for query performance
- Handle unique constraint violations gracefully

AUTH INTEGRATION:
- All protected API routes call requireAuthAPI() at start
- Frontend checks session before showing protected content
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
