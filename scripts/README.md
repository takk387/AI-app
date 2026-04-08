# Scripts Directory

This directory contains utility scripts for the AI-app repository.

## Available Scripts

### Repository Statistics (`repo-stats.ts`)

Generates comprehensive statistics about the repository including file counts, lines of code, and file sizes.

**Usage:**
```bash
npm run stats
```

**Output:**
- Displays detailed statistics in the console
- Generates a `repo-stats.json` file with all metrics (this file is gitignored)

**Statistics Included:**
- Total directory size (excluding node_modules, .git, etc.)
- Total number of files
- Total lines of code
- Breakdown by file type (TypeScript, JavaScript, Markdown, CSS, JSON, etc.)
- Average lines per file
- Average file size
- Largest category by lines

**Example Output:**
```
═══════════════════════════════════════════════════════
📊 AI-APP REPOSITORY STATISTICS
═══════════════════════════════════════════════════════

📁 OVERALL STATISTICS
───────────────────────────────────────────────────────
   Total Directory Size:  10.55 MB
   Total Files:           728
   Total Lines of Code:   268,133

📂 FILE BREAKDOWN BY TYPE
───────────────────────────────────────────────────────
   TYPESCRIPT
      Files:  555
      Lines:  165,882
      Size:   4.9 MB
   ...
```

### Version Generator (`generate-versions.ts`)

Generates version configuration file for the application.

**Usage:**
```bash
npm run generate:versions
```

This script is automatically run before `dev` and `build` commands.

## Adding New Scripts

When adding new scripts to this directory:

1. Use TypeScript for type safety
2. Include proper error handling
3. Add documentation in this README
4. Add an npm script command in `package.json` for easy execution
5. If the script generates files, add them to `.gitignore` if they shouldn't be committed
