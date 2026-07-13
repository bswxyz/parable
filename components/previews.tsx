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
import { ShiftCard } from "@/registry/parable/ui/shift-card";
import { NotificationStack } from "@/registry/parable/ui/notification-stack";
import { AnimatedGrid } from "@/registry/parable/ui/animated-grid";
import { TextScramble } from "@/registry/parable/ui/text-scramble";
import { TextHighlighter } from "@/registry/parable/ui/text-highlighter";
import { AnimatedInput } from "@/registry/parable/ui/animated-input";
import { PricingTable } from "@/registry/parable/ui/pricing-table";
import { ImageReveal } from "@/registry/parable/ui/image-reveal";
import { CursorImageTrail } from "@/registry/parable/ui/cursor-image-trail";
import { DragScrollGallery } from "@/registry/parable/ui/drag-scroll-gallery";
import { RichTooltip } from "@/registry/parable/ui/rich-tooltip";
import { TokenSwapCard } from "@/registry/parable/ui/token-swap-card";
import { HoverMemberRow } from "@/registry/parable/ui/hover-member-row";
import { FamilyDrawer } from "@/registry/parable/ui/family-drawer";
import { ProgressRing } from "@/registry/parable/ui/progress-ring";
import { StatCard } from "@/registry/parable/ui/stat-card";
import { AnimatedCounter } from "@/registry/parable/ui/animated-counter";
import { AvatarStack } from "@/registry/parable/ui/avatar-stack";
import { Activity, Aperture, ArrowUpRight, Boxes, Camera, Cloud, Command, CreditCard, DollarSign, GitBranch, Heart, Hexagon, Home, ImageIcon, Layers, Lock, Mail, MessageCircle, Music, Orbit, Rocket, Search, Settings, SkipForward, Sparkles, Star, Terminal, Triangle, User, Users, Wallet, Zap } from "lucide-react";

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
  "shift-card": (
    <div className="flex w-full items-center justify-center p-6">
      <ShiftCard
        className="w-[320px]"
        label="Case study"
        title="Prism analytics for realtime funnels"
        accent="#8b5cf6"
        detail={
          <>
            <p>
              Cohort retention, revenue attribution, and live funnels unified in
              one surface — hover to look closer.
            </p>
            <span className="inline-flex items-center gap-1 font-medium text-[#8b5cf6]">
              Read the story
              <ArrowUpRight className="size-3.5" strokeWidth={2.5} />
            </span>
          </>
        }
      />
    </div>
  ),
  "notification-stack": (
    <div className="flex w-full max-w-sm flex-col gap-3 px-4">
      <NotificationStack
        items={[
          {
            id: "1",
            title: "Aria Chen",
            body: "Sent you the Q3 deck — take a look when you get a sec.",
            icon: <MessageCircle />,
          },
          {
            id: "2",
            title: "Payment received",
            body: "$4,200.00 from Northwind Studios",
            icon: <CreditCard />,
          },
          {
            id: "3",
            title: "Deploy succeeded",
            body: "parable-web · production · 42s",
            icon: <Rocket />,
          },
          {
            id: "4",
            title: "3 new followers",
            body: "and 12 others liked your post",
            icon: <Heart />,
          },
        ]}
      />
      <p className="text-center text-xs text-white/40">Tap the top card to expand</p>
    </div>
  ),
  "animated-grid": (
    <AnimatedGrid
      cellSize={34}
      glowColor="#8b5cf6"
      className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f0f10]"
    >
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 p-8 text-center">
        <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
          Parable UI
        </span>
        <h3 className="text-2xl font-semibold text-white">Move your cursor</h3>
        <p className="max-w-xs text-sm text-white/55">
          A spotlight grid that follows the pointer and brightens the cells around it.
        </p>
      </div>
    </AnimatedGrid>
  ),
  "text-scramble": (
    <div className="flex w-full flex-col items-center justify-center gap-6 rounded-2xl bg-[#0f0f10] px-8 py-14 text-center">
      <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.25em] text-white/40">
        <Terminal className="size-3.5 text-[#22d3ee]" aria-hidden />
        <TextScramble text="DECODING SIGNAL" trigger="mount" speed={0.9} />
      </div>
      <TextScramble
        as="h3"
        text="Reality, rebuilt from noise"
        trigger="mount"
        speed={1.1}
        className="max-w-[16ch] text-2xl font-semibold tracking-tight text-white"
      />
      <TextScramble
        text="hover to re-scramble"
        trigger="hover"
        className="cursor-default font-mono text-xs text-white/50"
      />
    </div>
  ),
  "text-highlighter": (
    <div className="flex w-full max-w-md flex-col gap-4 px-6 text-center">
      <p className="text-lg font-medium leading-relaxed text-white/90">
        Ship work that feels{" "}
        <TextHighlighter variant="marker" color="#8b5cf6">
          unmistakably yours
        </TextHighlighter>
        ,{" "}
        <TextHighlighter variant="underline" color="#22d3ee" delay={0.28}>
          backed by proof
        </TextHighlighter>
        , and{" "}
        <TextHighlighter variant="box" color="#f5a623" delay={0.56}>
          never theoretical
        </TextHighlighter>
        .
      </p>
    </div>
  ),
  "animated-input": (
    <div className="flex w-full max-w-sm flex-col gap-3 px-6">
      <AnimatedInput label="Email" type="email" defaultValue="ada@parable.dev" icon={<Mail />} success />
      <AnimatedInput label="Full name" icon={<User />} />
      <AnimatedInput label="Password" type="password" defaultValue="hunter2" icon={<Lock />} error="Must be at least 8 characters" />
    </div>
  ),
  "pricing-table": (
    <div className="w-full max-w-3xl px-4">
      <PricingTable
        defaultCycle="yearly"
        onSelect={() => {}}
        tiers={[
          {
            name: "Starter",
            monthly: 0,
            yearly: 0,
            features: ["1 project", "Community support", "1 GB storage"],
            cta: "Start free",
          },
          {
            name: "Pro",
            monthly: 24,
            yearly: 230,
            popular: true,
            features: [
              "Unlimited projects",
              "Priority support",
              "100 GB storage",
              "Advanced analytics",
            ],
          },
          {
            name: "Team",
            monthly: 60,
            yearly: 576,
            features: [
              "Everything in Pro",
              "SSO & SAML",
              "Audit logs",
              "Dedicated manager",
            ],
            cta: "Contact sales",
          },
        ]}
      />
    </div>
  ),
  "image-reveal": (
    <div className="flex w-full items-center justify-center bg-[#0f0f10] p-6">
      <ImageReveal
        src={`data:image/svg+xml,${encodeURIComponent(
          "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 450'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#8b5cf6'/><stop offset='0.55' stop-color='#ec4899'/><stop offset='1' stop-color='#f5a623'/></linearGradient></defs><rect width='800' height='450' fill='#0f0f10'/><rect width='800' height='450' fill='url(%23g)' opacity='0.92'/><circle cx='610' cy='120' r='150' fill='#22d3ee' opacity='0.35'/><circle cx='170' cy='360' r='120' fill='#8b5cf6' opacity='0.45'/></svg>"
        )}`}
        alt="Abstract violet-to-ember gradient artwork"
        aspect="16/9"
        direction="up"
        rounded="1rem"
        className="w-full max-w-sm shadow-2xl ring-1 ring-white/10"
      />
    </div>
  ),
  "cursor-image-trail": (
    <CursorImageTrail
      className="grid h-80 w-full place-items-center rounded-xl bg-neutral-950"
      images={[
        "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMjQiIGhlaWdodD0iMjU2IiB2aWV3Qm94PSIwIDAgMjI0IDI1NiI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJnIiB4MT0iMCIgeTE9IjAiIHgyPSIxIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjOGI1Y2Y2Ii8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjZWM0ODk5Ii8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjIyNCIgaGVpZ2h0PSIyNTYiIHJ4PSIyOCIgZmlsbD0idXJsKCNnKSIvPjwvc3ZnPg==",
        "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMjQiIGhlaWdodD0iMjU2IiB2aWV3Qm94PSIwIDAgMjI0IDI1NiI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJnIiB4MT0iMCIgeTE9IjAiIHgyPSIxIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZWM0ODk5Ii8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjZjVhNjIzIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjIyNCIgaGVpZ2h0PSIyNTYiIHJ4PSIyOCIgZmlsbD0idXJsKCNnKSIvPjwvc3ZnPg==",
        "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMjQiIGhlaWdodD0iMjU2IiB2aWV3Qm94PSIwIDAgMjI0IDI1NiI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJnIiB4MT0iMCIgeTE9IjAiIHgyPSIxIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjMjJkM2VlIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjOGI1Y2Y2Ii8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjIyNCIgaGVpZ2h0PSIyNTYiIHJ4PSIyOCIgZmlsbD0idXJsKCNnKSIvPjwvc3ZnPg==",
        "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMjQiIGhlaWdodD0iMjU2IiB2aWV3Qm94PSIwIDAgMjI0IDI1NiI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJnIiB4MT0iMCIgeTE9IjAiIHgyPSIxIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZjVhNjIzIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjZWM0ODk5Ii8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjIyNCIgaGVpZ2h0PSIyNTYiIHJ4PSIyOCIgZmlsbD0idXJsKCNnKSIvPjwvc3ZnPg==",
        "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMjQiIGhlaWdodD0iMjU2IiB2aWV3Qm94PSIwIDAgMjI0IDI1NiI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJnIiB4MT0iMCIgeTE9IjAiIHgyPSIxIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjOGI1Y2Y2Ii8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjMjJkM2VlIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjIyNCIgaGVpZ2h0PSIyNTYiIHJ4PSIyOCIgZmlsbD0idXJsKCNnKSIvPjwvc3ZnPg==",
      ]}
      spawnDistance={40}
      maxVisible={8}
    >
      <span className="pointer-events-none select-none font-mono text-[11px] uppercase tracking-[0.2em] text-white/45">
        Move across me
      </span>
    </CursorImageTrail>
  ),
  "drag-scroll-gallery": (
    <DragScrollGallery
      className="py-4"
      gap={18}
      snap
      aria-label="Featured shots"
      items={[
        { t: "Prism", c: "#8b5cf6" },
        { t: "Fuchsia", c: "#ec4899" },
        { t: "Ember", c: "#f5a623" },
        { t: "Signal", c: "#22d3ee" },
        { t: "Violet", c: "#8b5cf6" },
        { t: "Ink", c: "#ec4899" },
      ].map((s) => (
        <div
          key={s.t}
          className="grid h-52 w-40 items-end overflow-hidden rounded-2xl p-4 ring-1 ring-white/10"
          style={{ background: `linear-gradient(155deg, ${s.c}, rgba(15,15,16,0.92))` }}
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <ImageIcon className="size-4 opacity-80" />
            {s.t}
          </div>
        </div>
      ))}
    />
  ),
  "rich-tooltip": (
    <div className="flex min-h-[280px] w-full items-center justify-center">
      <RichTooltip
        side="top"
        content={
          <div className="flex gap-3">
            <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
              <Sparkles className="size-4" />
            </div>
            <div>
              <div className="font-semibold text-white">Deploy preview</div>
              <p className="mt-0.5 text-white/60">
                Every push ships an isolated URL with logs, metrics, and instant rollback.
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-white/45">
                <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5">⌘</kbd>
                <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5">K</kbd>
                <span>to open</span>
              </div>
            </div>
          </div>
        }
      >
        <button className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-violet-400">
          <GitBranch className="size-4 text-violet-300" />
          Hover or focus me
        </button>
      </RichTooltip>
    </div>
  ),
  "token-swap-card": (
    <div className="w-full max-w-sm">
      <TokenSwapCard
        defaultFrom="ETH"
        defaultTo="USDC"
        defaultAmount="1.5"
        tokens={[
          { symbol: "ETH", name: "Ethereum", price: 3120.44, icon: <div className="size-full rounded-full bg-gradient-to-br from-indigo-400 to-violet-600" /> },
          { symbol: "USDC", name: "USD Coin", price: 1, icon: <div className="size-full rounded-full bg-gradient-to-br from-sky-400 to-blue-600" /> },
          { symbol: "SOL", name: "Solana", price: 176.9, icon: <div className="size-full rounded-full bg-gradient-to-br from-fuchsia-400 to-purple-600" /> },
          { symbol: "WBTC", name: "Wrapped Bitcoin", price: 68420, icon: <div className="size-full rounded-full bg-gradient-to-br from-amber-400 to-orange-500" /> },
          { symbol: "ARB", name: "Arbitrum", price: 0.82, icon: <div className="size-full rounded-full bg-gradient-to-br from-cyan-400 to-blue-500" /> },
        ]}
      />
    </div>
  ),
  "hover-member-row": (
    <div className="mx-auto w-full max-w-sm rounded-2xl border border-white/10 bg-[#0f0f10] p-2">
      <HoverMemberRow
        members={[
          { name: "Ada Lovelace", role: "Principal Engineer", bio: "Keeps the analytical engine humming and the roadmap honest." },
          { name: "Grace Hopper", role: "Compiler Lead", bio: "Turns nanoseconds into intuition and stray bugs into moths." },
          { name: "Alan Turing", role: "Research Director", bio: "Decides what is decidable, usually before lunch." },
        ]}
      />
    </div>
  ),
  "family-drawer": (
    <div className="flex w-full flex-col items-center gap-6 px-6 py-8">
      <div className="flex items-center gap-1.5" aria-hidden>
        <span className="h-1.5 w-6 rounded-full bg-violet-400" />
        <span className="h-1.5 w-6 rounded-full bg-white/20" />
        <span className="h-1.5 w-6 rounded-full bg-white/20" />
      </div>
      <FamilyDrawer
        triggerLabel={
          <>
            <Wallet className="size-4" aria-hidden />
            Add payment method
          </>
        }
        title="Add a card"
        description="Enter details, review, then confirm — the sheet morphs between steps."
        contentKey="step-1"
      >
        <div className="space-y-2.5 text-sm text-white/70">
          <div className="rounded-xl bg-white/[0.04] px-3 py-2.5 ring-1 ring-white/10">
            Card number
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-xl bg-white/[0.04] px-3 py-2.5 ring-1 ring-white/10">
              Expiry
            </div>
            <div className="rounded-xl bg-white/[0.04] px-3 py-2.5 ring-1 ring-white/10">
              CVC
            </div>
          </div>
          <button
            type="button"
            className="mt-1 w-full rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition-[filter] hover:brightness-110"
          >
            Continue
          </button>
        </div>
      </FamilyDrawer>
      <div className="flex items-center gap-2 text-xs text-white/40">
        <Layers className="size-3.5" aria-hidden />
        Height morphs as steps change
      </div>
    </div>
  ),
  "progress-ring": (
    <div className="flex items-center gap-8 text-white">
      <ProgressRing value={72} size={132} />
      <ProgressRing value={90} size={132} colors={["#22d3ee", "#8b5cf6"]}>
        <div className="flex flex-col items-center gap-1">
          <Zap className="size-5 text-cyan-300" aria-hidden />
          <span className="text-2xl font-semibold tabular-nums leading-none">90</span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-white/45">score</span>
        </div>
      </ProgressRing>
    </div>
  ),
  "stat-card": (
    <div className="grid w-full max-w-md grid-cols-1 gap-4 sm:grid-cols-2">
      <StatCard
        label="Monthly revenue"
        value={124700}
        delta={12.4}
        prefix="$"
        icon={<DollarSign />}
        data={[42, 38, 51, 47, 63, 72, 68, 84, 79, 96, 108, 124]}
      />
      <StatCard
        label="Active users"
        value={8421}
        delta={-3.2}
        icon={<Users />}
        data={[92, 88, 90, 84, 80, 78, 74, 70, 66, 60, 55, 51]}
      />
      <StatCard
        label="Avg. session"
        value={4.7}
        suffix="m"
        icon={<Activity />}
        data={[3, 3.4, 3.2, 3.9, 4.1, 4.0, 4.4, 4.7]}
      />
      <StatCard label="Conversion" value={3.9} suffix="%" delta={0.0} />
    </div>
  ),
  "animated-counter": (
    <div className="flex flex-col items-center gap-6 text-white">
      <AnimatedCounter value={128540} startOnView={false} className="text-5xl font-semibold tracking-tight" />
      <div className="flex gap-8 text-2xl font-medium text-white/70">
        <div className="flex flex-col items-center gap-1">
          <AnimatedCounter value={1234} startOnView={false} />
          <span className="text-xs uppercase tracking-widest text-white/40">visitors</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <AnimatedCounter value={98} startOnView={false} format={(n) => `${n}%`} />
          <span className="text-xs uppercase tracking-widest text-white/40">uptime</span>
        </div>
      </div>
    </div>
  ),
  "avatar-stack": (
    <AvatarStack
      size={48}
      max={5}
      people={[
        { name: "Aria Chen" },
        { name: "Marcus Webb" },
        { name: "Ines Duarte" },
        { name: "Kofi Mensah" },
        { name: "Yuki Tanaka" },
        { name: "Lena Fischer" },
        { name: "Omar Haddad" },
      ]}
    />
  ),
};

export function Preview({ slug }: { slug: string }) {
  return <>{PREVIEWS[slug] ?? null}</>;
}
