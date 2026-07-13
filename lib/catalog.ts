import registry from "@/registry.json";

export type Category =
  | "text"
  | "interactive"
  | "hero"
  | "effect"
  | "loader"
  | "block"
  | "template";
export type Family = "component" | "template";

/** Watermelon-style attribution: the canonical nested shape, not the legacy flat props. */
export interface InspiredBy {
  name: string;
  url: string;
}

export interface CatalogItem {
  slug: string;
  name: string;
  title: string;
  description: string;
  category: Category;
  family: Family;
  dependencies: string[];
  registryDependencies: string[];
  inspiredBy?: InspiredBy;
}

export const CATEGORY_LABEL: Record<Category, string> = {
  text: "Text Animations",
  interactive: "Interactive",
  hero: "Hero Backgrounds",
  effect: "Visual Effects",
  loader: "Loaders",
  block: "Blocks & Slices",
  template: "Templates",
};

export const CATEGORY_ORDER: Category[] = [
  "text",
  "interactive",
  "hero",
  "effect",
  "loader",
  "block",
];

type RawItem = {
  name: string;
  title?: string;
  description?: string;
  dependencies?: string[];
  registryDependencies?: string[];
  meta?: { family?: Family; category?: Category; inspiredBy?: InspiredBy };
};

export const COMPONENTS: CatalogItem[] = (registry.items as RawItem[]).map(
  (it) => ({
    slug: it.name,
    name: it.name,
    title: it.title ?? it.name,
    description: it.description ?? "",
    category: it.meta?.category ?? "interactive",
    family: it.meta?.family ?? "component",
    dependencies: it.dependencies ?? [],
    registryDependencies: it.registryDependencies ?? [],
    inspiredBy: it.meta?.inspiredBy,
  })
);

export function getComponent(slug: string): CatalogItem | undefined {
  return COMPONENTS.find((c) => c.slug === slug);
}

export function componentsByCategory(): [Category, CatalogItem[]][] {
  return CATEGORY_ORDER.map((cat) => [
    cat,
    COMPONENTS.filter((c) => c.category === cat),
  ]).filter(([, list]) => list.length > 0) as [Category, CatalogItem[]][];
}

/** Public base URL of the registry (env-overridable for prod). */
export const REGISTRY_BASE =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";

/** The install command for a given package manager. */
export function installCommand(
  slug: string,
  pm: "npm" | "pnpm" | "yarn" | "bun" = "npm"
): string {
  const url = `${REGISTRY_BASE || "https://parable-three.vercel.app"}/r/${slug}.json`;
  const runner = {
    npm: "npx shadcn@latest add",
    pnpm: "pnpm dlx shadcn@latest add",
    yarn: "yarn dlx shadcn@latest add",
    bun: "bunx --bun shadcn@latest add",
  }[pm];
  return `${runner} ${url}`;
}
