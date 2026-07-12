import type { Metadata } from "next";
import { TemplateGallery } from "@/components/template-gallery";
import { TEMPLATES } from "@/lib/templates";

export const metadata: Metadata = {
  title: "Templates",
  description:
    "Full, ready-to-ship website templates — the Parable and Formwork showcase series. Live preview, one-line install, source you own.",
};

export default function TemplatesPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12 md:py-16">
      <header className="mb-10 max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          {TEMPLATES.length} templates · free
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Templates</h1>
        <p className="mt-3 text-muted-foreground">
          Complete, individually-designed websites — no two share a template.
          Preview them live, clone the source, and ship. Every one is a real,
          deployed site you can open in a new tab.
        </p>
      </header>
      <TemplateGallery />
    </main>
  );
}
