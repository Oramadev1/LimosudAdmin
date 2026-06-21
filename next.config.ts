import type { NextConfig } from "next";

const laravelApiUrl =
  process.env.LARAVEL_API_URL ?? "https://api.limosudcars.com/api";
const apiOrigin = new URL(laravelApiUrl);

const storageRemotePattern = {
  protocol: apiOrigin.protocol.replace(":", "") as "http" | "https",
  hostname: apiOrigin.hostname,
  ...(apiOrigin.port ? { port: apiOrigin.port } : {}),
  pathname: "/storage/**",
} as const;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  async rewrites() {
    const upstream = laravelApiUrl.replace(/\/$/, "");

    return [
      {
        source: "/api/:path*",
        destination: `${upstream}/:path*`,
      },
    ];
  },
  turbopack: {
    root: import.meta.dirname,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [storageRemotePattern],
  },
  env: {
    NEXT_PUBLIC_API_ORIGIN: apiOrigin.origin,
  },
};

export default nextConfig;
