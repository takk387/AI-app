/**
 * Element Inspector Types
 * Type definitions for the Visual Element Inspector dev tool.
 */

/**
 * Subset of computed styles relevant for debugging
 */
export interface ExtractedStyles {
  // Layout
  display: string;
  position: string;
  width: string;
  height: string;

  // Spacing
  margin: string;
  padding: string;

  // Typography
  fontSize: string;
  fontWeight: string;
  fontFamily: string;
  lineHeight: string;
  color: string;

  // Background & Borders
  backgroundColor: string;
  borderRadius: string;
  border: string;

  // Flexbox/Grid (optional)
  flexDirection?: string;
  justifyContent?: string;
  alignItems?: string;
  gap?: string;
}

/**
 * Represents the extracted information about a selected DOM element
 */
export interface InspectedElement {
  /** Unique identifier for this selection */
  id: string;

  /** CSS selector path (e.g., "div.header > button.save-btn") */
  selectorPath: string;

  /** Short display name for the element */
  displayName: string;

  /** Tag name (lowercase) */
  tagName: string;

  /** Element's id attribute if present */
  elementId: string | null;

  /** Array of class names */
  classNames: string[];

  /** Relevant computed styles */
  computedStyles: ExtractedStyles;

  /** React component name if detected */
  reactComponentName: string | null;

  /** Guessed source file paths */
  guessedSourceFiles: string[];

  /** Element's text content (truncated) */
  textContent: string;

  /** Bounding rect for positioning */
  boundingRect: DOMRect;

  /** Reference to the actual DOM element */
  element: HTMLElement;
}

/**
 * State for the element inspector
 */
export interface ElementInspectorState {
  /** Whether inspect mode is active */
  isActive: boolean;

  /** Currently hovered element (for highlight) */
  hoveredElement: HTMLElement | null;

  /** List of selected elements with their data */
  selectedElements: InspectedElement[];

  /** User's problem description */
  problemDescription: string;

  /** User's desired change description */
  desiredChange: string;

  /** Whether the prompt modal is open */
  isPromptModalOpen: boolean;

  /** Generated prompt text */
  generatedPrompt: string;
}

/**
 * Actions for the element inspector
 */
export interface ElementInspectorActions {
  /** Toggle inspect mode on/off */
  toggleInspectMode: () => void;

  /** Set the hovered element for highlighting */
  setHoveredElement: (element: HTMLElement | null) => void;

  /** Toggle selection of an element */
  toggleElementSelection: (element: HTMLElement) => void;

  /** Remove a selected element by id */
  removeSelectedElement: (id: string) => void;

  /** Clear all selections */
  clearAllSelections: () => void;

  /** Update problem description */
  setProblemDescription: (text: string) => void;

  /** Update desired change description */
  setDesiredChange: (text: string) => void;

  /** Generate the Claude prompt */
  generatePrompt: () => void;

  /** Open/close prompt modal */
  setPromptModalOpen: (open: boolean) => void;

  /** Copy prompt to clipboard */
  copyPromptToClipboard: () => Promise<boolean>;
}

/**
 * Configuration options for source file guessing
 */
export interface SourceFileGuessConfig {
  /** Base source directory */
  srcDir: string;

  /** Component directories to search */
  componentDirs: string[];

  /** File extensions to consider */
  extensions: string[];
}

/**
 * Prompt generation options
 */
export interface PromptGenerationOptions {
  /** Include computed styles */
  includeStyles: boolean;

  /** Include guessed source files */
  includeSourceGuesses: boolean;

  /** Maximum text content length */
  maxTextContentLength: number;
}
