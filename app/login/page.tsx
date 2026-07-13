import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AUTH_ENABLED } from "@/lib/flags";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default function LoginPage() {
  // Auth is wired but flagged off at launch. Everything is free — no account needed.
  if (!AUTH_ENABLED) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          No account needed
        </h1>
        <p className="mt-3 text-muted-foreground">
          Everything on Parable is free right now — just{" "}
          <Link href="/components" className="text-foreground underline underline-offset-4">
            grab a component
          </Link>{" "}
          or clone a template. Accounts arrive with the Pro tier.
        </p>
      </main>
    );
  }

  // Real auth UI would mount here once AUTH_ENABLED is turned on.
  notFound();
}
