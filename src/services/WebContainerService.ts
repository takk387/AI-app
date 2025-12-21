'use client';

import { WebContainer, FileSystemTree, WebContainerProcess } from '@webcontainer/api';

// ============================================================================
// TYPES
// ============================================================================

export interface AppFile {
  path: string;
  content: string;
}

export interface WebContainerEvents {
  onBoot?: () => void;
  onReady?: (url: string) => void;
  onError?: (error: Error) => void;
  onOutput?: (data: string) => void;
  onServerReady?: (port: number, url: string) => void;
}

type ServiceStatus = 'idle' | 'booting' | 'ready' | 'error';

// ============================================================================
// WEBCONTAINER SERVICE SINGLETON
// ============================================================================

/**
 * Singleton service for managing a WebContainer instance.
 * WebContainers only allow one instance per page, so this ensures proper lifecycle.
 */
class WebContainerService {
  private static instance: WebContainerService | null = null;
  private container: WebContainer | null = null;
  private status: ServiceStatus = 'idle';
  private bootPromise: Promise<WebContainer> | null = null;
  private currentProcess: WebContainerProcess | null = null;
  private previewUrl: string | null = null;
  private events: WebContainerEvents = {};

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): WebContainerService {
    if (!WebContainerService.instance) {
      WebContainerService.instance = new WebContainerService();
    }
    return WebContainerService.instance;
  }

  /**
   * Set event handlers
   */
  setEventHandlers(events: WebContainerEvents): void {
    this.events = events;
  }

  /**
   * Get current status
   */
  getStatus(): ServiceStatus {
    return this.status;
  }

  /**
   * Get preview URL if server is running
   */
  getPreviewUrl(): string | null {
    return this.previewUrl;
  }

  /**
   * Boot the WebContainer instance
   * Returns existing instance if already booted
   */
  async boot(): Promise<WebContainer> {
    // Return existing container if ready
    if (this.container && this.status === 'ready') {
      return this.container;
    }

    // Return existing boot promise if booting
    if (this.bootPromise) {
      return this.bootPromise;
    }

    // Start boot process
    this.status = 'booting';
    this.events.onBoot?.();

    this.bootPromise = (async () => {
      try {
        // Boot WebContainer
        this.container = await WebContainer.boot();
        this.status = 'ready';

        // Listen for server-ready events
        this.container.on('server-ready', (port, url) => {
          this.previewUrl = url;
          this.events.onServerReady?.(port, url);
          this.events.onReady?.(url);
        });

        return this.container;
      } catch (error) {
        this.status = 'error';
        this.bootPromise = null;
        const err = error instanceof Error ? error : new Error(String(error));
        this.events.onError?.(err);
        throw err;
      }
    })();

    return this.bootPromise;
  }

  /**
   * Mount files to the WebContainer filesystem
   */
  async mountFiles(files: AppFile[]): Promise<void> {
    if (!this.container) {
      throw new Error('WebContainer not booted. Call boot() first.');
    }

    // Convert app files to WebContainer filesystem tree
    const tree = this.buildFileSystemTree(files);
    await this.container.mount(tree);
  }

  /**
   * Sanitize file path to prevent path traversal
   * WebContainer is sandboxed, but we sanitize anyway for defense-in-depth
   */
  private sanitizePath(filePath: string): string | null {
    // Remove leading prefixes
    let path = filePath;
    if (path.startsWith('src/')) path = path.slice(4);
    if (path.startsWith('./')) path = path.slice(2);
    if (path.startsWith('/')) path = path.slice(1);

    // Reject paths containing .. (path traversal attempt)
    if (path.includes('..')) {
      console.warn(`[WebContainerService] Rejected path traversal attempt: ${filePath}`);
      return null;
    }

    // Reject empty paths or paths that are just dots
    if (!path || path === '.' || path === '..') {
      return null;
    }

    return path;
  }

  /**
   * Convert flat file list to WebContainer FileSystemTree
   */
  private buildFileSystemTree(files: AppFile[]): FileSystemTree {
    const tree: FileSystemTree = {};

    for (const file of files) {
      // Sanitize path - prevent traversal and normalize
      const path = this.sanitizePath(file.path);
      if (!path) {
        continue; // Skip invalid paths
      }

      const parts = path.split('/');
      let current: FileSystemTree = tree;

      // Create nested directory structure
      for (let i = 0; i < parts.length - 1; i++) {
        const dir = parts[i];
        if (!current[dir]) {
          current[dir] = { directory: {} };
        }
        const node = current[dir];
        if ('directory' in node) {
          current = node.directory;
        }
      }

      // Add file
      const fileName = parts[parts.length - 1];
      current[fileName] = {
        file: { contents: file.content },
      };
    }

    return tree;
  }

  /**
   * Install npm dependencies
   * @param packageJson - Optional package.json content, otherwise uses mounted one
   */
  async installDependencies(packageJson?: string): Promise<void> {
    if (!this.container) {
      throw new Error('WebContainer not booted. Call boot() first.');
    }

    // If package.json provided, write it first
    if (packageJson) {
      await this.container.fs.writeFile('/package.json', packageJson);
    }

    // Run npm install
    const installProcess = await this.container.spawn('npm', ['install']);

    // Stream output
    installProcess.output.pipeTo(
      new WritableStream({
        write: (data) => {
          this.events.onOutput?.(data);
        },
      })
    );

    // Wait for completion
    const exitCode = await installProcess.exit;
    if (exitCode !== 0) {
      throw new Error(`npm install failed with exit code ${exitCode}`);
    }
  }

  /**
   * Start the development server
   * @param command - Command to run (default: 'npm run dev')
   * @returns Preview URL when server is ready
   */
  async startDevServer(command: string = 'npm run dev'): Promise<string> {
    if (!this.container) {
      throw new Error('WebContainer not booted. Call boot() first.');
    }

    // Kill existing process if any
    if (this.currentProcess) {
      this.currentProcess.kill();
      this.currentProcess = null;
    }

    // Parse command
    const [cmd, ...args] = command.split(' ');

    // Start dev server
    this.currentProcess = await this.container.spawn(cmd, args);

    // Stream output
    this.currentProcess.output.pipeTo(
      new WritableStream({
        write: (data) => {
          this.events.onOutput?.(data);
        },
      })
    );

    // Wait for server-ready event
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Dev server startup timed out after 60 seconds'));
      }, 60000);

      const originalHandler = this.events.onServerReady;
      this.events.onServerReady = (port, url) => {
        clearTimeout(timeout);
        this.events.onServerReady = originalHandler;
        originalHandler?.(port, url);
        resolve(url);
      };
    });
  }

  /**
   * Run a shell command in the container
   */
  async runCommand(
    command: string,
    args: string[] = []
  ): Promise<{ exitCode: number; output: string }> {
    if (!this.container) {
      throw new Error('WebContainer not booted. Call boot() first.');
    }

    const process = await this.container.spawn(command, args);
    let output = '';

    process.output.pipeTo(
      new WritableStream({
        write: (data) => {
          output += data;
          this.events.onOutput?.(data);
        },
      })
    );

    const exitCode = await process.exit;
    return { exitCode, output };
  }

  /**
   * Write a single file to the container
   */
  async writeFile(path: string, content: string): Promise<void> {
    if (!this.container) {
      throw new Error('WebContainer not booted. Call boot() first.');
    }

    // Ensure directory exists
    const dir = path.substring(0, path.lastIndexOf('/'));
    if (dir) {
      await this.container.spawn('mkdir', ['-p', dir]);
    }

    await this.container.fs.writeFile(path, content);
  }

  /**
   * Read a file from the container
   */
  async readFile(path: string): Promise<string> {
    if (!this.container) {
      throw new Error('WebContainer not booted. Call boot() first.');
    }

    return this.container.fs.readFile(path, 'utf-8');
  }

  /**
   * Teardown the WebContainer instance
   * Call this when unmounting the preview component
   */
  async teardown(): Promise<void> {
    // Kill running process
    if (this.currentProcess) {
      this.currentProcess.kill();
      this.currentProcess = null;
    }

    // Teardown container
    if (this.container) {
      this.container.teardown();
      this.container = null;
    }

    // Reset state
    this.status = 'idle';
    this.bootPromise = null;
    this.previewUrl = null;
    this.events = {};
  }

  /**
   * Check if container is ready
   */
  isReady(): boolean {
    return this.status === 'ready' && this.container !== null;
  }
}

// Export singleton getter
export function getWebContainerService(): WebContainerService {
  return WebContainerService.getInstance();
}

export default WebContainerService;
