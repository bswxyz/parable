import type { Metadata } from "next";

export const metadata: Metadata = { title: "Pricing" };

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-20">
      <h1 className="text-4xl font-semibold tracking-tight">Pricing</h1>
      <p className="mt-3 text-muted-foreground">
        Everything is free right now. Pro is on the way.
      </p>
      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border bg-card p-6">
          <h2 className="text-lg font-medium">Free</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Every component and template. Copy-paste, you own the code.
          </p>
          <p className="mt-6 text-3xl font-semibold">$0</p>
        </div>
        <div className="rounded-2xl border border-dashed bg-card/50 p-6">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-medium">Pro</h2>
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] text-amber-500">
              Coming soon
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Premium blocks, starter templates, and priority support.
          </p>
          <p className="mt-6 text-3xl font-semibold text-muted-foreground">—</p>
        </div>
      </div>
    </main>
  );
}
