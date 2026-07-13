import type { Metadata } from "next";
import { ComponentGallery } from "@/components/component-gallery";
import { COMPONENTS } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Components",
  description:
    "Motion-rich React components — copy-paste via the shadcn CLI. Filter by category, preview live, own the code.",
  alternates: { canonical: "/components" },
};

export default function ComponentsPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12 md:py-16">
      <header className="mb-10 max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          {COMPONENTS.length} components · free
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
          Components
        </h1>
        <p className="mt-3 text-muted-foreground">
          Animated, accessible React components. Install with the shadcn CLI and
          the source lands in your project — rename it, restyle it, retime it.
          It&apos;s yours.
        </p>
      </header>
      <ComponentGallery />
    </main>
  );
}
