/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Enable strict type checking
    ignoreBuildErrors: false,
  },
  // Fix Turbopack root directory warning  
  turbopack: {
    root: __dirname,
  },
  // Optimize bundling for React 19 compatibility
  experimental: {
    optimizePackageImports: ['react-hook-form', '@hookform/resolvers', 'zod'],
  },
  // Ensure proper module resolution
  transpilePackages: ['react-hook-form'],
  // eslint configuration moved to .eslintrc.json
}

module.exports = nextConfig