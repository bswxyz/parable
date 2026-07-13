import { ImageResponse } from "next/og";
import { OgCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const alt = "Parable — components & templates you own";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return new ImageResponse(
    (
      <OgCard
        kicker="Free · open · copy-paste"
        title="Components & templates you own."
        subtitle="Motion-rich React components and full website templates, installed with the shadcn CLI."
      />
    ),
    size
  );
}
