import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { COMPONENTS } from "@/lib/catalog";
import { TEMPLATES } from "@/lib/templates";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Everything on Parable is free right now. A Pro tier is on the way — the model is built in, but nothing is gated.",
};

const FREE = [
  "All 7 components",
  "All 52 templates",
  "Copy-paste via the shadcn CLI",
  "MCP catalog endpoint",
  "You own every line",
];

const PRO = [
  "Premium blocks & sections",
  "Starter templates with backends wired",
  "Early access to new drops",
  "Priority support",
];

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16 md:py-24">
      <div className="max-w-xl">
        <h1 className="text-4xl font-semibold tracking-tight">Pricing</h1>
        <p className="mt-3 text-muted-foreground">
          Everything is free right now — {COMPONENTS.length} components and{" "}
          {TEMPLATES.length} templates, all unlocked. A Pro tier is wired into
          the data model, but nothing is gated today.
        </p>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border bg-card p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-medium">Free</h2>
            <span className="font-mono text-xs text-emerald-500">available now</span>
          </div>
          <p className="mt-4 text-3xl font-semibold">
            $0<span className="text-base font-normal text-muted-foreground"> / forever</span>
          </p>
          <ul className="mt-6 space-y-2.5 text-sm">
            {FREE.map((f) => (
              <li key={f} className="flex items-center gap-2.5">
                <Check className="size-4 shrink-0 text-emerald-500" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/components"
            className="mt-8 block rounded-full bg-foreground py-2.5 text-center text-sm font-medium text-background transition-transform hover:scale-[1.01]"
          >
            Start building
          </Link>
        </div>

        <div className="rounded-2xl border border-dashed bg-card/50 p-6">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-medium">Pro</h2>
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] text-amber-500">
              Coming soon
            </span>
          </div>
          <p className="mt-4 text-3xl font-semibold text-muted-foreground">—</p>
          <ul className="mt-6 space-y-2.5 text-sm text-muted-foreground">
            {PRO.map((f) => (
              <li key={f} className="flex items-center gap-2.5">
                <Check className="size-4 shrink-0 text-muted-foreground/60" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <button
            disabled
            className="mt-8 w-full cursor-not-allowed rounded-full border py-2.5 text-center text-sm font-medium text-muted-foreground"
          >
            Not yet
          </button>
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        No checkout is live. When Pro ships, existing free items stay free.
      </p>
    </main>
  );
}
