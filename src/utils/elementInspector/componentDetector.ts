/**
 * React Component Detector
 * Attempts to detect React component names from DOM elements.
 */

/**
 * Detect React component name for an element
 */
export function detectComponentName(element: HTMLElement): string | null {
  // Strategy 1: Check data-component attribute
  const dataComponent = element.getAttribute('data-component');
  if (dataComponent) {
    return dataComponent;
  }

  // Strategy 2: Check data-testid for hints
  const testId = element.getAttribute('data-testid');
  if (testId) {
    const componentName = testIdToComponentName(testId);
    if (componentName) return componentName;
  }

  // Strategy 3: Access React fiber (development mode only)
  const fiberName = getReactFiberComponentName(element);
  if (fiberName) {
    return fiberName;
  }

  // Strategy 4: Infer from class names
  return inferComponentFromClasses(element);
}

/**
 * Convert test-id to component name
 */
function testIdToComponentName(testId: string): string | null {
  if (['container', 'wrapper', 'root'].includes(testId.toLowerCase())) {
    return null;
  }

  return testId
    .split(/[-_]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
}

/**
 * Get component name from React fiber
 */
function getReactFiberComponentName(element: HTMLElement): string | null {
  const fiberKey = Object.keys(element).find(key =>
    key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$')
  );

  if (!fiberKey) return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fiber = (element as any)[fiberKey];
    let current = fiber;
    let depth = 0;
    const maxDepth = 10;

    while (current && depth < maxDepth) {
      const type = current.type;

      if (typeof type === 'function' || typeof type === 'object') {
        const name = type?.displayName || type?.name;

        if (name && !isGenericComponentName(name)) {
          return name;
        }
      }

      current = current.return;
      depth++;
    }
  } catch {
    // Fiber access failed
  }

  return null;
}

/**
 * Check if a component name is generic/internal
 */
function isGenericComponentName(name: string): boolean {
  const genericNames = [
    'div', 'span', 'Fragment', 'Suspense', 'Provider',
    'Consumer', 'Context', 'ForwardRef', 'Memo'
  ];
  return genericNames.includes(name);
}

/**
 * Infer component name from CSS class names
 */
function inferComponentFromClasses(element: HTMLElement): string | null {
  const classes = Array.from(element.classList);

  for (const cls of classes) {
    // Match patterns like "Header", "NavButton", "UserProfile"
    if (/^[A-Z][a-zA-Z]+$/.test(cls)) {
      return cls;
    }

    // Match patterns like "header__container" -> "Header"
    const bemMatch = cls.match(/^([a-z]+)(__|--)?\w+$/i);
    if (bemMatch) {
      const base = bemMatch[1];
      return base.charAt(0).toUpperCase() + base.slice(1);
    }
  }

  return null;
}
