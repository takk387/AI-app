import type { FullTemplate } from '../../types/architectureTemplates';

/**
 * E-commerce Template
 * Product catalogs, shopping experiences
 */
export const ecommerceTemplate: FullTemplate = {
  id: 'ecommerce',
  name: 'E-commerce',
  description:
    'Product catalogs and shopping experiences with cart, checkout, and category navigation.',
  icon: '🛒',
  category: 'commerce',
  features: [
    'Product grid',
    'Product detail',
    'Shopping cart',
    'Checkout flow',
    'Category navigation',
    'Search with filters',
    'Wishlist',
  ],
  complexity: 'complex',
  estimatedComponents: 16,
  basePrompt: `Create an e-commerce application with the following structure:
- Product grid/list view with filtering and sorting
- Product detail page with images, description, variants
- Shopping cart sidebar or dedicated page
- Multi-step checkout flow (cart review, shipping, payment, confirmation)
- Category navigation with nested categories
- Search with autocomplete functionality
- Product quick view modal
- Price display with sale/discount support`,
  requiredFeatures: ['Product listing', 'Product detail page', 'Shopping cart', 'Checkout process'],
  suggestedFeatures: [
    'Wishlist',
    'Product reviews',
    'Related products',
    'Recently viewed',
    'Size/variant selector',
  ],
  layoutStructure: {
    type: 'topnav',
    regions: ['header', 'navigation', 'content', 'cart-sidebar', 'footer'],
  },
  components: [
    { name: 'ProductGrid', description: 'Grid of product cards with filters', priority: 'core' },
    {
      name: 'ProductCard',
      description: 'Product thumbnail with price and quick add',
      priority: 'core',
    },
    { name: 'ProductDetail', description: 'Full product page with gallery', priority: 'core' },
    {
      name: 'ShoppingCart',
      description: 'Cart sidebar or page with item management',
      priority: 'core',
    },
    { name: 'CartItem', description: 'Single cart item with quantity controls', priority: 'core' },
    { name: 'CheckoutSteps', description: 'Multi-step checkout wizard', priority: 'core' },
    { name: 'CategoryNav', description: 'Category navigation menu', priority: 'core' },
    {
      name: 'SearchAutocomplete',
      description: 'Search with product suggestions',
      priority: 'optional',
    },
    {
      name: 'ProductFilters',
      description: 'Filter panel for price, category, etc.',
      priority: 'optional',
    },
    { name: 'ImageGallery', description: 'Product image carousel', priority: 'optional' },
    { name: 'VariantSelector', description: 'Size/color variant picker', priority: 'optional' },
    { name: 'PriceDisplay', description: 'Price with sale/discount formatting', priority: 'core' },
    { name: 'Wishlist', description: 'Save for later functionality', priority: 'optional' },
    { name: 'ReviewSection', description: 'Product reviews and ratings', priority: 'optional' },
    { name: 'RelatedProducts', description: 'Similar product suggestions', priority: 'optional' },
    { name: 'QuickView', description: 'Product quick view modal', priority: 'optional' },
  ],
  technicalRequirements: {
    needsAuth: true,
    needsDatabase: true,
    needsAPI: true,
    needsFileUpload: true,
  },
};

export default ecommerceTemplate;
