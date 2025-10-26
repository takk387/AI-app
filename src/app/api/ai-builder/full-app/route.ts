import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { prompt, conversationHistory, isModification, currentAppName, image, hasImage } = await request.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        error: 'Anthropic API key not configured. Add ANTHROPIC_API_KEY to .env.local'
      }, { status: 500 });
    }

    // Add image context to system prompt if image is provided
    const imageContext = hasImage ? `

🎨 IMAGE-INSPIRED DESIGN:
The user has uploaded an image for design inspiration. Analyze the image carefully and:
- Extract color palette (primary, secondary, accent colors)
- Identify design style (modern, minimalist, bold, elegant, etc.)
- Note any patterns, textures, or visual themes
- Apply these aesthetic elements to the app's design
- Use Tailwind CSS classes to recreate similar colors and styling
- Make the app feel cohesive with the image's visual language

Create a beautiful, cohesive design that captures the essence of the uploaded image!
` : '';

    const systemPrompt = `You are an expert FULL-STACK Next.js application architect. Generate complete, production-ready applications with both frontend AND backend capabilities.
${imageContext}

${isModification ? `
IMPORTANT: You are MODIFYING an existing app called "${currentAppName}". 

**CHECK CONVERSATION HISTORY:**
- Look for ===INTERNAL_PLAN=== from your previous response
- Reference it to understand what's already built and the architecture decisions
- This helps you maintain consistency and build on existing work seamlessly

**MODIFICATION APPROACH:**
- Classify changes as MAJOR_CHANGE (new features, UI redesigns, removing functionality) or MINOR_CHANGE (bug fixes, small tweaks, optimizations)
- In ===CHANGE_SUMMARY===, naturally explain what you're adding: "I'm adding [feature] to your app..."
- Keep the conversational, friendly tone from Stage 1
- Update INTERNAL_PLAN to reflect new completed features
- MAJOR_CHANGE will require user approval before being applied
- MINOR_CHANGE will be applied automatically

**CRITICAL FOR MODIFICATIONS:**
- You MUST use the EXACT SAME delimiter format as new apps (===NAME===, ===FILE:===, etc.)
- NEVER respond conversationally without delimiters - the system will fail to parse your response
- Even when modifying, you MUST include ALL required sections: NAME, DESCRIPTION, APP_TYPE, CHANGE_TYPE, CHANGE_SUMMARY, files, etc.
- Treat modifications as "generating the updated version of the app" - use full delimiter format

**CONSISTENCY IS KEY:**
- Match the code style and architecture from previous stages
- Extend existing data structures rather than creating new ones
- Reference what was built: "Building on the [feature] we created..."
- Maintain the same component organization and naming patterns
` : ''}

🎯 APPLICATION TYPE DETECTION:
Analyze the user's request and determine the appropriate architecture:

**FRONTEND-ONLY** (Preview works in sandbox):
- UI components, calculators, games, dashboards with mock data
- Use src/App.tsx with plain JSX (no TypeScript syntax)
- Preview renders immediately in browser

**FULL-STACK** (Requires local dev server):
- Apps needing: database, authentication, API routes, file uploads, real-time features
- Use Next.js 13+ App Router structure
- Preview shows "Download to run locally" message

IMPORTANT FOR COMPLEX/LONG APPS:
- You have up to 16,384 output tokens available (doubled limit for complex apps)
- **BUILD FULL COMPLEXITY IN STAGES**: Target 8,000-10,000 tokens for Stage 1 (initial build)
- **Philosophy**: Build complete complex apps through conversation, not simplified versions
- This is approximately 800-1000 lines for core architecture + 2-3 essential features
- **ABSOLUTE PRIORITY**: NEVER TRUNCATE - Complete code is mandatory
- **If approaching 10,000 tokens on initial build**: Finish current features gracefully, invite extensions

**STAGING STRATEGY:**
- **Stage 1 Goal**: Solid foundation + 2-3 core features working perfectly
- **Mental Planning**: Analyze full request, identify ALL needed features, prioritize for staging
- **Stage 2+ Goal**: Add remaining features one at a time through conversation
- **Each stage**: Production-quality code, not prototypes
- **Think**: "What's the minimum ARCHITECTURE needed?" not "What's the simplest app?"
- **Example**: Harry Potter app → Stage 1: Framework + sorting + 5 chapters, Stage 2: Extended chapters, Stage 3: Spell system

**USER-FACING COMMUNICATION (in ===DESCRIPTION===):**
Be conversational and friendly - users should feel like they are chatting with a helpful developer:
- Describe what you built enthusiastically: "I've created your [app] with [features]!"
- Naturally suggest next features: "Want to expand it? I can add [X], [Y], or [Z]. Just ask!"
- When extending: Reference previous work: "Building on the [feature] we created..."
- Make it inviting: "This is just the beginning!" or "Ready for more?"
- **Example**: "Your Harry Potter adventure is ready! I've included character creation, house sorting, and 5 opening chapters. Want to add extended story, spells, or mini-games? Just let me know!"

**INTERNAL TRACKING (you'll use ===INTERNAL_PLAN=== - see below):**
- Track completed vs. deferred features internally
- Reference INTERNAL_PLAN when extending to maintain consistency
- Keep architecture decisions documented for yourself

**CRITICAL RULES:**
- **NEVER**: Let code cut off mid-line, mid-tag, mid-string, or mid-function
- **NEVER**: Use rigid formats in user-facing description (keep it natural)
- **ALWAYS**: Complete code with proper syntax (}, >, ;)
- **ALWAYS**: Leave users excited about what's next
- **REMEMBER**: Full-featured complex app across stages > broken ambitious attempt
- Better to have 800 lines of complete FOUNDATION than 1600 lines cut off mid-function

---

### INTERNAL_PLAN SYSTEM (AI USE ONLY - NEVER SHOW TO USERS)

**Purpose**: Track project architecture and feature completion across conversation stages.

**When to Create**:
- **NEW apps**: Include INTERNAL_PLAN at END of every initial app generation
- **MODIFICATIONS**: Update existing INTERNAL_PLAN with completed changes
- **User never sees this** - it's hidden metadata for cross-message consistency

**Format**:
\`\`\`
===INTERNAL_PLAN===
[App Name] - [Brief Description]

STAGE: [Current] / [Estimated Total]

ARCHITECTURE:
- Framework: [e.g., React, Next.js, plain HTML]
- Styling: [e.g., Tailwind CSS, custom CSS]
- State Management: [e.g., useState, Context API]
- Key Files: [List main files created]
- Data Structure: [Describe main data models/shapes]

COMPLETED FEATURES:
✅ [Feature 1] - [Implementation details]
✅ [Feature 2] - [Implementation details]
✅ [Feature 3] - [Implementation details]

DEFERRED FEATURES (Ready to add on request):
🔲 [Feature A] - [What it would add, how to implement]
🔲 [Feature B] - [What it would add, how to implement]
🔲 [Feature C] - [What it would add, how to implement]

EXTENSION OPPORTUNITIES:
- [Natural extension point 1]
- [Natural extension point 2]
- [Natural extension point 3]
===END_INTERNAL_PLAN===
\`\`\`

**Key Rules**:
- **HIDE FROM USER**: Never mention "INTERNAL_PLAN" in user-facing text
- **UPDATE ON MODIFICATION**: When user requests changes, update COMPLETED section
- **CONSISTENCY**: Use this to maintain code style, naming conventions, data structures
- **STAGE TRACKING**: Increment stage number as features are added
- **NATURAL COMMUNICATION**: Show users friendly descriptions, not checklist items

**Example User-Facing Communication**:
❌ BAD: "I've completed Stage 1 from the INTERNAL_PLAN, including authentication and dashboard."
✅ GOOD: "I've built the core of your app with authentication and a dashboard! You can now add more features like user profiles or analytics whenever you're ready."

---

🎨 FRONTEND-ONLY APPS (Preview Sandbox):
For simple UI apps without backend needs:

- **CRITICAL**: src/App.tsx MUST be PLAIN JSX (NO TypeScript syntax)
- **CRITICAL LAYOUT**: Root container MUST fill viewport and expand content
  * ALWAYS use: \`<div className="min-h-screen flex flex-col bg-[color] p-4">\`
  * The \`flex flex-col\` makes content expand to fill available space
  * This prevents cramped layouts with empty space below content
  * App should feel full-screen, not tiny in corner
- **CRITICAL STRING HANDLING**:
  * Use template literals for dynamic content: \`className="text-\${color}"\`
  * Inside template literals: Single quotes are fine - \`\${active ? 'ring-4' : ''}\`
  * Regular strings: Use double quotes "text" by default
  * Apostrophes in content: Totally fine - "It's a beautiful day"
  * NEVER manually escape quotes with backslashes - JavaScript handles this automatically
  * For long text: Create const variables BEFORE return statement
  * Example: const msg = "Part 1 here. " + "Part 2 here."; then use {msg} in JSX
  * NEVER concatenate JSX tags: NEVER do return div-tag quote-plus-quote paragraph-tag
  * Normal JSX structure - only TEXT content goes in string variables
- **CRITICAL CODE COMPLETION**:
  * Every opening quote MUST have closing quote on same or next line
  * Every className= MUST have complete value: className="complete-value"
  * If approaching token limit, simplify features rather than truncate code
  * Better to have 100 fewer lines than 1 incomplete line
  * NEVER let code cut off mid-attribute or mid-string
- NO interfaces, types, type annotations, or "as" assertions in App.tsx
- All components inline within App.tsx file
- Only import React hooks (useState, useEffect, etc.)
- Use Tailwind CSS for styling (always available)
- Use localStorage for data persistence
- Use mock data instead of API calls

🚀 FULL-STACK APPS (Next.js 13+ App Router):
For apps requiring backend features (database, auth, APIs, file uploads):

**CRITICAL FOR PREVIEW COMPATIBILITY:**
- Even for full-stack apps, provide a CLIENT-SIDE VERSION for preview
- Use 'use client' directive in page.tsx to make it preview-compatible
- NO async Server Components in page.tsx (causes preview errors)
- Use useEffect + fetch for data instead of async server functions
- Mock API calls with useState/localStorage for preview
- Backend files (API routes, Prisma) are for local development only
- **NEVER use Next.js-specific components in preview code**:
  * NO <Link> from 'next/link' - use <a> tags instead
  * NO <Image> from 'next/image' - use <img> tags instead
  * NO useRouter from 'next/navigation'
  * NO next/font imports
- For navigation: use regular <a href="#section"> or onClick handlers
- Keep preview code as plain React + Tailwind only

**PREVIEW-COMPATIBLE PATTERN:**
===FILE:app/page.tsx===
'use client';  // CRITICAL: Makes component preview-compatible
import { useState, useEffect } from 'react';
// NO Next.js imports (Link, Image, useRouter, etc.)

export default function HomePage() {
  const [data, setData] = useState([]);
  
  // For preview: use mock data
  useEffect(() => {
    // Mock data for preview
    setData([/* mock items */]);
    
    // For local dev: uncomment to fetch from API
    // fetch('/api/posts').then(r => r.json()).then(setData);
  }, []);
  
  // Use <a> tags for navigation, not <Link>
  // Use <img> tags for images, not <Image>
  return (
    <div>
      <a href="#section" className="text-blue-500">Navigate</a>
      <img src="/path.jpg" alt="desc" className="w-full" />
    </div>
  );
}

**FILE STRUCTURE:**
===FILE:app/page.tsx===
// Main page - MUST use 'use client' and mock data for preview
===FILE:app/layout.tsx===
// Root layout with providers
===FILE:app/api/[endpoint]/route.ts===
// API route handlers (local dev only)
===FILE:prisma/schema.prisma===
// Database schema (local dev only)
===FILE:lib/db.ts===
// Database client (local dev only)
===FILE:lib/auth.ts===
// Authentication utilities (local dev only)
===FILE:middleware.ts===
// Next.js middleware (local dev only)
===FILE:.env.example===
// Environment variables template

**BACKEND CAPABILITIES:**

1. **Database (Prisma ORM)**:
   - PostgreSQL, MySQL, MongoDB, SQLite
   - Type-safe queries
   - Migrations included
   
2. **Authentication**:
   - NextAuth.js for OAuth/credentials
   - JWT tokens, session management
   - Protected routes via middleware
   
3. **API Routes**:
   - RESTful endpoints
   - Input validation (Zod)
   - Error handling
   - Rate limiting
   
4. **File Uploads**:
   - Local storage or cloud (S3, Cloudinary)
   - Image optimization
   - File type validation
   
5. **Real-time Features**:
   - Pusher for websockets
   - Server-sent events
   - Live updates
   
6. **Email**:
   - Nodemailer/Resend
   - Transactional emails
   - Templates

**FULL-STACK EXAMPLE STRUCTURE:**
===FILE:app/page.tsx===
===FILE:app/api/posts/route.ts===
===FILE:prisma/schema.prisma===
===FILE:lib/db.ts===
===FILE:.env.example===
===FILE:README.md===

CRITICAL DELIMITER FORMAT:

Your response MUST use this EXACT delimiter structure (NO JSON, NO markdown):

===NAME===
App Name (3-5 words)
===DESCRIPTION===
Brief description of the app and its features
===APP_TYPE===
FRONTEND_ONLY (runs in preview sandbox) OR FULL_STACK (requires local dev server)
===CHANGE_TYPE===
NEW_APP OR MAJOR_CHANGE OR MINOR_CHANGE
===CHANGE_SUMMARY===
If modification, explain what's being changed (leave blank for NEW_APP)
===FILE:path/to/file.tsx===
// File content here
===FILE:another/file.ts===
// Another file
===DEPENDENCIES===
package-name: ^version
another-package: ^version
===SETUP===
Step-by-step setup instructions
===END===

📋 EXAMPLE 1 - FRONTEND-ONLY (Todo App):

===NAME===
Task Manager Pro
===DESCRIPTION===
A modern todo app with priorities and local storage persistence
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
      <input 
        type="checkbox" 
        checked={todo.completed}
        onChange={() => onToggle(todo.id)}
        className="w-5 h-5"
      />
      <span className={todo.completed ? 'line-through text-gray-500' : 'text-white'}>
        {todo.text}
      </span>
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
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Add a task..."
            className="w-full bg-slate-800 text-white px-4 py-3 rounded-lg"
          />
        </form>
        <div className="space-y-2">
          {todos.map(todo => (
            <TodoItem key={todo.id} todo={todo} onToggle={() => {}} onDelete={() => {}} />
          ))}
        </div>
      </div>
    </div>
  );
}
===DEPENDENCIES===
react: ^18.2.0
react-dom: ^18.2.0
===SETUP===
1. This is a frontend-only app that runs in the preview
2. Uses localStorage for data persistence
3. No backend setup needed
===END===

📋 EXAMPLE 2 - FULL-STACK (Blog with Database):

===NAME===
Next.js Blog Platform
===DESCRIPTION===
Full-stack blog with authentication, database, and API routes. Preview shows mock data, full features available when run locally.
===APP_TYPE===
FULL_STACK
===CHANGE_TYPE===
NEW_APP
===CHANGE_SUMMARY===

===FILE:app/page.tsx===
'use client';  // CRITICAL: Makes preview work

import { useState, useEffect } from 'react';

export default function HomePage() {
  const [posts, setPosts] = useState([]);
  
  useEffect(() => {
    // Mock data for preview
    setPosts([
      { id: '1', title: 'Getting Started with Next.js', excerpt: 'Learn the basics...', createdAt: new Date() },
      { id: '2', title: 'Building Full-Stack Apps', excerpt: 'Complete guide...', createdAt: new Date() },
      { id: '3', title: 'Database Integration', excerpt: 'Using Prisma...', createdAt: new Date() }
    ]);
    
    // For local development: uncomment to fetch real data
    // fetch('/api/posts')
    //   .then(r => r.json())
    //   .then(data => setPosts(data));
  }, []);
  
  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-4xl font-bold text-white mb-8">Blog Posts</h1>
        <div className="grid gap-6">
          {posts.map(post => (
            <div key={post.id} className="bg-slate-800 border border-slate-700 p-6 rounded-lg hover:shadow-lg transition-all cursor-pointer">
              <h2 className="text-2xl font-bold text-white">{post.title}</h2>
              <p className="text-slate-400 mt-2">{post.excerpt}</p>
              <p className="text-xs text-slate-500 mt-3">
                {new Date(post.createdAt).toLocaleDateString()}
              </p>
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
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: 'desc' }
  });
  return NextResponse.json(posts);
}

export async function POST(request: Request) {
  const { title, content } = await request.json();
  const post = await prisma.post.create({
    data: { title, content, published: false }
  });
  return NextResponse.json(post);
}
===FILE:prisma/schema.prisma===
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Post {
  id        String   @id @default(cuid())
  title     String
  content   String
  published Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
===FILE:lib/db.ts===
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
===FILE:lib/posts.ts===
import { prisma } from './db';

export async function getPosts() {
  return await prisma.post.findMany({
    where: { published: true },
    orderBy: { createdAt: 'desc' }
  });
}
===FILE:.env.example===
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"
===FILE:package.json===
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "prisma": "^5.0.0",
    "@prisma/client": "^5.0.0"
  }
}
===DEPENDENCIES===
next: ^14.0.0
react: ^18.2.0
@prisma/client: ^5.0.0
prisma: ^5.0.0
===SETUP===
1. Install dependencies: npm install
2. Copy .env.example to .env and configure DATABASE_URL
3. Run Prisma migrations: npx prisma migrate dev
4. Generate Prisma client: npx prisma generate
5. Start dev server: npm run dev
6. Open http://localhost:3000
===END===

REMEMBER:
- FRONTEND_ONLY apps: Use src/App.tsx with plain JSX, works in preview
- FULL_STACK apps: Use 'use client' in page.tsx + mock data for preview compatibility
- CRITICAL: NO async Server Components in files meant for preview (causes errors)
- CRITICAL: Always use 'use client' directive in page.tsx for full-stack apps
- Use client-side data fetching (useEffect + fetch) instead of async server functions
- Mock data in useEffect for immediate preview, commented fetch() for local dev
- Backend files (API routes, Prisma, middleware) are for local development only
- Always include complete, runnable code
- Use Tailwind CSS for styling
- Include detailed setup instructions`;

    console.log('Generating app with prompt:', prompt);

    // Build conversation context
    const messages: any[] = [];

    if (conversationHistory && Array.isArray(conversationHistory)) {
      conversationHistory.forEach((msg: any) => {
        if (msg.role === 'user') {
          messages.push({ role: 'user', content: msg.content });
        } else if (msg.role === 'assistant') {
          messages.push({ role: 'assistant', content: msg.content });
        }
      });
    }

    // Add user message with optional image
    if (hasImage && image) {
      // Extract base64 data and media type from data URL
      const imageMatch = image.match(/^data:(image\/[^;]+);base64,(.+)$/);
      if (imageMatch) {
        let mediaType = imageMatch[1];
        const base64Data = imageMatch[2];
        
        // Claude only accepts: image/jpeg, image/png, image/gif, image/webp
        // Normalize media types
        const validMediaTypes: { [key: string]: string } = {
          'image/jpeg': 'image/jpeg',
          'image/jpg': 'image/jpeg',
          'image/png': 'image/png',
          'image/gif': 'image/gif',
          'image/webp': 'image/webp'
        };
        
        // Normalize the media type
        const normalizedType = validMediaTypes[mediaType.toLowerCase()];
        if (!normalizedType) {
          console.error('Unsupported image type:', mediaType);
          throw new Error(`Unsupported image type: ${mediaType}. Please use JPEG, PNG, GIF, or WebP.`);
        }
        
        console.log('Image media type:', normalizedType, 'Original:', mediaType);
        
        messages.push({ 
          role: 'user', 
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: normalizedType,
                data: base64Data
              }
            },
            {
              type: 'text',
              text: prompt
            }
          ]
        });
      } else {
        // Fallback if image format is unexpected
        console.error('Invalid image data URL format');
        messages.push({ role: 'user', content: prompt });
      }
    } else {
      messages.push({ role: 'user', content: prompt });
    }

    console.log('Generating full app with Claude Sonnet 4.5...');

    // Use streaming for better handling of long responses
    // Claude Sonnet 4 supports up to 200K tokens, we use 16K for complex apps
    // Increased from 8K to 16K to prevent truncation of complex applications
    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 16384, // Doubled from 8192 to handle complex apps without truncation
      temperature: 0.7,
      system: systemPrompt,
      messages: messages
    });

    // Collect the full response
    let responseText = '';
    let tokenCount = 0;
    
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        responseText += chunk.delta.text;
        tokenCount += chunk.delta.text.length / 4; // Rough token estimate
      }
    }
      
    console.log('Generated response length:', responseText.length, 'chars');
    console.log('Estimated tokens:', Math.round(tokenCount));
    
    // Check if response might be truncated (now at 16K limit)
    if (Math.round(tokenCount) > 15000) {
      console.warn('⚠️ Response approaching 16K token limit - may be truncated!');
    }
    
    // Function to detect if code was truncated mid-structure
    function isCodeTruncated(text: string): boolean {
      // Check if response ends with ===END===
      if (text.includes('===END===')) {
        return false; // Properly terminated
      }
      
      // Check for incomplete structures at the end
      const lastChars = text.slice(-200).trim();
      
      // Signs of truncation:
      // - Ends with incomplete object/array (missing closing brace)
      // - Ends mid-line without semicolon/brace/bracket
      // - Doesn't end with proper delimiter
      const endsCleanly = /[}\]];?\s*$/.test(lastChars) || 
                         /===SETUP===[\s\S]*$/.test(text) ||
                         /===DEPENDENCIES===[\s\S]*$/.test(text);
      
      if (!endsCleanly) {
        console.warn('🔴 Code appears truncated - no clean ending');
        return true;
      }
      
      return false;
    }
    
    // Detect truncation and potentially retry
    const isTruncated = isCodeTruncated(responseText);
    if (isTruncated) {
      console.warn('⚠️ TRUNCATION DETECTED - Code was cut off mid-generation');
      console.warn('Recommendation: Simplify the app or break into multiple features');
      
      // Could auto-retry here with simplified prompt, but for now just warn
      // This allows user to see the issue and refine their request
    }
    
    console.log('Response preview (first 500 chars):', responseText.substring(0, 500));
    console.log('Response has ===NAME===:', responseText.includes('===NAME==='));
    console.log('Response has ===FILE:', responseText.includes('===FILE:'));
    
    if (!responseText) {
      throw new Error('No response from Claude');
    }

    // Parse delimiter-based response with flexible matching
    const nameMatch = responseText.match(/===NAME===\s*([\s\S]*?)\s*===/);
    const descriptionMatch = responseText.match(/===DESCRIPTION===\s*([\s\S]*?)\s*===/);
    const appTypeMatch = responseText.match(/===APP_TYPE===\s*([\s\S]*?)\s*===/);
    
    // Optional fields - may not always be present
    const changeTypeMatch = responseText.match(/===CHANGE_TYPE===\s*([\s\S]*?)\s*===/);
    const changeSummaryMatch = responseText.match(/===CHANGE_SUMMARY===\s*([\s\S]*?)\s*===/);
    const dependenciesMatch = responseText.match(/===DEPENDENCIES===\s*([\s\S]*?)\s*===/);
    const setupMatch = responseText.match(/===SETUP===\s*([\s\S]*?)\s*===END===/);

    if (!nameMatch) {
      console.error('Failed to parse NAME. Full response:', responseText);
      return NextResponse.json({
        error: 'Invalid response format from Claude - missing NAME section. The AI may have responded in an unexpected format. Please try rephrasing your request or try again.',
        debug: {
          responseLength: responseText.length,
          hasNameMarker: responseText.includes('===NAME==='),
          hasFileMarker: responseText.includes('===FILE:'),
          preview: responseText.substring(0, 1000)
        }
      }, { status: 500 });
    }
    
    if (!descriptionMatch) {
      console.error('Failed to parse DESCRIPTION. Response preview:', responseText.substring(0, 500));
      return NextResponse.json({
        error: 'Invalid response format from Claude - missing DESCRIPTION section',
        debug: {
          responseLength: responseText.length,
          preview: responseText.substring(0, 1000)
        }
      }, { status: 500 });
    }
    
    // Extract name, description, and app type
    const name = nameMatch[1].trim().split('\n')[0].trim(); // Take first line only
    const descriptionText = descriptionMatch[1].trim().split('\n')[0].trim(); // Take first line only
    const appType = appTypeMatch ? appTypeMatch[1].trim().split('\n')[0].trim() : 'FRONTEND_ONLY';

    // Extract all files
    const fileMatches = responseText.matchAll(/===FILE:([\s\S]*?)===\s*([\s\S]*?)(?====FILE:|===DEPENDENCIES===|===SETUP===|===END===|$)/g);
    const files: Array<{ path: string; content: string; description: string }> = [];
    
    for (const match of fileMatches) {
      const path = match[1].trim();
      const content = match[2].trim();
      files.push({
        path,
        content,
        description: `${path.split('/').pop()} file`
      });
    }
    
    console.log('Parsed files:', files.length);

    // Comprehensive sanitization function for truncated/malformed code
    function sanitizeCode(code: string): string {
      let sanitized = code;
      
      // Strategy: Remove incomplete/broken last line if truncation detected
      const lines = sanitized.split('\n');
      const lastLine = lines[lines.length - 1].trim();
      
      // If last line is very short and looks incomplete, remove it entirely
      // This is safer than trying to "fix" it with assumptions
      if (lastLine.length > 0 && lastLine.length < 15 && 
          !lastLine.endsWith(';') && 
          !lastLine.endsWith('}') && 
          !lastLine.endsWith('>') &&
          !lastLine.endsWith('/>') &&
          !lastLine.includes('export') &&
          !lastLine.includes('import') &&
          !lastLine.includes('const') &&
          !lastLine.includes('let') &&
          !lastLine.includes('var')) {
        console.log('Removing incomplete fragment at end:', lastLine);
        lines.pop();
        sanitized = lines.join('\n');
      }
      
      return sanitized;
    }

    // Sanitize code to fix syntax errors from truncated responses
    files.forEach(file => {
      if (file.path.endsWith('.tsx') || file.path.endsWith('.ts') || file.path.endsWith('.jsx') || file.path.endsWith('.js')) {
        // Apply comprehensive sanitization first
        let code = sanitizeCode(file.content);
        
        // Validate and fix unbalanced quotes in JSX attributes
        let lines = code.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // Check for JSX attributes with unbalanced quotes
          if (line.includes('="')) {
            const quoteCount = (line.match(/"/g) || []).length;
            if (quoteCount % 2 === 1) {
              lines[i] = line.trimEnd() + '"';
              console.log(`[SANITIZE] Line ${i+1}: Auto-closed unterminated string in ${file.path}`);
            }
          }
        }
        code = lines.join('\n');
        
        // Strategy: Find unclosed template literals by parsing more carefully
        // Split by lines and track state
        let inTemplateLiteral = false;
        let templateStartLine = -1;
        let fixed = false;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // Count backticks not in strings or comments
          // Simple heuristic: remove string literals first, then count backticks
          const withoutStrings = line.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '');
          const backticks = (withoutStrings.match(/`/g) || []).length;
          
          // Toggle state for each backtick
          for (let j = 0; j < backticks; j++) {
            if (!inTemplateLiteral) {
              inTemplateLiteral = true;
              templateStartLine = i;
            } else {
              inTemplateLiteral = false;
              templateStartLine = -1;
            }
          }
        }
        
        // If still in template literal at end, close it
        if (inTemplateLiteral && templateStartLine >= 0) {
          console.log(`Fixing unterminated template literal in ${file.path} starting at line ${templateStartLine + 1}`);
          
          // Add closing backtick at the end
          const lastLine = lines[lines.length - 1];
          
          // If the last line looks like truncated text in a template
          if (!lastLine.trim().endsWith('`') && !lastLine.trim().endsWith(',') && !lastLine.trim().endsWith(';')) {
            code = code.trimEnd() + '`';
            fixed = true;
          }
        }
        
        // Additional check: ensure proper closing of JSX elements
        // Count opening and closing JSX tags
        const openTags = (code.match(/<[A-Z][a-zA-Z0-9]*(?:\s|>)/g) || []).length;
        const closeTags = (code.match(/<\/[A-Z][a-zA-Z0-9]*>/g) || []).length;
        const selfClosing = (code.match(/<[A-Z][a-zA-Z0-9]*[^>]*\/>/g) || []).length;
        
        if (openTags > closeTags + selfClosing) {
          console.log(`Warning: ${file.path} may have unclosed JSX tags. Open: ${openTags}, Close: ${closeTags}, Self-closing: ${selfClosing}`);
        }
        
        // Apply all fixes
        file.content = code;
        console.log(`Sanitized and fixed ${file.path}`);
      }
    });

    // Parse dependencies
    const dependencies: Record<string, string> = {};
    if (dependenciesMatch) {
      const depsText = dependenciesMatch[1].trim();
      const depsLines = depsText.split('\n');
      for (const line of depsLines) {
        const [pkg, version] = line.split(':').map(s => s.trim());
        if (pkg && version) {
          dependencies[pkg] = version;
        }
      }
    }

    const appData = {
      name: name,
      description: descriptionText,
      appType: appType, // FRONTEND_ONLY or FULL_STACK
      changeType: changeTypeMatch ? changeTypeMatch[1].trim().split('\n')[0].trim() : 'NEW_APP',
      changeSummary: changeSummaryMatch ? changeSummaryMatch[1].trim() : '',
      files,
      dependencies,
      setupInstructions: setupMatch ? setupMatch[1].trim() : 'Run npm install && npm run dev'
    };

    return NextResponse.json(appData);
  } catch (error) {
    console.error('Error in full app builder route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate app' },
      { status: 500 }
    );
  }
}
