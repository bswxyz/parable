import { ImageResponse } from "next/og";
import { OgCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";
import { COMPONENTS } from "@/lib/catalog";

export const alt = "Parable components";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return new ImageResponse(
    (
      <OgCard
        kicker={`${COMPONENTS.length} components · free`}
        title="Components"
        subtitle="Animated, accessible React components. Install with the shadcn CLI, own the code."
        badge="/components"
      />
    ),
    size
  );
}
