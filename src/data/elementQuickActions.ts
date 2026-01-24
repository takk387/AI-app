/**
 * Element Quick Actions
 *
 * Maps element types to context-aware quick actions for Click + Talk mode.
 * Each action has a label (shown to user) and a prompt (sent to AI).
 *
 * MIGRATED to Gemini 3: ElementType defined locally instead of importing from layoutDesign
 */

/**
 * Element types for UI components
 * Defined locally to avoid dependency on legacy layoutDesign.ts
 */
export type ElementType =
  | 'header'
  | 'footer'
  | 'sidebar'
  | 'hero'
  | 'section'
  | 'card'
  | 'button'
  | 'text'
  | 'heading'
  | 'image'
  | 'nav'
  | 'list'
  | 'form'
  | 'input'
  | 'container'
  | 'link'
  | 'icon'
  | 'video'
  | 'modal'
  | 'tabs'
  | 'menu'
  | 'custom';

export interface QuickAction {
  /** Display label shown to user */
  label: string;
  /** Full prompt sent to AI when action is clicked */
  prompt: string;
  /** Optional icon name (for future use) */
  icon?: string;
  /** Category for grouping actions */
  category?: 'style' | 'layout' | 'interaction' | 'content';
}

/**
 * Quick actions for each element type
 * These are shown in the SuggestedActionsBar when an element is selected
 */
export const ELEMENT_QUICK_ACTIONS: Record<ElementType, QuickAction[]> = {
  header: [
    {
      label: 'Make sticky',
      prompt: 'Make the header sticky so it stays at the top when scrolling',
      category: 'layout',
    },
    {
      label: 'Change background',
      prompt: 'Change the header background color or style',
      category: 'style',
    },
    {
      label: 'Add shadow',
      prompt: 'Add a subtle shadow to the header for depth',
      category: 'style',
    },
    {
      label: 'Change height',
      prompt: 'Adjust the header height (make it taller or more compact)',
      category: 'layout',
    },
  ],
  footer: [
    {
      label: 'Change background',
      prompt: 'Change the footer background color',
      category: 'style',
    },
    {
      label: 'Add columns',
      prompt: 'Organize the footer content into multiple columns',
      category: 'layout',
    },
    {
      label: 'Change height',
      prompt: 'Adjust the footer height',
      category: 'layout',
    },
    {
      label: 'Add social links',
      prompt: 'Add social media icon links to the footer',
      category: 'content',
    },
  ],
  sidebar: [
    {
      label: 'Make collapsible',
      prompt: 'Make the sidebar collapsible with a toggle button',
      category: 'interaction',
    },
    {
      label: 'Change width',
      prompt: 'Adjust the sidebar width (wider or narrower)',
      category: 'layout',
    },
    {
      label: 'Change background',
      prompt: 'Change the sidebar background color',
      category: 'style',
    },
    {
      label: 'Move to other side',
      prompt: 'Move the sidebar to the opposite side of the layout',
      category: 'layout',
    },
  ],
  hero: [
    {
      label: 'Change background',
      prompt: 'Change the hero section background (color, gradient, or image)',
      category: 'style',
    },
    {
      label: 'Add overlay',
      prompt: 'Add a dark overlay to improve text readability',
      category: 'style',
    },
    {
      label: 'Change height',
      prompt: 'Adjust the hero section height (taller for more impact or shorter)',
      category: 'layout',
    },
    {
      label: 'Center content',
      prompt: 'Center all the content in the hero section',
      category: 'layout',
    },
  ],
  section: [
    {
      label: 'More padding',
      prompt: 'Add more padding around the section content',
      category: 'layout',
    },
    {
      label: 'Change background',
      prompt: 'Change the section background color',
      category: 'style',
    },
    {
      label: 'Rearrange items',
      prompt: 'Rearrange the items in this section (reorder or change layout)',
      category: 'layout',
    },
    {
      label: 'Add divider',
      prompt: 'Add a visual divider between this section and the next',
      category: 'style',
    },
  ],
  card: [
    {
      label: 'Add shadow',
      prompt: 'Add a shadow to the card for depth',
      category: 'style',
    },
    {
      label: 'Round corners',
      prompt: 'Make the card corners more rounded',
      category: 'style',
    },
    {
      label: 'Add border',
      prompt: 'Add a subtle border around the card',
      category: 'style',
    },
    {
      label: 'Add hover effect',
      prompt: 'Add an interactive hover effect (lift, scale, or glow)',
      category: 'interaction',
    },
  ],
  button: [
    {
      label: 'Make bigger',
      prompt: 'Make the button larger and more prominent',
      category: 'layout',
    },
    {
      label: 'Change color',
      prompt: 'Change the button color',
      category: 'style',
    },
    {
      label: 'More rounded',
      prompt: 'Make the button corners more rounded (pill shape)',
      category: 'style',
    },
    {
      label: 'Add hover effect',
      prompt: 'Add an interactive hover effect to the button',
      category: 'interaction',
    },
  ],
  text: [
    {
      label: 'Make bigger',
      prompt: 'Increase the text size',
      category: 'style',
    },
    {
      label: 'Change font',
      prompt: 'Change the font family for this text',
      category: 'style',
    },
    {
      label: 'Bold it',
      prompt: 'Make the text bold',
      category: 'style',
    },
    {
      label: 'Center it',
      prompt: 'Center align the text',
      category: 'layout',
    },
  ],
  heading: [
    {
      label: 'Make bigger',
      prompt: 'Increase the heading size',
      category: 'style',
    },
    {
      label: 'Change font',
      prompt: 'Change the heading font family',
      category: 'style',
    },
    {
      label: 'Change color',
      prompt: 'Change the heading text color',
      category: 'style',
    },
    {
      label: 'Add underline',
      prompt: 'Add a decorative underline to the heading',
      category: 'style',
    },
  ],
  image: [
    {
      label: 'Make bigger',
      prompt: 'Make the image larger',
      category: 'layout',
    },
    {
      label: 'Add border',
      prompt: 'Add a border around the image',
      category: 'style',
    },
    {
      label: 'Round corners',
      prompt: 'Make the image corners rounded',
      category: 'style',
    },
    {
      label: 'Add shadow',
      prompt: 'Add a shadow behind the image',
      category: 'style',
    },
  ],
  nav: [
    {
      label: 'Change style',
      prompt: 'Change the navigation style (pills, underline, etc.)',
      category: 'style',
    },
    {
      label: 'Add icons',
      prompt: 'Add icons to the navigation items',
      category: 'content',
    },
    {
      label: 'Change spacing',
      prompt: 'Adjust the spacing between navigation items',
      category: 'layout',
    },
    {
      label: 'Make sticky',
      prompt: 'Make the navigation sticky when scrolling',
      category: 'layout',
    },
  ],
  list: [
    {
      label: 'Change style',
      prompt: 'Change the list style (bullets, numbers, custom)',
      category: 'style',
    },
    {
      label: 'Add dividers',
      prompt: 'Add dividers between list items',
      category: 'style',
    },
    {
      label: 'Change spacing',
      prompt: 'Adjust the spacing between list items',
      category: 'layout',
    },
    {
      label: 'Add bullets',
      prompt: 'Add bullet points to the list items',
      category: 'style',
    },
  ],
  form: [
    {
      label: 'Change layout',
      prompt: 'Change the form layout (single column, two columns)',
      category: 'layout',
    },
    {
      label: 'Add validation',
      prompt: 'Add visual validation indicators to form fields',
      category: 'interaction',
    },
    {
      label: 'Change spacing',
      prompt: 'Adjust the spacing between form fields',
      category: 'layout',
    },
    {
      label: 'Add labels',
      prompt: 'Add or improve labels for form fields',
      category: 'content',
    },
  ],
  input: [
    {
      label: 'Change size',
      prompt: 'Change the input field size',
      category: 'layout',
    },
    {
      label: 'Add icon',
      prompt: 'Add an icon inside the input field',
      category: 'content',
    },
    {
      label: 'Change border',
      prompt: 'Change the input border style',
      category: 'style',
    },
    {
      label: 'Add placeholder',
      prompt: 'Add or improve the placeholder text',
      category: 'content',
    },
  ],
  container: [
    {
      label: 'Change width',
      prompt: 'Change the container width (narrower or full-width)',
      category: 'layout',
    },
    {
      label: 'Center content',
      prompt: 'Center the content inside the container',
      category: 'layout',
    },
    {
      label: 'Add padding',
      prompt: 'Add more padding inside the container',
      category: 'layout',
    },
    {
      label: 'Change background',
      prompt: 'Add or change the container background',
      category: 'style',
    },
  ],
  link: [
    {
      label: 'Change color',
      prompt: 'Change the link color',
      category: 'style',
    },
    {
      label: 'Add underline',
      prompt: 'Add an underline to the link',
      category: 'style',
    },
    {
      label: 'Add icon',
      prompt: 'Add an icon next to the link',
      category: 'content',
    },
    {
      label: 'Add hover effect',
      prompt: 'Add a hover effect to the link',
      category: 'interaction',
    },
  ],
  icon: [
    {
      label: 'Change size',
      prompt: 'Change the icon size',
      category: 'layout',
    },
    {
      label: 'Change color',
      prompt: 'Change the icon color',
      category: 'style',
    },
    {
      label: 'Add background',
      prompt: 'Add a background circle or square behind the icon',
      category: 'style',
    },
    {
      label: 'Add animation',
      prompt: 'Add a subtle animation to the icon',
      category: 'interaction',
    },
  ],
  video: [
    {
      label: 'Change size',
      prompt: 'Change the video player size',
      category: 'layout',
    },
    {
      label: 'Add controls',
      prompt: 'Show or customize the video controls',
      category: 'interaction',
    },
    {
      label: 'Add poster',
      prompt: 'Add a poster/thumbnail image for the video',
      category: 'content',
    },
    {
      label: 'Round corners',
      prompt: 'Make the video player corners rounded',
      category: 'style',
    },
  ],
  modal: [
    {
      label: 'Change size',
      prompt: 'Change the modal size (smaller or larger)',
      category: 'layout',
    },
    {
      label: 'Add overlay',
      prompt: 'Add or darken the background overlay',
      category: 'style',
    },
    {
      label: 'Change animation',
      prompt: 'Change the modal open/close animation',
      category: 'interaction',
    },
    {
      label: 'Add close button',
      prompt: 'Add or style the modal close button',
      category: 'content',
    },
  ],
  tabs: [
    {
      label: 'Change style',
      prompt: 'Change the tab style (underline, pills, boxed)',
      category: 'style',
    },
    {
      label: 'Add icons',
      prompt: 'Add icons to the tabs',
      category: 'content',
    },
    {
      label: 'Change position',
      prompt: 'Move tabs to a different position (top, left, bottom)',
      category: 'layout',
    },
    {
      label: 'Add animation',
      prompt: 'Add smooth transition animations between tabs',
      category: 'interaction',
    },
  ],
  menu: [
    {
      label: 'Change style',
      prompt: 'Change the menu style',
      category: 'style',
    },
    {
      label: 'Add icons',
      prompt: 'Add icons to menu items',
      category: 'content',
    },
    {
      label: 'Add submenu',
      prompt: 'Add a submenu or dropdown',
      category: 'content',
    },
    {
      label: 'Add hover effect',
      prompt: 'Add a hover effect to menu items',
      category: 'interaction',
    },
  ],
  custom: [
    {
      label: 'Change size',
      prompt: 'Change the size of this element',
      category: 'layout',
    },
    {
      label: 'Change color',
      prompt: 'Change the color of this element',
      category: 'style',
    },
    {
      label: 'Add padding',
      prompt: 'Add padding around this element',
      category: 'layout',
    },
    {
      label: 'Add border',
      prompt: 'Add a border to this element',
      category: 'style',
    },
  ],
};

/**
 * Get quick actions for an element type
 * Falls back to 'custom' actions if type is not found
 */
export function getQuickActionsForElement(elementType: ElementType): QuickAction[] {
  return ELEMENT_QUICK_ACTIONS[elementType] || ELEMENT_QUICK_ACTIONS.custom;
}

/**
 * Global actions available regardless of element selection
 */
export const GLOBAL_QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Capture Preview',
    prompt: 'Take a screenshot of the current preview for reference',
    category: 'content',
  },
  {
    label: 'Upload Reference',
    prompt: 'Upload a reference image to match the style',
    category: 'content',
  },
  {
    label: 'Toggle Theme',
    prompt: 'Switch between light and dark mode',
    category: 'style',
  },
  {
    label: 'Save Design',
    prompt: 'Save the current design state',
    category: 'content',
  },
];

/**
 * Responsive design actions
 */
export const RESPONSIVE_QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Fix mobile',
    prompt: 'Make this element look better on mobile devices',
    category: 'layout',
  },
  {
    label: 'Hide on mobile',
    prompt: 'Hide this element on mobile devices only',
    category: 'layout',
  },
  {
    label: 'Stack on mobile',
    prompt: 'Stack this element vertically on smaller screens',
    category: 'layout',
  },
  {
    label: 'Full width on mobile',
    prompt: 'Make this element full width on mobile',
    category: 'layout',
  },
];

/**
 * Animation/interaction actions
 */
export const ANIMATION_QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Add hover effect',
    prompt: 'Add an interactive hover effect to this element',
    category: 'interaction',
  },
  {
    label: 'Add entrance animation',
    prompt: 'Add a smooth entrance animation when this element appears',
    category: 'interaction',
  },
  {
    label: 'Add scroll animation',
    prompt: 'Animate this element as it scrolls into view',
    category: 'interaction',
  },
  {
    label: 'Add click feedback',
    prompt: 'Add visual feedback when this element is clicked',
    category: 'interaction',
  },
];
