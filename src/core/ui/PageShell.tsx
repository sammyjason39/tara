import type React from "react";
import { cn } from "@/lib/utils";

interface PageShellProps {
  header?: React.ReactNode;
  left?: React.ReactNode;
  right?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export function PageShell({
  header,
  left,
  right,
  footer,
  children,
}: PageShellProps) {
  const gridClass = cn(
    "grid gap-6",
    left && right
      ? "xl:grid-cols-[300px_minmax(0,1fr)_320px] lg:grid-cols-[280px_1fr]"
      : left
        ? "lg:grid-cols-[300px_minmax(0,1fr)]"
        : right
          ? "lg:grid-cols-[minmax(0,1fr)_320px]"
          : "grid-cols-1",
  );

  return (
    <div className="min-h-screen w-full bg-muted/30">
      <div className="mx-auto flex w-full flex-col gap-4 md:gap-6 px-4 md:px-6 py-4 md:py-6 font-sans">
        {header}
        <div className={gridClass}>
          {left ? (
            <aside className={cn(
              "rounded-xl border bg-card/60 shadow-sm relative z-10",
              right && "lg:hidden xl:block" // Hide left sidebar on lg if both exist to save space
            )}>
              {left}
            </aside>
          ) : null}
          <main className="min-w-0 relative z-10">{children}</main>
          {right ? (
            <aside className="rounded-xl border bg-card/60 shadow-sm relative z-10">
              {right}
            </aside>
          ) : null}
        </div>
        {footer && <div className="mt-6">{footer}</div>}
      </div>
    </div>
  );
}

export default PageShell;
