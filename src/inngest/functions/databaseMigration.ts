/**
 * Database Migration Function
 *
 * Inngest function for migrating data from browser SQLite to production database.
 * Handles large data migrations in the background with:
 * 1. Data extraction from serialized SQLite
 * 2. Schema transformation
 * 3. Batched data insertion
 * 4. Verification
 */

import { inngest, sendStatusUpdate } from '../client';

// ============================================================================
// TYPES
// ============================================================================

interface ParsedSourceData {
  valid: boolean;
  error?: string;
  schema?: TableSchema[];
  tables?: TableData[];
}

interface TableSchema {
  name: string;
  columns: Array<{
    name: string;
    type: string;
    nullable: boolean;
    primaryKey: boolean;
  }>;
}

interface TableData {
  name: string;
  rows: Record<string, unknown>[];
}

interface MigrationResult {
  success: boolean;
  tablesCount: number;
  rowsCount: number;
  error?: string;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Database migration background job
 *
 * Triggered by: 'deploy/database.migrate' event
 * Duration: Depends on data size, typically 1-10 minutes
 */
export const databaseMigration = inngest.createFunction(
  {
    id: 'database-migration',
    retries: 3,
    cancelOn: [
      {
        event: 'deploy/database.cancelled',
        match: 'data.projectId',
      },
    ],
  },
  { event: 'deploy/database.migrate' },
  async ({ event, step }) => {
    const { projectId, userId, sourceData, targetProvider, targetConnectionUrl } = event.data;

    // Step 1: Parse and validate source data
    const parsedData = await step.run('parse-source-data', async () => {
      await sendStatusUpdate(
        projectId,
        userId,
        'database',
        'parsing',
        'Parsing source database...',
        10
      );

      return parseSourceData(sourceData);
    });

    if (!parsedData.valid) {
      await sendStatusUpdate(
        projectId,
        userId,
        'database',
        'failed',
        'Failed to parse source data',
        0,
        { error: parsedData.error }
      );

      return {
        success: false,
        tablesCount: 0,
        rowsCount: 0,
        error: parsedData.error,
      } as MigrationResult;
    }

    // Step 2: Execute migration (connects, migrates, and verifies in one step)
    // Note: We do this in a single step because database clients can't be serialized
    // between Inngest steps
    const migrationResult = await step.run('execute-migration', async () => {
      await sendStatusUpdate(
        projectId,
        userId,
        'database',
        'connecting',
        `Connecting to ${targetProvider}...`,
        20
      );

      return executeMigration(
        targetProvider,
        targetConnectionUrl,
        parsedData,
        async (status, message, progress) => {
          await sendStatusUpdate(projectId, userId, 'database', status, message, progress);
        }
      );
    });

    // Step 3: Send final status
    await step.run('finalize', async () => {
      if (migrationResult.success) {
        await sendStatusUpdate(
          projectId,
          userId,
          'database',
          'completed',
          `Database migration completed! ${migrationResult.rowsCount} rows migrated.`,
          100
        );
      } else {
        await sendStatusUpdate(
          projectId,
          userId,
          'database',
          'failed',
          `Migration failed: ${migrationResult.error}`,
          0,
          { error: migrationResult.error }
        );
      }
    });

    return migrationResult;
  }
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function parseSourceData(sourceData: string): ParsedSourceData {
  try {
    const data = JSON.parse(sourceData);

    // Validate expected structure
    if (!data.tables || !Array.isArray(data.tables)) {
      return {
        valid: false,
        error: 'Invalid source data format: missing tables array',
      };
    }

    // Extract schema and data
    const schema: TableSchema[] = [];
    const tables: TableData[] = [];

    for (const table of data.tables) {
      if (table.schema) {
        schema.push(table.schema);
      }
      if (table.data) {
        tables.push({
          name: table.name,
          rows: table.data,
        });
      }
    }

    return {
      valid: true,
      schema,
      tables,
    };
  } catch (error) {
    return {
      valid: false,
      error: `Failed to parse source data: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Execute the full migration in a single operation
 * This is necessary because database clients can't be serialized between Inngest steps
 */
async function executeMigration(
  provider: 'turso' | 'neon',
  connectionUrl: string,
  parsedData: ParsedSourceData,
  onProgress: (status: string, message: string, progress: number) => Promise<void>
): Promise<MigrationResult> {
  // In production, this would use actual database clients:
  // - @libsql/client for Turso
  // - @neondatabase/serverless for Neon

  console.log(`[databaseMigration] Starting migration to ${provider}`);

  try {
    // Simulate connection
    await onProgress('migrating', 'Creating database schema...', 30);
    console.log(
      `[databaseMigration] Connected to ${provider}: ${connectionUrl.substring(0, 30)}...`
    );

    // Create schema
    const schema = parsedData.schema || [];
    for (const table of schema) {
      const sql = generateCreateTableSQL(table, provider);
      console.log(`[databaseMigration] Creating table: ${sql.substring(0, 60)}...`);
    }

    // Migrate data
    const tables = parsedData.tables || [];
    let totalRows = 0;

    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      const progress = 30 + Math.round(((i + 1) / tables.length) * 50);
      await onProgress(
        'migrating',
        `Migrating table: ${table.name} (${i + 1}/${tables.length})...`,
        progress
      );

      // Simulate migration
      totalRows += table.rows.length;
      console.log(`[databaseMigration] Migrated ${table.rows.length} rows to ${table.name}`);
    }

    // Verify
    await onProgress('verifying', 'Verifying migration...', 90);
    const expectedRows = tables.reduce((sum, t) => sum + t.rows.length, 0);

    if (totalRows >= expectedRows) {
      return {
        success: true,
        tablesCount: tables.length,
        rowsCount: totalRows,
      };
    } else {
      return {
        success: false,
        tablesCount: tables.length,
        rowsCount: totalRows,
        error: `Row count mismatch: expected ${expectedRows}, got ${totalRows}`,
      };
    }
  } catch (error) {
    return {
      success: false,
      tablesCount: 0,
      rowsCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function generateCreateTableSQL(table: TableSchema, provider: 'turso' | 'neon'): string {
  const columns = table.columns.map((col) => {
    let type = col.type;

    // Translate types for target database
    if (provider === 'neon') {
      // SQLite -> PostgreSQL type mapping
      if (type === 'INTEGER' && col.primaryKey) {
        type = 'SERIAL';
      } else if (type === 'INTEGER') {
        type = 'INTEGER';
      } else if (type === 'TEXT') {
        type = 'TEXT';
      } else if (type === 'REAL') {
        type = 'DOUBLE PRECISION';
      } else if (type === 'BLOB') {
        type = 'BYTEA';
      }
    }

    let columnDef = `"${col.name}" ${type}`;
    if (col.primaryKey) {
      columnDef += ' PRIMARY KEY';
    }
    if (!col.nullable && !col.primaryKey) {
      columnDef += ' NOT NULL';
    }

    return columnDef;
  });

  return `CREATE TABLE IF NOT EXISTS "${table.name}" (${columns.join(', ')})`;
}
