"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  {
    group: "Getting started",
    items: [
      { href: "/docs", label: "Introduction" },
      { href: "/docs/installation", label: "Installation" },
      { href: "/docs/theming", label: "Theming" },
    ],
  },
  {
    group: "Guides",
    items: [
      { href: "/docs/cli", label: "CLI" },
      { href: "/docs/mcp", label: "MCP server" },
    ],
  },
  {
    group: "About",
    items: [{ href: "/docs/changelog", label: "Changelog" }],
  },
];

export function DocsSidebar() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-6 text-sm" aria-label="Docs">
      {NAV.map((g) => (
        <div key={g.group}>
          <p className="mb-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            {g.group}
          </p>
          <ul className="space-y-0.5">
            {g.items.map((it) => {
              const active = pathname === it.href;
              return (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block rounded-md px-2.5 py-1.5 transition-colors",
                      active
                        ? "bg-muted font-medium text-foreground"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                  >
                    {it.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
