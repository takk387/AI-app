/**
 * Backend Feature Templates for Full-Stack Code Generation
 *
 * These templates are conditionally included based on TechnicalRequirements flags.
 * They provide working implementations rather than just placeholder code.
 */

import type { TechnicalRequirements } from '@/types/appConcept';

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

  if (features.length === 0) {
    return '';
  }

  return `## Backend Features Required\n${features.join('\n')}`;
}
