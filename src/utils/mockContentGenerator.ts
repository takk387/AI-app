/**
 * Mock content generator for LayoutPreview
 * Generates realistic preview content based on app concept
 */

import type { Feature } from '../types/appConcept';

export interface MockContent {
  navItems: string[];
  hero: {
    title: string;
    subtitle: string;
    cta: string;
  };
  stats: Array<{
    label: string;
    value: string;
  }>;
  cards: Array<{
    title: string;
    subtitle: string;
    tag: string;
  }>;
  listItems: Array<{
    title: string;
    status: string;
    meta: string;
  }>;
}

/**
 * Generate mock content based on app concept
 */
export function generateMockContent(
  name: string,
  description: string,
  features: Feature[],
  purpose: string
): MockContent {
  // Determine app type from description and purpose
  const appType = detectAppType(description, purpose);

  // Generate nav items based on features and app type
  const navItems = generateNavItems(features, appType);

  // Generate hero content
  const hero = generateHeroContent(name, description, appType);

  // Generate stats based on app type
  const stats = generateStats(appType);

  // Generate cards based on features
  const cards = generateCards(features, appType);

  // Generate list items
  const listItems = generateListItems(features, appType);

  return {
    navItems,
    hero,
    stats,
    cards,
    listItems
  };
}

type AppType = 
  | 'dashboard'
  | 'ecommerce'
  | 'social'
  | 'productivity'
  | 'portfolio'
  | 'blog'
  | 'analytics'
  | 'general';

/**
 * Detect app type from description and purpose
 */
function detectAppType(description: string, purpose: string): AppType {
  const text = `${description} ${purpose}`.toLowerCase();

  if (text.includes('dashboard') || text.includes('admin') || text.includes('management')) {
    return 'dashboard';
  }
  if (text.includes('shop') || text.includes('store') || text.includes('product') || text.includes('cart')) {
    return 'ecommerce';
  }
  if (text.includes('social') || text.includes('community') || text.includes('friend') || text.includes('post')) {
    return 'social';
  }
  if (text.includes('task') || text.includes('todo') || text.includes('project') || text.includes('work')) {
    return 'productivity';
  }
  if (text.includes('portfolio') || text.includes('showcase') || text.includes('work')) {
    return 'portfolio';
  }
  if (text.includes('blog') || text.includes('article') || text.includes('content')) {
    return 'blog';
  }
  if (text.includes('analytics') || text.includes('metrics') || text.includes('report')) {
    return 'analytics';
  }

  return 'general';
}

/**
 * Generate navigation items
 */
function generateNavItems(features: Feature[], appType: AppType): string[] {
  const baseItems = ['Home'];

  // Add feature-based items
  const featureItems = features
    .slice(0, 3)
    .map((f) => f.name.split(' ').slice(0, 2).join(' '));

  // Add app-type specific items
  const typeItems: Record<AppType, string[]> = {
    dashboard: ['Dashboard', 'Reports', 'Settings'],
    ecommerce: ['Products', 'Cart', 'Account'],
    social: ['Feed', 'Messages', 'Profile'],
    productivity: ['Tasks', 'Calendar', 'Notes'],
    portfolio: ['Projects', 'About', 'Contact'],
    blog: ['Articles', 'Categories', 'About'],
    analytics: ['Overview', 'Reports', 'Insights'],
    general: ['Features', 'About', 'Contact']
  };

  const items = new Set([...baseItems, ...featureItems, ...typeItems[appType]]);
  return Array.from(items).slice(0, 5);
}

/**
 * Generate hero content
 */
function generateHeroContent(
  name: string,
  description: string,
  appType: AppType
): MockContent['hero'] {
  const ctaByType: Record<AppType, string> = {
    dashboard: 'View Dashboard',
    ecommerce: 'Shop Now',
    social: 'Join Community',
    productivity: 'Get Started',
    portfolio: 'View Work',
    blog: 'Read Latest',
    analytics: 'See Reports',
    general: 'Get Started'
  };

  return {
    title: name || 'Welcome to Your App',
    subtitle: description?.slice(0, 100) || 'Your amazing application awaits',
    cta: ctaByType[appType]
  };
}

/**
 * Generate stats based on app type
 */
function generateStats(appType: AppType): MockContent['stats'] {
  const statsByType: Record<AppType, MockContent['stats']> = {
    dashboard: [
      { label: 'Active Users', value: '2,341' },
      { label: 'Revenue', value: '$45.2K' },
      { label: 'Growth', value: '+12.5%' },
      { label: 'Tasks Done', value: '847' }
    ],
    ecommerce: [
      { label: 'Products', value: '1,234' },
      { label: 'Orders', value: '567' },
      { label: 'Customers', value: '3.2K' },
      { label: 'Revenue', value: '$89K' }
    ],
    social: [
      { label: 'Members', value: '15.2K' },
      { label: 'Posts', value: '45.6K' },
      { label: 'Engagement', value: '78%' },
      { label: 'Active Now', value: '234' }
    ],
    productivity: [
      { label: 'Tasks', value: '156' },
      { label: 'Completed', value: '134' },
      { label: 'In Progress', value: '22' },
      { label: 'Team Size', value: '8' }
    ],
    portfolio: [
      { label: 'Projects', value: '24' },
      { label: 'Clients', value: '18' },
      { label: 'Awards', value: '7' },
      { label: 'Years', value: '5+' }
    ],
    blog: [
      { label: 'Articles', value: '256' },
      { label: 'Readers', value: '12.4K' },
      { label: 'Comments', value: '1.2K' },
      { label: 'Shares', value: '3.4K' }
    ],
    analytics: [
      { label: 'Data Points', value: '1.2M' },
      { label: 'Reports', value: '156' },
      { label: 'Insights', value: '89' },
      { label: 'Accuracy', value: '99.2%' }
    ],
    general: [
      { label: 'Users', value: '5,234' },
      { label: 'Actions', value: '12.4K' },
      { label: 'Success Rate', value: '95%' },
      { label: 'Uptime', value: '99.9%' }
    ]
  };

  return statsByType[appType];
}

/**
 * Generate cards based on features
 */
function generateCards(features: Feature[], appType: AppType): MockContent['cards'] {
  // Use features if available
  if (features.length > 0) {
    return features.slice(0, 4).map((f, i) => ({
      title: f.name,
      subtitle: f.description.slice(0, 60) || 'Feature description',
      tag: f.priority === 'high' ? 'Priority' : f.priority === 'medium' ? 'Standard' : 'Optional'
    }));
  }

  // Default cards by app type
  const defaultCards: Record<AppType, MockContent['cards']> = {
    dashboard: [
      { title: 'Revenue Overview', subtitle: 'Monthly revenue analytics', tag: 'Finance' },
      { title: 'User Activity', subtitle: 'Active user statistics', tag: 'Users' },
      { title: 'Performance', subtitle: 'System performance metrics', tag: 'Tech' },
      { title: 'Notifications', subtitle: 'Recent system alerts', tag: 'Alerts' }
    ],
    ecommerce: [
      { title: 'New Arrivals', subtitle: 'Latest products in stock', tag: 'New' },
      { title: 'Best Sellers', subtitle: 'Top selling products', tag: 'Popular' },
      { title: 'On Sale', subtitle: 'Discounted items', tag: 'Sale' },
      { title: 'Featured', subtitle: 'Hand-picked selections', tag: 'Featured' }
    ],
    social: [
      { title: 'Trending Topics', subtitle: 'What people are talking about', tag: 'Trending' },
      { title: 'New Connections', subtitle: 'People you might know', tag: 'Connect' },
      { title: 'Groups', subtitle: 'Communities to join', tag: 'Community' },
      { title: 'Events', subtitle: 'Upcoming activities', tag: 'Events' }
    ],
    productivity: [
      { title: 'Today\'s Tasks', subtitle: 'Your daily priorities', tag: 'Today' },
      { title: 'Projects', subtitle: 'Active project overview', tag: 'Projects' },
      { title: 'Calendar', subtitle: 'Upcoming events', tag: 'Schedule' },
      { title: 'Notes', subtitle: 'Quick notes and ideas', tag: 'Notes' }
    ],
    portfolio: [
      { title: 'Web Design', subtitle: 'Responsive websites', tag: 'Web' },
      { title: 'Mobile Apps', subtitle: 'iOS and Android', tag: 'Mobile' },
      { title: 'Branding', subtitle: 'Identity design', tag: 'Brand' },
      { title: 'Illustration', subtitle: 'Digital artwork', tag: 'Art' }
    ],
    blog: [
      { title: 'Getting Started', subtitle: 'Introduction to our topic', tag: 'Basics' },
      { title: 'Advanced Tips', subtitle: 'Pro techniques', tag: 'Advanced' },
      { title: 'Case Study', subtitle: 'Real-world examples', tag: 'Case' },
      { title: 'News Update', subtitle: 'Latest industry news', tag: 'News' }
    ],
    analytics: [
      { title: 'Traffic Analysis', subtitle: 'Visitor patterns', tag: 'Traffic' },
      { title: 'Conversion Rate', subtitle: 'User actions', tag: 'Conversion' },
      { title: 'Revenue Metrics', subtitle: 'Financial insights', tag: 'Revenue' },
      { title: 'User Behavior', subtitle: 'Engagement data', tag: 'Behavior' }
    ],
    general: [
      { title: 'Feature One', subtitle: 'Primary functionality', tag: 'Core' },
      { title: 'Feature Two', subtitle: 'Secondary functionality', tag: 'Standard' },
      { title: 'Feature Three', subtitle: 'Additional capability', tag: 'Plus' },
      { title: 'Feature Four', subtitle: 'Extra feature', tag: 'Extra' }
    ]
  };

  return defaultCards[appType];
}

/**
 * Generate list items
 */
function generateListItems(features: Feature[], appType: AppType): MockContent['listItems'] {
  const statusOptions = ['Active', 'Pending', 'Complete', 'In Progress'];
  const metaOptions = ['2 min ago', '1 hour ago', 'Yesterday', 'This week'];

  // Generate from features if available
  if (features.length >= 3) {
    return features.slice(0, 5).map((f, i) => ({
      title: f.name,
      status: statusOptions[i % statusOptions.length],
      meta: metaOptions[i % metaOptions.length]
    }));
  }

  // Default list items by app type
  const defaultItems: Record<AppType, MockContent['listItems']> = {
    dashboard: [
      { title: 'System health check', status: 'Complete', meta: '2 min ago' },
      { title: 'Database backup', status: 'In Progress', meta: '5 min ago' },
      { title: 'Security scan', status: 'Pending', meta: '1 hour ago' },
      { title: 'Performance audit', status: 'Active', meta: 'Yesterday' },
      { title: 'User report generation', status: 'Complete', meta: 'This week' }
    ],
    ecommerce: [
      { title: 'Order #12345', status: 'Shipped', meta: '2 min ago' },
      { title: 'Order #12344', status: 'Processing', meta: '1 hour ago' },
      { title: 'Return request', status: 'Pending', meta: 'Yesterday' },
      { title: 'Inventory alert', status: 'Active', meta: 'This week' },
      { title: 'Order #12343', status: 'Delivered', meta: 'This week' }
    ],
    social: [
      { title: 'John commented on your post', status: 'New', meta: '2 min ago' },
      { title: 'Sarah started following you', status: 'New', meta: '1 hour ago' },
      { title: 'Group invitation', status: 'Pending', meta: 'Yesterday' },
      { title: 'Event reminder', status: 'Active', meta: 'Tomorrow' },
      { title: 'Message from Mike', status: 'Unread', meta: 'This week' }
    ],
    productivity: [
      { title: 'Complete project proposal', status: 'In Progress', meta: 'Due today' },
      { title: 'Review design mockups', status: 'Pending', meta: 'Due tomorrow' },
      { title: 'Team standup meeting', status: 'Scheduled', meta: 'In 2 hours' },
      { title: 'Send weekly report', status: 'Complete', meta: 'Yesterday' },
      { title: 'Code review', status: 'In Progress', meta: 'This week' }
    ],
    portfolio: [
      { title: 'Client feedback on project', status: 'New', meta: '2 min ago' },
      { title: 'Project milestone reached', status: 'Complete', meta: 'Yesterday' },
      { title: 'New inquiry received', status: 'Pending', meta: 'Today' },
      { title: 'Portfolio update published', status: 'Live', meta: 'This week' },
      { title: 'Contract signed', status: 'Complete', meta: 'Last week' }
    ],
    blog: [
      { title: 'New comment on "Getting Started"', status: 'Approved', meta: '2 min ago' },
      { title: 'Article draft saved', status: 'Draft', meta: '1 hour ago' },
      { title: 'Scheduled post for tomorrow', status: 'Scheduled', meta: 'Tomorrow' },
      { title: 'Newsletter sent', status: 'Complete', meta: 'Yesterday' },
      { title: 'New subscriber', status: 'Active', meta: 'Today' }
    ],
    analytics: [
      { title: 'Daily report generated', status: 'Complete', meta: '2 min ago' },
      { title: 'Anomaly detected in traffic', status: 'Alert', meta: '1 hour ago' },
      { title: 'Weekly summary ready', status: 'New', meta: 'Today' },
      { title: 'Data sync completed', status: 'Success', meta: 'Yesterday' },
      { title: 'Custom report scheduled', status: 'Pending', meta: 'Tomorrow' }
    ],
    general: [
      { title: 'Item one', status: 'Active', meta: '2 min ago' },
      { title: 'Item two', status: 'Pending', meta: '1 hour ago' },
      { title: 'Item three', status: 'Complete', meta: 'Yesterday' },
      { title: 'Item four', status: 'In Progress', meta: 'Today' },
      { title: 'Item five', status: 'Active', meta: 'This week' }
    ]
  };

  return defaultItems[appType];
}
