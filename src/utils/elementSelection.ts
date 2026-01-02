/**
 * Element Selection Utilities
 *
 * Utilities for Click + Talk mode element detection and selection.
 * Used by LayoutBuilderWizard to identify and highlight clickable elements.
 */

import type { ElementType, ElementBounds, SelectedElementInfo } from '@/types/layoutDesign';

/**
 * Get the bounding rectangle of an element
 * Returns position relative to the viewport
 */
export function getElementBounds(element: HTMLElement): ElementBounds {
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

/**
 * Get element bounds relative to a container element
 * Useful for positioning overlays within a preview container
 */
export function getElementBoundsRelative(
  element: HTMLElement,
  container: HTMLElement
): ElementBounds {
  const elementRect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  return {
    x: elementRect.left - containerRect.left,
    y: elementRect.top - containerRect.top,
    width: elementRect.width,
    height: elementRect.height,
  };
}

/**
 * Infer element type from data attributes or HTML semantics
 */
export function inferElementType(element: HTMLElement): ElementType {
  // First check data attribute (preferred)
  const dataType = element.dataset.elementType as ElementType;
  if (dataType) return dataType;

  // Infer from tag name
  const tagName = element.tagName.toLowerCase();
  const tagTypeMap: Record<string, ElementType> = {
    header: 'header',
    footer: 'footer',
    aside: 'sidebar',
    nav: 'nav',
    button: 'button',
    a: 'link',
    img: 'image',
    video: 'video',
    input: 'input',
    textarea: 'input',
    select: 'input',
    form: 'form',
    h1: 'heading',
    h2: 'heading',
    h3: 'heading',
    h4: 'heading',
    h5: 'heading',
    h6: 'heading',
    p: 'text',
    span: 'text',
    section: 'section',
    article: 'section',
    main: 'container',
    div: 'container',
    ul: 'list',
    ol: 'list',
    li: 'list',
  };

  // Check class names for common patterns
  const className = element.className.toLowerCase();
  if (className.includes('card')) return 'card';
  if (className.includes('hero')) return 'hero';
  if (className.includes('sidebar')) return 'sidebar';
  if (className.includes('header')) return 'header';
  if (className.includes('footer')) return 'footer';
  if (className.includes('nav')) return 'nav';
  if (className.includes('menu')) return 'menu';
  if (className.includes('modal')) return 'modal';
  if (className.includes('tabs')) return 'tabs';
  if (className.includes('btn') || className.includes('button')) return 'button';
  if (className.includes('icon')) return 'icon';

  return tagTypeMap[tagName] || 'custom';
}

/**
 * Get a user-friendly display name for an element
 */
export function getElementDisplayName(element: HTMLElement): string {
  // Check for explicit label
  const dataLabel = element.dataset.elementLabel;
  if (dataLabel) return dataLabel;

  // Use aria-label if present
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;

  // Check for ID and format it
  const id = element.id;
  if (id) {
    return id
      .replace(/[-_]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/^./, (str) => str.toUpperCase());
  }

  // Fall back to element type
  const type = inferElementType(element);
  return type.charAt(0).toUpperCase() + type.slice(1);
}

/**
 * Extract current style properties from an element
 * Returns relevant CSS properties for the element type
 */
export function extractElementProperties(element: HTMLElement): Record<string, unknown> {
  const computed = window.getComputedStyle(element);
  const type = inferElementType(element);

  // Base properties for all elements
  const baseProps: Record<string, string> = {
    backgroundColor: computed.backgroundColor,
    color: computed.color,
    fontSize: computed.fontSize,
    fontWeight: computed.fontWeight,
    padding: computed.padding,
    margin: computed.margin,
    borderRadius: computed.borderRadius,
    boxShadow: computed.boxShadow,
  };

  // Add type-specific properties
  switch (type) {
    case 'header':
    case 'footer':
    case 'sidebar':
      return {
        ...baseProps,
        position: computed.position,
        height: computed.height,
        width: computed.width,
        display: computed.display,
        flexDirection: computed.flexDirection,
        justifyContent: computed.justifyContent,
        alignItems: computed.alignItems,
      };

    case 'button':
      return {
        ...baseProps,
        border: computed.border,
        cursor: computed.cursor,
        textTransform: computed.textTransform,
        letterSpacing: computed.letterSpacing,
      };

    case 'image':
      return {
        ...baseProps,
        width: computed.width,
        height: computed.height,
        objectFit: computed.objectFit,
        border: computed.border,
      };

    case 'text':
    case 'heading':
      return {
        ...baseProps,
        lineHeight: computed.lineHeight,
        letterSpacing: computed.letterSpacing,
        textAlign: computed.textAlign,
        fontFamily: computed.fontFamily,
      };

    case 'card':
      return {
        ...baseProps,
        border: computed.border,
        overflow: computed.overflow,
        width: computed.width,
      };

    default:
      return baseProps;
  }
}

/**
 * Build a complete SelectedElementInfo object from a DOM element
 */
export function buildSelectedElementInfo(
  element: HTMLElement,
  container?: HTMLElement
): SelectedElementInfo {
  const type = inferElementType(element);
  const bounds = container
    ? getElementBoundsRelative(element, container)
    : getElementBounds(element);

  return {
    id: element.dataset.elementId || element.id || generateElementId(element),
    type,
    bounds,
    currentProperties: extractElementProperties(element),
    parentId: element.parentElement?.dataset.elementId,
    allowedActions: getDefaultActionsForType(type),
    displayName: getElementDisplayName(element),
  };
}

/**
 * Generate a unique ID for an element without one
 */
function generateElementId(element: HTMLElement): string {
  const type = inferElementType(element);
  const index = Array.from(document.querySelectorAll(`[data-element-type="${type}"]`)).indexOf(
    element
  );
  return `${type}-${index >= 0 ? index : Date.now()}`;
}

/**
 * Get default quick actions for an element type
 * These will be shown in the SuggestedActionsBar
 */
export function getDefaultActionsForType(type: ElementType): string[] {
  const actionMap: Record<ElementType, string[]> = {
    header: ['Make sticky', 'Change background', 'Add shadow', 'Change height'],
    footer: ['Change background', 'Add columns', 'Change height', 'Add social links'],
    sidebar: ['Make collapsible', 'Change width', 'Change background', 'Move to other side'],
    hero: ['Change background', 'Add overlay', 'Change height', 'Center content'],
    section: ['More padding', 'Change background', 'Rearrange items', 'Add divider'],
    card: ['Add shadow', 'Round corners', 'Add border', 'Change hover effect'],
    button: ['Make bigger', 'Change color', 'More rounded', 'Add hover effect'],
    text: ['Make bigger', 'Change font', 'Bold it', 'Center it'],
    heading: ['Make bigger', 'Change font', 'Change color', 'Add underline'],
    image: ['Make bigger', 'Add border', 'Round corners', 'Add shadow'],
    nav: ['Change style', 'Add icons', 'Change spacing', 'Make sticky'],
    list: ['Change style', 'Add dividers', 'Change spacing', 'Add bullets'],
    form: ['Change layout', 'Add validation', 'Change spacing', 'Add labels'],
    input: ['Change size', 'Add icon', 'Change border', 'Add placeholder'],
    container: ['Change width', 'Center content', 'Add padding', 'Change background'],
    link: ['Change color', 'Add underline', 'Add icon', 'Change hover effect'],
    icon: ['Change size', 'Change color', 'Add background', 'Add animation'],
    video: ['Change size', 'Add controls', 'Add poster', 'Round corners'],
    modal: ['Change size', 'Add overlay', 'Change animation', 'Add close button'],
    tabs: ['Change style', 'Add icons', 'Change position', 'Add animation'],
    menu: ['Change style', 'Add icons', 'Add submenu', 'Change hover effect'],
    custom: ['Change size', 'Change color', 'Add padding', 'Add border'],
  };

  return actionMap[type] || actionMap.custom;
}

/**
 * Find all selectable elements within a container
 * Returns elements that have data-element-id or are semantic HTML elements
 */
export function findSelectableElements(container: HTMLElement): HTMLElement[] {
  const elements: HTMLElement[] = [];

  // Elements with explicit data attributes
  const explicitElements = container.querySelectorAll('[data-element-id]');
  explicitElements.forEach((el) => elements.push(el as HTMLElement));

  // Semantic HTML elements if no explicit attributes found
  if (elements.length === 0) {
    const semanticSelectors = [
      'header',
      'footer',
      'nav',
      'aside',
      'main',
      'section',
      'article',
      'button',
      'a',
      'img',
      'form',
      'input',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
    ];
    semanticSelectors.forEach((selector) => {
      container.querySelectorAll(selector).forEach((el) => elements.push(el as HTMLElement));
    });
  }

  return elements;
}

/**
 * Check if an element is selectable (should respond to clicks)
 */
export function isSelectableElement(element: HTMLElement): boolean {
  // Has explicit data attribute
  if (element.dataset.elementId) return true;

  // Is a semantic element
  const semanticTags = [
    'header',
    'footer',
    'nav',
    'aside',
    'main',
    'section',
    'article',
    'button',
    'a',
    'img',
    'form',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
  ];
  if (semanticTags.includes(element.tagName.toLowerCase())) return true;

  // Has a recognizable class
  const className = element.className.toLowerCase();
  const recognizablePatterns = [
    'card',
    'hero',
    'sidebar',
    'header',
    'footer',
    'nav',
    'menu',
    'modal',
    'btn',
    'button',
  ];
  return recognizablePatterns.some((pattern) => className.includes(pattern));
}
