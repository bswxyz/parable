"use client";

import * as React from "react";
import { ShimmerButton } from "@/registry/parable/ui/shimmer-button";
import { VelocityMarquee } from "@/registry/parable/ui/velocity-marquee";
import { KineticText } from "@/registry/parable/ui/kinetic-text";
import { MagneticDock } from "@/registry/parable/ui/magnetic-dock";
import { AuroraBackground } from "@/registry/parable/ui/aurora-background";
import { DotMatrixLoader } from "@/registry/parable/ui/dot-matrix-loader";
import { MagnetLines } from "@/registry/parable/ui/magnet-lines";
import { Home, Search, Music, Camera, Star, Settings } from "lucide-react";

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
    <div className="text-violet-500">
      <DotMatrixLoader />
    </div>
  ),
  "magnet-lines": (
    <MagnetLines className="h-56 w-56" rows={9} columns={9} color="#8b5cf6" />
  ),
};

export function Preview({ slug }: { slug: string }) {
  return <>{PREVIEWS[slug] ?? null}</>;
}
