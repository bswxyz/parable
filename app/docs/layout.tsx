import { DocsSidebar } from "@/components/docs-sidebar";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
      <details className="mb-6 rounded-lg border md:hidden">
        <summary className="cursor-pointer list-none px-4 py-2.5 text-sm font-medium">
          Documentation menu
        </summary>
        <div className="border-t px-4 py-3">
          <DocsSidebar />
        </div>
      </details>
      <div className="flex gap-10">
        <aside className="sticky top-20 hidden h-fit w-52 shrink-0 md:block">
          <DocsSidebar />
        </aside>
        <article className="min-w-0 max-w-2xl flex-1">{children}</article>
      </div>
    </div>
  );
}
