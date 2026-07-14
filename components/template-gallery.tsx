"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  TEMPLATES,
  TEMPLATE_STACKS,
  type TemplateFamily,
  type TemplateStack,
} from "@/lib/templates";
import { Badge } from "@/components/ui/badge";

type FamilyFilter = "all" | TemplateFamily;
type StackFilter = "all" | TemplateStack;

export function TemplateGallery() {
  const [family, setFamily] = React.useState<FamilyFilter>("all");
  const [stack, setStack] = React.useState<StackFilter>("all");
  const [q, setQ] = React.useState("");

  const filtered = TEMPLATES.filter((tpl) => {
    if (family !== "all" && tpl.family !== family) return false;
    if (stack !== "all" && tpl.stack !== stack) return false;
    if (
      q &&
      !`${tpl.name} ${tpl.pitch} ${tpl.tags.join(" ")} ${tpl.slug}`
        .toLowerCase()
        .includes(q.toLowerCase())
    )
      return false;
    return true;
  });

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search templates…"
          aria-label="Search templates"
          className="w-full rounded-lg border bg-background px-3.5 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <div className="flex flex-wrap items-center gap-2">
          {(["all", "parable", "formwork"] as const).map((f) => (
            <Chip key={f} active={family === f} onClick={() => setFamily(f)}>
              {f === "all" ? "All" : f === "parable" ? "Parable" : "Formwork"}
            </Chip>
          ))}
          <span className="mx-1 h-5 w-px bg-border" />
          {TEMPLATE_STACKS.map((s) => (
            <Chip
              key={s.key}
              subtle
              active={stack === s.key}
              onClick={() => setStack(s.key)}
            >
              {s.label}
            </Chip>
          ))}
          <span className="ml-auto font-mono text-xs text-muted-foreground">
            {filtered.length} / {TEMPLATES.length}
          </span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-20 text-center text-sm text-muted-foreground">
          No templates match those filters.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((tpl) => (
            <Link
              key={tpl.slug}
              href={`/templates/${tpl.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border bg-card transition-colors hover:border-foreground/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="relative aspect-[16/10] overflow-hidden border-b bg-muted">
                <Image
                  src={tpl.thumb}
                  alt={`${tpl.name} template — homepage preview`}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <span className="absolute left-2 top-2 rounded-md bg-background/80 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide backdrop-blur">
                  {tpl.family}
                </span>
                {tpl.isNew && (
                  <span className="absolute right-2 top-2 rounded-md bg-foreground px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-background shadow-sm">
                    New
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-medium">{tpl.name}</h3>
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    {tpl.stack}
                  </Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {tpl.pitch}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({
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
