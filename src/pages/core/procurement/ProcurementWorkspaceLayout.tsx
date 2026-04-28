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
  AlertTriangle,
  ClipboardList,
  FileSignature,
  Handshake,
  Layers,
  LineChart,
  SendToBack,
  ShoppingCart,
} from "lucide-react";

type MenuItem = { label: string; to: string; icon: React.ElementType };
type MenuSection = { title: string; items: MenuItem[] };

const SECTIONS: MenuSection[] = [
  {
    title: "Operations",
    items: [
      { label: "Requisition Desk", to: "/core/procurement/prs", icon: ClipboardList },
      { label: "PO Release Desk", to: "/core/procurement/po-release", icon: ShoppingCart },
      { label: "Staff Schedule", to: "/core/procurement/schedule", icon: Handshake },
    ],
  },
  {
    title: "Supplier Network",
    items: [
      { label: "Supplier Desk", to: "/core/procurement/suppliers", icon: Handshake },
      { label: "Supplier Portal", to: "/core/procurement/portal", icon: SendToBack },
    ],
  },
  {
    title: "Governance",
    items: [
      { label: "Contract Desk", to: "/core/procurement/contracts", icon: FileSignature },
      { label: "Risk and Compliance", to: "/core/procurement/risk", icon: AlertTriangle },
    ],
  },
  {
    title: "Intelligence",
    items: [{ label: "Spend Intelligence", to: "/core/procurement/insights", icon: LineChart }],
  },
];

const ROUTE_LABELS: Record<string, string> = Object.fromEntries(
  SECTIONS.flatMap((section) =>
    section.items.map((item) => [item.to.replace("/core/procurement/", ""), item.label]),
  ),
);

export default function ProcurementWorkspaceLayout() {
  const session = useSession();
  const location = useLocation();

  const segments = location.pathname.replace("/core/procurement", "").split("/").filter(Boolean);
  const breadcrumbs = segments.map((segment, index) => ({
    label: ROUTE_LABELS[segment] ?? segment.replace(/-/g, " "),
    path: `/core/procurement/${segments.slice(0, index + 1).join("/")}`,
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
                    <Link to="/core/procurement">Procurement</Link>
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
              title="Procurement Workspace"
              subtitle="Source-to-pay operations with supplier intelligence, compliance controls, and release governance."
              icon={<Layers className="h-5 w-5 text-muted-foreground" />}
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
                          end={item.to === "/core/procurement"}
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
