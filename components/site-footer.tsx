import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center">
        <p>
          <span className="font-semibold text-foreground">Parable</span> —
          components &amp; templates you own.
        </p>
        <nav className="flex flex-wrap gap-4 sm:ml-auto">
          <Link href="/components" className="hover:text-foreground">
            Components
          </Link>
          <Link href="/templates" className="hover:text-foreground">
            Templates
          </Link>
          <Link href="/docs" className="hover:text-foreground">
            Docs
          </Link>
          <a
            href="https://github.com/bswxyz/parable"
            target="_blank"
            rel="noopener"
            className="hover:text-foreground"
          >
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
