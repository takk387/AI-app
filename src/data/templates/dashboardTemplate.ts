import type { FullTemplate } from '../../types/architectureTemplates';

/**
 * Dashboard Template
 * Admin panels, analytics views, data monitoring
 */
export const dashboardTemplate: FullTemplate = {
  id: 'dashboard',
  name: 'Dashboard',
  description:
    'Admin panels, analytics views, and data monitoring applications with sidebar navigation and widget-based layouts.',
  icon: '📊',
  category: 'admin',
  features: [
    'Sidebar navigation',
    'Data visualization',
    'Widget cards',
    'User profile menu',
    'Search functionality',
    'Notifications',
    'Grid layout',
  ],
  complexity: 'moderate',
  estimatedComponents: 12,
  basePrompt: `Create a dashboard application with the following structure:
- Collapsible sidebar navigation with menu items
- Top header bar with user profile dropdown, notifications bell, and search
- Main content area with responsive grid layout
- Widget/card components for displaying metrics and data
- Charts and graphs section (placeholder components)
- Clean, professional design with consistent spacing`,
  requiredFeatures: [
    'Sidebar navigation',
    'Header with user menu',
    'Dashboard grid layout',
    'Metric cards',
  ],
  suggestedFeatures: [
    'Charts and graphs',
    'Data tables',
    'Activity timeline',
    'Quick actions panel',
    'Settings page',
  ],
  layoutStructure: {
    type: 'sidebar',
    regions: ['sidebar', 'header', 'main', 'widgets'],
  },
  components: [
    {
      name: 'Sidebar',
      description: 'Collapsible navigation sidebar with menu items',
      priority: 'core',
    },
    {
      name: 'Header',
      description: 'Top bar with search, notifications, and user menu',
      priority: 'core',
    },
    { name: 'DashboardGrid', description: 'Responsive grid layout for widgets', priority: 'core' },
    { name: 'MetricCard', description: 'Card displaying key metrics with icons', priority: 'core' },
    {
      name: 'ChartWidget',
      description: 'Placeholder for chart visualizations',
      priority: 'optional',
    },
    { name: 'ActivityFeed', description: 'Recent activity timeline', priority: 'optional' },
    { name: 'QuickActions', description: 'Common action shortcuts panel', priority: 'optional' },
    {
      name: 'NotificationDropdown',
      description: 'Notification list dropdown',
      priority: 'optional',
    },
    { name: 'UserMenu', description: 'User profile dropdown menu', priority: 'core' },
    { name: 'SearchBar', description: 'Global search input', priority: 'optional' },
    { name: 'DataTable', description: 'Sortable data table component', priority: 'optional' },
    { name: 'StatsSummary', description: 'Summary statistics section', priority: 'optional' },
  ],
  technicalRequirements: {
    needsAuth: true,
    needsDatabase: true,
    needsAPI: true,
    needsFileUpload: false,
  },
};

export default dashboardTemplate;
