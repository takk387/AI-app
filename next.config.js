/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,

  // Next.js 16: Turbopack is default. Empty config silences webpack/turbopack conflict.
  turbopack: {},

  // COOP/COEP headers required for WebContainers (SharedArrayBuffer)
  // Only applied to Railway API routes that need SharedArrayBuffer
  async headers() {
    return [
      {
        source: '/api/railway/:path*',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
    ];
  },

  // Webpack config for tree-sitter native bindings (production builds)
  // Turbopack uses this as fallback when it can't handle native modules
  webpack: (config, { isServer, dev }) => {
    if (!dev) {
      config.optimization = config.optimization || {};
      config.optimization.minimize = false;
    }

    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'tree-sitter': 'commonjs tree-sitter',
        'tree-sitter-typescript': 'commonjs tree-sitter-typescript',
        'tree-sitter-javascript': 'commonjs tree-sitter-javascript',
        'puppeteer': 'commonjs puppeteer',
        'esbuild': 'commonjs esbuild',
      });

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
