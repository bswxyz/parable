import Link from "next/link";
import { Terminal, Download, Pencil } from "lucide-react";
import { HomeHero } from "@/components/home-hero";
import { HomeFeatured } from "@/components/home-featured";
import { COMPONENTS } from "@/lib/catalog";
import { TEMPLATES } from "@/lib/templates";

const STEPS = [
  {
    icon: Terminal,
    step: "01",
    title: "Add the registry",
    body: "Drop the @parable namespace into your components.json — one line.",
  },
  {
    icon: Download,
    step: "02",
    title: "shadcn add",
    body: "Install any component by name or URL. Dependencies resolve automatically.",
  },
  {
    icon: Pencil,
    step: "03",
    title: "Own the code",
    body: "The source lands in your repo. Rename it, restyle it, retime it. It's yours.",
  },
];

export default function Home() {
  return (
    <main>
      <HomeHero componentCount={COMPONENTS.length} />

      <HomeFeatured />

      {/* How it works */}
      <section className="border-y bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.step} className="rounded-2xl border bg-card p-6">
                <div className="flex items-center justify-between">
                  <s.icon className="size-5 text-muted-foreground" />
                  <span className="font-mono text-xs text-muted-foreground">
                    {s.step}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-medium">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The full index — the central hub the showcases link from */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">
            Every template
          </h2>
          <span className="font-mono text-xs text-muted-foreground">
            {TEMPLATES.length} sites
          </span>
        </div>
        <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3 lg:grid-cols-4">
          {TEMPLATES.map((t) => (
            <li key={t.slug}>
              <Link
                href={`/templates/${t.slug}`}
                className="group flex items-baseline justify-between gap-2 border-b border-transparent py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <span className="truncate">{t.name}</span>
                <span className="shrink-0 font-mono text-[10px] text-foreground/30 group-hover:text-foreground/50">
                  {t.stack}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
