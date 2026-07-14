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
import { getPropDocs, getUsage, type ComponentPropDocs } from "@/lib/docs";
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
  const propDocs = getPropDocs(slug);
  const usage = getUsage(slug);
  const markdown = buildMarkdown(c.title, c.description, slug, source, propDocs);

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

      {/* Usage */}
      {usage && (
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-medium">Usage</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            The exact code rendering the preview above.
          </p>
          <CodeBlock code={usage} lang="tsx" />
        </section>
      )}

      {/* Props */}
      {propDocs && propDocs.props.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-1 text-sm font-medium">Props</h2>
          <p className="mb-3 font-mono text-xs text-muted-foreground">
            {propDocs.interface}
            {propDocs.extends.length > 0 && (
              <span className="text-muted-foreground/70">
                {" "}
                extends {propDocs.extends.join(", ")}
              </span>
            )}
          </p>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-3 py-2 font-mono text-xs font-medium">
                    Prop
                  </th>
                  <th className="px-3 py-2 font-mono text-xs font-medium">
                    Type
                  </th>
                  <th className="px-3 py-2 font-mono text-xs font-medium">
                    Default
                  </th>
                  <th className="px-3 py-2 font-mono text-xs font-medium">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody>
                {propDocs.props.map((p) => (
                  <tr key={p.name} className="border-b last:border-0">
                    <td className="whitespace-nowrap px-3 py-2 align-top font-mono text-xs">
                      {p.name}
                      {p.required && (
                        <span
                          className="text-[#ec4899]"
                          title="Required"
                          aria-label="required"
                        >
                          *
                        </span>
                      )}
                    </td>
                    <td className="max-w-[220px] px-3 py-2 align-top font-mono text-xs text-muted-foreground">
                      {p.type}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 align-top font-mono text-xs text-muted-foreground">
                      {p.default ?? "—"}
                    </td>
                    <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                      {p.description || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

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
  source: string,
  propDocs?: ComponentPropDocs
): string {
  const propsTable =
    propDocs && propDocs.props.length > 0
      ? `\n## Props (${propDocs.interface})\n\n| Prop | Type | Default | Description |\n| --- | --- | --- | --- |\n${propDocs.props
          .map(
            (p) =>
              `| ${p.name}${p.required ? " (required)" : ""} | \`${p.type.replace(/\|/g, "\\|")}\` | ${p.default ? `\`${p.default.replace(/\|/g, "\\|")}\`` : "—"} | ${p.description.replace(/\|/g, "\\|") || "—"} |`
          )
          .join("\n")}\n`
      : "";

  return `# ${title}

${desc}

## Install

\`\`\`bash
${installCommand(slug, "npm")}
\`\`\`
${propsTable}
## Source — components/parable/${slug}.tsx

\`\`\`tsx
${source}
\`\`\`
`;
}
