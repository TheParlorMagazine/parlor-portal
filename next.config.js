/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    '/shop/share-image': ['./assets/fonts/*.ttf'],
    '/post/*/share-image': ['./assets/fonts/*.ttf'],
    '/api/admin/article-share-card': ['./assets/fonts/*.ttf'],
  },
  allowedDevOrigins: ['192.168.178.113'],
  async redirects() {
    return [
      // Temporary destinations while these Borderlands articles are rebuilt.
      { source: '/borderlands-of-identity/a-body-interrupted', destination: '/borderlands-of-identity', permanent: false },
      { source: '/borderlands-of-identity/where-the-heart-draws-its-lines', destination: '/borderlands-of-identity', permanent: false },
      { source: '/borderlands-of-identity/nothing-dramatic-happens-at-the-border', destination: '/borderlands-of-identity', permanent: false },
      { source: '/donate', destination: '/buy-us-a-birthday-gift', permanent: true },
      { source: '/world-we-are-building', destination: '/issue/dfcbace2-9956-4669-8e63-a475aa371a80', permanent: false },
      { source: '/the-world-we-are-building', destination: '/issue/dfcbace2-9956-4669-8e63-a475aa371a80', permanent: false },
    ]
  },
  turbopack: {
    root: __dirname,
  },
  images: {
    // Allow Next's image optimizer to resize/serve webp for our image hosts, so
    // large originals (some Wix covers are 7+ MB) are downscaled to display size.
    remotePatterns: [
      { protocol: 'https', hostname: 'static.wixstatic.com' },
      { protocol: 'https', hostname: 'nxpwcdtduxsorbzoajbm.supabase.co' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'www.theparlormagazine.com' },
    ],
  },
}

module.exports = nextConfig
