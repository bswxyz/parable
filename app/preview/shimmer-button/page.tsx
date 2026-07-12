import { ShimmerButton } from "@/registry/parable/ui/shimmer-button";

export default function ShimmerButtonPreview() {
  return (
    <main
      style={{ minHeight: "100dvh" }}
      className="flex flex-col items-center justify-center gap-10 bg-neutral-950 p-10"
    >
      <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">
        @parable/shimmer-button
      </p>
      <div className="flex flex-wrap items-center justify-center gap-6">
        <ShimmerButton>Install component</ShimmerButton>
        <ShimmerButton shimmerColor="#f5a623" background="rgba(12,10,8,1)">
          Amber shimmer
        </ShimmerButton>
        <ShimmerButton shimmerColor="#29e6ff" shimmerDuration="1.4s">
          Fast cyan
        </ShimmerButton>
      </div>
    </main>
  );
}
