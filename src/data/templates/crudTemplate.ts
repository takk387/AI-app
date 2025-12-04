import type { FullTemplate } from '../../types/architectureTemplates';

/**
 * CRUD Application Template
 * Data management applications with list, create, edit, and delete functionality
 */
export const crudTemplate: FullTemplate = {
  id: 'crud',
  name: 'CRUD Application',
  description:
    'Data management applications with list views, forms, and full create, read, update, delete functionality.',
  icon: '📝',
  category: 'admin',
  features: [
    'List/table view',
    'Create form',
    'Edit form',
    'Detail view',
    'Search & filter',
    'Pagination',
    'Delete confirmation',
  ],
  complexity: 'simple',
  estimatedComponents: 10,
  basePrompt: `Create a CRUD application with the following structure:
- List view with table or grid display of items
- Create form with input validation
- Edit form (can reuse create form with pre-filled data)
- Detail view modal or dedicated page
- Search bar with filter options
- Sort functionality for columns
- Pagination component
- Delete confirmation dialog
- Empty state and loading states`,
  requiredFeatures: [
    'Item list/table',
    'Create form',
    'Edit functionality',
    'Delete with confirmation',
  ],
  suggestedFeatures: [
    'Bulk actions',
    'Export to CSV',
    'Advanced filtering',
    'Sorting',
    'Inline editing',
  ],
  layoutStructure: {
    type: 'topnav',
    regions: ['header', 'toolbar', 'content', 'pagination'],
  },
  components: [
    {
      name: 'DataTable',
      description: 'Table/grid display with sortable columns',
      priority: 'core',
    },
    { name: 'CreateForm', description: 'Form for creating new items', priority: 'core' },
    { name: 'EditForm', description: 'Form for editing existing items', priority: 'core' },
    { name: 'DetailView', description: 'Modal or page showing item details', priority: 'core' },
    { name: 'SearchBar', description: 'Search input with debounce', priority: 'core' },
    { name: 'FilterPanel', description: 'Filter options panel', priority: 'optional' },
    { name: 'Pagination', description: 'Page navigation component', priority: 'core' },
    { name: 'DeleteDialog', description: 'Confirmation dialog for deletions', priority: 'core' },
    { name: 'EmptyState', description: 'Display when no items exist', priority: 'optional' },
    { name: 'LoadingState', description: 'Loading skeleton/spinner', priority: 'optional' },
  ],
  technicalRequirements: {
    needsAuth: false,
    needsDatabase: true,
    needsAPI: true,
    needsFileUpload: false,
  },
};

export default crudTemplate;
