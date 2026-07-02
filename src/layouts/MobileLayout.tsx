import { Outlet, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Home, Clock, CalendarDays, Bell, User, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppFooter } from "@/components/AppFooter";
import { useFeatureFlags } from "@/contexts/FeatureFlagsContext";
import type { FeatureKey } from "@/lib/feature-flags";

const bottomNav: Array<{
  to: string;
  icon: typeof Home;
  labelKey: string;
  end?: boolean;
  feature: FeatureKey | null;
}> = [
  { to: "/m", icon: Home, labelKey: "nav.dashboard", end: true, feature: "dashboard" },
  { to: "/m/clock", icon: Clock, labelKey: "nav.attendance", feature: "attendance" },
  { to: "/m/leave", icon: CalendarDays, labelKey: "nav.leaves", feature: "leave" },
  { to: "/m/sop", icon: FileText, labelKey: "nav.sop", feature: "sop" },
  { to: "/m/notifications", icon: Bell, labelKey: "nav.notifications", feature: "notifications" },
  { to: "/m/profile", icon: User, labelKey: "profile.my_profile", feature: null },
];

export function MobileLayout() {
  const { t } = useTranslation();
  const { isEnabled } = useFeatureFlags();
  const visibleNav = bottomNav.filter((item) => isEnabled(item.feature));
  const colClass =
    visibleNav.length <= 4
      ? "grid-cols-4"
      : visibleNav.length === 5
        ? "grid-cols-5"
        : "grid-cols-6";

  return (
    <div className="flex flex-col h-[100dvh] max-w-md mx-auto bg-background">
      <main className="flex-1 min-h-0 overflow-y-auto">
        <Outlet />
      </main>

      <AppFooter className="border-t-0 shrink-0" />

      <nav
        className={cn(
          "shrink-0 grid w-full border-t border-border bg-card/95 backdrop-blur-md pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]",
          colClass,
        )}
        aria-label="Navigasi utama"
      >
        {visibleNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex min-w-0 flex-col items-center gap-0.5 px-0.5 py-1",
                isActive ? "text-gold" : "text-muted-foreground",
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                    isActive && "bg-gold/10",
                  )}
                >
                  <item.icon
                    className="h-5 w-5 shrink-0"
                    strokeWidth={isActive ? 2.25 : 2}
                    aria-hidden
                  />
                </span>
                <span className="flex min-h-[2rem] w-full items-center justify-center text-center text-[10px] leading-[1.2] font-medium break-words hyphens-auto">
                  {t(item.labelKey)}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
