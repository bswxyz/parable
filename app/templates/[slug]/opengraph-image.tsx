import { ImageResponse } from "next/og";
import { OgCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";
import { TEMPLATES, getTemplate } from "@/lib/templates";

export const alt = "Parable template";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return TEMPLATES.map((t) => ({ slug: t.slug }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = getTemplate(slug);
  return new ImageResponse(
    (
      <OgCard
        kicker={t ? `${t.family} · ${t.stack}` : "Template"}
        title={t?.name ?? "Template"}
        subtitle={t?.pitch}
        badge="template"
      />
    ),
    size
  );
}
