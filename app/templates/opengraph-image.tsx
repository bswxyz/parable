import { ImageResponse } from "next/og";
import { OgCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";
import { TEMPLATES } from "@/lib/templates";

export const alt = "Parable templates";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return new ImageResponse(
    (
      <OgCard
        kicker={`${TEMPLATES.length} templates · free`}
        title="Templates"
        subtitle="Complete, individually-designed websites. Live preview, clone, ship."
        badge="/templates"
      />
    ),
    size
  );
}
