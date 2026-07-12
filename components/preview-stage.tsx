import { cn } from "@/lib/utils";

/**
 * Isolated stage for live component previews. `isolate` + `contain` keep the
 * component's stacking/paint scoped; our components also self-scope their CSS
 * (pb-* keyframes/classes), so nothing leaks into the shell.
 */
export function PreviewStage({
  children,
  className,
  minH = "min-h-[280px]",
}: {
  children: React.ReactNode;
  className?: string;
  minH?: string;
}) {
  return (
    <div
      className={cn(
        "relative isolate grid place-items-center overflow-hidden rounded-2xl border bg-[radial-gradient(circle_at_1px_1px,var(--pb-dot,rgba(120,120,130,0.18))_1px,transparent_0)] [background-size:16px_16px] p-8",
        minH,
        className
      )}
      style={{ contain: "paint layout" }}
    >
      {children}
    </div>
  );
}
