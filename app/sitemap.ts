import type { MetadataRoute } from "next";
import { COMPONENTS } from "@/lib/catalog";
import { TEMPLATES } from "@/lib/templates";

const BASE =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://parable.dev";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = [
    "",
    "/components",
    "/templates",
    "/docs",
    "/docs/installation",
    "/docs/theming",
    "/docs/cli",
    "/docs/mcp",
    "/docs/changelog",
  ];

  const staticRoutes: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: `${BASE}${path}`,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  const componentRoutes: MetadataRoute.Sitemap = COMPONENTS.map((c) => ({
    url: `${BASE}/components/${c.slug}`,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const templateRoutes: MetadataRoute.Sitemap = TEMPLATES.map((t) => ({
    url: `${BASE}/templates/${t.slug}`,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...componentRoutes, ...templateRoutes];
}
