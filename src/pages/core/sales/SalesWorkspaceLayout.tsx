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
  BadgeDollarSign,
  Bot,
  ClipboardList,
  Gauge,
  ListTodo,
  ShoppingBag,
  Rocket,
  ScrollText,
} from "lucide-react";

type MenuItem = { label: string; to: string; icon: React.ElementType };
type MenuSection = { title: string; items: MenuItem[] };

const SECTIONS: MenuSection[] = [
  {
    title: "Operations",
    items: [
      { label: "Sales Dashboard", to: "/core/sales/dashboard", icon: Gauge },
      { label: "Leads", to: "/core/sales/leads", icon: Rocket },
      { label: "Pipeline Board", to: "/core/sales/pipeline", icon: ClipboardList },
      { label: "Opportunities", to: "/core/sales/opps", icon: BadgeDollarSign },
      { label: "Quote Desk", to: "/core/sales/quotes", icon: Bot },
      { label: "Timeline", to: "/core/sales/timeline", icon: ListTodo },
      { label: "Sales Orders", to: "/core/sales/orders", icon: ShoppingBag },
    ],
  },
  {
    title: "Leadership",
    items: [
      { label: "Manager View", to: "/core/sales/manager", icon: Gauge },
      { label: "Executive Forecast", to: "/core/sales/forecast", icon: BadgeDollarSign },
      { label: "Audit Log", to: "/core/sales/audit", icon: ScrollText },
    ],
  },
];

const ROUTE_LABELS: Record<string, string> = Object.fromEntries(
  SECTIONS.flatMap((section) =>
    section.items.map((item) => [item.to.replace("/core/sales/", ""), item.label]),
  ),
);

export default function SalesWorkspaceLayout() {
  const session = useSession();
  const location = useLocation();

  const segments = location.pathname.replace("/core/sales", "").split("/").filter(Boolean);
  const breadcrumbs = segments.map((segment, index) => ({
    label: ROUTE_LABELS[segment] ?? segment.replace(/-/g, " "),
    path: `/core/sales/${segments.slice(0, index + 1).join("/")}`,
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
                    <Link to="/core/sales">Sales</Link>
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
              title="Sales Workspace"
              subtitle="Leads -> opportunities -> quote approvals -> orders with full CRM timeline and forecasting."
            />
          </div>
        }
        left={
          <ScrollArea className="h-full max-h-[calc(100vh-120px)]">
            <div className="space-y-6 p-4">
              <WorkspacePanel>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p className="text-sm font-semibold text-foreground">Tenant: {session.tenantId}</p>
                  <p>Role: {session.role}</p>
                  <p>Department: {session.departmentId}</p>
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
                          end={item.to === "/core/sales"}
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
