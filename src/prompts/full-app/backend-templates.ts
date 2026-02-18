/**
 * Backend Feature Templates for Full-Stack Code Generation
 *
 * These templates are conditionally included based on TechnicalRequirements flags.
 * They provide working implementations rather than just placeholder code.
 */

import type { TechnicalRequirements } from '@/types/appConcept';
import type { ArchitectureSpec } from '@/types/architectureSpec';

/**
 * NextAuth.js authentication template.
 * Included when needsAuth: true
 */
export const AUTH_TEMPLATE = `
### NextAuth.js Implementation

When authentication is required, include these files:

===FILE:app/api/auth/[...nextauth]/route.ts===
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';

// In production, replace with your database client
const users: { id: string; email: string; password: string; name: string }[] = [];

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = users.find((u) => u.email === credentials.email);
        if (!user) return null;

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };

===FILE:lib/auth.ts===
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

export async function requireAuth() {
  const session = await getServerSession();
  if (!session?.user) {
    redirect('/login');
  }
  return session;
}

export async function getOptionalSession() {
  return await getServerSession();
}

export async function requireAuthAPI() {
  const session = await getServerSession();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }
  return session;
}

===FILE:PROTECTED_API_ROUTE_EXAMPLE===
// IMPORTANT: Apply this pattern to ALL generated API routes when auth is enabled

import { requireAuthAPI } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const session = await requireAuthAPI(); // ← ALWAYS include this
    const userId = session.user.id;

    // ... your route logic here ...

    return NextResponse.json({ data: 'Protected data' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

### CRITICAL INSTRUCTION FOR AI:
When \`needsAuth: true\`, EVERY generated API route (except /api/auth/*) MUST:
1. Import requireAuthAPI from '@/lib/auth'
2. Call await requireAuthAPI() at the start of the handler
3. Handle the Unauthorized error with 401 response

===FILE:components/AuthProvider.tsx===
'use client';
import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

export function AuthProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

===FILE:components/LoginForm.tsx===
'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError('Invalid email or password');
    } else {
      router.push('/');
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
      {error && (
        <div className="bg-red-50 text-red-500 p-3 rounded" role="alert">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-1">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  );
}
`.trim();

/**
 * File upload template with S3/cloud storage.
 * Included when needsFileUpload: true
 */
export const FILE_UPLOAD_TEMPLATE = `
### File Upload Implementation

When file uploads are required, include these files:

===FILE:app/api/upload/route.ts===
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuid } from 'uuid';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF, PDF' },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size: 5MB' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const ext = file.name.split('.').pop();
    const filename = \`\${uuid()}.\${ext}\`;

    // Save to public/uploads (for demo - use cloud storage in production)
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, filename), buffer);

    return NextResponse.json({
      url: \`/uploads/\${filename}\`,
      filename,
      size: file.size,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

===FILE:components/FileUpload.tsx===
'use client';
import { useState, useCallback, useRef } from 'react';

interface FileUploadProps {
  onUpload: (url: string) => void;
  accept?: string;
  maxSize?: number;
}

export function FileUpload({
  onUpload,
  accept = 'image/*,.pdf',
  maxSize = 5 * 1024 * 1024,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (file.size > maxSize) {
        setError(\`File too large. Maximum size: \${Math.round(maxSize / 1024 / 1024)}MB\`);
        return;
      }

      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Upload failed');
        }

        const { url } = await res.json();
        onUpload(url);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload failed');
      } finally {
        setUploading(false);
      }
    },
    [maxSize, onUpload]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={\`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors \${
          dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }\`}
        role="button"
        tabIndex={0}
        aria-label="Upload file"
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
          disabled={uploading}
        />
        {uploading ? (
          <div className="text-gray-500">Uploading...</div>
        ) : (
          <div className="text-gray-500">
            <p>Click or drag file to upload</p>
            <p className="text-sm mt-1">Max size: {Math.round(maxSize / 1024 / 1024)}MB</p>
          </div>
        )}
      </div>
      {error && (
        <p className="text-red-500 text-sm mt-2" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
`.trim();

/**
 * Real-time features template using Server-Sent Events.
 * Included when needsRealtime: true
 */
export const REALTIME_TEMPLATE = `
### Real-time Implementation (Server-Sent Events)

When real-time updates are required, include these files:

===FILE:app/api/events/route.ts===
import { NextRequest } from 'next/server';

// Store for active connections (use Redis in production)
const clients = new Set<ReadableStreamDefaultController>();

export async function GET(request: NextRequest) {
  const stream = new ReadableStream({
    start(controller) {
      clients.add(controller);

      // Send initial connection message
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode('data: {"type":"connected"}\\n\\n'));

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clients.delete(controller);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

// Helper to broadcast to all clients
export function broadcast(data: object) {
  const encoder = new TextEncoder();
  const message = encoder.encode(\`data: \${JSON.stringify(data)}\\n\\n\`);
  clients.forEach((client) => {
    try {
      client.enqueue(message);
    } catch {
      clients.delete(client);
    }
  });
}

===FILE:hooks/useRealtime.ts===
'use client';
import { useEffect, useState, useCallback, useRef } from 'react';

interface UseRealtimeOptions {
  onMessage?: (data: unknown) => void;
  reconnectInterval?: number;
}

export function useRealtime<T = unknown>(
  endpoint: string = '/api/events',
  options: UseRealtimeOptions = {}
) {
  const { onMessage, reconnectInterval = 3000 } = options;
  const [data, setData] = useState<T | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(endpoint);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        setData(parsed as T);
        onMessage?.(parsed);
      } catch (e) {
        console.error('Failed to parse SSE message:', e);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      setError(new Error('Connection lost'));
      eventSource.close();

      // Attempt to reconnect
      setTimeout(connect, reconnectInterval);
    };
  }, [endpoint, onMessage, reconnectInterval]);

  useEffect(() => {
    connect();
    return () => {
      eventSourceRef.current?.close();
    };
  }, [connect]);

  return { data, isConnected, error };
}

// Usage example:
// const { data, isConnected } = useRealtime<Message[]>('/api/events', {
//   onMessage: (msg) => console.log('Received:', msg)
// });
`.trim();

/**
 * Database seed template for initial data.
 * Included when needsDatabase: true
 */
export const DATABASE_SEED_TEMPLATE = `
### Database Seed Data

When database is required, include seed data:

===FILE:prisma/seed.ts===
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clear existing data (be careful in production!)
  // await prisma.post.deleteMany();
  // await prisma.user.deleteMany();

  // Create sample data
  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      name: 'Demo User',
      // Add other fields as needed
    },
  });

  console.log('Created user:', user);

  // Add more seed data as needed for your models

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// Add to package.json:
// "prisma": {
//   "seed": "ts-node --compiler-options {\\"module\\":\\"CommonJS\\"} prisma/seed.ts"
// }
// Run with: npx prisma db seed
`.trim();

/**
 * Internationalization template using next-intl.
 * Included when needsI18n: true
 */
export const I18N_TEMPLATE = `
### next-intl Implementation

When internationalization is required, include these files:

===FILE:src/i18n/config.ts===
export const locales = ['en', 'es', 'fr'] as const;
export const defaultLocale = 'en' as const;
export type Locale = (typeof locales)[number];

===FILE:src/i18n/request.ts===
import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale } from './config';

export default getRequestConfig(async ({ locale }) => {
  if (!locales.includes(locale as any)) locale = defaultLocale;
  return {
    messages: (await import(\`../messages/\${locale}.json\`)).default,
  };
});

===FILE:messages/en.json===
{
  "common": {
    "welcome": "Welcome",
    "loading": "Loading...",
    "error": "Something went wrong",
    "retry": "Try Again",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "create": "Create",
    "search": "Search"
  },
  "nav": {
    "home": "Home",
    "about": "About",
    "contact": "Contact",
    "settings": "Settings"
  },
  "auth": {
    "login": "Log In",
    "logout": "Log Out",
    "signup": "Sign Up",
    "email": "Email",
    "password": "Password"
  }
}

===FILE:messages/es.json===
{
  "common": {
    "welcome": "Bienvenido",
    "loading": "Cargando...",
    "error": "Algo salió mal",
    "retry": "Intentar de nuevo",
    "save": "Guardar",
    "cancel": "Cancelar",
    "delete": "Eliminar",
    "edit": "Editar",
    "create": "Crear",
    "search": "Buscar"
  },
  "nav": {
    "home": "Inicio",
    "about": "Acerca de",
    "contact": "Contacto",
    "settings": "Configuración"
  },
  "auth": {
    "login": "Iniciar sesión",
    "logout": "Cerrar sesión",
    "signup": "Registrarse",
    "email": "Correo electrónico",
    "password": "Contraseña"
  }
}

===FILE:src/components/LanguageSwitcher.tsx===
'use client';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { locales } from '@/i18n/config';

const languageNames: Record<string, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
};

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleChange = (newLocale: string) => {
    const newPath = pathname.replace(\`/\${locale}\`, \`/\${newLocale}\`);
    router.push(newPath);
  };

  return (
    <select
      value={locale}
      onChange={(e) => handleChange(e.target.value)}
      className="border rounded px-2 py-1 bg-white dark:bg-slate-800"
      aria-label="Select language"
    >
      {locales.map((loc) => (
        <option key={loc} value={loc}>
          {languageNames[loc] || loc}
        </option>
      ))}
    </select>
  );
}

===FILE:src/i18n/middleware.ts===
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './config';

export default createMiddleware({
  locales,
  defaultLocale,
});

export const config = {
  matcher: ['/', '/(en|es|fr)/:path*'],
};

===DEPENDENCIES===
next-intl: ^3.0.0
`.trim();

/**
 * Get backend templates based on technical requirements.
 * Only includes templates for features that are actually needed.
 *
 * @param tech Technical requirements from AppConcept
 * @returns Concatenated templates for needed features, or empty string if none
 */
export function getBackendTemplates(tech: TechnicalRequirements): string {
  const templates: string[] = [];

  if (tech.needsAuth) {
    templates.push(AUTH_TEMPLATE);
  }

  if (tech.needsFileUpload) {
    templates.push(FILE_UPLOAD_TEMPLATE);
  }

  if (tech.needsRealtime) {
    templates.push(REALTIME_TEMPLATE);
  }

  if (tech.needsDatabase) {
    templates.push(DATABASE_SEED_TEMPLATE);
  }

  if (tech.needsI18n) {
    templates.push(I18N_TEMPLATE);
  }

  if (templates.length === 0) {
    return '';
  }

  return `
## BACKEND FEATURE IMPLEMENTATIONS

Use these exact patterns when implementing the required backend features:

${templates.join('\n\n---\n\n')}
`.trim();
}

/**
 * Get a minimal version of backend templates for token-constrained contexts.
 */
export function getBackendTemplatesMinimal(tech: TechnicalRequirements): string {
  const features: string[] = [];

  if (tech.needsAuth) {
    features.push(
      '- Auth: Use NextAuth.js with CredentialsProvider, create /api/auth/[...nextauth]/route.ts'
    );
  }

  if (tech.needsFileUpload) {
    features.push(
      '- Uploads: Create /api/upload route with file validation (type, size), return URL'
    );
  }

  if (tech.needsRealtime) {
    features.push('- Real-time: Use Server-Sent Events (SSE) with /api/events endpoint');
  }

  if (tech.needsDatabase) {
    features.push('- Database: Include prisma/seed.ts with sample data');
  }

  if (tech.needsI18n) {
    features.push(
      '- i18n: Use next-intl with locale config, messages JSON files, and LanguageSwitcher component'
    );
  }

  if (features.length === 0) {
    return '';
  }

  return `## Backend Features Required\n${features.join('\n')}`;
}

/**
 * Format ArchitectureSpec into comprehensive prompt instructions.
 * This replaces static templates with app-specific, AI-generated architecture.
 *
 * @param spec The architecture specification generated by BackendArchitectureAgent
 * @returns Formatted prompt section for backend implementation
 */
export function formatArchitectureSpec(spec: ArchitectureSpec): string {
  const sections: string[] = [];

  // Header with architecture overview
  sections.push(`## BACKEND ARCHITECTURE (AI-Generated for ${spec.appName})

**Generated:** ${new Date(spec.generatedAt).toLocaleDateString()}
**Architecture Summary:** ${spec.architectureReasoning.summary}
`);

  // Database section with full Prisma schema
  if (spec.database) {
    const tableDescriptions = spec.database.tables
      .map((t) => `  - ${t.name}: ${t.description} (${t.fields.length} fields)`)
      .join('\n');

    sections.push(`### Database Schema (Prisma)

**Strategy:** ${spec.database.strategy}
**Tables:**
${tableDescriptions}

\`\`\`prisma
${spec.database.prismaSchema}
\`\`\`

**Indexes for Performance:**
${spec.database.indexes.map((i) => `- ${i.name}: ${i.reason}`).join('\n')}

**CRITICAL:** Use this EXACT Prisma schema. Do not modify field names or types.
`);
  }

  // API routes section
  if (spec.api && spec.api.routes.length > 0) {
    const routeList = spec.api.routes
      .map((r) => {
        const authInfo = r.requiresAuth ? ` (Auth: ${r.requiredRoles?.join(', ') || 'any'})` : '';
        return `- ${r.method} ${r.path}: ${r.description}${authInfo}`;
      })
      .join('\n');

    sections.push(`### API Routes

**Style:** ${spec.api.style.toUpperCase()}

**Routes to Implement:**
${routeList}

**Error Handling:** ${spec.api.errorHandling.strategy}
${spec.api.errorHandling.customErrors.length > 0 ? `Custom errors: ${spec.api.errorHandling.customErrors.map((e) => e.code).join(', ')}` : ''}
`);
  }

  // Authentication section
  if (spec.auth) {
    const providers = spec.auth.providers
      .map((p) => `  - ${p.type}${p.provider ? `: ${p.provider}` : ''}`)
      .join('\n');

    const roles = spec.auth.rbac?.roles.map((r) => `  - ${r.name}: ${r.description}`).join('\n');

    sections.push(`### Authentication

**Strategy:** ${spec.auth.strategy}
**Session:** ${spec.auth.session.strategy} (max age: ${spec.auth.session.maxAge}s)

**Providers:**
${providers}

${
  spec.auth.rbac
    ? `**Role-Based Access Control:**
${roles}

**Permissions:**
${spec.auth.rbac.permissions.map((p) => `  - ${p.name}: ${p.actions.join(', ')} on ${p.resource}`).join('\n')}`
    : ''
}
`);
  }

  // Real-time section
  if (spec.realtime) {
    const channels = spec.realtime.channels
      .map(
        (c) => `  - ${c.name}: ${c.description} (events: ${c.events.map((e) => e.name).join(', ')})`
      )
      .join('\n');

    sections.push(`### Real-time Features

**Strategy:** ${spec.realtime.strategy}

**Channels:**
${channels}
`);
  }

  // Storage section
  if (spec.storage) {
    const buckets = spec.storage.buckets
      .map(
        (b) => `  - ${b.name}: ${b.description} (max: ${Math.round(b.maxFileSize / 1024 / 1024)}MB)`
      )
      .join('\n');

    sections.push(`### File Storage

**Strategy:** ${spec.storage.strategy}

**Buckets:**
${buckets}

**Validation:**
- Max file size: ${Math.round(spec.storage.validation.maxSize / 1024 / 1024)}MB
- Allowed types: ${spec.storage.validation.allowedTypes.join(', ')}
`);
  }

  // Caching section
  if (spec.caching) {
    const policies = spec.caching.policies.map((p) => `  - ${p.pattern}: TTL ${p.ttl}s`).join('\n');

    sections.push(`### Caching

**Strategy:** ${spec.caching.strategy}

**Policies:**
${policies}
`);
  }

  // Architecture decisions and reasoning
  if (spec.architectureReasoning.decisions.length > 0) {
    const decisions = spec.architectureReasoning.decisions
      .map((d) => `- **${d.area}:** ${d.decision}\n  _Reason: ${d.reasoning}_`)
      .join('\n');

    sections.push(`### Architecture Decisions

${decisions}
`);
  }

  // Scalability and security notes
  if (
    spec.architectureReasoning.scalabilityNotes.length > 0 ||
    spec.architectureReasoning.securityNotes.length > 0
  ) {
    sections.push(`### Production Considerations

**Scalability:**
${spec.architectureReasoning.scalabilityNotes.map((n) => `- ${n}`).join('\n')}

**Security:**
${spec.architectureReasoning.securityNotes.map((n) => `- ${n}`).join('\n')}
`);
  }

  // Final critical instructions
  sections.push(`---

**⚠️ CRITICAL IMPLEMENTATION RULES:**

1. **Use the EXACT Prisma schema above** - field names, types, and relations must match
2. **Implement ALL API routes listed** - each with proper error handling
3. **Follow the auth strategy specified** - including RBAC if defined
4. **This architecture is designed to scale** - do not simplify or remove features
5. **Database: ${spec.database?.strategy === 'sqlite' ? 'SQLite is used for development - schema is PostgreSQL-compatible for production migration' : spec.database?.strategy === 'supabase' ? 'Supabase (PostgreSQL) is the database - use Supabase client for queries' : 'PostgreSQL is the database - use Prisma for all database operations'}**

This architecture was specifically generated for "${spec.appName}" based on its features and requirements.
`);

  return sections.join('\n');
}
