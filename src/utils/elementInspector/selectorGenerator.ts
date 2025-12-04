/**
 * CSS Selector Generator
 * Generates human-readable CSS selector paths for DOM elements.
 */

/**
 * Generate a CSS selector path for an element
 */
export function generateSelectorPath(element: HTMLElement, maxDepth = 5): string {
  const path: string[] = [];
  let current: HTMLElement | null = element;
  let depth = 0;

  while (current && current !== document.body && depth < maxDepth) {
    const selector = getElementSelector(current);
    path.unshift(selector);

    // Stop if we hit an element with an id
    if (current.id) break;

    current = current.parentElement;
    depth++;
  }

  return path.join(' > ');
}

/**
 * Get selector for a single element
 */
function getElementSelector(element: HTMLElement): string {
  // If element has id, that's the most specific
  if (element.id) {
    return `#${escapeSelector(element.id)}`;
  }

  const tagName = element.tagName.toLowerCase();
  const classes = Array.from(element.classList)
    .filter((cls) => !cls.startsWith('__') && !cls.includes('css-')) // Filter internal classes
    .slice(0, 3) // Limit to 3 classes for readability
    .map((cls) => `.${escapeSelector(cls)}`)
    .join('');

  let selector = tagName + classes;

  // Add nth-child if needed for disambiguation
  if (!classes && element.parentElement) {
    const siblings = Array.from(element.parentElement.children).filter(
      (el) => el.tagName === element.tagName
    );
    if (siblings.length > 1) {
      const index = siblings.indexOf(element) + 1;
      selector += `:nth-child(${index})`;
    }
  }

  return selector;
}

/**
 * Escape special characters in selector
 */
function escapeSelector(str: string): string {
  return str.replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
}

/**
 * Generate a short display name for an element
 */
export function generateDisplayName(element: HTMLElement): string {
  const tagName = element.tagName.toLowerCase();

  if (element.id) {
    return `${tagName}#${element.id}`;
  }

  const firstClass = element.classList[0];
  if (firstClass && !firstClass.startsWith('__')) {
    return `${tagName}.${firstClass}`;
  }

  // Use text content hint
  const text = element.textContent?.trim().slice(0, 20);
  if (text) {
    return `${tagName} "${text}${text.length >= 20 ? '...' : ''}"`;
  }

  return tagName;
}
