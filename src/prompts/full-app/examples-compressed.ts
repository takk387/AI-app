/**
 * Compressed full-app examples
 * Reduced from ~2400 tokens to ~1059 tokens (56% reduction)
 *
 * Uses dynamic version injection from versions.generated.ts
 */

import { VERSIONS } from '@/config/versions';

export const FULLAPP_EXAMPLES_COMPRESSED = `
EXAMPLES:

1. FRONTEND-ONLY Todo App:
===NAME===
Task Manager Pro
===DESCRIPTION===
Todo app with priorities and local storage
===APP_TYPE===
FRONTEND_ONLY
===CHANGE_TYPE===
NEW_APP
===CHANGE_SUMMARY===

===FILE:src/components/ErrorBoundary.tsx===
import React, { Component, ReactNode } from 'react';
class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: Error|null}> {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) { console.error('App Error:', error, info); }
  render() {
    if (this.state.hasError) return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="bg-slate-800 p-6 rounded-lg text-center">
          <h2 className="text-xl font-bold text-red-400 mb-2">Something went wrong</h2>
          <button onClick={() => this.setState({hasError: false, error: null})}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:ring-2 focus:ring-blue-500">Try Again</button>
        </div>
      </div>
    );
    return this.props.children;
  }
}
export default ErrorBoundary;
===FILE:src/App.tsx===
import React, { useState, useEffect } from 'react';
import ErrorBoundary from './components/ErrorBoundary';

function TodoItem({ todo, onToggle, onDelete }) {
  return (
    <article className="bg-slate-800 p-4 rounded-lg flex items-center gap-3">
      <input type="checkbox" checked={todo.completed} onChange={() => onToggle(todo.id)}
             className="w-5 h-5" aria-label={\`Mark "\${todo.text}" as \${todo.completed ? 'incomplete' : 'complete'}\`} />
      <span className={todo.completed ? 'line-through text-gray-500' : 'text-white'}>{todo.text}</span>
      <button onClick={() => onDelete(todo.id)} className="ml-auto text-red-400 hover:text-red-300 focus:ring-2 focus:ring-red-500 rounded px-2 py-1"
              aria-label={\`Delete "\${todo.text}"\`}>Delete</button>
    </article>
  );
}

function TodoApp() {
  const [todos, setTodos] = useState([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('todos');
    if (saved) setTodos(JSON.parse(saved));
  }, []);

  const addTodo = (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) { setError('Task cannot be empty'); return; }
    if (trimmed.length < 2) { setError('Task must be at least 2 characters'); return; }
    setError(null);
    setIsSubmitting(true);
    const newTodos = [...todos, { id: Date.now(), text: trimmed, completed: false }];
    setTodos(newTodos);
    localStorage.setItem('todos', JSON.stringify(newTodos));
    setInput('');
    setIsSubmitting(false);
    setToast({ type: 'success', message: 'Task added!' });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <main className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-2xl mx-auto">
        <header><h1 className="text-4xl font-bold text-white mb-8">Task Manager</h1></header>
        <form onSubmit={addTodo} className="mb-6">
          <label htmlFor="task-input" className="block text-sm text-slate-400 mb-1">Add a new task <span className="text-red-400">*</span></label>
          <input id="task-input" value={input} onChange={(e) => { setInput(e.target.value); if (error) setError(null); }}
                 aria-invalid={!!error} aria-describedby={error ? "task-error" : undefined}
                 className={\`w-full bg-slate-800 text-white px-4 py-3 rounded-lg focus:ring-2 \${error ? 'border border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}\`} placeholder="What needs to be done?" />
          {error && <p id="task-error" className="text-red-400 text-sm mt-1" role="alert">{error}</p>}
          <button type="submit" disabled={isSubmitting}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 focus:ring-2 focus:ring-blue-500">
            {isSubmitting ? 'Adding...' : 'Add Task'}
          </button>
        </form>
        <section aria-label="Task list" className="space-y-2">
          {todos.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No tasks yet. Add one above!</p>
          ) : todos.map(todo => <TodoItem key={todo.id} todo={todo} onToggle={() => {}} onDelete={() => {}} />)}
        </section>
      </div>
      {toast && (
        <div className={\`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg \${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white\`} role="alert" aria-live="polite">
          {toast.message}
        </div>
      )}
    </main>
  );
}

export default function App() {
  return <ErrorBoundary><TodoApp /></ErrorBoundary>;
}
===DEPENDENCIES===
react: ${VERSIONS.react}
===SETUP===
Frontend-only, runs in preview. Uses localStorage.
===END===

2. FULL-STACK Blog:
===NAME===
Next.js Blog Platform
===DESCRIPTION===
Blog with auth, database, API routes. Preview shows mock data.
===APP_TYPE===
FULL_STACK
===CHANGE_TYPE===
NEW_APP
===CHANGE_SUMMARY===

===FILE:app/components/ErrorBoundary.tsx===
'use client';
import React, { Component, ReactNode } from 'react';
class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: Error|null}> {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) { console.error('App Error:', error, info); }
  render() {
    if (this.state.hasError) return (
      <main className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="bg-slate-800 p-6 rounded-lg text-center">
          <h1 className="text-xl font-bold text-red-400 mb-2">Something went wrong</h1>
          <button onClick={() => this.setState({hasError: false, error: null})}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:ring-2 focus:ring-blue-500">Try Again</button>
        </div>
      </main>
    );
    return this.props.children;
  }
}
export default ErrorBoundary;
===FILE:app/layout.tsx===
import type { Metadata } from 'next';
import './globals.css';
import ErrorBoundary from './components/ErrorBoundary';

export const metadata: Metadata = {
  title: 'Next.js Blog Platform',
  description: 'A full-stack blog with posts, authentication, and database storage.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><ErrorBoundary>{children}</ErrorBoundary></body>
    </html>
  );
}
===FILE:app/page.tsx===
'use client';
import { useState, useEffect, useCallback } from 'react';

const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={\`animate-pulse bg-slate-700 rounded \${className}\`} aria-hidden="true" />
);

export default function HomePage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Mock for preview
      await new Promise(r => setTimeout(r, 500));
      setPosts([
        { id: '1', title: 'Getting Started', excerpt: 'Learn basics...', createdAt: new Date() },
        { id: '2', title: 'Full-Stack Apps', excerpt: 'Complete guide...', createdAt: new Date() }
      ]);
      // For local: const res = await fetch('/api/posts'); setPosts(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  return (
    <main className="min-h-screen bg-slate-900 p-8">
      <div className="container mx-auto max-w-4xl">
        <header><h1 className="text-4xl font-bold text-white mb-8">Blog Posts</h1></header>
        {error ? (
          <div className="bg-red-900/50 border border-red-500 p-6 rounded-lg text-center" role="alert">
            <p className="text-red-400 mb-4">{error}</p>
            <button onClick={fetchPosts} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:ring-2 focus:ring-red-500">
              Try Again
            </button>
          </div>
        ) : loading ? (
          <section aria-label="Loading posts" className="grid gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-slate-800 p-6 rounded-lg">
                <Skeleton className="h-8 w-3/4 mb-4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3 mt-2" />
              </div>
            ))}
          </section>
        ) : posts.length === 0 ? (
          <p className="text-slate-400 text-center py-12">No posts yet. Create your first post!</p>
        ) : (
          <section aria-label="Blog posts" className="grid gap-6">
            {posts.map(post => (
              <article key={post.id} className="bg-slate-800 p-6 rounded-lg">
                <h2 className="text-2xl font-bold text-white">{post.title}</h2>
                <p className="text-slate-400 mt-2">{post.excerpt}</p>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
===FILE:app/api/posts/route.ts===
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const posts = await prisma.post.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(posts);
}
===FILE:prisma/schema.prisma===
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }
model Post {
  id String @id @default(cuid())
  title String
  content String
  createdAt DateTime @default(now())
}
===FILE:.env.example===
DATABASE_URL="postgresql://user:pass@localhost:5432/db"
===DEPENDENCIES===
next: ${VERSIONS.next}
react: ${VERSIONS.react}
typescript: ${VERSIONS.typescript}
prisma: ${VERSIONS.prisma}
===SETUP===
1. npm install
2. Copy .env.example to .env
3. npx prisma migrate dev
4. npm run dev
===END===

KEY: Frontend apps run in preview immediately. Full-stack needs local setup but preview shows mock data.
`.trim();
