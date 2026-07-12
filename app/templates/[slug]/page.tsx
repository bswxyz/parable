import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { TEMPLATES, getTemplate } from "@/lib/templates";
import { TemplatePreview } from "@/components/template-preview";
import { CloneBlock } from "@/components/clone-block";
import { CopyPageButton } from "@/components/copy-page-button";
import { Badge } from "@/components/ui/badge";

export function generateStaticParams() {
  return TEMPLATES.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tpl = getTemplate(slug);
  if (!tpl) return {};
  return { title: tpl.name, description: tpl.pitch };
}

export default async function TemplateDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tpl = getTemplate(slug);
  if (!tpl) notFound();

  const markdown = `# ${tpl.name}\n\n${tpl.pitch}\n\n- Live: ${tpl.liveUrl}\n- Repo: ${tpl.repo}\n- Stack: ${tpl.stack}\n\n## Clone\n\n\`\`\`bash\nnpx degit ${tpl.degit} ${tpl.slug}\n\`\`\`\n`;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 md:py-14">
      <Link
        href="/templates"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All templates
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">{tpl.name}</h1>
            <Badge variant="secondary" className="font-mono text-[10px]">
              {tpl.stack}
            </Badge>
            <Badge variant="outline" className="font-mono text-[10px]">
              {tpl.family}
            </Badge>
            <span className="font-mono text-xs text-emerald-500">free</span>
          </div>
          <p className="mt-2 max-w-xl text-muted-foreground">{tpl.pitch}</p>
        </div>
        <CopyPageButton markdown={markdown} />
      </div>

      <div className="mt-8">
        <TemplatePreview liveUrl={tpl.liveUrl} thumb={tpl.thumb} name={tpl.name} />
      </div>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-medium">Get the source</h2>
        <CloneBlock degit={tpl.degit} repo={tpl.repo} slug={tpl.slug} />
        <p className="mt-2 text-xs text-muted-foreground">
          Templates are complete sites, not components — clone the repo (or{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono">degit</code>{" "}
          the source) and it&apos;s yours to rebuild on. No build step for the
          Formwork set; framework templates carry their own.
        </p>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <InfoCard title="Tags" items={tpl.tags} />
        <div className="rounded-xl border bg-card p-4">
          <h3 className="mb-2 text-xs font-medium text-muted-foreground">
            Links
          </h3>
          <div className="flex flex-col gap-1.5 text-sm">
            <a
              href={tpl.liveUrl}
              target="_blank"
              rel="noopener"
              className="text-foreground underline-offset-4 hover:underline"
            >
              Live site ↗
            </a>
            <a
              href={tpl.repo}
              target="_blank"
              rel="noopener"
              className="text-foreground underline-offset-4 hover:underline"
            >
              Source repo ↗
            </a>
            <a
              href={`${tpl.liveUrl}guide/`}
              target="_blank"
              rel="noopener"
              className="text-muted-foreground underline-offset-4 hover:underline"
            >
              Build guide ↗
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

function InfoCard({ title, items }: { title: string; items: string[] }) {
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
