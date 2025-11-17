/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  
  // IMPORTANT: Disable Turbopack to maintain webpack compatibility
  // Required for tree-sitter native bindings
  turbo: false,
  
  webpack: (config, { isServer }) => {
    // Fix for tree-sitter native bindings
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'tree-sitter': 'commonjs tree-sitter',
        'tree-sitter-typescript': 'commonjs tree-sitter-typescript',
        'tree-sitter-javascript': 'commonjs tree-sitter-javascript',
      });
      
      // Ignore .node files
      config.module = config.module || {};
      config.module.rules = config.module.rules || [];
      config.module.rules.push({
        test: /\.node$/,
        use: 'node-loader',
      });
    }
    
    return config;
  },
}
