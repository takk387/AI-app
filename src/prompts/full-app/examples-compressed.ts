/**
 * Compressed full-app examples
 * Reduced from ~2400 tokens to ~1059 tokens (56% reduction)
 *
 * Uses dynamic version injection from versions.generated.ts
 */

import { VERSIONS } from '@/config/versions';

/**
 * Skeleton example — shows delimiter format only.
 * Replaces 277-line FULLAPP_EXAMPLES_COMPRESSED for simple apps.
 */
export const SKELETON_EXAMPLE = `
## OUTPUT FORMAT EXAMPLE

Use this exact delimiter format for all generated files:

===NAME===
My App

===EXPLANATION===
Brief description of the app and its features.

===FILE:app/page.tsx===
'use client';
import { useState } from 'react';

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold">My App</h1>
    </main>
  );
}

===FILE:app/layout.tsx===
// ... layout with metadata, fonts, ErrorBoundary wrapper

===DEPENDENCIES===
react,react-dom

===SETUP===
npm install && npm run dev

===END===
`.trim();

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
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] p-4">
        <div className="bg-[var(--color-surface)] p-6 rounded-lg text-center">
          <h2 className="text-xl font-bold text-red-400 mb-2">Something went wrong</h2>
          <button onClick={() => this.setState({hasError: false, error: null})}
                  className="px-4 py-2 bg-[var(--color-primary)] text-white rounded hover:opacity-90 focus:ring-2 focus:ring-[var(--color-primary)]">Try Again</button>
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
    <article className="bg-[var(--color-surface)] p-4 rounded-lg flex items-center gap-3">
      <input type="checkbox" checked={todo.completed} onChange={() => onToggle(todo.id)}
             className="w-5 h-5" aria-label={\`Mark "\${todo.text}" as \${todo.completed ? 'incomplete' : 'complete'}\`} />
      <span className={todo.completed ? 'line-through text-[var(--color-text-muted)]' : 'text-[var(--color-text)]'}>{todo.text}</span>
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
    <main className="min-h-screen bg-[var(--color-background)] p-8">
      <div className="max-w-2xl mx-auto">
        <header><h1 className="text-4xl font-bold text-[var(--color-text)] mb-8">Task Manager</h1></header>
        <form onSubmit={addTodo} className="mb-6">
          <label htmlFor="task-input" className="block text-sm text-[var(--color-text-muted)] mb-1">Add a new task <span className="text-red-400">*</span></label>
          <input id="task-input" value={input} onChange={(e) => { setInput(e.target.value); if (error) setError(null); }}
                 aria-invalid={!!error} aria-describedby={error ? "task-error" : undefined}
                 className={\`w-full bg-[var(--color-surface)] text-[var(--color-text)] px-4 py-3 rounded-lg focus:ring-2 \${error ? 'border border-red-500 focus:ring-red-500' : 'focus:ring-[var(--color-primary)]'}\`} placeholder="What needs to be done?" />
          {error && <p id="task-error" className="text-red-400 text-sm mt-1" role="alert">{error}</p>}
          <button type="submit" disabled={isSubmitting}
                  className="mt-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded hover:opacity-90 disabled:opacity-50 focus:ring-2 focus:ring-[var(--color-primary)]">
            {isSubmitting ? 'Adding...' : 'Add Task'}
          </button>
        </form>
        <section aria-label="Task list" className="space-y-2">
          {todos.length === 0 ? (
            <p className="text-[var(--color-text-muted)] text-center py-8">No tasks yet. Add one above!</p>
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

2. FULL-STACK Blog (runs in WebContainers with real API routes):
===NAME===
Next.js Blog Platform
===DESCRIPTION===
Blog with API routes and in-memory data store. Runs fully in preview.
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
      <main className="min-h-screen flex items-center justify-center bg-[var(--color-background)] p-4">
        <div className="bg-[var(--color-surface)] p-6 rounded-lg text-center">
          <h1 className="text-xl font-bold text-red-400 mb-2">Something went wrong</h1>
          <button onClick={() => this.setState({hasError: false, error: null})}
                  className="px-4 py-2 bg-[var(--color-primary)] text-white rounded hover:opacity-90 focus:ring-2 focus:ring-[var(--color-primary)]">Try Again</button>
        </div>
      </main>
    );
    return this.props.children;
  }
}
export default ErrorBoundary;
===FILE:app/layout.tsx===
import type { Metadata } from 'next';
import ErrorBoundary from './components/ErrorBoundary';

export const metadata: Metadata = {
  title: 'Next.js Blog Platform',
  description: 'A full-stack blog with posts and API routes.',
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

export default function HomePage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/posts');
      if (!res.ok) throw new Error('Failed to fetch posts');
      setPosts(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  return (
    <main className="min-h-screen bg-[var(--color-background)] p-8">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-4xl font-bold text-[var(--color-text)] mb-8">Blog Posts</h1>
        {error ? (
          <div className="bg-red-900/50 border border-red-500 p-6 rounded-lg text-center" role="alert">
            <p className="text-red-400 mb-4">{error}</p>
            <button onClick={fetchPosts} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Try Again</button>
          </div>
        ) : loading ? (
          <p className="text-[var(--color-text-muted)]">Loading...</p>
        ) : (
          <section className="grid gap-6">
            {posts.map(post => (
              <article key={post.id} className="bg-[var(--color-surface)] p-6 rounded-lg">
                <h2 className="text-2xl font-bold text-[var(--color-text)]">{post.title}</h2>
                <p className="text-[var(--color-text-muted)] mt-2">{post.excerpt}</p>
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

const posts = [
  { id: '1', title: 'Getting Started with Next.js', excerpt: 'Learn the basics of building full-stack apps.', createdAt: new Date().toISOString() },
  { id: '2', title: 'API Routes in Practice', excerpt: 'How to build RESTful endpoints with Next.js.', createdAt: new Date().toISOString() },
];

export async function GET() {
  return NextResponse.json(posts);
}

export async function POST(request: Request) {
  const body = await request.json();
  const newPost = { id: String(Date.now()), ...body, createdAt: new Date().toISOString() };
  posts.push(newPost);
  return NextResponse.json(newPost, { status: 201 });
}
===DEPENDENCIES===
next: ${VERSIONS.next}
react: ${VERSIONS.react}
typescript: ${VERSIONS.typescript}
===SETUP===
npm install && npm run dev
===END===

KEY: Frontend apps use Vite. Full-stack apps use Next.js App Router with real API routes.
`.trim();
