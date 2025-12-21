'use client';

import type { AppFile } from '@/types/railway';
import { logger } from '@/utils/logger';

// sql.js types (loaded from CDN at runtime)
interface SqlJsDatabase {
  run(sql: string, params?: unknown[]): void;
  exec(sql: string): { columns: string[]; values: unknown[][] }[];
  getRowsModified(): number;
  close(): void;
}

interface SqlJsStatic {
  Database: new (data?: ArrayLike<number>) => SqlJsDatabase;
}

// Global type for sql.js loaded from CDN
declare global {
  interface Window {
    initSqlJs?: (config?: { locateFile?: (file: string) => string }) => Promise<SqlJsStatic>;
  }
}

const log = logger.child({ route: 'in-browser-database' });

// CDN URL for sql.js
const SQL_JS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/sql-wasm.js';

// ============================================================================
// TYPES
// ============================================================================

export interface DatabaseResult {
  columns: string[];
  values: unknown[][];
}

export interface QueryResult {
  success: boolean;
  data?: DatabaseResult[];
  error?: string;
  rowsAffected?: number;
}

// ============================================================================
// IN-BROWSER DATABASE SERVICE
// ============================================================================

/**
 * Service for in-browser SQLite database using sql.js.
 * Provides database functionality for frontend-only previews.
 */
class InBrowserDatabaseService {
  private static instance: InBrowserDatabaseService | null = null;
  private db: SqlJsDatabase | null = null;
  private SQL: SqlJsStatic | null = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  /**
   * Get the singleton instance
   */
  static getInstance(): InBrowserDatabaseService {
    if (!InBrowserDatabaseService.instance) {
      InBrowserDatabaseService.instance = new InBrowserDatabaseService();
    }
    return InBrowserDatabaseService.instance;
  }

  /**
   * Initialize sql.js (lazy, only when needed)
   * Loads sql.js from CDN to avoid webpack bundling issues
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        // Check if we're in browser environment
        if (typeof window === 'undefined') {
          throw new Error('InBrowserDatabaseService can only be used in browser environment');
        }

        log.info('Initializing sql.js from CDN...');

        // Load sql.js from CDN if not already loaded
        if (!window.initSqlJs) {
          await this.loadSqlJsFromCDN();
        }

        if (!window.initSqlJs) {
          throw new Error('Failed to load sql.js from CDN');
        }

        // Initialize sql.js with WASM from CDN
        this.SQL = await window.initSqlJs({
          locateFile: (file: string) =>
            `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`,
        });

        // Create a new database
        if (!this.SQL) {
          throw new Error('sql.js failed to initialize');
        }
        this.db = new this.SQL.Database();

        this.initialized = true;
        log.info('sql.js initialized successfully');
      } catch (error) {
        log.error('Failed to initialize sql.js', error);
        throw error;
      }
    })();

    return this.initPromise;
  }

  /**
   * Load sql.js library from CDN via script tag
   */
  private loadSqlJsFromCDN(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.initSqlJs) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = SQL_JS_CDN;
      script.async = true;

      script.onload = () => {
        log.info('sql.js script loaded from CDN');
        resolve();
      };

      script.onerror = () => {
        reject(new Error('Failed to load sql.js from CDN'));
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Reset the database (clear all data)
   */
  async reset(): Promise<void> {
    if (!this.SQL) {
      await this.initialize();
    }

    if (this.db) {
      this.db.close();
    }

    if (!this.SQL) {
      throw new Error('sql.js not initialized');
    }
    this.db = new this.SQL.Database();
    log.info('Database reset');
  }

  /**
   * Execute a SQL query
   */
  async query(sql: string, params?: unknown[]): Promise<QueryResult> {
    await this.initialize();

    if (!this.db) {
      return { success: false, error: 'Database not initialized' };
    }

    try {
      if (params && params.length > 0) {
        this.db.run(sql, params);
        return {
          success: true,
          rowsAffected: this.db.getRowsModified(),
        };
      } else {
        const results = this.db.exec(sql);
        return {
          success: true,
          data: results,
          rowsAffected: this.db.getRowsModified(),
        };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.error('SQL query failed', error);
      return { success: false, error: message };
    }
  }

  /**
   * Parse Prisma schema and create SQLite tables
   */
  async initializeFromPrismaSchema(schemaContent: string): Promise<QueryResult> {
    await this.initialize();

    try {
      const createStatements = this.parsePrismaToSqlite(schemaContent);

      for (const statement of createStatements) {
        const result = await this.query(statement);
        if (!result.success) {
          return result;
        }
      }

      log.info('Prisma schema initialized', { tableCount: createStatements.length });
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.error('Failed to initialize Prisma schema', error);
      return { success: false, error: message };
    }
  }

  /**
   * Initialize database from app files (looks for Prisma schema or SQL files)
   * @returns true if a database schema was found and initialized
   */
  async initializeFromFiles(files: AppFile[]): Promise<boolean> {
    await this.initialize();

    // Look for Prisma schema
    const prismaFile = files.find(
      (f) => f.path.includes('schema.prisma') || f.path.endsWith('.prisma')
    );

    if (prismaFile) {
      const result = await this.initializeFromPrismaSchema(prismaFile.content);
      return result.success;
    }

    // Look for SQL migration files
    const sqlFiles = files.filter(
      (f) => f.path.endsWith('.sql') && (f.path.includes('migration') || f.path.includes('schema'))
    );

    if (sqlFiles.length > 0) {
      for (const file of sqlFiles) {
        const result = await this.query(file.content);
        if (!result.success) {
          return false;
        }
      }
      log.info('SQL migrations applied', { fileCount: sqlFiles.length });
      return true;
    }

    // No schema found
    log.info('No database schema found in files');
    return false;
  }

  /**
   * Convert Prisma schema to SQLite CREATE TABLE statements
   */
  private parsePrismaToSqlite(schema: string): string[] {
    const statements: string[] = [];

    // Match model blocks
    const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
    let match;

    while ((match = modelRegex.exec(schema)) !== null) {
      const modelName = match[1];
      const modelBody = match[2];

      const columns = this.parseModelFields(modelBody);

      if (columns.length > 0) {
        const createStatement = `CREATE TABLE IF NOT EXISTS ${modelName} (\n  ${columns.join(',\n  ')}\n);`;
        statements.push(createStatement);
      }
    }

    return statements;
  }

  /**
   * Parse Prisma model fields to SQLite column definitions
   */
  private parseModelFields(modelBody: string): string[] {
    const columns: string[] = [];
    const lines = modelBody.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines, comments, and relation fields
      if (
        !trimmed ||
        trimmed.startsWith('//') ||
        trimmed.startsWith('@@') ||
        trimmed.includes('[]') // Array relations
      ) {
        continue;
      }

      // Parse field: name Type @attributes
      const fieldMatch = trimmed.match(/^(\w+)\s+(\w+)(\?)?(\s+.*)?$/);

      if (fieldMatch) {
        const [, fieldName, fieldType, optional, attributes] = fieldMatch;

        // Map Prisma types to SQLite types
        const sqliteType = this.prismaTypeToSqlite(fieldType);

        if (sqliteType) {
          let columnDef = `${fieldName} ${sqliteType}`;

          // Check for @id
          if (attributes?.includes('@id')) {
            columnDef += ' PRIMARY KEY';
            if (fieldType === 'Int' && attributes?.includes('@default(autoincrement())')) {
              columnDef += ' AUTOINCREMENT';
            }
          }

          // Check for @unique
          if (attributes?.includes('@unique')) {
            columnDef += ' UNIQUE';
          }

          // NOT NULL unless optional
          if (!optional && !attributes?.includes('@id')) {
            columnDef += ' NOT NULL';
          }

          // Handle @default
          const defaultMatch = attributes?.match(/@default\(([^)]+)\)/);
          if (defaultMatch) {
            const defaultValue = this.parseDefaultValue(defaultMatch[1], fieldType);
            if (defaultValue !== null) {
              columnDef += ` DEFAULT ${defaultValue}`;
            }
          }

          columns.push(columnDef);
        }
      }
    }

    return columns;
  }

  /**
   * Map Prisma type to SQLite type
   */
  private prismaTypeToSqlite(prismaType: string): string | null {
    const typeMap: Record<string, string> = {
      String: 'TEXT',
      Int: 'INTEGER',
      BigInt: 'INTEGER',
      Float: 'REAL',
      Decimal: 'REAL',
      Boolean: 'INTEGER', // SQLite uses 0/1 for boolean
      DateTime: 'TEXT', // ISO 8601 string
      Json: 'TEXT', // JSON as text
      Bytes: 'BLOB',
    };

    return typeMap[prismaType] || null;
  }

  /**
   * Parse Prisma default value to SQLite default
   */
  private parseDefaultValue(value: string, _fieldType: string): string | null {
    // Handle common defaults
    if (value === 'autoincrement()') {
      return null; // Handled by AUTOINCREMENT
    }

    if (value === 'now()') {
      return "datetime('now')";
    }

    if (value === 'uuid()' || value === 'cuid()') {
      return null; // Will be generated at insert time
    }

    if (value === 'true') return '1';
    if (value === 'false') return '0';

    // String literal
    if (value.startsWith('"') && value.endsWith('"')) {
      return value.replace(/"/g, "'");
    }

    // Number
    if (/^-?\d+(\.\d+)?$/.test(value)) {
      return value;
    }

    return null;
  }

  /**
   * Get all tables in the database
   */
  async getTables(): Promise<string[]> {
    const result = await this.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    );

    if (!result.success || !result.data || result.data.length === 0) {
      return [];
    }

    return result.data[0].values.map((row) => row[0] as string);
  }

  /**
   * Check if database is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Close the database
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.initialized = false;
    this.initPromise = null;
  }
}

// Export singleton getter
export function getInBrowserDatabaseService(): InBrowserDatabaseService {
  return InBrowserDatabaseService.getInstance();
}

export default InBrowserDatabaseService;
