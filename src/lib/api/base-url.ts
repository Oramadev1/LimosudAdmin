import { siteConfig } from "@/config/site";

function apiBaseUrl(): string {
  const publicUrl = process.env.NEXT_PUBLIC_API_URL;
  if (publicUrl && publicUrl.startsWith("http")) {
    return publicUrl.replace(/\/$/, "");
  }

  const serverUrl = process.env.LARAVEL_API_URL;
  if (serverUrl) {
    return serverUrl.replace(/\/$/, "");
  }

  return "https://api.limosudcars.com/api";
}

export function resolveApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (typeof window !== "undefined") {
    const clientBase = siteConfig.apiUrl.replace(/\/$/, "");

    // Legacy same-origin proxy mode (/api → Next.js rewrite). Avoid in dev.
    if (clientBase === "/api" || (!clientBase.startsWith("http") && clientBase.startsWith("/"))) {
      return `${clientBase}${normalizedPath}`;
    }

    return `${clientBase}${normalizedPath}`;
  }

  return `${apiBaseUrl()}${normalizedPath}`;
}
