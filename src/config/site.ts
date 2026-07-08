export const siteConfig = {
  name: "Limosud Cars Admin",
  brand: "LIMOSUD CARS",
  logo: "/logo.png",
  description: "Admin dashboard for Limosud Cars",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001",
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "https://api.limosudcars.com/api",
  publicSiteUrl: process.env.NEXT_PUBLIC_CLIENT_URL ?? "http://localhost:3000",
} as const;
