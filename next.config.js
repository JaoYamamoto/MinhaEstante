const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  cacheOnFrontendNav: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    disableDevLogs: true,
  },
})

/** @type {import('next').NextConfig} */
const nextConfig = {}

module.exports = withPWA(nextConfig)
