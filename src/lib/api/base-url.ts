import { siteConfig } from "@/config/site";

function apiBaseUrl(): string {
  const publicUrl = siteConfig.apiUrl;
  if (publicUrl.startsWith("http")) {
    return publicUrl.replace(/\/$/, "");
  }

  return "https://api.limosudcars.com/api";
}

export function resolveApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${apiBaseUrl()}${normalizedPath}`;
}
