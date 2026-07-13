import { codeToHtml } from "shiki";
import { CopyButton } from "@/components/copy-button";

export async function CodeBlock({
  code,
  lang = "tsx",
  className,
}: {
  code: string;
  lang?: string;
  className?: string;
}) {
  const html = await codeToHtml(code, {
    lang,
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: false,
  });

  return (
    <div className={`group relative ${className ?? ""}`}>
      <div className="absolute right-3 top-3 z-10 opacity-100 transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 focus-within:opacity-100">
        <CopyButton value={code} label="Copy code" />
      </div>
      <div
        className="max-h-[560px] overflow-auto rounded-xl border bg-[#fff] p-4 text-[13px] leading-relaxed dark:bg-[#0d1117] [&_pre]:!bg-transparent [&_pre]:whitespace-pre [&_code]:font-mono"
        // shiki output is trusted (our own source files)
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
