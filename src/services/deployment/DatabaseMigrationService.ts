/**
 * DatabaseMigrationService
 *
 * Service for migrating data from browser SQLite to production databases.
 * Handles schema transformation and data migration.
 */

import type { DatabaseProvider } from '@/types/deployment/unified';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Migration status
 */
export type MigrationStatus =
  | 'pending'
  | 'extracting'
  | 'transforming'
  | 'migrating'
  | 'verifying'
  | 'completed'
  | 'failed';

/**
 * Table schema definition
 */
export interface TableSchema {
  name: string;
  columns: ColumnSchema[];
  primaryKey?: string[];
  indexes?: IndexSchema[];
  foreignKeys?: ForeignKeySchema[];
}

/**
 * Column schema definition
 */
export interface ColumnSchema {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  autoIncrement?: boolean;
}

/**
 * Index schema definition
 */
export interface IndexSchema {
  name: string;
  columns: string[];
  unique: boolean;
}

/**
 * Foreign key schema definition
 */
export interface ForeignKeySchema {
  columns: string[];
  referencedTable: string;
  referencedColumns: string[];
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

/**
 * Extracted database data
 */
export interface ExtractedData {
  schema: TableSchema[];
  data: Record<string, Record<string, unknown>[]>;
  version?: string;
}

/**
 * Migration request
 */
export interface MigrationRequest {
  projectId: string;
  sourceData: ExtractedData;
  targetProvider: DatabaseProvider;
  targetConnectionUrl: string;
  options?: MigrationOptions;
}

/**
 * Migration options
 */
export interface MigrationOptions {
  dropExisting?: boolean;
  validateData?: boolean;
  batchSize?: number;
  onProgress?: (progress: MigrationProgress) => void;
}

/**
 * Migration progress
 */
export interface MigrationProgress {
  status: MigrationStatus;
  currentTable?: string;
  tablesCompleted: number;
  totalTables: number;
  rowsCompleted: number;
  totalRows: number;
  percentage: number;
  error?: string;
}

/**
 * Migration result
 */
export interface MigrationResult {
  success: boolean;
  tablesCreated: number;
  rowsMigrated: number;
  duration: number;
  error?: string;
}

// ============================================================================
// TYPE MAPPING
// ============================================================================

/**
 * SQLite to PostgreSQL type mapping
 */
const SQLITE_TO_POSTGRES: Record<string, string> = {
  INTEGER: 'INTEGER',
  REAL: 'DOUBLE PRECISION',
  TEXT: 'TEXT',
  BLOB: 'BYTEA',
  BOOLEAN: 'BOOLEAN',
  DATETIME: 'TIMESTAMP WITH TIME ZONE',
  DATE: 'DATE',
  TIME: 'TIME',
  JSON: 'JSONB',
};

/**
 * SQLite to libSQL type mapping (mostly compatible)
 */
const SQLITE_TO_LIBSQL: Record<string, string> = {
  INTEGER: 'INTEGER',
  REAL: 'REAL',
  TEXT: 'TEXT',
  BLOB: 'BLOB',
  BOOLEAN: 'INTEGER', // libSQL stores booleans as integers
  DATETIME: 'TEXT',
  DATE: 'TEXT',
  TIME: 'TEXT',
  JSON: 'TEXT',
};

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class DatabaseMigrationService {
  private progress: MigrationProgress;

  constructor() {
    this.progress = this.createInitialProgress();
  }

  // --------------------------------------------------------------------------
  // PUBLIC API
  // --------------------------------------------------------------------------

  /**
   * Migrate data from source to target database
   */
  async migrate(request: MigrationRequest): Promise<MigrationResult> {
    const startTime = Date.now();

    try {
      this.progress = this.createInitialProgress();
      this.updateProgress({ status: 'extracting' });

      // Validate source data
      this.validateSourceData(request.sourceData);

      // Transform schema for target provider
      this.updateProgress({ status: 'transforming' });
      const transformedSchema = this.transformSchema(
        request.sourceData.schema,
        request.targetProvider
      );

      // Execute migration
      this.updateProgress({ status: 'migrating' });
      const result = await this.executeMigration(
        transformedSchema,
        request.sourceData.data,
        request.targetConnectionUrl,
        request.targetProvider,
        request.options
      );

      // Verify migration
      if (request.options?.validateData) {
        this.updateProgress({ status: 'verifying' });
        await this.verifyMigration(
          request.sourceData.data,
          request.targetConnectionUrl,
          request.targetProvider
        );
      }

      this.updateProgress({ status: 'completed', percentage: 100 });

      return {
        success: true,
        tablesCreated: transformedSchema.length,
        rowsMigrated: result.rowsMigrated,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Migration failed';
      this.updateProgress({ status: 'failed', error: errorMessage });

      return {
        success: false,
        tablesCreated: 0,
        rowsMigrated: 0,
        duration: Date.now() - startTime,
        error: errorMessage,
      };
    }
  }

  /**
   * Extract schema from SQL statements
   */
  extractSchemaFromSQL(sqlStatements: string): TableSchema[] {
    const schemas: TableSchema[] = [];
    const createTableRegex =
      /CREATE TABLE\s+(?:IF NOT EXISTS\s+)?["'`]?(\w+)["'`]?\s*\(([\s\S]*?)\)/gi;

    let match;
    while ((match = createTableRegex.exec(sqlStatements)) !== null) {
      const tableName = match[1];
      const columnsStr = match[2];

      const columns = this.parseColumns(columnsStr);
      const primaryKey = this.extractPrimaryKey(columnsStr);
      const foreignKeys = this.extractForeignKeys(columnsStr);

      schemas.push({
        name: tableName,
        columns,
        primaryKey,
        foreignKeys,
      });
    }

    return schemas;
  }

  /**
   * Generate SQL for target database
   */
  generateSQL(schema: TableSchema[], targetProvider: DatabaseProvider): string {
    const transformedSchema = this.transformSchema(schema, targetProvider);
    return transformedSchema
      .map((table) => this.generateCreateTableSQL(table, targetProvider))
      .join('\n\n');
  }

  /**
   * Get current migration progress
   */
  getProgress(): MigrationProgress {
    return { ...this.progress };
  }

  // --------------------------------------------------------------------------
  // PRIVATE METHODS
  // --------------------------------------------------------------------------

  private createInitialProgress(): MigrationProgress {
    return {
      status: 'pending',
      tablesCompleted: 0,
      totalTables: 0,
      rowsCompleted: 0,
      totalRows: 0,
      percentage: 0,
    };
  }

  private updateProgress(updates: Partial<MigrationProgress>): void {
    this.progress = { ...this.progress, ...updates };
  }

  private validateSourceData(data: ExtractedData): void {
    if (!data.schema || data.schema.length === 0) {
      throw new Error('Source data has no schema defined');
    }

    for (const table of data.schema) {
      if (!table.name || !table.columns || table.columns.length === 0) {
        throw new Error(`Invalid schema for table: ${table.name || 'unknown'}`);
      }
    }
  }

  private transformSchema(schema: TableSchema[], targetProvider: DatabaseProvider): TableSchema[] {
    const typeMap = targetProvider === 'neon' ? SQLITE_TO_POSTGRES : SQLITE_TO_LIBSQL;

    return schema.map((table) => ({
      ...table,
      columns: table.columns.map((column) => ({
        ...column,
        type: this.mapColumnType(column.type, typeMap),
      })),
    }));
  }

  private mapColumnType(sourceType: string, typeMap: Record<string, string>): string {
    const normalizedType = sourceType.toUpperCase().split('(')[0].trim();
    return typeMap[normalizedType] || sourceType;
  }

  private parseColumns(columnsStr: string): ColumnSchema[] {
    const columns: ColumnSchema[] = [];
    const lines = columnsStr.split(',').map((l) => l.trim());

    for (const line of lines) {
      // Skip constraints
      if (
        line.toUpperCase().startsWith('PRIMARY KEY') ||
        line.toUpperCase().startsWith('FOREIGN KEY') ||
        line.toUpperCase().startsWith('UNIQUE') ||
        line.toUpperCase().startsWith('CHECK') ||
        line.toUpperCase().startsWith('CONSTRAINT')
      ) {
        continue;
      }

      const match = line.match(/["'`]?(\w+)["'`]?\s+(\w+(?:\([^)]+\))?)/i);
      if (match) {
        const [, name, type] = match;
        columns.push({
          name,
          type,
          nullable: !line.toUpperCase().includes('NOT NULL'),
          autoIncrement: line.toUpperCase().includes('AUTOINCREMENT'),
          defaultValue: this.extractDefaultValue(line),
        });
      }
    }

    return columns;
  }

  private extractDefaultValue(columnDef: string): string | undefined {
    const match = columnDef.match(/DEFAULT\s+(.+?)(?:,|$)/i);
    return match ? match[1].trim() : undefined;
  }

  private extractPrimaryKey(columnsStr: string): string[] | undefined {
    // Check for inline PRIMARY KEY
    const inlineMatch = columnsStr.match(/(\w+)\s+\w+.*PRIMARY KEY/i);
    if (inlineMatch) {
      return [inlineMatch[1]];
    }

    // Check for table-level PRIMARY KEY
    const tableMatch = columnsStr.match(/PRIMARY KEY\s*\(([^)]+)\)/i);
    if (tableMatch) {
      return tableMatch[1].split(',').map((col) => col.trim().replace(/["'`]/g, ''));
    }

    return undefined;
  }

  private extractForeignKeys(columnsStr: string): ForeignKeySchema[] {
    const foreignKeys: ForeignKeySchema[] = [];
    const fkRegex = /FOREIGN KEY\s*\(([^)]+)\)\s*REFERENCES\s+(\w+)\s*\(([^)]+)\)/gi;

    let match;
    while ((match = fkRegex.exec(columnsStr)) !== null) {
      foreignKeys.push({
        columns: match[1].split(',').map((c) => c.trim().replace(/["'`]/g, '')),
        referencedTable: match[2],
        referencedColumns: match[3].split(',').map((c) => c.trim().replace(/["'`]/g, '')),
      });
    }

    return foreignKeys;
  }

  private generateCreateTableSQL(table: TableSchema, targetProvider: DatabaseProvider): string {
    const isPostgres = targetProvider === 'neon';
    const quote = isPostgres ? '"' : '`';

    const columnDefs = table.columns.map((col) => {
      let def = `${quote}${col.name}${quote} ${col.type}`;

      if (!col.nullable) {
        def += ' NOT NULL';
      }

      if (col.defaultValue) {
        def += ` DEFAULT ${col.defaultValue}`;
      }

      if (col.autoIncrement && isPostgres) {
        def = `${quote}${col.name}${quote} SERIAL`;
      }

      return def;
    });

    if (table.primaryKey && table.primaryKey.length > 0) {
      const pkCols = table.primaryKey.map((c) => `${quote}${c}${quote}`).join(', ');
      columnDefs.push(`PRIMARY KEY (${pkCols})`);
    }

    if (table.foreignKeys) {
      for (const fk of table.foreignKeys) {
        const fkCols = fk.columns.map((c) => `${quote}${c}${quote}`).join(', ');
        const refCols = fk.referencedColumns.map((c) => `${quote}${c}${quote}`).join(', ');
        let fkDef = `FOREIGN KEY (${fkCols}) REFERENCES ${quote}${fk.referencedTable}${quote} (${refCols})`;

        if (fk.onDelete) {
          fkDef += ` ON DELETE ${fk.onDelete}`;
        }
        if (fk.onUpdate) {
          fkDef += ` ON UPDATE ${fk.onUpdate}`;
        }

        columnDefs.push(fkDef);
      }
    }

    return `CREATE TABLE ${quote}${table.name}${quote} (\n  ${columnDefs.join(',\n  ')}\n);`;
  }

  private async executeMigration(
    schema: TableSchema[],
    data: Record<string, Record<string, unknown>[]>,
    _connectionUrl: string,
    _targetProvider: DatabaseProvider,
    options?: MigrationOptions
  ): Promise<{ rowsMigrated: number }> {
    const batchSize = options?.batchSize || 1000;
    let totalRows = 0;

    // Calculate total rows
    for (const tableData of Object.values(data)) {
      totalRows += tableData.length;
    }

    this.updateProgress({
      totalTables: schema.length,
      totalRows,
    });

    let rowsMigrated = 0;

    // TODO: Implement actual database operations
    // For now, simulate the migration
    for (let i = 0; i < schema.length; i++) {
      const table = schema[i];
      const tableData = data[table.name] || [];

      this.updateProgress({
        currentTable: table.name,
        tablesCompleted: i,
      });

      // Simulate inserting data in batches
      for (let j = 0; j < tableData.length; j += batchSize) {
        const batch = tableData.slice(j, j + batchSize);
        rowsMigrated += batch.length;

        this.updateProgress({
          rowsCompleted: rowsMigrated,
          percentage: Math.round((rowsMigrated / totalRows) * 100),
        });

        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }

    this.updateProgress({
      tablesCompleted: schema.length,
    });

    return { rowsMigrated };
  }

  private async verifyMigration(
    _sourceData: Record<string, Record<string, unknown>[]>,
    _connectionUrl: string,
    _targetProvider: DatabaseProvider
  ): Promise<void> {
    // TODO: Implement verification logic
    // - Count rows in each table
    // - Compare with source data
    // - Check for data integrity

    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let migrationServiceInstance: DatabaseMigrationService | null = null;

/**
 * Get or create the migration service instance
 */
export function getDatabaseMigrationService(): DatabaseMigrationService {
  if (!migrationServiceInstance) {
    migrationServiceInstance = new DatabaseMigrationService();
  }
  return migrationServiceInstance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetDatabaseMigrationService(): void {
  migrationServiceInstance = null;
}
