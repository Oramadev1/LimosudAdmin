import type { NextConfig } from "next";

const laravelApiUrl =
  process.env.LARAVEL_API_URL ?? "https://api.limosudcars.com/api";
const apiOrigin = new URL(laravelApiUrl);
const lanHost = process.env.DEV_LAN_HOST ?? "192.168.1.4";

const storageRemotePattern = {
  protocol: apiOrigin.protocol.replace(":", "") as "http" | "https",
  hostname: apiOrigin.hostname,
  ...(apiOrigin.port ? { port: apiOrigin.port } : {}),
  pathname: "/storage/**",
} as const;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  // Allow HMR WebSocket when teammates open the dev server via your LAN IP.
  allowedDevOrigins: [lanHost, `http://${lanHost}:3001`],
  async rewrites() {
    const upstream = laravelApiUrl.replace(/\/$/, "");
    const storageOrigin = upstream.replace(/\/api\/?$/, "");

    // Optional /storage proxy when NEXT_PUBLIC_API_URL=/api (legacy)
    const publicApiUrl = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
    const useApiProxy =
      publicApiUrl === "/api" ||
      (publicApiUrl.endsWith("/api") && !publicApiUrl.startsWith("http"));

    const rewrites = [];

    if (useApiProxy) {
      rewrites.push({
        source: "/api/:path*",
        destination: `${upstream}/:path*`,
      });
    }

    rewrites.push({
      source: "/storage/:path*",
      destination: `${storageOrigin}/storage/:path*`,
    });

    return rewrites;
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
