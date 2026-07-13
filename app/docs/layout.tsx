import { DocsSidebar } from "@/components/docs-sidebar";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-6xl gap-10 px-4 py-10 md:py-14">
      <aside className="sticky top-20 hidden h-fit w-52 shrink-0 md:block">
        <DocsSidebar />
      </aside>
      <article className="min-w-0 max-w-2xl flex-1">{children}</article>
    </div>
  );
}
