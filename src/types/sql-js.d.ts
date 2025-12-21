// Type declarations for sql.js
declare module 'sql.js' {
  export interface SqlJsDatabase {
    run(sql: string, params?: unknown[]): void;
    exec(sql: string): QueryExecResult[];
    getRowsModified(): number;
    close(): void;
    export(): Uint8Array;
  }

  export interface QueryExecResult {
    columns: string[];
    values: unknown[][];
  }

  export interface SqlJsStatic {
    Database: new (data?: ArrayLike<number>) => SqlJsDatabase;
  }

  export interface SqlJsConfig {
    locateFile?: (file: string) => string;
  }

  export default function initSqlJs(config?: SqlJsConfig): Promise<SqlJsStatic>;
}
