"use client";

import * as React from "react";
import Image from "next/image";
import { ExternalLink, RefreshCw } from "lucide-react";

/**
 * Live template preview. Shows the static screenshot immediately, then lets the
 * viewer load the real site in an iframe on demand (heavy WebGL templates can be
 * slow, so we don't autoload all of them). Screenshot is the always-there
 * fallback.
 */
export function TemplatePreview({
  liveUrl,
  thumb,
  name,
}: {
  liveUrl: string;
  thumb: string;
  name: string;
}) {
  const [live, setLive] = React.useState(false);

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-muted">
      <div className="relative aspect-[16/10] w-full">
        {live ? (
          <iframe
            src={liveUrl}
            title={`${name} — live preview`}
            className="absolute inset-0 h-full w-full bg-white"
            loading="lazy"
            sandbox="allow-scripts allow-same-origin allow-popups"
          />
        ) : (
          <Image
            src={thumb}
            alt={`${name} template — homepage screenshot`}
            fill
            sizes="(max-width: 1024px) 100vw, 900px"
            className="object-cover object-top"
            priority
          />
        )}
      </div>

      <div className="flex items-center gap-2 border-t bg-background/80 px-3 py-2 backdrop-blur">
        <button
          onClick={() => setLive((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <RefreshCw className="size-3.5" />
          {live ? "Show screenshot" : "Load live preview"}
        </button>
        <span className="truncate font-mono text-[11px] text-muted-foreground">
          {liveUrl.replace(/^https?:\/\//, "")}
        </span>
        <a
          href={liveUrl}
          target="_blank"
          rel="noopener"
          className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-foreground px-2.5 py-1 text-xs font-medium text-background transition-transform hover:scale-[1.02]"
        >
          Open <ExternalLink className="size-3.5" />
        </a>
      </div>
    </div>
  );
}
