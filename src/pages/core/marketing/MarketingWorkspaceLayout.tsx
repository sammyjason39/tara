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
  Activity,
  BadgeDollarSign,
  BellRing,
  Cable,
  Calendar,
  Contact2,
  Database,
  Layers,
  Megaphone,
  MessageSquare,
  PlaySquare,
  ScrollText,
  Workflow,
} from "lucide-react";

type MenuItem = { label: string; to: string; icon: React.ElementType };
type MenuSection = { title: string; items: MenuItem[] };

const SECTIONS: MenuSection[] = [
  {
    title: "Operations",
    items: [
      { label: "Marketing Dashboard", to: "/core/marketing/dashboard", icon: Activity },
      { label: "Customer 360", to: "/core/marketing/customer-360", icon: Contact2 },
      { label: "Appointments", to: "/core/marketing/appointments", icon: Calendar },
      { label: "Campaign Service", to: "/core/marketing/campaigns", icon: Megaphone },
      { label: "Execution Desk", to: "/core/marketing/execution", icon: PlaySquare },
      { label: "Funnel Orchestrator", to: "/core/marketing/funnels", icon: Layers },
      { label: "Lead Capture", to: "/core/marketing/lead-capture", icon: Database },
      { label: "Nurture Studio", to: "/core/marketing/nurture", icon: Workflow },
      { label: "Unified Inbox", to: "/core/marketing/inbox", icon: MessageSquare },
    ],
  },
  {
    title: "Integrations",
    items: [
      { label: "Connected Accounts", to: "/core/marketing/accounts", icon: Cable },
      { label: "Analytics and ROI", to: "/core/marketing/analytics", icon: BadgeDollarSign },
    ],
  },
  {
    title: "Governance",
    items: [
      { label: "Alerts", to: "/core/marketing/alerts", icon: BellRing },
      { label: "Audit Log", to: "/core/marketing/audit", icon: ScrollText },
    ],
  },
];

const ROUTE_LABELS: Record<string, string> = Object.fromEntries(
  SECTIONS.flatMap((section) =>
    section.items.map((item) => [item.to.replace("/core/marketing/", ""), item.label]),
  ),
);

export default function MarketingWorkspaceLayout() {
  const session = useSession();
  const location = useLocation();

  const segments = location.pathname.replace("/core/marketing", "").split("/").filter(Boolean);
  const breadcrumbs = segments.map((segment, index) => ({
    label: ROUTE_LABELS[segment] ?? segment.replace(/-/g, " "),
    path: `/core/marketing/${segments.slice(0, index + 1).join("/")}`,
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
                    <Link to="/core/marketing">Marketing</Link>
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
              title="Marketing Workspace"
              subtitle="Demand generation with lead capture, scoring, automation, and real-time Sales handoff."
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
                          end={item.to === "/core/marketing"}
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
