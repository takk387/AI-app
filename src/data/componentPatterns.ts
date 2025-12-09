/**
 * Component Patterns Library
 *
 * Pre-defined UI component patterns for the Layout Builder.
 * Each pattern includes a suggested message to send to the AI for implementation.
 */

export type ComponentCategory =
  | 'navigation'
  | 'content'
  | 'forms'
  | 'data'
  | 'feedback'
  | 'commerce';

export interface ComponentPattern {
  id: string;
  name: string;
  category: ComponentCategory;
  icon: string;
  description: string;
  /** Message to send to AI when this pattern is selected */
  suggestedMessage: string;
  /** Keywords for search */
  keywords: string[];
}

/**
 * All available component patterns organized by category
 */
export const componentPatterns: ComponentPattern[] = [
  // ============================================================================
  // NAVIGATION
  // ============================================================================
  {
    id: 'nav-header-standard',
    name: 'Standard Header',
    category: 'navigation',
    icon: '📍',
    description: 'Top navigation bar with logo, menu items, and CTA button',
    suggestedMessage:
      'Add a standard header with logo on the left, navigation links in the center, and a CTA button on the right.',
    keywords: ['header', 'navbar', 'top', 'navigation', 'menu'],
  },
  {
    id: 'nav-sidebar',
    name: 'Sidebar Navigation',
    category: 'navigation',
    icon: '📑',
    description: 'Vertical side navigation with icons and collapsible sections',
    suggestedMessage:
      'Add a sidebar navigation on the left with icon + text menu items. Make it collapsible with a toggle button.',
    keywords: ['sidebar', 'side', 'vertical', 'menu', 'drawer'],
  },
  {
    id: 'nav-tabs',
    name: 'Tab Navigation',
    category: 'navigation',
    icon: '📂',
    description: 'Horizontal tabs for switching between content sections',
    suggestedMessage:
      'Add horizontal tab navigation with underline style. Include 3-4 tabs that can switch between content sections.',
    keywords: ['tabs', 'horizontal', 'switch', 'sections'],
  },
  {
    id: 'nav-breadcrumb',
    name: 'Breadcrumb Trail',
    category: 'navigation',
    icon: '🔗',
    description: 'Show current location in site hierarchy',
    suggestedMessage:
      'Add a breadcrumb navigation showing the path: Home > Category > Current Page. Use chevrons as separators.',
    keywords: ['breadcrumb', 'path', 'hierarchy', 'location'],
  },
  {
    id: 'nav-footer',
    name: 'Footer',
    category: 'navigation',
    icon: '📋',
    description: 'Site footer with links, social icons, and copyright',
    suggestedMessage:
      'Add a footer with 3-4 columns of links, social media icons, and a copyright notice at the bottom.',
    keywords: ['footer', 'bottom', 'links', 'copyright', 'social'],
  },

  // ============================================================================
  // CONTENT
  // ============================================================================
  {
    id: 'content-hero',
    name: 'Hero Section',
    category: 'content',
    icon: '🎯',
    description: 'Large banner with headline, subtitle, and call-to-action',
    suggestedMessage:
      'Add a hero section with a large headline, supporting subtitle text, and a prominent CTA button. Center-aligned with generous padding.',
    keywords: ['hero', 'banner', 'headline', 'cta', 'above fold'],
  },
  {
    id: 'content-hero-split',
    name: 'Split Hero',
    category: 'content',
    icon: '↔️',
    description: 'Hero with text on one side and image/illustration on the other',
    suggestedMessage:
      'Add a split hero section with headline and CTA on the left, and space for an image or illustration on the right.',
    keywords: ['hero', 'split', 'two column', 'image'],
  },
  {
    id: 'content-cards-grid',
    name: 'Card Grid',
    category: 'content',
    icon: '🃏',
    description: 'Grid of content cards with images and descriptions',
    suggestedMessage:
      'Add a grid of cards with image at top, title, short description, and a subtle hover effect. 3 columns on desktop, 1 on mobile.',
    keywords: ['cards', 'grid', 'tiles', 'gallery'],
  },
  {
    id: 'content-feature-list',
    name: 'Feature List',
    category: 'content',
    icon: '✨',
    description: 'List of features with icons and descriptions',
    suggestedMessage:
      'Add a features section with icon, title, and description for each feature. Use a 3-column grid layout.',
    keywords: ['features', 'benefits', 'icons', 'list'],
  },
  {
    id: 'content-testimonials',
    name: 'Testimonials',
    category: 'content',
    icon: '💬',
    description: 'Customer quotes with avatars and names',
    suggestedMessage:
      'Add a testimonials section with quote text, customer avatar, name, and company. Use a card-style layout.',
    keywords: ['testimonials', 'quotes', 'reviews', 'social proof'],
  },
  {
    id: 'content-cta-banner',
    name: 'CTA Banner',
    category: 'content',
    icon: '📢',
    description: 'Full-width call-to-action banner',
    suggestedMessage:
      'Add a full-width CTA banner with compelling headline and prominent button. Use a contrasting background color.',
    keywords: ['cta', 'banner', 'call to action', 'conversion'],
  },
  {
    id: 'content-faq',
    name: 'FAQ Accordion',
    category: 'content',
    icon: '❓',
    description: 'Expandable questions and answers',
    suggestedMessage:
      'Add an FAQ section with expandable accordion items. Show the question, and expand to reveal the answer when clicked.',
    keywords: ['faq', 'accordion', 'questions', 'answers', 'help'],
  },

  // ============================================================================
  // FORMS
  // ============================================================================
  {
    id: 'form-login',
    name: 'Login Form',
    category: 'forms',
    icon: '🔐',
    description: 'Email and password login with forgot password link',
    suggestedMessage:
      'Add a login form with email input, password input, "Forgot password?" link, and a login button. Include "Sign up" link for new users.',
    keywords: ['login', 'signin', 'authentication', 'email', 'password'],
  },
  {
    id: 'form-signup',
    name: 'Sign Up Form',
    category: 'forms',
    icon: '📝',
    description: 'Registration form with name, email, and password',
    suggestedMessage:
      'Add a sign-up form with name, email, password, and confirm password fields. Include terms checkbox and submit button.',
    keywords: ['signup', 'register', 'create account', 'registration'],
  },
  {
    id: 'form-contact',
    name: 'Contact Form',
    category: 'forms',
    icon: '✉️',
    description: 'Name, email, and message contact form',
    suggestedMessage:
      'Add a contact form with name, email, subject dropdown, and message textarea. Include a send button.',
    keywords: ['contact', 'message', 'inquiry', 'email'],
  },
  {
    id: 'form-search',
    name: 'Search Bar',
    category: 'forms',
    icon: '🔍',
    description: 'Search input with icon and optional filters',
    suggestedMessage:
      'Add a search bar with a search icon, placeholder text, and rounded corners. Optionally include filter buttons.',
    keywords: ['search', 'find', 'query', 'input'],
  },
  {
    id: 'form-newsletter',
    name: 'Newsletter Signup',
    category: 'forms',
    icon: '📧',
    description: 'Email input for newsletter subscription',
    suggestedMessage:
      'Add a newsletter signup with email input and subscribe button. Keep it compact and inline.',
    keywords: ['newsletter', 'subscribe', 'email', 'mailing list'],
  },

  // ============================================================================
  // DATA DISPLAY
  // ============================================================================
  {
    id: 'data-stats',
    name: 'Stats/Metrics',
    category: 'data',
    icon: '📊',
    description: 'Key numbers displayed prominently',
    suggestedMessage:
      'Add a stats section showing 4 key metrics with large numbers, labels, and optional trend indicators. Use a horizontal row layout.',
    keywords: ['stats', 'metrics', 'numbers', 'kpi', 'dashboard'],
  },
  {
    id: 'data-table',
    name: 'Data Table',
    category: 'data',
    icon: '📋',
    description: 'Structured data in rows and columns',
    suggestedMessage:
      'Add a data table with sortable columns, header row, and hover state on rows. Include pagination at the bottom.',
    keywords: ['table', 'data', 'rows', 'columns', 'grid'],
  },
  {
    id: 'data-list',
    name: 'Item List',
    category: 'data',
    icon: '📃',
    description: 'Vertical list of items with actions',
    suggestedMessage:
      'Add a list of items with avatar/icon, title, subtitle, and action buttons on the right. Include dividers between items.',
    keywords: ['list', 'items', 'rows', 'vertical'],
  },
  {
    id: 'data-chart-placeholder',
    name: 'Chart Area',
    category: 'data',
    icon: '📈',
    description: 'Placeholder for charts and graphs',
    suggestedMessage:
      'Add a chart area with a card container, title, and space for a chart. Include a time range selector.',
    keywords: ['chart', 'graph', 'visualization', 'analytics'],
  },
  {
    id: 'data-progress',
    name: 'Progress Indicators',
    category: 'data',
    icon: '⏳',
    description: 'Progress bars or circular progress',
    suggestedMessage:
      'Add progress indicators showing completion status. Include both linear progress bars and percentage labels.',
    keywords: ['progress', 'loading', 'status', 'completion'],
  },

  // ============================================================================
  // FEEDBACK
  // ============================================================================
  {
    id: 'feedback-modal',
    name: 'Modal Dialog',
    category: 'feedback',
    icon: '🪟',
    description: 'Popup dialog for confirmations or forms',
    suggestedMessage:
      'Add a modal dialog style with overlay, centered container, title, content area, and action buttons at the bottom.',
    keywords: ['modal', 'dialog', 'popup', 'overlay'],
  },
  {
    id: 'feedback-toast',
    name: 'Toast Notification',
    category: 'feedback',
    icon: '🔔',
    description: 'Brief notification message',
    suggestedMessage:
      'Add toast notification styling with icon, message text, and dismiss button. Position in the bottom-right corner.',
    keywords: ['toast', 'notification', 'alert', 'message', 'snackbar'],
  },
  {
    id: 'feedback-alert',
    name: 'Alert Banner',
    category: 'feedback',
    icon: '⚠️',
    description: 'Important message banner with icon',
    suggestedMessage:
      'Add alert banner styling for success, warning, error, and info states. Include icon, message, and optional dismiss.',
    keywords: ['alert', 'banner', 'warning', 'error', 'success', 'info'],
  },
  {
    id: 'feedback-empty-state',
    name: 'Empty State',
    category: 'feedback',
    icon: '📭',
    description: 'Placeholder when no content exists',
    suggestedMessage:
      'Add an empty state design with illustration placeholder, title, description, and action button.',
    keywords: ['empty', 'no data', 'placeholder', 'zero state'],
  },
  {
    id: 'feedback-loading',
    name: 'Loading State',
    category: 'feedback',
    icon: '⏳',
    description: 'Loading indicators and skeletons',
    suggestedMessage:
      'Add loading skeleton styles for cards and lists. Use subtle animation and placeholder shapes.',
    keywords: ['loading', 'skeleton', 'spinner', 'placeholder'],
  },

  // ============================================================================
  // COMMERCE
  // ============================================================================
  {
    id: 'commerce-product-card',
    name: 'Product Card',
    category: 'commerce',
    icon: '🛍️',
    description: 'Product display with image, price, and add to cart',
    suggestedMessage:
      'Add product card styling with image, product name, price, and "Add to Cart" button. Include hover effect.',
    keywords: ['product', 'item', 'ecommerce', 'shop', 'store'],
  },
  {
    id: 'commerce-pricing-table',
    name: 'Pricing Table',
    category: 'commerce',
    icon: '💰',
    description: 'Compare pricing plans side by side',
    suggestedMessage:
      'Add a pricing table with 3 plan cards showing plan name, price, features list, and CTA button. Highlight the recommended plan.',
    keywords: ['pricing', 'plans', 'subscription', 'tiers'],
  },
  {
    id: 'commerce-cart',
    name: 'Shopping Cart',
    category: 'commerce',
    icon: '🛒',
    description: 'Cart summary with items and totals',
    suggestedMessage:
      'Add cart styling with item rows (image, name, quantity, price), subtotal, and checkout button.',
    keywords: ['cart', 'basket', 'checkout', 'items'],
  },
  {
    id: 'commerce-checkout-form',
    name: 'Checkout Form',
    category: 'commerce',
    icon: '💳',
    description: 'Payment and shipping form layout',
    suggestedMessage:
      'Add checkout form layout with shipping address section, payment method section, and order summary sidebar.',
    keywords: ['checkout', 'payment', 'shipping', 'order'],
  },
];

/**
 * Get all unique categories
 */
export function getCategories(): ComponentCategory[] {
  return ['navigation', 'content', 'forms', 'data', 'feedback', 'commerce'];
}

/**
 * Get display name for a category
 */
export function getCategoryDisplayName(category: ComponentCategory): string {
  const names: Record<ComponentCategory, string> = {
    navigation: 'Navigation',
    content: 'Content',
    forms: 'Forms',
    data: 'Data Display',
    feedback: 'Feedback',
    commerce: 'Commerce',
  };
  return names[category];
}

/**
 * Get patterns by category
 */
export function getPatternsByCategory(category: ComponentCategory): ComponentPattern[] {
  return componentPatterns.filter((p) => p.category === category);
}

/**
 * Search patterns by query
 */
export function searchPatterns(query: string): ComponentPattern[] {
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) return componentPatterns;

  return componentPatterns.filter(
    (p) =>
      p.name.toLowerCase().includes(lowerQuery) ||
      p.description.toLowerCase().includes(lowerQuery) ||
      p.keywords.some((k) => k.includes(lowerQuery))
  );
}

/**
 * Get a pattern by ID
 */
export function getPatternById(id: string): ComponentPattern | undefined {
  return componentPatterns.find((p) => p.id === id);
}
