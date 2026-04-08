# Repository Statistics

This document provides an overview of the AI-app repository statistics.

## Quick Stats (as of latest run)

- **Total Directory Size**: 10.56 MB (excluding node_modules, .git, build artifacts)
- **Total Files**: 730 files
- **Total Lines of Code**: 268,242 lines

## Breakdown by File Type

| Type       | Files | Lines    | Size     | % of Total Lines |
|------------|-------|----------|----------|------------------|
| TypeScript | 555   | 165,882  | 4.9 MB   | 62%              |
| Markdown   | 106   | 50,479   | 1.51 MB  | 19%              |
| Other      | 49    | 31,273   | 1.04 MB  | 12%              |
| JSON       | 10    | 18,974   | 677 KB   | 7%               |
| JavaScript | 9     | 923      | 27 KB    | 0.3%             |
| CSS        | 1     | 711      | 16 KB    | 0.3%             |

## Metrics

- **Average Lines per File**: 367 lines
- **Average File Size**: 14.81 KB
- **Primary Language**: TypeScript (62% of codebase)

## How to Update These Stats

Run the following command to generate fresh statistics:

```bash
npm run stats
```

This will:
1. Scan the entire repository (excluding node_modules, .git, etc.)
2. Display comprehensive statistics in the console
3. Generate a `scripts/repo-stats.json` file with detailed metrics

For more information, see `scripts/README.md`.
