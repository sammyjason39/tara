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
  return (
    <div className="h-full w-full bg-background selection:bg-primary/20 selection:text-primary">
      <div className="flex flex-col w-full h-full">
        {header && (
          <header className="shrink-0 border-b border-border/50 bg-surface-2/80 backdrop-blur-2xl z-20">
            {header}
          </header>
        )}
        
        <div className="flex-1 flex overflow-hidden min-h-0">
          {left && (
            <aside className="w-80 shrink-0 border-r border-border/50 bg-surface-2/40 backdrop-blur-2xl hidden lg:block overflow-y-auto premium-scrollbar">
              {left}
            </aside>
          )}
          
          <section className="flex-1 overflow-y-auto overflow-x-hidden relative bg-surface-1/30 premium-scrollbar transition-premium">
            <div className="w-full">
              {children}
            </div>
            {footer && <div className="p-8 border-t border-border/50 mt-auto">{footer}</div>}
          </section>

          {right && (
            <aside className="w-80 shrink-0 border-l border-border/50 bg-surface-2/40 backdrop-blur-2xl hidden xl:block overflow-y-auto premium-scrollbar">
              {right}
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}


export default PageShell;
