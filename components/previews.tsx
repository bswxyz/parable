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
import { TextureButton } from "@/registry/parable/ui/texture-button";
import { BorderBeam } from "@/registry/parable/ui/border-beam";
import { IntroDisclosure } from "@/registry/parable/ui/intro-disclosure";
import { TweetGrid } from "@/registry/parable/ui/tweet-grid";
import { AiInput } from "@/registry/parable/ui/ai-input";
import { PeekCarousel } from "@/registry/parable/ui/peek-carousel";
import { ParallaxHero } from "@/registry/parable/ui/parallax-hero";
import { AsciiRender } from "@/registry/parable/ui/ascii-render";
import { MegaNavbar } from "@/registry/parable/ui/mega-navbar";
import { ScrollTextReveal } from "@/registry/parable/ui/scroll-text-reveal";
import { CommandPalette } from "@/registry/parable/ui/command-palette";
import { ActivityFeed } from "@/registry/parable/ui/activity-feed";
import { FileDrop } from "@/registry/parable/ui/file-drop";
import { LiquidBlobs } from "@/registry/parable/ui/liquid-blobs";
import { HeroSection } from "@/registry/parable/ui/hero-section";
import { FeatureBento } from "@/registry/parable/ui/feature-bento";
import { TestimonialMarquee } from "@/registry/parable/ui/testimonial-marquee";
import { CtaBanner } from "@/registry/parable/ui/cta-banner";
import { FaqAccordion } from "@/registry/parable/ui/faq-accordion";
import { StatsBand } from "@/registry/parable/ui/stats-band";
import { SectionDots } from "@/registry/parable/ui/section-dots";
import { Squircle } from "@/registry/parable/ui/squircle";
import { GooeyToggle } from "@/registry/parable/ui/gooey-toggle";
import { WalletStack } from "@/registry/parable/ui/wallet-stack";
import { ThemeToggle } from "@/registry/parable/ui/theme-toggle";
import { SpotlightCard } from "@/registry/parable/ui/spotlight-card";
import { CompareSlider } from "@/registry/parable/ui/compare-slider";
import { MorphTabs } from "@/registry/parable/ui/morph-tabs";
import { OrbitIcons } from "@/registry/parable/ui/orbit-icons";
import { BalloonBurst } from "@/registry/parable/ui/balloon-burst";
import { MatrixRain } from "@/registry/parable/ui/matrix-rain";
import { PixelCanvas } from "@/registry/parable/ui/pixel-canvas";
import { OrbitCardStack } from "@/registry/parable/ui/orbit-card-stack";
import { FamilyButton } from "@/registry/parable/ui/family-button";
import { MorphSurface } from "@/registry/parable/ui/morph-surface";
import { AiChat } from "@/registry/parable/ui/ai-chat";
import { MultiStepForm } from "@/registry/parable/ui/multi-step-form";
import { BarChart } from "@/registry/parable/ui/bar-chart";
import { DonutChart } from "@/registry/parable/ui/donut-chart";
import { CalendarHeatmap } from "@/registry/parable/ui/calendar-heatmap";
import { KanbanBoard } from "@/registry/parable/ui/kanban-board";
import { ImageZoom } from "@/registry/parable/ui/image-zoom";
import { Stepper } from "@/registry/parable/ui/stepper";
import { Skeleton } from "@/registry/parable/ui/skeleton";
import { Activity, Aperture, ArrowRight, ArrowUpRight, BarChart3, Bell, BookOpen, Boxes, Building2, CalendarDays, CalendarRange, Camera, ChevronRight, Cloud, Command, Copy, Cpu, CreditCard, Database, DollarSign, Download, FilePlus, GitBranch, GitPullRequest, Globe, Heart, Hexagon, Home, ImageIcon, Layers, LayoutDashboard, LayoutGrid, LifeBuoy, Lock, Mail, MessageCircle, Moon, Music, Orbit, Palette, PartyPopper, PenTool, Rocket, Search, Settings, Share2, ShieldCheck, SkipForward, SlidersHorizontal, Sparkles, Star, Sun, Terminal, Triangle, User, UserPlus, Users, Wallet, Zap } from "lucide-react";

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
  "texture-button": (
    <div className="flex flex-col items-center gap-4">
      <TextureButton variant="accent">
        <Sparkles className="size-4" /> Get Parable
      </TextureButton>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <TextureButton variant="surface">
          <Download className="size-4" /> Install
        </TextureButton>
        <TextureButton variant="glass">
          Docs <ArrowRight className="size-4" />
        </TextureButton>
      </div>
    </div>
  ),
  "border-beam": (
    <div className="grid w-full place-items-center p-8">
      <BorderBeam className="w-[280px] bg-[#0f0f10]" colorFrom="#8b5cf6" colorTo="#ec4899" duration={5}>
        <div className="p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Sparkles className="size-4 text-violet-400" />
            Pro plan
          </div>
          <p className="mt-2 text-xs leading-relaxed text-white/55">
            A glowing beam traces the border, forever.
          </p>
        </div>
      </BorderBeam>
    </div>
  ),
  "intro-disclosure": (
    <div className="relative flex h-[440px] w-full max-w-[380px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#0f0f10]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 28% 18%, rgba(139,92,246,0.20), transparent 55%), radial-gradient(circle at 82% 84%, rgba(34,211,238,0.14), transparent 55%)",
        }}
      />
      <IntroDisclosure
        defaultOpen
        steps={[
          {
            title: "Welcome to Parable",
            body: "A living registry of motion-first React components — copy one file into your app and own it outright.",
            media: (
              <div className="flex h-28 items-center justify-center bg-gradient-to-br from-violet-500/30 via-fuchsia-500/20 to-transparent">
                <Sparkles className="text-violet-200" />
              </div>
            ),
          },
          {
            title: "Themed to your brand",
            body: "Every component ships with --pb-* tokens, so accent and surface colours follow your own design system.",
            media: (
              <div className="flex h-28 items-center justify-center bg-gradient-to-br from-fuchsia-500/30 via-amber-400/15 to-transparent">
                <Palette className="text-fuchsia-200" />
              </div>
            ),
          },
          {
            title: "Ship in minutes",
            body: "Reduced-motion safe, keyboard operable, and SSR-ready out of the box. Press Get started to finish the tour.",
            media: (
              <div className="flex h-28 items-center justify-center bg-gradient-to-br from-cyan-400/25 via-violet-500/20 to-transparent">
                <Rocket className="text-cyan-200" />
              </div>
            ),
          },
        ]}
      />
    </div>
  ),
  "tweet-grid": (
    <div className="w-full max-w-md p-4">
      <TweetGrid
        columns={2}
        tweets={[
          { name: "Ava Chen", handle: "avabuilds", verified: true, likes: 1284, href: "#", body: "Shipped our landing page with Parable blocks in an afternoon — the stagger-on-view is chef's kiss." },
          { name: "Marcus Reyes", handle: "mreyes", likes: 342, body: "The reduced-motion fallback actually works. Rare." },
          { name: "Lin Ortega", handle: "linpixels", verified: true, likes: 5600, body: "Copy, paste, done. No dependency hell.", media: <div className="h-full w-full bg-gradient-to-br from-[#8b5cf6] via-[#ec4899] to-[#f5a623]" /> },
          { name: "Dev Patel", handle: "devp", likes: 89, body: "Masonry that still reads top-to-bottom for screen readers. Thoughtful." },
        ]}
      />
    </div>
  ),
  "ai-input": (
    <div className="w-full max-w-md px-4">
      <AiInput
        model="Sonnet 4.5"
        placeholder="Ask anything…"
        suggestions={["Summarize this thread", "Draft a reply", "Explain like I'm five"]}
        onSubmit={() => new Promise((resolve) => setTimeout(resolve, 900))}
      />
    </div>
  ),
  "peek-carousel": (
    <div className="w-full max-w-[440px] px-2">
      <PeekCarousel
        peek={34}
        aria-label="Featured releases"
        items={[
          <div key="a" className="flex h-48 flex-col justify-end rounded-2xl bg-gradient-to-br from-[#8b5cf6] to-[#ec4899] p-5 shadow-lg shadow-black/40">
            <span className="text-[11px] font-medium uppercase tracking-widest text-white/70">Vol. 01</span>
            <span className="text-xl font-semibold text-white">Prism Drift</span>
          </div>,
          <div key="b" className="flex h-48 flex-col justify-end rounded-2xl bg-gradient-to-br from-[#ec4899] to-[#f5a623] p-5 shadow-lg shadow-black/40">
            <span className="text-[11px] font-medium uppercase tracking-widest text-white/70">Vol. 02</span>
            <span className="text-xl font-semibold text-white">Ember Fold</span>
          </div>,
          <div key="c" className="flex h-48 flex-col justify-end rounded-2xl bg-gradient-to-br from-[#22d3ee] to-[#8b5cf6] p-5 shadow-lg shadow-black/40">
            <span className="text-[11px] font-medium uppercase tracking-widest text-white/70">Vol. 03</span>
            <span className="text-xl font-semibold text-white">Signal Bloom</span>
          </div>,
          <div key="d" className="flex h-48 flex-col justify-end rounded-2xl bg-gradient-to-br from-[#f5a623] to-[#22d3ee] p-5 shadow-lg shadow-black/40">
            <span className="text-[11px] font-medium uppercase tracking-widest text-white/70">Vol. 04</span>
            <span className="text-xl font-semibold text-white">Halo Cast</span>
          </div>,
        ]}
      />
    </div>
  ),
  "parallax-hero": (
    <ParallaxHero className="min-h-[360px] w-full rounded-xl">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/70 backdrop-blur-sm">
          <Sparkles className="size-3.5 text-violet-300" /> Parable UI
        </span>
        <h1 className="bg-gradient-to-b from-white to-white/55 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
          Depth you can feel
        </h1>
        <p className="text-sm text-white/55">
          Move your cursor — every layer drifts on its own plane.
        </p>
        <button className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
          Get started <ArrowRight className="size-4" />
        </button>
      </div>
    </ParallaxHero>
  ),
  "ascii-render": (
    <AsciiRender rows={22} cols={64} color="#8b5cf6" speed={1} className="w-full" />
  ),
  "mega-navbar": (
    <div className="w-full overflow-hidden rounded-xl bg-[#0f0f10] ring-1 ring-white/10">
      <MegaNavbar
        brand={
          <span className="inline-flex items-center gap-1.5 text-white">
            <span className="grid size-5 place-items-center rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-500">
              <Sparkles className="size-3 text-white" />
            </span>
            Parable
          </span>
        }
        items={[
          {
            label: "Product",
            panel: [
              {
                title: "Build",
                links: [
                  { label: "Components", desc: "60+ animated primitives", icon: <Layers />, href: "#" },
                  { label: "Templates", desc: "Ship in minutes", icon: <Rocket />, href: "#" },
                ],
              },
              {
                title: "Learn",
                links: [
                  { label: "Docs", desc: "Guides & full API", icon: <BookOpen />, href: "#" },
                  { label: "Support", desc: "We're here to help", icon: <LifeBuoy />, href: "#" },
                ],
              },
            ],
          },
          { label: "Pricing", href: "#" },
          { label: "Docs", href: "#" },
        ]}
      />
      <div className="space-y-3 p-6">
        <div className="h-2.5 w-2/3 rounded-full bg-white/10" />
        <div className="h-2.5 w-1/2 rounded-full bg-white/[0.06]" />
        <div className="h-24 rounded-xl bg-gradient-to-br from-violet-500/15 via-fuchsia-500/10 to-transparent ring-1 ring-white/5" />
      </div>
    </div>
  ),
  "scroll-text-reveal": (
    <div className="w-full max-w-md px-6">
      <ScrollTextReveal
        className="text-2xl font-medium leading-snug tracking-tight text-white"
        text="Great typography feels inevitable — each word arriving exactly when the eye reaches it, lighting up one by one as you read."
      />
    </div>
  ),
  "command-palette": (
    <div className="flex min-h-[280px] w-full items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/50 shadow-[0_12px_40px_-16px_rgba(0,0,0,0.7)]">
          <Search className="size-4 text-white/40" />
          <span className="flex-1">Search commands…</span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[11px]">⌘</kbd>
            <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[11px]">K</kbd>
          </span>
        </div>
        <p className="mt-3 text-center text-xs text-white/35">Press ⌘K to open the palette</p>
        <CommandPalette
          groups={[
            {
              heading: "Navigation",
              items: [
                { id: "dashboard", label: "Go to Dashboard", icon: <LayoutDashboard />, shortcut: "G H", keywords: ["home", "start"] },
                { id: "profile", label: "View Profile", icon: <User />, shortcut: "G P", keywords: ["account"] },
              ],
            },
            {
              heading: "Actions",
              items: [
                { id: "new-doc", label: "New Document", icon: <FilePlus />, shortcut: "⌘N", keywords: ["create", "file"] },
                { id: "settings", label: "Open Settings", icon: <Settings />, keywords: ["preferences", "config"] },
                { id: "theme", label: "Toggle Theme", icon: <Moon />, keywords: ["dark", "light", "appearance"] },
              ],
            },
          ]}
        />
      </div>
    </div>
  ),
  "activity-feed": (
    <div className="w-full max-w-sm px-2">
      <ActivityFeed
        title="Activity"
        events={[
          {
            id: "1",
            icon: <Rocket />,
            actor: "Ava",
            action: (
              <>
                deployed{" "}
                <strong className="font-semibold text-white">api-gateway</strong> to
                production
              </>
            ),
            time: "2m ago",
            accent: "#8b5cf6",
            detail: "v2.4.1 · 312 files changed · 0 regressions",
          },
          {
            id: "2",
            icon: <GitPullRequest />,
            actor: "Noah",
            action: (
              <>
                merged{" "}
                <strong className="font-semibold text-white">
                  #1284 Rate limiter
                </strong>
              </>
            ),
            time: "1h ago",
            accent: "#ec4899",
          },
          {
            id: "3",
            icon: <UserPlus />,
            actor: "Mia",
            action: (
              <>
                invited{" "}
                <strong className="font-semibold text-white">3 teammates</strong> to
                the workspace
              </>
            ),
            time: "5h ago",
            accent: "#22d3ee",
          },
        ]}
      />
    </div>
  ),
  "file-drop": (
    <div className="w-full max-w-sm"><FileDrop accept="image/*,application/pdf" multiple maxSizeMB={5} /></div>
  ),
  "liquid-blobs": (
    <LiquidBlobs className="grid h-64 w-full place-items-center rounded-xl">
      <div className="text-center">
        <span className="block font-mono text-[10px] uppercase tracking-[0.3em] text-white/60">
          Parable
        </span>
        <span className="mt-2 block text-2xl font-semibold text-white">
          Liquid Blobs
        </span>
      </div>
    </LiquidBlobs>
  ),
  "hero-section": (
    <div className="w-full max-w-2xl px-4">
          <HeroSection
            className="rounded-2xl border border-white/10 bg-[#0f0f10]"
            eyebrow="Parable Registry"
            title="Ship interfaces that feel alive"
            accentWord="alive"
            subtitle="Production-grade motion blocks you can paste straight into any React app."
            primaryLabel="Get started"
            secondaryLabel="Browse blocks"
            onPrimary={() => {}}
            onSecondary={() => {}}
            stats={[
              { value: "12k", label: "stars" },
              { value: "400+", label: "teams" },
              { value: "54", label: "blocks" },
            ]}
          />
        </div>
  ),
  "feature-bento": (
    <div className="w-full max-w-xl p-6">
      <FeatureBento
        columns={2}
        items={[
          {
            icon: <Zap />,
            title: "Instant previews",
            description: "Every branch deploys to its own URL in seconds.",
            size: "wide",
            visual: (
              <div className="h-full w-full rounded-xl bg-gradient-to-br from-violet-500/25 via-fuchsia-500/10 to-transparent ring-1 ring-white/10" />
            ),
          },
          {
            icon: <ShieldCheck />,
            title: "SOC 2 ready",
            description: "Audit logs and SSO on every plan.",
          },
          {
            icon: <BarChart3 />,
            title: "Live analytics",
            description: "Latency and usage in real time.",
          },
        ]}
      />
    </div>
  ),
  "testimonial-marquee": (
    <div className="w-full max-w-3xl py-2">
      <TestimonialMarquee
        rows={2}
        speed={26}
        testimonials={[
          { quote: "We swapped three tools for this and shipped a week early.", name: "Mara Ellison", role: "CTO, Fieldnote" },
          { quote: "The polish out of the box is unreal. Our landing page finally feels alive.", name: "Devon Okafor", role: "Design lead, Loomline" },
          { quote: "Installed one component, kept the whole registry.", name: "Priya Raghavan", role: "Founder, Statlight" },
          { quote: "Accessibility handled by default. Our audit came back spotless.", name: "Jonas Weber", role: "Engineering, Kupfer" },
          { quote: "It reads like code we wish we had written ourselves.", name: "Alma Reyes", role: "Staff engineer, Driftwood" },
          { quote: "Marketing pages went from weeks to an afternoon.", name: "Theo Lindqvist", role: "Product, Norrsken" },
        ]}
      />
    </div>
  ),
  "cta-banner": (
    <div className="w-full max-w-2xl px-4">
      <CtaBanner
        title="Ship your best work faster"
        accentWord="faster"
        subtitle="Join thousands of teams building with the Parable registry — production-ready components, zero lock-in."
        primaryLabel="Get started"
        secondaryLabel="View docs"
        onPrimary={() => {}}
        onSecondary={() => {}}
      />
    </div>
  ),
  "faq-accordion": (
    <div className="w-full max-w-md px-4">
      <FaqAccordion
        defaultOpenIndex={0}
        items={[
          { question: "Do I own the code?", answer: "Yes — the source copies into your project. No dependency, no lock-in." },
          { question: "Is it really free?", answer: "Every component and template, MIT-licensed. No paid tier." },
          { question: "How do I install?", answer: "One shadcn CLI command per component." },
        ]}
      />
    </div>
  ),
  "stats-band": (
    <div className="flex w-full items-center justify-center rounded-2xl border border-white/10 bg-[#0f0f10] px-4 py-12">
      <StatsBand
        stats={[
          { value: 99.9, suffix: "%", decimals: 1, label: "Uptime" },
          { value: 4, prefix: "$", suffix: "M+", label: "Raised" },
          { value: 12, suffix: "k", label: "Developers" },
          { value: 180, suffix: "ms", label: "P95 Latency" },
        ]}
      />
    </div>
  ),
  "section-dots": (
    <div style={{ position: "relative", width: "100%", minHeight: 380, overflow: "hidden", borderRadius: 16, background: "radial-gradient(120% 120% at 12% 0%, #17151f 0%, #0f0f10 62%)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ position: "absolute", inset: 0, padding: "30px 100px 30px 36px", display: "flex", flexDirection: "column", gap: 14 }}>
        {[
          { id: "sd-intro", tag: "01", title: "Introduction", accent: "#8b5cf6" },
          { id: "sd-features", tag: "02", title: "Features", accent: "#ec4899" },
          { id: "sd-pricing", tag: "03", title: "Pricing", accent: "#f5a623" },
          { id: "sd-faq", tag: "04", title: "FAQ", accent: "#22d3ee" },
        ].map((s) => (
          <div key={s.id} id={s.id} style={{ borderRadius: 14, padding: "14px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ fontSize: 11, letterSpacing: 2, fontFamily: "ui-monospace, monospace", color: s.accent }}>{s.tag}</div>
            <div style={{ marginTop: 4, fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.92)" }}>{s.title}</div>
            <div style={{ height: 6, width: "58%", borderRadius: 999, marginTop: 10, background: "linear-gradient(90deg, " + s.accent + "66, transparent)" }} />
            <div style={{ height: 6, width: "40%", borderRadius: 999, marginTop: 6, background: "rgba(255,255,255,0.08)" }} />
          </div>
        ))}
      </div>
      <SectionDots
        position="right"
        className="absolute"
        sections={[
          { id: "sd-intro", label: "Introduction" },
          { id: "sd-features", label: "Features" },
          { id: "sd-pricing", label: "Pricing" },
          { id: "sd-faq", label: "FAQ" },
        ]}
      />
    </div>
  ),
  "squircle": (
    <div style={{ display: "flex", gap: 28, alignItems: "center", justifyContent: "center", flexWrap: "wrap", padding: 32 }}>
      <Squircle size={132} smoothing={4} border={{ width: 1.5, color: "rgba(255,255,255,0.16)" }}>
        <div style={{ display: "grid", placeItems: "center", height: "100%", width: "100%", background: "linear-gradient(135deg,#8b5cf6,#ec4899)" }}>
          <Sparkles color="white" size={34} strokeWidth={2} />
        </div>
      </Squircle>
      <Squircle size={132} smoothing={4} border={{ width: 1.5, color: "#22d3ee" }}>
        <div style={{ height: "100%", width: "100%", background: "radial-gradient(120% 120% at 30% 20%,#f5a623,#0f0f10)" }} />
      </Squircle>
      <Squircle size={132} smoothing={8}>
        <div style={{ display: "grid", placeItems: "center", height: "100%", width: "100%", color: "#0f0f10", fontWeight: 800, fontSize: 44, background: "linear-gradient(135deg,#22d3ee,#8b5cf6)" }}>n</div>
      </Squircle>
    </div>
  ),
  "gooey-toggle": (
    <div style={{ display: "grid", placeItems: "center", width: "100%", minHeight: 320, background: "#0f0f10", borderRadius: 16 }}>
      <GooeyToggle
        defaultValue="week"
        options={[
          { value: "day", label: "Day", icon: <Sun /> },
          { value: "week", label: "Week", icon: <CalendarDays /> },
          { value: "month", label: "Month", icon: <CalendarRange /> },
        ]}
      />
    </div>
  ),
  "wallet-stack": (
    <div className="flex min-h-[440px] w-full items-center justify-center bg-[#0f0f10] p-8">
      <WalletStack
        cards={[
          { id: "personal", label: "Personal", number: "•••• 4242", holder: "A. MORGAN" },
          { id: "business", label: "Business", number: "•••• 8817", holder: "A. MORGAN", gradient: ["#22d3ee", "#8b5cf6"] },
          { id: "travel", label: "Travel", number: "•••• 0093", holder: "A. MORGAN", gradient: ["#f5a623", "#ec4899"] },
          { id: "savings", label: "Savings", number: "•••• 5501", holder: "A. MORGAN", gradient: ["#ec4899", "#8b5cf6"] },
        ]}
      />
    </div>
  ),
  "theme-toggle": (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 28, padding: 48, borderRadius: 28, background: "radial-gradient(130% 130% at 28% 18%, #1b1b30 0%, #0f0f10 68%)" }}>
      <ThemeToggle defaultTheme="dark" syncDocumentClass={false} size={30} style={{ background: "rgba(255,255,255,0.045)" }} />
      <ThemeToggle defaultTheme="light" syncDocumentClass={false} size={30} style={{ background: "rgba(255,255,255,0.045)" }} />
      <ThemeToggle defaultTheme="dark" syncDocumentClass={false} size={46} sunColor="#f5a623" moonColor="#22d3ee" ringColor="#8b5cf6" style={{ background: "rgba(255,255,255,0.045)" }} />
    </div>
  ),
  "spotlight-card": (
    <div className="flex w-full items-center justify-center bg-[#0f0f10] p-8">
      <div className="grid w-full max-w-md grid-cols-1 gap-4 sm:grid-cols-2">
        <SpotlightCard glowColor="#8b5cf6" className="p-5">
          <div className="text-sm font-semibold text-white">Pointer light</div>
          <p className="mt-1.5 text-xs leading-relaxed text-white/55">
            Move your cursor across the card. The wash and the lit edge follow it.
          </p>
        </SpotlightCard>
        <SpotlightCard glowColor="#22d3ee" radius={260} className="p-5">
          <div className="text-sm font-semibold text-white">Signal</div>
          <p className="mt-1.5 text-xs leading-relaxed text-white/55">
            Each card measures its own bounds, so a whole grid lights independently.
          </p>
        </SpotlightCard>
      </div>
    </div>
  ),
  "compare-slider": (
    <div className="flex w-full items-center justify-center p-6">
      <CompareSlider
        className="h-[320px] w-full max-w-md"
        labels={{ before: "Draft", after: "Final" }}
        before={
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#151517] via-[#1b1220] to-[#241428]">
            <span className="text-4xl font-semibold tracking-tight text-white/35">v1</span>
          </div>
        }
        after={
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#8b5cf6] via-[#ec4899] to-[#f5a623]">
            <span className="text-4xl font-semibold tracking-tight text-white">v2</span>
          </div>
        }
      />
    </div>
  ),
  "morph-tabs": (
    <div style={{ width: "100%", maxWidth: 440, padding: 28 }}>
      <MorphTabs
        variant="pill"
        defaultValue="overview"
        tabs={[
          {
            value: "overview",
            label: "Overview",
            icon: <LayoutGrid />,
            content: (
              <div style={{ padding: "18px 6px 6px" }}>
                <p style={{ margin: 0, color: "#fff", fontWeight: 600 }}>Signal, not noise</p>
                <p style={{ margin: "6px 0 0" }}>A calm snapshot of everything moving through your workspace this week.</p>
              </div>
            ),
          },
          {
            value: "insights",
            label: "Insights",
            icon: <Sparkles />,
            content: (
              <div style={{ padding: "18px 6px 6px" }}>
                <p style={{ margin: 0, color: "#fff", fontWeight: 600 }}>Up and to the right</p>
                <p style={{ margin: "6px 0 0" }}>Engagement climbed 24% after the last release. The pill glides; panels slide.</p>
              </div>
            ),
          },
          {
            value: "controls",
            label: "Controls",
            icon: <SlidersHorizontal />,
            content: (
              <div style={{ padding: "18px 6px 6px" }}>
                <p style={{ margin: 0, color: "#fff", fontWeight: 600 }}>Tune the flow</p>
                <p style={{ margin: "6px 0 0" }}>Arrow keys move selection, Home/End jump to the ends — focus and selection stay in sync.</p>
              </div>
            ),
          },
        ]}
      />
    </div>
  ),
  "orbit-icons": (
    <div style={{ display: "grid", placeItems: "center", width: "100%", minHeight: 360, background: "radial-gradient(circle at 50% 45%, #17141f, #0f0f10)" }}>
      <OrbitIcons
        pauseOnHover
        rings={[
          { icons: [<PenTool key="f" />, <MessageCircle key="s" />, <GitBranch key="g" />, <Globe key="c" />], radius: 72, duration: 18 },
          { icons: [<Cloud key="cl" />, <Database key="d" />, <Cpu key="cp" />, <Zap key="z" />, <Globe key="gl" />, <Boxes key="b" />], radius: 120, duration: 26, reverse: true },
        ]}
      >
        <div style={{ display: "grid", placeItems: "center", width: 64, height: 64, borderRadius: 18, background: "linear-gradient(135deg, #8b5cf6, #ec4899)", boxShadow: "0 12px 40px -8px #8b5cf6aa, inset 0 1px 0 rgba(255,255,255,0.25)", color: "#fff" }}>
          <Sparkles style={{ width: 28, height: 28 }} />
        </div>
      </OrbitIcons>
    </div>
  ),
  "balloon-burst": (
    <div style={{ position: "relative", width: "100%", minHeight: 340, overflow: "hidden", borderRadius: 16, background: "radial-gradient(120% 100% at 50% 0%, #1b1436 0%, #0f0f10 62%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <BalloonBurst interval={2600} count={16} duration={3200} origin="bottom" position="absolute" />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "18px 24px", borderRadius: 16, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(24,24,27,0.55)", backdropFilter: "blur(8px)", color: "white", textAlign: "center" }}>
        <PartyPopper size={30} color="#f5a623" strokeWidth={2} aria-hidden />
        <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>Deploy successful</div>
        <div style={{ fontSize: 12.5, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: "rgba(255,255,255,0.5)" }}>useBalloons().release()</div>
      </div>
    </div>
  ),
  "matrix-rain": (
    <MatrixRain
      color="#22d3ee"
      fontSize={15}
      speed={1.1}
      fade={0.08}
      className="h-[320px] w-full rounded-xl bg-[#0f0f10] ring-1 ring-white/10"
    >
      <div className="flex h-[320px] flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-black/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-cyan-300 ring-1 ring-white/10 backdrop-blur-sm">
          <Terminal size={13} aria-hidden />
          system online
        </div>
        <div className="text-2xl font-semibold text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.85)]">
          Follow the white rabbit
        </div>
      </div>
    </MatrixRain>
  ),
  "pixel-canvas": (
    <PixelCanvas
      colors={["#8b5cf6", "#ec4899", "#22d3ee"]}
      gap={6}
      pixelSize={7}
      speed={1}
      className="w-full max-w-[420px] rounded-2xl border border-white/10 bg-[#0f0f10]"
    >
      <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 px-8 py-12 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
          <Sparkles className="h-5 w-5 text-violet-300" aria-hidden />
        </div>
        <div className="text-lg font-semibold tracking-tight text-white">Hover to ignite</div>
        <div className="max-w-[240px] text-sm leading-relaxed text-zinc-400">
          A deterministic pixel field that ripples outward from your cursor.
        </div>
      </div>
    </PixelCanvas>
  ),
  "orbit-card-stack": (
    <div style={{ width: "100%", maxWidth: 320, margin: "0 auto" }}>
      <OrbitCardStack
        accent="#8b5cf6"
        cards={[
          { q: "Flick the top card and it arcs off-screen with a proper spring throw, then orbits to the back.", a: "Ada Lovelace", r: "Head of Design", c: "#8b5cf6" },
          { q: "Drag, buttons, and arrow keys all land on the same clean motion. Shipped it in an afternoon.", a: "Grace Hopper", r: "VP Engineering", c: "#ec4899" },
          { q: "The reduced-motion fallback stays fully legible. Rare to see it done right.", a: "Alan Turing", r: "Principal", c: "#22d3ee" },
        ].map((t, i) => (
          <div key={i} className="flex h-full flex-col justify-between">
            <div className="flex gap-1" style={{ color: t.c }} aria-hidden>
              {[0, 1, 2, 3, 4].map((s) => (
                <Star key={s} size={13} fill="currentColor" strokeWidth={0} />
              ))}
            </div>
            <p className="text-[15px] leading-relaxed text-white/90">{t.q}</p>
            <div>
              <div className="text-sm font-semibold text-white">{t.a}</div>
              <div className="text-xs text-white/50">{t.r}</div>
            </div>
          </div>
        ))}
      />
    </div>
  ),
  "family-button": (
    <div className="flex min-h-[320px] w-full items-end justify-center p-8">
      <FamilyButton
        expandDirection="up"
        actions={[
          { icon: <Share2 />, label: "Share" },
          { icon: <Copy />, label: "Duplicate" },
          { icon: <Star />, label: "Favorite" },
          { icon: <Bell />, label: "Remind me" },
        ]}
      />
    </div>
  ),
  "morph-surface": (
    <div style={{ display: "flex", minHeight: 340, width: "100%", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <MorphSurface
        accent="#8b5cf6"
        panelLabel="Team member"
        closeLabel="Collapse profile"
        compact={
          <>
            <span style={{ display: "grid", placeItems: "center", height: 24, width: 24, borderRadius: 999, background: "linear-gradient(135deg,#8b5cf6,#ec4899)", fontSize: 11, fontWeight: 700, color: "#fff" }}>AK</span>
            <span style={{ fontWeight: 600 }}>Ada Kessler</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, marginLeft: 2, fontSize: 12, color: "#22d3ee" }}>
              <span style={{ height: 6, width: 6, borderRadius: 999, background: "#22d3ee", boxShadow: "0 0 8px #22d3ee" }} />
              online
            </span>
            <ChevronRight size={15} style={{ marginLeft: 2, color: "rgba(255,255,255,0.4)" }} />
          </>
        }
        expandedContent={
          <div style={{ width: 268 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ display: "grid", placeItems: "center", height: 44, width: 44, borderRadius: 999, background: "linear-gradient(135deg,#8b5cf6,#ec4899)", fontWeight: 700, color: "#fff" }}>AK</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>Ada Kessler</div>
                <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.55)" }}>Staff Engineer · Platform</div>
              </div>
            </div>
            <p style={{ margin: "12px 0 0", fontSize: 13, lineHeight: 1.55, color: "rgba(255,255,255,0.72)" }}>
              Owns the ingestion pipeline and on-call tooling. Usually replies within a few hours.
            </p>
            <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.03)", padding: "7px 11px", fontSize: 12.5, fontWeight: 500 }}>
                <MessageCircle size={14} style={{ color: "#8b5cf6" }} /> Message
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.03)", padding: "7px 11px", fontSize: 12.5, fontWeight: 500 }}>
                <CalendarDays size={14} style={{ color: "#f5a623" }} /> Schedule
              </span>
            </div>
          </div>
        }
      />
    </div>
  ),
  "ai-chat": (
    <div className="w-full max-w-sm mx-auto"><AiChat className="h-[26rem]" title="Parable AI" placeholder="Ask about a component…" /></div>
  ),
  "multi-step-form": (
    <div className="w-full max-w-[440px]">
      <MultiStepForm
        steps={[
          {
            id: "account",
            title: "Create your account",
            validate: () => true,
            content: (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-white/50">
                    <Mail className="size-3.5" aria-hidden /> Work email
                  </span>
                  <div className="flex h-9 items-center rounded-lg border border-white/10 bg-white/[0.04] px-3 text-[13px] text-white/80">
                    jordan@parable.dev
                  </div>
                </div>
                <div className="space-y-1.5">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-white/50">
                    <Lock className="size-3.5" aria-hidden /> Password
                  </span>
                  <div className="flex h-9 items-center rounded-lg border border-white/10 bg-white/[0.04] px-3 text-[13px] tracking-[0.3em] text-white/80">
                    ••••••••
                  </div>
                </div>
              </div>
            ),
          },
          {
            id: "workspace",
            title: "Set up your workspace",
            content: (
              <div className="space-y-1.5">
                <span className="flex items-center gap-1.5 text-xs font-medium text-white/50">
                  <Building2 className="size-3.5" aria-hidden /> Workspace name
                </span>
                <div className="flex h-9 items-center rounded-lg border border-white/10 bg-white/[0.04] px-3 text-[13px] text-white/80">
                  Parable Studio
                </div>
                <p className="pt-1 text-[12px] leading-relaxed text-white/45">
                  This is where your team collaborates. You can rename it anytime.
                </p>
              </div>
            ),
          },
          {
            id: "review",
            title: "Review & finish",
            content: (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px]">
                  <span className="text-white/50">Email</span>
                  <span className="text-white/80">jordan@parable.dev</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px]">
                  <span className="text-white/50">Workspace</span>
                  <span className="text-white/80">Parable Studio</span>
                </div>
                <p className="flex items-center gap-1.5 pt-1 text-[12px] text-white/45">
                  <Sparkles className="size-3.5 text-violet-300" aria-hidden /> Everything looks good — submit to create your account.
                </p>
              </div>
            ),
          },
        ]}
      />
    </div>
  ),
  "bar-chart": (
    <div className="w-full max-w-md">
      <BarChart
        title="Weekly signups"
        seriesLabel="This week"
        secondaryLabel="Last week"
        height={200}
        data={[
          { label: "Mon", value: 320 },
          { label: "Tue", value: 510 },
          { label: "Wed", value: 440 },
          { label: "Thu", value: 680 },
          { label: "Fri", value: 740 },
          { label: "Sat", value: 390 },
          { label: "Sun", value: 580 },
        ]}
        secondaryData={[
          { label: "Mon", value: 210 },
          { label: "Tue", value: 300 },
          { label: "Wed", value: 260 },
          { label: "Thu", value: 410 },
          { label: "Fri", value: 520 },
          { label: "Sat", value: 240 },
          { label: "Sun", value: 380 },
        ]}
      />
    </div>
  ),
  "donut-chart": (
    <div className="w-full max-w-[460px] px-2">
      <DonutChart
        data={[
          { label: "Direct", value: 4200 },
          { label: "Referral", value: 3100 },
          { label: "Organic", value: 2400 },
          { label: "Social", value: 1500 },
          { label: "Email", value: 900 },
        ]}
        size={188}
        thickness={24}
      />
    </div>
  ),
  "calendar-heatmap": (
    <div className="w-full max-w-[560px]">
      <CalendarHeatmap
        weeks={18}
        endDate="2026-07-14"
        data={Array.from({ length: 220 }, (_, i) => {
          const iso = new Date(Date.UTC(2026, 0, 1) + i * 86400000)
            .toISOString()
            .slice(0, 10);
          const seed = (i * 1103515245 + 12345) >>> 8;
          return { date: iso, count: seed % 9 === 0 ? 0 : seed % 13 };
        })}
      />
    </div>
  ),
  "kanban-board": (
    <div className="w-full max-w-[520px] px-1">
      <KanbanBoard
        columns={[
          {
            id: "todo",
            title: "To Do",
            cards: [
              { id: "a1", title: "Design the empty states", tag: "Design", color: "#8b5cf6" },
              { id: "a2", title: "Write the API reference", tag: "Docs", color: "#22d3ee" },
            ],
          },
          {
            id: "doing",
            title: "In Progress",
            cards: [
              { id: "b1", title: "Rebuild the auth flow", tag: "Feature", color: "#ec4899" },
            ],
          },
          {
            id: "done",
            title: "Done",
            cards: [
              { id: "c1", title: "Ship the pricing page", tag: "Growth", color: "#f5a623" },
            ],
          },
        ]}
      />
    </div>
  ),
  "image-zoom": (
    <div className="flex w-full items-center justify-center p-6">
      <ImageZoom
        className="w-[300px] max-w-full shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)]"
        zoom={2.6}
        alt="Parable poster — the number 42 inside concentric rings, hover to magnify"
        src={"data:image/svg+xml," + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 480'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#8b5cf6'/><stop offset='.5' stop-color='#ec4899'/><stop offset='1' stop-color='#f5a623'/></linearGradient><radialGradient id='v' cx='.5' cy='.42' r='.72'><stop offset='0' stop-color='#0f0f10' stop-opacity='0'/><stop offset='1' stop-color='#0f0f10' stop-opacity='.55'/></radialGradient></defs><rect width='640' height='480' fill='#0f0f10'/><rect width='640' height='480' fill='url(#g)' opacity='.92'/><circle cx='320' cy='202' r='120' fill='#0f0f10' fill-opacity='.28'/><circle cx='320' cy='202' r='120' fill='none' stroke='#fff' stroke-opacity='.5' stroke-width='2'/><circle cx='320' cy='202' r='80' fill='none' stroke='#fff' stroke-opacity='.35' stroke-width='1.5'/><text x='320' y='224' font-family='ui-monospace,Menlo,monospace' font-size='76' font-weight='700' fill='#fff' text-anchor='middle'>42</text><text x='320' y='356' font-family='ui-monospace,Menlo,monospace' font-size='27' letter-spacing='9' fill='#fff' fill-opacity='.92' text-anchor='middle'>PARABLE</text><text x='320' y='390' font-family='ui-monospace,Menlo,monospace' font-size='12' letter-spacing='3' fill='#fff' fill-opacity='.6' text-anchor='middle'>HOVER TO MAGNIFY</text><rect x='.5' y='.5' width='639' height='479' fill='url(#v)'/></svg>`)}
      />
    </div>
  ),
  "stepper": (
    <div style={{ width: "100%", maxWidth: 460, padding: "28px 22px", borderRadius: 20, background: "linear-gradient(180deg,#161618,#0f0f10)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.04), 0 24px 48px -28px rgba(0,0,0,0.85)" }}>
      <Stepper
        current={2}
        steps={[
          { label: "Account", description: "Your details" },
          { label: "Payment", description: "Card on file" },
          { label: "Review", description: "Confirm order" },
          { label: "Done", description: "All set" },
        ]}
      />
    </div>
  ),
  "skeleton": (
    <div className="flex w-full max-w-[380px] flex-col gap-5 rounded-2xl bg-[#0f0f10] p-6 text-zinc-100 ring-1 ring-white/10">
      <div className="flex items-center gap-3">
        <Skeleton.Avatar width={44} />
        <div className="min-w-0 flex-1">
          <Skeleton.Text lines={2} />
        </div>
      </div>
      <Skeleton variant="rect" height={132} radius={16} />
      <Skeleton.Text lines={3} />
    </div>
  ),
};

export function Preview({ slug }: { slug: string }) {
  return <>{PREVIEWS[slug] ?? null}</>;
}
