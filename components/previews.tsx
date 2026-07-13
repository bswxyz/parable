"use client";

import * as React from "react";
import { ShimmerButton } from "@/registry/parable/ui/shimmer-button";
import { VelocityMarquee } from "@/registry/parable/ui/velocity-marquee";
import { KineticText } from "@/registry/parable/ui/kinetic-text";
import { MagneticDock } from "@/registry/parable/ui/magnetic-dock";
import { AuroraBackground } from "@/registry/parable/ui/aurora-background";
import { DotMatrixLoader } from "@/registry/parable/ui/dot-matrix-loader";
import { MagnetLines } from "@/registry/parable/ui/magnet-lines";
import { DitherAurora } from "@/registry/parable/ui/dither-aurora";
import { LiquidMetalButton } from "@/registry/parable/ui/liquid-metal-button";
import { DynamicIsland } from "@/registry/parable/ui/dynamic-island";
import { ExpandableCard } from "@/registry/parable/ui/expandable-card";
import { LogoCarousel } from "@/registry/parable/ui/logo-carousel";
import { GravityDots } from "@/registry/parable/ui/gravity-dots";
import { GradientHeading } from "@/registry/parable/ui/gradient-heading";
import { RevenueChart } from "@/registry/parable/ui/revenue-chart";
import { TransactionList } from "@/registry/parable/ui/transaction-list";
import { DeviceFrame } from "@/registry/parable/ui/device-frame";
import { SignInSlice } from "@/registry/parable/ui/sign-in-slice";
import { StickyScrollCards } from "@/registry/parable/ui/sticky-scroll-cards";
import { SplitFlap } from "@/registry/parable/ui/split-flap";
import { EyeTracking } from "@/registry/parable/ui/eye-tracking";
import { Aperture, Boxes, Camera, Cloud, Command, Hexagon, Home, Music, Orbit, Search, Settings, SkipForward, Sparkles, Star, Triangle, Zap } from "lucide-react";

/** Live demo for each component, keyed by slug. Used by gallery cards + detail. */
export const PREVIEWS: Record<string, React.ReactNode> = {
  "shimmer-button": (
    <div className="flex flex-wrap items-center justify-center gap-4">
      <ShimmerButton>Get the component</ShimmerButton>
      <ShimmerButton shimmerColor="#f5a623" background="rgba(14,12,10,1)">
        Amber
      </ShimmerButton>
    </div>
  ),
  "velocity-marquee": (
    <VelocityMarquee
      className="text-2xl font-semibold text-foreground/80"
      items={[
        "SCROLL FASTER",
        "★",
        "IT SPEEDS UP",
        "★",
        "THEN EASES BACK",
        "★",
      ]}
    />
  ),
  "kinetic-text": (
    <KineticText
      key={Math.random()}
      as="p"
      className="max-w-md text-center text-2xl font-medium"
      text="Words rise into place, one spring at a time."
    />
  ),
  "magnetic-dock": (
    <MagneticDock
      items={[
        { icon: <Home />, label: "Home" },
        { icon: <Search />, label: "Search" },
        { icon: <Music />, label: "Music" },
        { icon: <Camera />, label: "Camera" },
        { icon: <Star />, label: "Starred" },
        { icon: <Settings />, label: "Settings" },
      ]}
    />
  ),
  "aurora-background": (
    <AuroraBackground className="grid h-56 w-full place-items-center rounded-xl">
      <span className="text-lg font-medium text-white/90">Aurora</span>
    </AuroraBackground>
  ),
  "dot-matrix-loader": (
    <div className="flex items-end gap-10">
      <div className="flex flex-col items-center gap-3">
        <DotMatrixLoader variant="spiral" color="#8b5cf6" dotSize={7} gap={7} speed={2.4} />
        <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">spiral</span>
      </div>
      <div className="flex flex-col items-center gap-3">
        <DotMatrixLoader variant="snake" color="#22d3ee" dotSize={7} gap={7} speed={2.8} />
        <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">snake</span>
      </div>
      <div className="flex flex-col items-center gap-3">
        <DotMatrixLoader variant="rain" color="#ec4899" dotSize={7} gap={7} speed={2} />
        <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">rain</span>
      </div>
    </div>
  ),
  "magnet-lines": (
    <MagnetLines className="h-56 w-56" rows={9} columns={9} color="#8b5cf6" />
  ),
  "dither-aurora": (
    <DitherAurora className="grid h-56 w-full place-items-center rounded-xl">
      <span className="font-mono text-xs uppercase tracking-widest text-white/80">
        Prism Drift
      </span>
    </DitherAurora>
  ),
  "liquid-metal-button": (
    <div className="flex flex-wrap items-center justify-center gap-4">
      <LiquidMetalButton>Chromatic</LiquidMetalButton>
      <LiquidMetalButton preset="silver">Silver</LiquidMetalButton>
      <LiquidMetalButton preset="gold">Gold</LiquidMetalButton>
    </div>
  ),
  "dynamic-island": (
    <div className="flex min-h-[240px] w-full items-center justify-center rounded-xl bg-neutral-950 p-6">
      <DynamicIsland
        defaultState="expanded"
        idleContent={
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-violet-400" />
            <span className="text-[13px] font-medium">Now Playing</span>
          </div>
        }
      >
        <div className="flex items-center gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-violet-500/20 text-violet-300">
            <Music className="size-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">Midnight City</p>
            <p className="truncate text-xs text-white/50">M83 · Hurry Up, We're Dreaming</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button className="flex-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/15">Pause</button>
          <button aria-label="Next track" className="grid size-8 place-items-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/15">
            <SkipForward className="size-4" aria-hidden />
          </button>
        </div>
      </DynamicIsland>
    </div>
  ),
  "expandable-card": (
    <div className="w-full max-w-sm">
      <ExpandableCard
        title="Aurora Engine"
        subtitle="Real-time gradient renderer"
        defaultExpanded
        media={<Sparkles />}
      >
        <p>A GPU-cheap animated backdrop built from drifting radial bands — transform and opacity only, so it stays buttery at 60fps.</p>
        <div className="flex gap-2">
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/70">WebGL</span>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/70">Reduced-motion safe</span>
        </div>
      </ExpandableCard>
    </div>
  ),
  "logo-carousel": (
    <div className="w-full max-w-xl px-4">
      <LogoCarousel
        columns={4}
        interval={2200}
        logos={[
          { label: "Hexly", node: (<div className="flex items-center gap-1.5 text-neutral-100"><Hexagon className="h-5 w-5 text-violet-400" /><span className="font-mono text-sm font-semibold tracking-tight">Hexly</span></div>) },
          { label: "Delta", node: (<div className="flex items-center gap-1.5 text-neutral-100"><Triangle className="h-5 w-5 text-fuchsia-400" /><span className="font-mono text-sm font-semibold tracking-tight">Delta</span></div>) },
          { label: "Cmdr", node: (<div className="flex items-center gap-1.5 text-neutral-100"><Command className="h-5 w-5 text-cyan-400" /><span className="font-mono text-sm font-semibold tracking-tight">Cmdr</span></div>) },
          { label: "Nimbus", node: (<div className="flex items-center gap-1.5 text-neutral-100"><Cloud className="h-5 w-5 text-amber-400" /><span className="font-mono text-sm font-semibold tracking-tight">Nimbus</span></div>) },
          { label: "Volt", node: (<div className="flex items-center gap-1.5 text-neutral-100"><Zap className="h-5 w-5 text-violet-400" /><span className="font-mono text-sm font-semibold tracking-tight">Volt</span></div>) },
          { label: "Orbit", node: (<div className="flex items-center gap-1.5 text-neutral-100"><Orbit className="h-5 w-5 text-cyan-400" /><span className="font-mono text-sm font-semibold tracking-tight">Orbit</span></div>) },
          { label: "Lens", node: (<div className="flex items-center gap-1.5 text-neutral-100"><Aperture className="h-5 w-5 text-fuchsia-400" /><span className="font-mono text-sm font-semibold tracking-tight">Lens</span></div>) },
          { label: "Crate", node: (<div className="flex items-center gap-1.5 text-neutral-100"><Boxes className="h-5 w-5 text-amber-400" /><span className="font-mono text-sm font-semibold tracking-tight">Crate</span></div>) },
        ]}
      />
    </div>
  ),
  "gravity-dots": (
    <GravityDots
      mode="attract"
      radius={120}
      className="h-72 w-full max-w-lg rounded-2xl border border-white/10 bg-[#0f0f10]"
    >
      <div className="pointer-events-none flex h-full items-end justify-center pb-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">
          attract &middot; move your cursor
        </span>
      </div>
    </GravityDots>
  ),
  "gradient-heading": (
    <div className="flex w-full flex-col items-center gap-6 px-6 py-10 text-center">
      <GradientHeading as="h2" variant="aurora" size="xl">
        Ship it beautifully
      </GradientHeading>
      <div className="flex flex-col gap-3">
        <GradientHeading as="p" variant="signal" size="md">
          Signal, not noise
        </GradientHeading>
        <GradientHeading as="p" variant="steel" size="md">
          Forged in chrome
        </GradientHeading>
      </div>
    </div>
  ),
  "revenue-chart": (
    <div className="w-full max-w-[460px]"><RevenueChart title="Net Revenue" /></div>
  ),
  "transaction-list": (
    <div className="w-full max-w-md px-4"><TransactionList onRowClick={() => {}} /></div>
  ),
  "device-frame": (
    <div className="mx-auto w-full max-w-md">
      <DeviceFrame variant="browser" url="parable-three.vercel.app" tab="Parable">
        <div
          className="flex h-full w-full flex-col items-center justify-center gap-2"
          style={{ background: "radial-gradient(130% 120% at 18% 0%, #8b5cf6 0%, #ec4899 42%, #0f0f10 100%)" }}
        >
          <span className="text-2xl font-semibold tracking-tight text-white">Ship it in a frame</span>
          <span className="text-xs font-medium text-white/70">phone &amp; browser mockups</span>
        </div>
      </DeviceFrame>
    </div>
  ),
  "sign-in-slice": (
    <div className="flex w-full justify-center py-4">
      <SignInSlice className="w-[340px]" />
    </div>
  ),
  "sticky-scroll-cards": (
    <div className="h-[440px] w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-[#0b0b0d] p-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <StickyScrollCards
        stickyTop={20}
        items={[
          {
            title: "Capture",
            body: "Every signal from your stack lands in one replayable timeline.",
            content: (
              <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs text-white/60">
                <Sparkles className="size-3.5" /> Real-time ingest
              </div>
            ),
          },
          {
            title: "Compose",
            body: "Drag primitives into flows. Branch, merge, and preview on one canvas.",
            accent: "#22d3ee",
          },
          {
            title: "Ship",
            body: "One click promotes a draft to production with instant rollback baked in.",
            accent: "#f5a623",
          },
        ]}
      />
      <div className="h-28" />
    </div>
  ),
  "split-flap": (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem", alignItems: "center", justifyContent: "center", padding: "2rem 1.5rem", background: "#0b0b0d", borderRadius: "1rem", width: "100%" }}>
      <SplitFlap text="PARABLE" style={{ fontSize: "2.4rem" }} />
      <SplitFlap text="DEPARTURES" loop={2600} textColor="#f5a623" style={{ fontSize: "1.15rem" }} />
    </div>
  ),
  "eye-tracking": (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, minHeight: 260, width: "100%" }}>
      <EyeTracking count={2} size={112} />
      <span style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(250,250,250,0.45)" }}>move your cursor</span>
    </div>
  ),
};

export function Preview({ slug }: { slug: string }) {
  return <>{PREVIEWS[slug] ?? null}</>;
}
