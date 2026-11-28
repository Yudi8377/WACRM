import type { MetadataRoute } from "next";

const APP_BASE_URL = (
  process.env.APP_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_BASE_URL ||
  "https://wacrm-commercial.dwahyudi8377.workers.dev"
).replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/katalog", "/android", "/demo", "/privacy", "/terms", "/refund"],
        disallow: ["/api/", "/dashboard/", "/super-admin/"],
      },
    ],
    sitemap: `${APP_BASE_URL}/sitemap.xml`,
    host: APP_BASE_URL,
  };
}
