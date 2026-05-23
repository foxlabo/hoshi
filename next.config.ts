import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Both `better-sqlite3` and `sharp` ship native bindings that must be
  // loaded server-side rather than bundled. Keeping them external avoids
  // the turbopack "Could not locate the bindings file" error in dev.
  serverExternalPackages: ['better-sqlite3', 'sharp'],
}

export default nextConfig
