import * as React from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { PageHeader } from "@/core/ui/PageHeader";
import { PageShell } from "@/core/ui/PageShell";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { useSession } from "@/core/security/session";
import { cn } from "@/lib/utils";
import {
  HandCoins,
  Users,
  LayoutTemplate
} from "lucide-react";

type MenuItem = { label: string; to: string; icon: React.ElementType };
type MenuSection = { title: string; items: MenuItem[] };

const SECTIONS: MenuSection[] = [
  {
    title: "Strategic",
    items: [
      { label: "CFO Dashboard", to: "/core/finance", icon: LayoutGrid },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Money Desk", to: "/core/finance/moneydesk", icon: Banknote },
      { label: "Treasury Map", to: "/core/finance/treasury", icon: Wallet },
      { label: "Ledger Core", to: "/core/finance/ledger", icon: FileSpreadsheet },
      { label: "Invoice Capture", to: "/core/finance/invoices", icon: FileText },
      { label: "Finance Docs", to: "/core/finance/docs", icon: FileSignature },
      { label: "Assets", to: "/core/finance/assets", icon: BookOpen },
      { label: "Tax Center", to: "/core/finance/tax", icon: FileText },
      { label: "Payslip Studio", to: "/core/finance/payslip-studio", icon: LayoutTemplate },
      { label: "Staff Schedule", to: "/core/finance/schedule", icon: Users },
    ],
  },
  {
    title: "Payments",
    items: [
      { label: "Pay Flow", to: "/core/finance/payflow", icon: CreditCard },
      { label: "Receivable Desk", to: "/core/finance/receivables", icon: Receipt },
      { label: "Payable Desk", to: "/core/finance/payables", icon: Banknote },
      { label: "JV Settlement", to: "/core/finance/jv", icon: HandCoins },
    ],
  },
  {
    title: "Governance",
    items: [
      { label: "Close Period Studio", to: "/core/finance/close", icon: Lock },
      { label: "Audit Vault", to: "/core/finance/audit", icon: ShieldCheck },
      { label: "Policy Manager", to: "/core/finance/policy", icon: ShieldCheck },
      { label: "Budget Studio", to: "/core/finance/budget", icon: BarChart3 },
    ],
  },

  {
    title: "Intelligence",
    items: [{ label: "Finance Insights", to: "/core/finance/insights", icon: BarChart3 }],
  },
];

const ROUTE_LABELS: Record<string, string> = Object.fromEntries(
  SECTIONS.flatMap((section) =>
    section.items.map((item) => [item.to.replace("/core/finance/", ""), item.label]),
  ),
);

export default function FinanceWorkspaceLayout() {
  const session = useSession();
  const location = useLocation();

  const segments = location.pathname.replace("/core/finance", "").split("/").filter(Boolean);
  const breadcrumbs = segments.map((segment, index) => ({
    label: ROUTE_LABELS[segment] ?? segment.replace(/-/g, " "),
    path: `/core/finance/${segments.slice(0, index + 1).join("/")}`,
  }));

  return (
    <div className="min-h-screen bg-muted/30">
      <PageShell
        header={
          <div className="space-y-3">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/core">Core</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/core/finance">Finance</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {breadcrumbs.map((item, index) => (
                  <React.Fragment key={item.path}>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      {index === breadcrumbs.length - 1 ? (
                        <BreadcrumbPage className="capitalize">{item.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link to={item.path} className="capitalize">
                            {item.label}
                          </Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
            <PageHeader
              title="Zenvix Finance"
              subtitle="Operational + strategic money control center with approvals and audit."
            />
          </div>
        }
        left={
          <ScrollArea className="h-full max-h-[calc(100vh-120px)]">
            <div className="space-y-6 p-4">
              <WorkspacePanel>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p className="text-sm font-semibold text-foreground">Tenant: {session.tenant_id}</p>
                  <p>Role: {session.role}</p>
                  <p>Department: {session.department_id}</p>
                </div>
              </WorkspacePanel>
              {SECTIONS.map((section) => (
                <div key={section.title} className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {section.title}
                  </p>
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          end={item.to === "/core/finance"}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                              isActive
                                ? "bg-muted text-foreground"
                                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                            )
                          }
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        }
      >
        <Outlet />
      </PageShell>
    </div>
  );
}
