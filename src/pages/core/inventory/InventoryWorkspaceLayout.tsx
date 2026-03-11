import * as React from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useSession } from "@/core/security/session";
import { cn } from "@/lib/utils";
import {
  ActivitySquare,
  BarChart3,
  Boxes,
  ClipboardCheck,
  ScanLine,
  ShieldCheck,
} from "lucide-react";

type MenuItem = { label: string; to: string; icon: React.ElementType };

const TABS: MenuItem[] = [
  { label: "Dashboard", to: "/core/inventory/dashboard", icon: Boxes },
  { label: "Stock Hub", to: "/core/inventory/stock", icon: ScanLine },
  { label: "Receiving", to: "/core/inventory/receiving", icon: ActivitySquare },
  { label: "Adjustments", to: "/core/inventory/adjustments", icon: ClipboardCheck },
  { label: "Audit Log", to: "/core/inventory/audit", icon: ShieldCheck },
  { label: "Insights", to: "/core/inventory/insights", icon: BarChart3 },
];

export default function InventoryWorkspaceLayout() {
  const session = useSession();
  const location = useLocation();

  // Derive current page title from the active tab
  const currentTab = TABS.find((t) =>
    location.pathname.startsWith(t.to),
  );

  return (
    <div className="flex flex-col min-h-screen bg-muted/20">
      {/* ── Module Header ─────────────────────────────────────── */}
      <div className="border-b bg-background px-6 pt-5 pb-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Boxes className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">Inventory</h1>
            <p className="text-xs text-muted-foreground">
              Stock control · Receiving · Adjustments · Governance
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded bg-muted px-2 py-0.5">{session.tenantId}</span>
            <span className="rounded bg-muted px-2 py-0.5">{session.role}</span>
          </div>
        </div>

        {/* ── Tab Bar ───────────────────────────────────────────── */}
        <nav className="flex gap-1 overflow-x-auto" aria-label="Inventory navigation">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = location.pathname.startsWith(tab.to);
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap rounded-t-lg px-4 py-2.5 text-sm font-medium transition-all border-b-2",
                  isActive
                    ? "border-primary bg-background text-primary shadow-sm"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/60",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {tab.label}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* ── Page Content ──────────────────────────────────────── */}
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
