import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://phone-watchdog-web.vercel.app";

// This entire site sits behind HTTP Basic Auth (SITE_PASSWORD, see src/proxy.ts) in
// Production and Preview, so no crawler can actually fetch this sitemap or any URL
// in it. Kept for completeness/personal use per explicit decision, not because it's
// discoverable by bots.
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: SITE_URL }];
}
