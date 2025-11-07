/**
 * Compressed full-app examples
 * Reduced from ~2400 tokens to ~1059 tokens (56% reduction)
 */

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

===FILE:src/App.tsx===
import React, { useState, useEffect } from 'react';

function TodoItem({ todo, onToggle, onDelete }) {
  return (
    <div className="bg-slate-800 p-4 rounded-lg flex items-center gap-3">
      <input type="checkbox" checked={todo.completed} onChange={() => onToggle(todo.id)} className="w-5 h-5" />
      <span className={todo.completed ? 'line-through text-gray-500' : 'text-white'}>{todo.text}</span>
      <button onClick={() => onDelete(todo.id)} className="ml-auto text-red-400">Delete</button>
    </div>
  );
}

export default function App() {
  const [todos, setTodos] = useState([]);
  const [input, setInput] = useState('');
  
  useEffect(() => {
    const saved = localStorage.getItem('todos');
    if (saved) setTodos(JSON.parse(saved));
  }, []);
  
  const addTodo = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const newTodos = [...todos, { id: Date.now(), text: input, completed: false }];
    setTodos(newTodos);
    localStorage.setItem('todos', JSON.stringify(newTodos));
    setInput('');
  };
  
  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Task Manager</h1>
        <form onSubmit={addTodo} className="mb-6">
          <input value={input} onChange={(e) => setInput(e.target.value)} 
                 className="w-full bg-slate-800 text-white px-4 py-3 rounded-lg" placeholder="Add task..." />
        </form>
        <div className="space-y-2">
          {todos.map(todo => <TodoItem key={todo.id} todo={todo} onToggle={() => {}} onDelete={() => {}} />)}
        </div>
      </div>
    </div>
  );
}
===DEPENDENCIES===
react: ^18.2.0
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

===FILE:app/page.tsx===
'use client';
import { useState, useEffect } from 'react';

export default function HomePage() {
  const [posts, setPosts] = useState([]);
  
  useEffect(() => {
    // Mock for preview
    setPosts([
      { id: '1', title: 'Getting Started', excerpt: 'Learn basics...', createdAt: new Date() },
      { id: '2', title: 'Full-Stack Apps', excerpt: 'Complete guide...', createdAt: new Date() }
    ]);
    // For local: fetch('/api/posts').then(r => r.json()).then(setPosts);
  }, []);
  
  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-4xl font-bold text-white mb-8">Blog Posts</h1>
        <div className="grid gap-6">
          {posts.map(post => (
            <div key={post.id} className="bg-slate-800 p-6 rounded-lg">
              <h2 className="text-2xl font-bold text-white">{post.title}</h2>
              <p className="text-slate-400 mt-2">{post.excerpt}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
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
next: ^14.0.0
prisma: ^5.0.0
===SETUP===
1. npm install
2. Copy .env.example to .env
3. npx prisma migrate dev
4. npm run dev
===END===

KEY: Frontend apps run in preview immediately. Full-stack needs local setup but preview shows mock data.
`.trim();
