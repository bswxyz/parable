import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AUTH_ENABLED } from "@/lib/flags";

export const metadata: Metadata = { title: "Account", robots: { index: false } };

export default function AccountPage() {
  if (!AUTH_ENABLED) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Accounts aren&apos;t live yet
        </h1>
        <p className="mt-3 text-muted-foreground">
          Parable is free and account-free for now. When the Pro tier ships,
          your entitlements will live here.
        </p>
        <Link
          href="/pricing"
          className="mt-6 text-sm text-foreground underline underline-offset-4"
        >
          See pricing →
        </Link>
      </main>
    );
  }
  notFound();
}
