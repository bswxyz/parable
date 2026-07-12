import type { Metadata } from "next";

export const metadata: Metadata = { title: "Docs" };

export default function DocsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-20">
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        Coming in Phase 4
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">Docs</h1>
      <p className="mt-3 text-muted-foreground">
        Installation, theming, CLI, and the MCP endpoint. In the meantime, add
        the Parable registry to your <code>components.json</code>:
      </p>
      <pre className="mt-4 overflow-x-auto rounded-xl border bg-card p-4 font-mono text-xs">
        {`{
  "registries": {
    "@parable": "https://parable.dev/r/{name}.json"
  }
}`}
      </pre>
    </main>
  );
}
