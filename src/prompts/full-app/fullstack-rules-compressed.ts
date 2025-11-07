/**
 * Compressed full-stack app rules
 * Reduced from ~600 tokens to ~253 tokens (58% reduction)
 */

export const FULLSTACK_RULES_COMPRESSED = `
FULL-STACK APPS (Next.js App Router):

PREVIEW COMPATIBILITY:
- Add 'use client' directive to page.tsx for preview
- NO async Server Components in preview (causes errors)
- NO Next.js-specific components: <Link>, <Image>, useRouter, next/font
- Use <a> for navigation, <img> for images, regular React hooks
- Use useEffect + mock data for preview, commented fetch() for local dev

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
