/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Enable strict type checking
    ignoreBuildErrors: false,
  },
  eslint: {
    // Enable strict ESLint checking
    ignoreDuringBuilds: false,
  },
}

module.exports = nextConfig