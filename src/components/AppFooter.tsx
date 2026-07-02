import { APP_VERSION, APP_COPYRIGHT_YEAR } from "@/lib/version";
import { useBranding } from "@/contexts/BrandingContext";
import { cn } from "@/lib/utils";

interface AppFooterProps {
  className?: string;
}

export function AppFooter({ className }: AppFooterProps) {
  const { companyName, appVersion } = useBranding();

  return (
    <footer
      className={cn(
        "shrink-0 border-t border-border/40 bg-muted/30 px-4 py-2 text-center text-[11px] text-muted-foreground select-none",
        className
      )}
    >
      <span>
        &copy; {APP_COPYRIGHT_YEAR} {companyName}
      </span>
      <span className="mx-1.5 hidden sm:inline">&middot;</span>
      <span className="block sm:inline">v{appVersion}</span>
    </footer>
  );
}
