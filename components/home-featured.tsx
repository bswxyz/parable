import Link from "next/link";
import Image from "next/image";
import { PreviewStage } from "@/components/preview-stage";
import { Preview } from "@/components/previews";
import { COMPONENTS } from "@/lib/catalog";
import { TEMPLATES } from "@/lib/templates";

const FEATURED_COMPONENTS = [
  "liquid-metal-button",
  "dynamic-island",
  "magnetic-dock",
  "gravity-dots",
];
const FEATURED_TEMPLATES = [
  "formwork-neon",
  "perigee-astro",
  "aperture-lab",
  "backstage-pass",
];

export function HomeFeatured() {
  const comps = FEATURED_COMPONENTS.map((s) =>
    COMPONENTS.find((c) => c.slug === s)
  ).filter(Boolean);
  const tpls = FEATURED_TEMPLATES.map((s) =>
    TEMPLATES.find((t) => t.slug === s)
  ).filter(Boolean);

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
      {/* Components */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Featured components
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Animated, accessible, reduced-motion aware.
          </p>
        </div>
        <Link
          href="/components"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          All components →
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {comps.map(
          (c) =>
            c && (
              <div
                key={c.slug}
                className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-colors focus-within:border-foreground/25 hover:border-foreground/25"
              >
                <PreviewStage
                  minH="min-h-[160px]"
                  className="rounded-none border-0 border-b"
                >
                  <div className="pointer-events-none scale-[0.7]" aria-hidden inert>
                    <Preview slug={c.slug} />
                  </div>
                </PreviewStage>
                <div className="p-3.5">
                  <h3 className="text-sm font-medium">
                    <Link
                      href={`/components/${c.slug}`}
                      className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
                    >
                      {c.title}
                    </Link>
                  </h3>
                </div>
              </div>
            )
        )}
      </div>

      {/* Templates */}
      <div className="mb-6 mt-20 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Featured templates
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete sites. Live preview, clone, ship.
          </p>
        </div>
        <Link
          href="/templates"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          All templates →
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {tpls.map(
          (t) =>
            t && (
              <Link
                key={t.slug}
                href={`/templates/${t.slug}`}
                className="group overflow-hidden rounded-2xl border bg-card transition-colors hover:border-foreground/25"
              >
                <div className="relative aspect-[16/10] overflow-hidden border-b">
                  <Image
                    src={t.thumb}
                    alt={`${t.name} template preview`}
                    fill
                    sizes="(max-width: 640px) 100vw, 25vw"
                    className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                </div>
                <div className="p-3.5">
                  <h3 className="text-sm font-medium">{t.name}</h3>
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {t.pitch}
                  </p>
                </div>
              </Link>
            )
        )}
      </div>
    </div>
  );
}
