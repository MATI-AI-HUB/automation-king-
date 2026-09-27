/** @type {import('next').NextConfig} */
const path = require('path')

const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.supabase.in' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: '**' },
    ],
  },
  async rewrites() {
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '')
    const rewrites = []
    if (supabaseUrl && supabaseUrl.startsWith('https://')) {
      rewrites.push({
        source: '/api/supabase/:path*',
        destination: `${supabaseUrl}/:path*`,
      })
    }
    const legacy =
      process.env.ENABLE_LEGACY_POCKETBASE === 'true' &&
      process.env.NODE_ENV !== 'production'
    const api = process.env.NEXT_PUBLIC_API_URL || ''
    if (legacy && api) {
      rewrites.push({
        source: '/api/backend/:path*',
        destination: `${api}/api/:path*`,
      })
    }
    return rewrites
  },
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ]
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ['/**', '!**/Banglarvoice-apps/**', '!**/frontend/**'],
      }
      config.cache = false
    }
    return config
  },
  allowedDevOrigins: [
    '192.168.0.106',
    '10.83.106.238',
    '.monkeycode-ai.live',
  ],
}

module.exports = nextConfig
