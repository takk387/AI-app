/**
 * POST /api/deploy/vercel
 * Deploy app to Vercel
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { DeploymentService } from '@/services/DeploymentService';
import { DeployRequestSchema } from '@/types/deployment';
import {
  generatePackageJson,
  generateReadme,
  generateNextConfig,
  generateTsConfig,
  generateTailwindConfig,
  generatePostCssConfig,
  generateGitIgnore,
  generateEnvExample,
} from '@/utils/exportApp';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate request
    const parseResult = DeployRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { appId, projectName } = parseResult.data;

    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get app data
    const { data: app, error: appError } = await supabase
      .from('generated_apps')
      .select('*')
      .eq('id', appId)
      .eq('user_id', user.id)
      .single();

    if (appError || !app) {
      return NextResponse.json({ success: false, error: 'App not found' }, { status: 404 });
    }

    // Get Vercel token
    const token = await DeploymentService.getVercelToken(supabase, user.id);
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: 'Vercel not connected. Please connect your Vercel account first.',
        },
        { status: 400 }
      );
    }

    // Sanitize project name
    const sanitizedProjectName = (projectName || app.title)
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 100);

    // Prepare files for deployment
    const files: Record<string, string> = {
      // Main app file
      'src/App.tsx': app.code,

      // Entry point
      'src/app/page.tsx': `'use client';
import App from '../App';
export default function Page() {
  return <App />;
}`,

      // Layout with Tailwind
      'src/app/layout.tsx': `import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '${app.title}',
  description: '${app.description || 'Generated with AI App Builder'}',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}`,

      // Tailwind CSS
      'src/app/globals.css': `@tailwind base;
@tailwind components;
@tailwind utilities;`,

      // Config files
      'package.json': generatePackageJson(sanitizedProjectName),
      'README.md': generateReadme(app.title),
      'next.config.js': generateNextConfig(),
      'tsconfig.json': generateTsConfig(),
      'tailwind.config.js': generateTailwindConfig(),
      'postcss.config.js': generatePostCssConfig(),
      '.gitignore': generateGitIgnore(),
      '.env.example': generateEnvExample(),
    };

    // Deploy
    const result = await DeploymentService.deployToVercel({
      token,
      projectName: sanitizedProjectName,
      files,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Deploy error:', error);
    return NextResponse.json({ success: false, error: 'Deployment failed' }, { status: 500 });
  }
}

/**
 * GET /api/deploy/vercel?deploymentId=xxx
 * Check deployment status
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const deploymentId = url.searchParams.get('deploymentId');

    if (!deploymentId) {
      return NextResponse.json({ success: false, error: 'Missing deploymentId' }, { status: 400 });
    }

    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get Vercel token
    const token = await DeploymentService.getVercelToken(supabase, user.id);
    if (!token) {
      return NextResponse.json({ success: false, error: 'Vercel not connected' }, { status: 400 });
    }

    // Check status
    const status = await DeploymentService.getDeploymentStatus(token, deploymentId);

    return NextResponse.json({
      success: true,
      ...status,
    });
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json({ success: false, error: 'Failed to check status' }, { status: 500 });
  }
}
