import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  COMPONENTS,
  getComponent,
  CATEGORY_LABEL,
  installCommand,
} from "@/lib/catalog";
import { readComponentSource } from "@/lib/source";
import { CodeBlock } from "@/components/code-block";
import { InstallBlock } from "@/components/install-block";
import { PreviewStage } from "@/components/preview-stage";
import { Preview } from "@/components/previews";
import { CopyPageButton } from "@/components/copy-page-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export function generateStaticParams() {
  return COMPONENTS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = getComponent(slug);
  if (!c) return {};
  return {
    title: c.title,
    description: c.description,
    alternates: { canonical: `/components/${c.slug}` },
  };
}

export default async function ComponentDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = getComponent(slug);
  if (!c) notFound();

  const source = await readComponentSource(slug);
  const markdown = buildMarkdown(c.title, c.description, slug, source);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 md:py-14">
      <Link
        href="/components"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All components
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">{c.title}</h1>
            <Badge variant="secondary" className="font-mono text-[10px]">
              {CATEGORY_LABEL[c.category]}
            </Badge>
          </div>
          <p className="mt-2 max-w-xl text-muted-foreground">{c.description}</p>
          {c.inspiredBy && (
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              Inspired by{" "}
              <a
                href={c.inspiredBy.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              >
                {c.inspiredBy.name}
              </a>{" "}
              — independently built, not affiliated.{" "}
              <Link
                href="/docs/attribution"
                className="underline underline-offset-2 hover:text-foreground"
              >
                Attribution policy
              </Link>
            </p>
          )}
        </div>
        <CopyPageButton markdown={markdown} />
      </div>

      {/* Preview / Code */}
      <Tabs defaultValue="preview" className="mt-8">
        <TabsList>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="code">Code</TabsTrigger>
        </TabsList>
        <TabsContent value="preview">
          <PreviewStage>
            <Preview slug={slug} />
          </PreviewStage>
        </TabsContent>
        <TabsContent value="code">
          <CodeBlock code={source} lang="tsx" />
        </TabsContent>
      </Tabs>

      {/* Install */}
      <section className="mt-10">
        <h2 className="mb-3 text-sm font-medium">Installation</h2>
        <InstallBlock slug={slug} />
        <p className="mt-2 text-xs text-muted-foreground">
          Runs the shadcn CLI — the component source is copied into
          <code className="mx-1 rounded bg-muted px-1 py-0.5 font-mono">
            components/parable/{slug}.tsx
          </code>
          . You own it from there.
        </p>
      </section>

      {/* Dependencies */}
      {(c.dependencies.length > 0 || c.registryDependencies.length > 0) && (
        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          {c.dependencies.length > 0 && (
            <DepList title="npm dependencies" items={c.dependencies} />
          )}
          {c.registryDependencies.length > 0 && (
            <DepList
              title="Registry dependencies"
              items={c.registryDependencies}
            />
          )}
        </section>
      )}
    </main>
  );
}

function DepList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="mb-2 text-xs font-medium text-muted-foreground">{title}</h3>
      <ul className="flex flex-wrap gap-2">
        {items.map((d) => (
          <li
            key={d}
            className="rounded-md border bg-muted/40 px-2 py-1 font-mono text-xs"
          >
            {d}
          </li>
        ))}
      </ul>
    </div>
  );
}

function buildMarkdown(
  title: string,
  desc: string,
  slug: string,
  source: string
): string {
  return `# ${title}

${desc}

## Install

\`\`\`bash
${installCommand(slug, "npm")}
\`\`\`

## Source — components/parable/${slug}.tsx

\`\`\`tsx
${source}
\`\`\`
`;
}
