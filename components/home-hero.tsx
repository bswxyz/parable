"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { VelocityMarquee } from "@/registry/parable/ui/velocity-marquee";
import { ShimmerButton } from "@/registry/parable/ui/shimmer-button";
import { DitherAurora } from "@/registry/parable/ui/dither-aurora";
import { CopyButton } from "@/components/copy-button";
import { installCommand } from "@/lib/catalog";
import { TEMPLATES } from "@/lib/templates";

const marqueeItems = TEMPLATES.slice(0, 18).map((t) => (
  <span key={t.slug} className="text-zinc-400">
    {t.name}
    <span className="mx-3 text-zinc-600">/</span>
  </span>
));

/* The hero CTA installs the exact shader rendering behind it. */
const heroCommand = installCommand("dither-aurora", "npm");

export function HomeHero({ componentCount }: { componentCount: number }) {
  return (
    <section className="relative overflow-hidden border-b bg-[#0f0f10]">
      <DitherAurora
        className="absolute inset-0"
        speed={0.15}
        pixelSize={4}
        aria-hidden
      >
        <span />
      </DitherAurora>
      {/* legibility scrim */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20"
      />

      <div className="relative mx-auto max-w-6xl px-4 py-24 md:py-32">
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">
          Free · open · copy-paste
        </p>
        <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight text-zinc-50 md:text-7xl">
          Components &amp; templates you actually{" "}
          <em className="font-display font-normal">own</em>.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-zinc-300">
          Motion-rich React components and complete website templates, installed
          with the shadcn CLI. The code copies into your project — no black-box
          dependency, no lock-in.
        </p>

        {/* The install command IS the hero CTA */}
        <div className="mt-8 flex max-w-2xl items-center gap-3 rounded-full border border-white/15 bg-black/40 py-2 pl-4 pr-2 backdrop-blur">
          <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-[13px] text-zinc-200 [scrollbar-width:none]">
            {heroCommand}
          </code>
          <CopyButton
            value={heroCommand}
            celebrate
            label="Copy install command"
            className="shrink-0 border-white/15 bg-white/10 text-zinc-300 hover:text-white"
          />
        </div>
        <p className="mt-2 font-mono text-[11px] text-zinc-500">
          ↑ installs the aurora rendering behind this text
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <ShimmerButton
            as={Link}
            href="/components"
            aria-label="Browse components"
            className="text-base"
          >
            Browse components <ArrowRight className="size-4" />
          </ShimmerButton>
          <Link
            href="/templates"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/10"
          >
            Browse templates
          </Link>
          <span className="font-mono text-xs text-zinc-400">
            {componentCount} components · {TEMPLATES.length} templates
          </span>
        </div>
      </div>

      <div className="relative border-t border-white/10 bg-black/40 py-4 backdrop-blur-sm">
        <VelocityMarquee
          items={marqueeItems}
          baseSpeed={40}
          className="text-lg font-medium"
        />
      </div>
    </section>
  );
}
