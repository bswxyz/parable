import { ImageResponse } from "next/og";
import { OgCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";
import { COMPONENTS, getComponent, CATEGORY_LABEL } from "@/lib/catalog";

export const alt = "Parable component";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return COMPONENTS.map((c) => ({ slug: c.slug }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = getComponent(slug);
  return new ImageResponse(
    (
      <OgCard
        kicker={c ? CATEGORY_LABEL[c.category] : "Component"}
        title={c?.title ?? "Component"}
        subtitle={c?.description}
        badge="component"
      />
    ),
    size
  );
}
