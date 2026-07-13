import type { MDXComponents } from "mdx/types";

/** Styled elements for all MDX docs pages. Tailwind-tuned, theme-aware. */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: (props) => (
      <h1 className="mb-3 text-3xl font-semibold tracking-tight" {...props} />
    ),
    h2: (props) => (
      <h2
        className="mt-10 mb-3 text-xl font-semibold tracking-tight"
        {...props}
      />
    ),
    h3: (props) => (
      <h3 className="mt-6 mb-2 text-base font-semibold" {...props} />
    ),
    p: (props) => (
      <p className="my-4 leading-7 text-muted-foreground" {...props} />
    ),
    a: (props) => (
      <a
        className="font-medium text-foreground underline underline-offset-4 decoration-foreground/30 hover:decoration-foreground"
        {...props}
      />
    ),
    ul: (props) => (
      <ul className="my-4 ml-5 list-disc space-y-1.5 text-muted-foreground" {...props} />
    ),
    ol: (props) => (
      <ol className="my-4 ml-5 list-decimal space-y-1.5 text-muted-foreground" {...props} />
    ),
    li: (props) => <li className="leading-7" {...props} />,
    code: (props) => (
      <code
        className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground"
        {...props}
      />
    ),
    pre: (props) => (
      <pre
        className="my-5 overflow-x-auto rounded-xl border bg-card p-4 font-mono text-[13px] leading-relaxed [&_code]:bg-transparent [&_code]:p-0"
        {...props}
      />
    ),
    hr: () => <hr className="my-8 border-border" />,
    strong: (props) => (
      <strong className="font-semibold text-foreground" {...props} />
    ),
    blockquote: (props) => (
      <blockquote
        className="my-5 border-l-2 border-foreground/30 pl-4 text-muted-foreground italic"
        {...props}
      />
    ),
    table: (props) => (
      <div className="my-5 overflow-x-auto">
        <table className="w-full border-collapse text-sm" {...props} />
      </div>
    ),
    th: (props) => (
      <th className="border-b px-3 py-2 text-left font-medium" {...props} />
    ),
    td: (props) => (
      <td className="border-b px-3 py-2 text-muted-foreground" {...props} />
    ),
    ...components,
  };
}
