"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  COMPONENTS,
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  type Category,
} from "@/lib/catalog";
import { PreviewStage } from "@/components/preview-stage";
import { PREVIEWS } from "@/components/previews";
import { Badge } from "@/components/ui/badge";

type CatFilter = "all" | Category;

export function ComponentGallery() {
  const [cat, setCat] = React.useState<CatFilter>("all");
  const [q, setQ] = React.useState("");

  const filtered = COMPONENTS.filter((c) => {
    if (cat !== "all" && c.category !== cat) return false;
    if (q && !`${c.title} ${c.description} ${c.slug}`.toLowerCase().includes(q.toLowerCase()))
      return false;
    return true;
  });

  return (
    <div>
      {/* controls */}
      <div className="mb-8 flex flex-col gap-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search components…"
          aria-label="Search components"
          className="w-full rounded-lg border bg-background px-3.5 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip active={cat === "all"} onClick={() => setCat("all")}>
            All
          </FilterChip>
          {CATEGORY_ORDER.map((c) => (
            <FilterChip key={c} active={cat === c} onClick={() => setCat(c)}>
              {CATEGORY_LABEL[c]}
            </FilterChip>
          ))}
          <span className="ml-auto font-mono text-xs text-muted-foreground">
            {filtered.length} / {COMPONENTS.length}
          </span>
        </div>
      </div>

      {/* grid */}
      {filtered.length === 0 ? (
        <p className="py-20 text-center text-sm text-muted-foreground">
          Nothing matches those filters yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <Link
              key={c.slug}
              href={`/components/${c.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border bg-card transition-colors hover:border-foreground/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <PreviewStage
                minH="min-h-[200px]"
                className="rounded-none border-0 border-b"
              >
                <div className="pointer-events-none scale-90">
                  {PREVIEWS[c.slug]}
                </div>
              </PreviewStage>
              <div className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-medium">{c.title}</h3>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {c.description}
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className="shrink-0 font-mono text-[10px]"
                >
                  {CATEGORY_LABEL[c.category]}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  subtle,
  onClick,
  children,
}: {
  active: boolean;
  subtle?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? subtle
            ? "border-foreground/30 bg-foreground/10 text-foreground"
            : "border-transparent bg-foreground text-background"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
