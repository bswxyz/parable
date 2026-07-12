import type { Metadata } from "next";

export const metadata: Metadata = { title: "Templates" };

export default function TemplatesPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-20">
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        Coming in Phase 3
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">Templates</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">
        Full, ready-to-ship website templates — the Parable &amp; Formwork
        showcase series. Live preview, one-line install, and the source is yours.
      </p>
    </main>
  );
}
