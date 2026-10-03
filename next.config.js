/** @type {import('next').NextConfig} */
const nextConfig = {
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
