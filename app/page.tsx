import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { COMPONENTS } from "@/lib/catalog";

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-24 md:py-32">
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        Free · open · copy-paste
      </p>
      <h1 className="mt-4 max-w-3xl text-5xl font-semibold tracking-tight md:text-6xl">
        Components &amp; templates you actually own.
      </h1>
      <p className="mt-5 max-w-xl text-lg text-muted-foreground">
        Motion-rich React components and full website templates, installed with
        the shadcn CLI. The code copies into your project — no black-box
        dependency, no lock-in.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/components"
          className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-transform hover:scale-[1.02]"
        >
          Browse components <ArrowRight className="size-4" />
        </Link>
        <Link
          href="/templates"
          className="inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
        >
          Browse templates
        </Link>
      </div>
      <p className="mt-10 font-mono text-xs text-muted-foreground">
        {COMPONENTS.length} components · ~54 templates · a full landing lands in
        Phase 5
      </p>
    </main>
  );
}
