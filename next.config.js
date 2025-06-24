/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Temporarily disable for debugging embed script loading
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ['@supabase/supabase-js'],
  async rewrites() {
    // In development, rewrite requests to /admin to themselves.
    // This prevents the catch-all route from interfering with admin pages.
    // See: https://github.com/vercel/next.js/issues/64270
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/admin/:path*',
          destination: '/admin/:path*',
        },
      ];
    }

    return [];
  },
}

module.exports = nextConfig
