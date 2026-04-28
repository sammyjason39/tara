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
import { ActivitySquare, Laptop, Network } from "lucide-react";

type MenuItem = { label: string; to: string; icon: React.ElementType };
type MenuSection = { title: string; items: MenuItem[] };

const SECTIONS: MenuSection[] = [
  {
    title: "Accounts",
    items: [
      { label: "Accounts", to: "/core/it/accounts", icon: ActivitySquare },
      { label: "Staff Schedule", to: "/core/it/schedule", icon: Laptop },
    ],
  },
  {
    title: "Assets",
    items: [{ label: "Devices", to: "/core/it/devices", icon: Laptop }],
  },
  {
    title: "Health",
    items: [{ label: "System Health", to: "/core/it/health", icon: Network }],
  },
];

export default function ITWorkspaceLayout() {
  const session = useSession();
  const location = useLocation();

  const segments = location.pathname.replace("/core/it", "").split("/").filter(Boolean);
  const breadcrumbs = segments.map((segment, index) => ({
    label: segment.replace(/-/g, " "),
    path: `/core/it/${segments.slice(0, index + 1).join("/")}`,
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
                    <Link to="/core/it">IT</Link>
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
              title="IT Workspace"
              subtitle="Account provisioning, device mapping, and LAN health monitoring."
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
                          end={item.to === "/core/it"}
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
