/**
 * Source File Guesser
 * Attempts to guess likely source file paths based on element information.
 */

import type { InspectedElement, SourceFileGuessConfig } from '@/types/elementInspector';

const DEFAULT_CONFIG: SourceFileGuessConfig = {
  srcDir: 'src',
  componentDirs: ['components', 'app', 'pages'],
  extensions: ['.tsx', '.jsx', '.ts', '.js'],
};

/**
 * Guess likely source file paths for an element
 */
export function guessSourceFiles(
  element: InspectedElement,
  config: SourceFileGuessConfig = DEFAULT_CONFIG
): string[] {
  const guesses: string[] = [];
  const seen = new Set<string>();

  const addGuess = (path: string) => {
    if (!seen.has(path)) {
      seen.add(path);
      guesses.push(path);
    }
  };

  // Strategy 1: From React component name
  if (element.reactComponentName) {
    const componentGuesses = guessFromComponentName(element.reactComponentName, config);
    componentGuesses.forEach(addGuess);
  }

  // Strategy 2: From class names
  for (const className of element.classNames.slice(0, 3)) {
    const classGuesses = guessFromClassName(className, config);
    classGuesses.forEach(addGuess);
  }

  // Strategy 3: From element ID
  if (element.elementId) {
    const idGuesses = guessFromElementId(element.elementId, config);
    idGuesses.forEach(addGuess);
  }

  return guesses.slice(0, 5);
}

/**
 * Guess file paths from component name
 */
function guessFromComponentName(componentName: string, config: SourceFileGuessConfig): string[] {
  const guesses: string[] = [];

  // Known feature folders in this codebase
  const featureFolders = ['modals', 'header', 'build', 'review', 'storage', 'ui', 'dev'];

  for (const dir of config.componentDirs) {
    for (const ext of config.extensions) {
      // Direct match: components/Header.tsx
      guesses.push(`${config.srcDir}/${dir}/${componentName}${ext}`);

      // Folder with index: components/Header/index.tsx
      guesses.push(`${config.srcDir}/${dir}/${componentName}/index${ext}`);

      // Folder with same name: components/Header/Header.tsx
      guesses.push(`${config.srcDir}/${dir}/${componentName}/${componentName}${ext}`);
    }
  }

  // Check feature folders
  for (const feature of featureFolders) {
    for (const ext of config.extensions) {
      guesses.push(`${config.srcDir}/components/${feature}/${componentName}${ext}`);
    }
  }

  return guesses;
}

/**
 * Guess file paths from class name
 */
function guessFromClassName(className: string, config: SourceFileGuessConfig): string[] {
  const guesses: string[] = [];

  // Skip utility/generic classes
  if (className.match(/^(flex|grid|p-|m-|w-|h-|text-|bg-|border-)/)) {
    return guesses;
  }

  // Extract potential component name from class
  const parts = className.split(/[-_]/);
  const componentName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);

  for (const dir of config.componentDirs) {
    for (const ext of config.extensions) {
      guesses.push(`${config.srcDir}/${dir}/${componentName}${ext}`);
    }
  }

  return guesses;
}

/**
 * Guess file paths from element ID
 */
function guessFromElementId(elementId: string, config: SourceFileGuessConfig): string[] {
  return guessFromClassName(elementId, config);
}
