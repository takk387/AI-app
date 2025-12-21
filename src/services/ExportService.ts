'use client';

import type { AppFile } from '@/types/railway';
import { logger } from '@/utils/logger';

const log = logger.child({ route: 'export-service' });

// ============================================================================
// TYPES
// ============================================================================

export type ExportFormat = 'zip' | 'vercel' | 'netlify' | 'clipboard';

export interface ExportOptions {
  appName: string;
  files: AppFile[];
  dependencies?: Record<string, string>;
}

export interface ExportResult {
  success: boolean;
  message: string;
  url?: string;
  data?: Blob | string;
}

// ============================================================================
// EXPORT SERVICE
// ============================================================================

/**
 * Service for exporting generated apps to various formats and platforms.
 */
class ExportService {
  private static instance: ExportService | null = null;

  private constructor() {}

  /**
   * Get the singleton instance
   */
  static getInstance(): ExportService {
    if (!ExportService.instance) {
      ExportService.instance = new ExportService();
    }
    return ExportService.instance;
  }

  /**
   * Export app to the specified format
   */
  async export(format: ExportFormat, options: ExportOptions): Promise<ExportResult> {
    log.info('Exporting app', { format, appName: options.appName });

    switch (format) {
      case 'zip':
        return this.exportAsZip(options);
      case 'vercel':
        return this.exportToVercel(options);
      case 'netlify':
        return this.exportToNetlify(options);
      case 'clipboard':
        return this.exportToClipboard(options);
      default:
        return { success: false, message: `Unknown export format: ${format}` };
    }
  }

  /**
   * Export as downloadable ZIP file
   */
  private async exportAsZip(options: ExportOptions): Promise<ExportResult> {
    try {
      // Dynamically import JSZip only when needed
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // Add all files to the zip
      for (const file of options.files) {
        const path = file.path.startsWith('/') ? file.path.slice(1) : file.path;
        zip.file(path, file.content);
      }

      // Generate package.json if dependencies exist
      if (options.dependencies && Object.keys(options.dependencies).length > 0) {
        const packageJson = {
          name: options.appName.toLowerCase().replace(/\s+/g, '-'),
          version: '1.0.0',
          private: true,
          scripts: {
            dev: 'next dev',
            build: 'next build',
            start: 'next start',
            lint: 'next lint',
          },
          dependencies: {
            next: '^14.0.0',
            react: '^18.2.0',
            'react-dom': '^18.2.0',
            ...options.dependencies,
          },
          devDependencies: {
            '@types/node': '^20',
            '@types/react': '^18',
            '@types/react-dom': '^18',
            typescript: '^5',
          },
        };
        zip.file('package.json', JSON.stringify(packageJson, null, 2));
      }

      // Add basic config files
      zip.file(
        'tsconfig.json',
        JSON.stringify(
          {
            compilerOptions: {
              target: 'es5',
              lib: ['dom', 'dom.iterable', 'esnext'],
              allowJs: true,
              skipLibCheck: true,
              strict: true,
              noEmit: true,
              esModuleInterop: true,
              module: 'esnext',
              moduleResolution: 'bundler',
              resolveJsonModule: true,
              isolatedModules: true,
              jsx: 'preserve',
              incremental: true,
              plugins: [{ name: 'next' }],
              paths: { '@/*': ['./*'] },
            },
            include: ['**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
            exclude: ['node_modules'],
          },
          null,
          2
        )
      );

      zip.file(
        'next.config.js',
        `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = nextConfig;
`
      );

      zip.file(
        'README.md',
        `# ${options.appName}

Generated with AI App Builder.

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) with your browser.
`
      );

      // Generate the zip blob
      const blob = await zip.generateAsync({ type: 'blob' });

      // Trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${options.appName.toLowerCase().replace(/\s+/g, '-')}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return { success: true, message: 'ZIP file downloaded successfully', data: blob };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.error('ZIP export failed', error);
      return { success: false, message: `ZIP export failed: ${message}` };
    }
  }

  /**
   * Export to Vercel (opens deployment page)
   */
  private async exportToVercel(options: ExportOptions): Promise<ExportResult> {
    try {
      // Create a GitHub gist or use Vercel's deploy button
      // For now, we'll create a base64-encoded blob URL

      // Generate files for Vercel
      const files: Record<string, string> = {};
      for (const file of options.files) {
        const path = file.path.startsWith('/') ? file.path.slice(1) : file.path;
        files[path] = file.content;
      }

      // Encode files as base64 for URL
      const encodedFiles = btoa(JSON.stringify(files));

      // Vercel deploy URL with repository
      // Note: This requires a GitHub repository. For direct deployment,
      // users would need to use the Vercel CLI or connect their GitHub.
      const vercelUrl = `https://vercel.com/new/clone?project-name=${encodeURIComponent(
        options.appName.toLowerCase().replace(/\s+/g, '-')
      )}`;

      // Open Vercel in new tab
      window.open(vercelUrl, '_blank');

      return {
        success: true,
        message:
          'Vercel deployment page opened. Download the ZIP and push to GitHub for deployment.',
        url: vercelUrl,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.error('Vercel export failed', error);
      return { success: false, message: `Vercel export failed: ${message}` };
    }
  }

  /**
   * Export to Netlify (opens deployment page)
   */
  private async exportToNetlify(options: ExportOptions): Promise<ExportResult> {
    try {
      // Netlify drop URL
      const netlifyUrl = 'https://app.netlify.com/drop';

      // Open Netlify Drop in new tab
      window.open(netlifyUrl, '_blank');

      return {
        success: true,
        message:
          'Netlify Drop page opened. Download the ZIP first, then drag and drop the extracted folder to deploy.',
        url: netlifyUrl,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.error('Netlify export failed', error);
      return { success: false, message: `Netlify export failed: ${message}` };
    }
  }

  /**
   * Copy main component code to clipboard
   */
  private async exportToClipboard(options: ExportOptions): Promise<ExportResult> {
    try {
      // Find the main App file
      const mainFile = options.files.find(
        (f) =>
          f.path === 'App.tsx' ||
          f.path === '/App.tsx' ||
          f.path.endsWith('/App.tsx') ||
          f.path === 'index.tsx' ||
          f.path === '/index.tsx'
      );

      if (!mainFile) {
        return { success: false, message: 'No main component file found to copy' };
      }

      await navigator.clipboard.writeText(mainFile.content);

      return {
        success: true,
        message: 'Component code copied to clipboard',
        data: mainFile.content,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.error('Clipboard export failed', error);
      return { success: false, message: `Clipboard export failed: ${message}` };
    }
  }
}

// Export singleton getter
export function getExportService(): ExportService {
  return ExportService.getInstance();
}

export default ExportService;
