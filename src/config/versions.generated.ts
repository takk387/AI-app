/**
 * AUTO-GENERATED - DO NOT EDIT
 * Generated: 2026-01-21T02:24:09.370Z
 * Source: package.json + curated-versions.ts
 *
 * Run 'npm run generate:versions' to regenerate
 */

// Project versions (from package.json)
export const PROJECT_VERSIONS = {
  "react": "^19.2.1",
  "react-dom": "^19.2.1",
  "next": "^15.5.9",
  "typescript": "^5.2.2",
  "tailwindcss": "^3.3.5",
  "autoprefixer": "^10.4.16",
  "postcss": "^8.4.31",
  "zod": "^4.1.13",
  "zustand": "^4.5.7",
  "immer": "^11.0.1"
} as const;

// Curated versions (for generated apps)
export const CURATED_VERSIONS = {
  "prisma": "^5.22.0",
  "@prisma/client": "^5.22.0",
  "next-auth": "^4.24.0",
  "@auth/core": "^0.35.0",
  "@trpc/server": "^10.45.0",
  "@trpc/client": "^10.45.0",
  "@trpc/react-query": "^10.45.0",
  "@tanstack/react-query": "^5.60.0",
  "stripe": "^17.3.0",
  "@stripe/stripe-js": "^4.9.0",
  "uploadthing": "^7.3.0",
  "@uploadthing/react": "^7.1.0",
  "resend": "^4.0.0",
  "nodemailer": "^6.9.15",
  "pusher": "^5.2.0",
  "pusher-js": "^8.4.0",
  "react-hook-form": "^7.54.0",
  "@hookform/resolvers": "^3.9.0",
  "@radix-ui/react-dialog": "^1.1.0",
  "@radix-ui/react-dropdown-menu": "^2.1.0",
  "lucide-react": "^0.465.0",
  "class-variance-authority": "^0.7.0",
  "clsx": "^2.1.1",
  "tailwind-merge": "^2.5.0"
} as const;

// Combined versions (project takes precedence)
export const VERSIONS = {
  "prisma": "^5.22.0",
  "@prisma/client": "^5.22.0",
  "next-auth": "^4.24.0",
  "@auth/core": "^0.35.0",
  "@trpc/server": "^10.45.0",
  "@trpc/client": "^10.45.0",
  "@trpc/react-query": "^10.45.0",
  "@tanstack/react-query": "^5.60.0",
  "stripe": "^17.3.0",
  "@stripe/stripe-js": "^4.9.0",
  "uploadthing": "^7.3.0",
  "@uploadthing/react": "^7.1.0",
  "resend": "^4.0.0",
  "nodemailer": "^6.9.15",
  "pusher": "^5.2.0",
  "pusher-js": "^8.4.0",
  "react-hook-form": "^7.54.0",
  "@hookform/resolvers": "^3.9.0",
  "@radix-ui/react-dialog": "^1.1.0",
  "@radix-ui/react-dropdown-menu": "^2.1.0",
  "lucide-react": "^0.465.0",
  "class-variance-authority": "^0.7.0",
  "clsx": "^2.1.1",
  "tailwind-merge": "^2.5.0",
  "react": "^19.2.1",
  "react-dom": "^19.2.1",
  "next": "^15.5.9",
  "typescript": "^5.2.2",
  "tailwindcss": "^3.3.5",
  "autoprefixer": "^10.4.16",
  "postcss": "^8.4.31",
  "zod": "^4.1.13",
  "zustand": "^4.5.7",
  "immer": "^11.0.1"
} as const;

// Type-safe version getter
export type VersionedPackage = keyof typeof VERSIONS;

export function getVersion(pkg: VersionedPackage): string {
  return VERSIONS[pkg];
}

// Version instructions for AI prompts
export const VERSION_INSTRUCTIONS = `
## DEPENDENCY VERSIONS
Use these EXACT versions in the ===DEPENDENCIES=== section:

**Core Framework:**
- react: ${VERSIONS.react}
- react-dom: ${VERSIONS['react-dom']}
- next: ${VERSIONS.next}
- typescript: ${VERSIONS.typescript}

**Styling:**
- tailwindcss: ${VERSIONS.tailwindcss}
- autoprefixer: ${VERSIONS.autoprefixer}
- postcss: ${VERSIONS.postcss}

**Database & Auth (if needed):**
- prisma: ${VERSIONS.prisma}
- @prisma/client: ${VERSIONS['@prisma/client']}
- next-auth: ${VERSIONS['next-auth']}

**Validation & State:**
- zod: ${VERSIONS.zod}
- zustand: ${VERSIONS.zustand}

**UI Components (if needed):**
- lucide-react: ${VERSIONS['lucide-react']}
- @radix-ui/react-dialog: ${VERSIONS['@radix-ui/react-dialog']}
- class-variance-authority: ${VERSIONS['class-variance-authority']}
- clsx: ${VERSIONS.clsx}
- tailwind-merge: ${VERSIONS['tailwind-merge']}

IMPORTANT: Always use these current versions. Never use outdated versions like react ^18.x or next ^14.x.
`.trim();
