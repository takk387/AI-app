#!/usr/bin/env tsx
/**
 * Repository Statistics Script
 * 
 * Calculates comprehensive statistics about the AI-app repository:
 * - Total directory size
 * - Number of files by type
 * - Lines of code
 * - File size breakdowns
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface FileStats {
  count: number;
  lines: number;
  size: number;
}

interface RepoStats {
  totalSize: string;
  totalSizeBytes: number;
  files: {
    [key: string]: FileStats;
  };
  totalFiles: number;
  totalLines: number;
}

// File patterns to include in statistics
const FILE_PATTERNS = {
  typescript: ['.ts', '.tsx'],
  javascript: ['.js', '.jsx'],
  styles: ['.css', '.scss', '.sass'],
  markdown: ['.md', '.mdx'],
  json: ['.json'],
  config: ['.config.js', '.config.ts', 'package.json', 'tsconfig.json'],
};

// Directories to exclude
const EXCLUDE_DIRS = [
  'node_modules',
  '.git',
  '.next',
  'build',
  'dist',
  'coverage',
  '.husky',
];

function getDirectorySize(dirPath: string): number {
  try {
    const output = execSync(`du -sb "${dirPath}" 2>/dev/null | cut -f1`, {
      encoding: 'utf-8',
    });
    return parseInt(output.trim(), 10);
  } catch (error) {
    console.error('Error calculating directory size:', error);
    return 0;
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function getAllFiles(
  dirPath: string,
  arrayOfFiles: string[] = []
): string[] {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    
    // Skip excluded directories
    if (fs.statSync(filePath).isDirectory()) {
      const dirName = path.basename(filePath);
      if (!EXCLUDE_DIRS.includes(dirName)) {
        arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
      }
    } else {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

function countLines(filePath: string): number {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.split('\n').length;
  } catch (error) {
    return 0;
  }
}

function getFileSize(filePath: string): number {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

function getFileCategory(filePath: string): string {
  const ext = path.extname(filePath);
  const basename = path.basename(filePath);

  for (const [category, patterns] of Object.entries(FILE_PATTERNS)) {
    if (patterns.some(pattern => {
      if (pattern.startsWith('.')) {
        return ext === pattern;
      }
      return basename === pattern;
    })) {
      return category;
    }
  }

  return 'other';
}

function calculateStats(rootPath: string): RepoStats {
  console.log('🔍 Scanning repository...\n');

  const allFiles = getAllFiles(rootPath);
  const stats: RepoStats = {
    totalSize: '',
    totalSizeBytes: 0,
    files: {},
    totalFiles: 0,
    totalLines: 0,
  };

  // Calculate directory size
  stats.totalSizeBytes = getDirectorySize(rootPath);
  stats.totalSize = formatBytes(stats.totalSizeBytes);

  // Process each file
  allFiles.forEach((file, index) => {
    const category = getFileCategory(file);
    
    if (!stats.files[category]) {
      stats.files[category] = { count: 0, lines: 0, size: 0 };
    }

    stats.files[category].count++;
    stats.files[category].lines += countLines(file);
    stats.files[category].size += getFileSize(file);

    // Progress indicator
    if ((index + 1) % 100 === 0) {
      process.stdout.write(`\rProcessed ${index + 1} files...`);
    }
  });

  process.stdout.write('\r');

  // Calculate totals
  stats.totalFiles = allFiles.length;
  Object.values(stats.files).forEach((categoryStats) => {
    stats.totalLines += categoryStats.lines;
  });

  return stats;
}

function printStats(stats: RepoStats): void {
  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 AI-APP REPOSITORY STATISTICS');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('📁 OVERALL STATISTICS');
  console.log('───────────────────────────────────────────────────────');
  console.log(`   Total Directory Size:  ${stats.totalSize}`);
  console.log(`   Total Files:           ${stats.totalFiles.toLocaleString()}`);
  console.log(`   Total Lines of Code:   ${stats.totalLines.toLocaleString()}`);
  console.log('');

  console.log('📂 FILE BREAKDOWN BY TYPE');
  console.log('───────────────────────────────────────────────────────');
  
  // Sort categories by line count (descending)
  const sortedCategories = Object.entries(stats.files).sort(
    ([, a], [, b]) => b.lines - a.lines
  );

  sortedCategories.forEach(([category, data]) => {
    console.log(`\n   ${category.toUpperCase()}`);
    console.log(`      Files:  ${data.count.toLocaleString()}`);
    console.log(`      Lines:  ${data.lines.toLocaleString()}`);
    console.log(`      Size:   ${formatBytes(data.size)}`);
  });

  console.log('\n═══════════════════════════════════════════════════════');
  
  // Calculate some interesting metrics
  const avgLinesPerFile = Math.round(stats.totalLines / stats.totalFiles);
  const avgSizePerFile = Math.round(stats.totalSizeBytes / stats.totalFiles);
  
  console.log('\n📈 ADDITIONAL METRICS');
  console.log('───────────────────────────────────────────────────────');
  console.log(`   Average Lines per File:  ${avgLinesPerFile.toLocaleString()}`);
  console.log(`   Average Size per File:   ${formatBytes(avgSizePerFile)}`);
  
  // Show largest categories
  if (sortedCategories.length > 0) {
    const [largestCategory, largestData] = sortedCategories[0];
    const percentOfTotal = Math.round((largestData.lines / stats.totalLines) * 100);
    console.log(`   Largest Category:        ${largestCategory} (${percentOfTotal}% of lines)`);
  }

  console.log('\n═══════════════════════════════════════════════════════\n');
}

// Main execution
const rootPath = path.resolve(__dirname, '..');
const stats = calculateStats(rootPath);
printStats(stats);

// Export stats to JSON file for potential use by other scripts
const outputPath = path.join(__dirname, 'repo-stats.json');
fs.writeFileSync(outputPath, JSON.stringify(stats, null, 2));
console.log(`💾 Stats saved to: ${outputPath}\n`);
