import { WebContainer } from '@webcontainer/api';
import type { AppFile } from '@/types/railway';
import { toFileSystemTree, ensurePackageJson } from '@/utils/webContainerFS';
import { logger } from '@/utils/logger';

export type RuntimeStatus =
  | 'idle'
  | 'booting'
  | 'mounting'
  | 'installing'
  | 'running'
  | 'ready'
  | 'error';

type ServerReadyCallback = (port: number, url: string) => void;

const log = logger.child({ route: 'WebContainerService' });

class WebContainerService {
  private instance: WebContainer | null = null;
  private status: RuntimeStatus = 'idle';
  private serverReadyCallbacks: ServerReadyCallback[] = [];
  private previewUrl: string | null = null;
  private statusListeners: Array<(status: RuntimeStatus) => void> = [];

  static isSupported(): boolean {
    return typeof SharedArrayBuffer !== 'undefined';
  }

  getStatus(): RuntimeStatus {
    return this.status;
  }

  getPreviewUrl(): string | null {
    return this.previewUrl;
  }

  onStatusChange(listener: (status: RuntimeStatus) => void): () => void {
    this.statusListeners.push(listener);
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== listener);
    };
  }

  onServerReady(callback: ServerReadyCallback): () => void {
    this.serverReadyCallbacks.push(callback);
    return () => {
      this.serverReadyCallbacks = this.serverReadyCallbacks.filter((cb) => cb !== callback);
    };
  }

  private setStatus(status: RuntimeStatus): void {
    this.status = status;
    for (const listener of this.statusListeners) {
      listener(status);
    }
  }

  async boot(): Promise<void> {
    if (this.instance) return;
    if (!WebContainerService.isSupported()) {
      this.setStatus('error');
      throw new Error('WebContainers requires SharedArrayBuffer (Chrome/Firefox only)');
    }

    this.setStatus('booting');
    try {
      this.instance = await WebContainer.boot();
      this.instance.on('server-ready', (port: number, url: string) => {
        this.previewUrl = url;
        this.setStatus('ready');
        for (const cb of this.serverReadyCallbacks) {
          cb(port, url);
        }
      });
      log.info('WebContainer booted');
    } catch (error) {
      this.setStatus('error');
      log.error('WebContainer boot failed', error);
      throw error;
    }
  }

  async mountProject(files: AppFile[], deps: Record<string, string>): Promise<void> {
    if (!this.instance) throw new Error('WebContainer not booted');

    this.setStatus('mounting');
    try {
      const allFiles = ensurePackageJson(files, deps);
      const fsTree = toFileSystemTree(allFiles);
      await this.instance.mount(fsTree);
      log.info('Project mounted', { fileCount: allFiles.length });
    } catch (error) {
      this.setStatus('error');
      log.error('Mount failed', error);
      throw error;
    }
  }

  async install(onOutput?: (data: string) => void): Promise<number> {
    if (!this.instance) throw new Error('WebContainer not booted');

    this.setStatus('installing');
    try {
      const process = await this.instance.spawn('npm', ['install', '--prefer-offline']);

      process.output
        .pipeTo(
          new WritableStream({
            write(data) {
              onOutput?.(data);
            },
          })
        )
        .catch(() => {});

      const exitCode = await process.exit;
      if (exitCode !== 0) {
        this.setStatus('error');
        log.error('npm install failed', undefined, { exitCode });
      }
      return exitCode;
    } catch (error) {
      this.setStatus('error');
      log.error('Install failed', error);
      throw error;
    }
  }

  async startDev(onOutput?: (data: string) => void): Promise<void> {
    if (!this.instance) throw new Error('WebContainer not booted');

    this.setStatus('running');
    try {
      const process = await this.instance.spawn('npm', ['run', 'dev']);

      process.output
        .pipeTo(
          new WritableStream({
            write(data) {
              onOutput?.(data);
            },
          })
        )
        .catch(() => {});
    } catch (error) {
      this.setStatus('error');
      log.error('Dev server start failed', error);
      throw error;
    }
  }

  async teardown(): Promise<void> {
    if (this.instance) {
      this.instance.teardown();
      this.instance = null;
      this.previewUrl = null;
      this.setStatus('idle');
      log.info('WebContainer torn down');
    }
  }
}

let serviceInstance: WebContainerService | null = null;

export function getWebContainerService(): WebContainerService {
  if (!serviceInstance) {
    serviceInstance = new WebContainerService();
  }
  return serviceInstance;
}
