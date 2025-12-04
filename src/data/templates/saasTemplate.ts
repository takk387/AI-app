import type { FullTemplate } from '../../types/architectureTemplates';

/**
 * SaaS Application Template
 * Subscription-based applications with authentication, onboarding, and settings
 */
export const saasTemplate: FullTemplate = {
  id: 'saas',
  name: 'SaaS Application',
  description:
    'Subscription-based applications with authentication, onboarding wizard, dashboard, and team management.',
  icon: '🚀',
  category: 'saas',
  features: [
    'Authentication',
    'Onboarding wizard',
    'Dashboard home',
    'Settings pages',
    'Billing section',
    'Team management',
    'Profile settings',
  ],
  complexity: 'complex',
  estimatedComponents: 18,
  basePrompt: `Create a SaaS application with the following structure:
- Authentication pages (login, register, forgot password, email verification)
- Multi-step onboarding wizard for new users
- Dashboard home with key metrics and quick actions
- Settings pages (profile, account, notifications, security)
- Billing and subscription management placeholder
- Team/organization management with roles
- Navigation between main sections`,
  requiredFeatures: ['User authentication', 'Onboarding flow', 'Dashboard', 'Settings pages'],
  suggestedFeatures: [
    'Billing management',
    'Team invitations',
    'Role-based access',
    'API key management',
    'Usage analytics',
  ],
  layoutStructure: {
    type: 'sidebar',
    regions: ['sidebar', 'header', 'main', 'settings-panel'],
  },
  components: [
    { name: 'LoginPage', description: 'User login form with validation', priority: 'core' },
    { name: 'RegisterPage', description: 'User registration form', priority: 'core' },
    { name: 'ForgotPassword', description: 'Password reset request form', priority: 'core' },
    { name: 'OnboardingWizard', description: 'Multi-step onboarding flow', priority: 'core' },
    {
      name: 'OnboardingStep',
      description: 'Individual onboarding step component',
      priority: 'core',
    },
    { name: 'DashboardHome', description: 'Main dashboard with metrics', priority: 'core' },
    { name: 'ProfileSettings', description: 'User profile edit page', priority: 'core' },
    { name: 'AccountSettings', description: 'Account preferences page', priority: 'core' },
    { name: 'NotificationSettings', description: 'Notification preferences', priority: 'optional' },
    { name: 'SecuritySettings', description: 'Password and 2FA settings', priority: 'optional' },
    { name: 'BillingSection', description: 'Subscription and payment info', priority: 'optional' },
    { name: 'PricingPlans', description: 'Plan selection component', priority: 'optional' },
    { name: 'TeamMembers', description: 'Team member list with roles', priority: 'optional' },
    { name: 'InviteModal', description: 'Invite team member modal', priority: 'optional' },
    { name: 'RoleSelector', description: 'User role assignment', priority: 'optional' },
    { name: 'AppSidebar', description: 'Main navigation sidebar', priority: 'core' },
    { name: 'UserDropdown', description: 'User menu dropdown', priority: 'core' },
    { name: 'SettingsNav', description: 'Settings page navigation', priority: 'optional' },
  ],
  technicalRequirements: {
    needsAuth: true,
    needsDatabase: true,
    needsAPI: true,
    needsFileUpload: true,
  },
};

export default saasTemplate;
