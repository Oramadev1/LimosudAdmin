import { siteConfig } from "@/config/site";

export function resolveApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (typeof window !== "undefined") {
    return `${siteConfig.apiUrl.replace(/\/$/, "")}${normalizedPath}`;
  }

  const upstream =
    process.env.LARAVEL_API_URL ?? "https://api.limosudcars.com/api";

  return `${upstream.replace(/\/$/, "")}${normalizedPath}`;
}
