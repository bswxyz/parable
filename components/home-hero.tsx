"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { VelocityMarquee } from "@/registry/parable/ui/velocity-marquee";
import { ShimmerButton } from "@/registry/parable/ui/shimmer-button";
import { AuroraBackground } from "@/registry/parable/ui/aurora-background";
import { TEMPLATES } from "@/lib/templates";

const marqueeItems = TEMPLATES.slice(0, 18).map((t) => (
  <span key={t.slug} className="text-muted-foreground">
    {t.name}
    <span className="mx-3 text-foreground/25">/</span>
  </span>
));

export function HomeHero({ componentCount }: { componentCount: number }) {
  return (
    <section className="relative overflow-hidden border-b">
      <AuroraBackground
        className="absolute inset-0"
        colors={["#8b5cf6", "#ec4899", "#f5a623"]}
        background="transparent"
        speed={22}
        grain={false}
      >
        <span />
      </AuroraBackground>

      <div className="relative mx-auto max-w-6xl px-4 py-24 md:py-32">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Free · open · copy-paste
        </p>
        <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
          Components &amp; templates you actually own.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Motion-rich React components and complete website templates, installed
          with the shadcn CLI. The code copies into your project — no black-box
          dependency, no lock-in.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link href="/components" aria-label="Browse components">
            <ShimmerButton className="text-base">
              Browse components <ArrowRight className="size-4" />
            </ShimmerButton>
          </Link>
          <Link
            href="/templates"
            className="inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-medium transition-colors hover:bg-muted"
          >
            Browse templates
          </Link>
          <span className="font-mono text-xs text-muted-foreground">
            {componentCount} components · {TEMPLATES.length} templates
          </span>
        </div>
      </div>

      <div className="relative border-t bg-background/40 py-4 backdrop-blur-sm">
        <VelocityMarquee
          items={marqueeItems}
          baseSpeed={40}
          className="text-lg font-medium"
        />
      </div>
    </section>
  );
}
