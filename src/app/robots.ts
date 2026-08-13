import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://phone-watchdog-web.vercel.app";

// The whole site is HTTP Basic Auth gated (see src/proxy.ts) — no crawler can actually
// reach any of this. robots.txt itself will 401 to an unauthenticated bot.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
