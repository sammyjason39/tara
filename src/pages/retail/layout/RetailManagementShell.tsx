import * as React from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
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
  BarChart3,
  Store,
  Users,
  Clock,
  Globe,
  PackageCheck,
  Tag,
  Eye,
  MonitorDot,
  FileText,
  Layout,
} from "lucide-react";
import { useRetail } from "../context/RetailContext";
import { RetailModeSwitchControl } from "../components/RetailModeSwitchControl";
import { RetailContextSwitcher } from "../components/RetailContextSwitcher";

type MenuItem = { label: string; to: string; icon: React.ElementType };
type MenuSection = { title: string; items: MenuItem[] };

const SECTIONS: MenuSection[] = [
  {
    title: "Overview",
    items: [
      { label: "Retail Home", to: "/m/retail/workspace", icon: Layout },
      {
        label: "Command Center",
        to: "/m/retail/management/dashboard",
        icon: BarChart3,
      },
    ],
  },
  {
    title: "Governance",
    items: [
      {
        label: "Store Profile",
        to: "/m/retail/management/profile",
        icon: Store,
      },
      { label: "Staff Roles", to: "/m/retail/management/staff", icon: Users },
      {
        label: "Shift Control",
        to: "/m/retail/management/shifts",
        icon: Clock,
      },
      {
        label: "Commerce Channels",
        to: "/m/retail/management/ecommerce",
        icon: Globe,
      },
    ],
  },
  {
    title: "Operations Hub",
    items: [
      {
        label: "Fulfillment Hub",
        to: "/m/retail/management/orders",
        icon: PackageCheck,
      },
      { label: "Pricing Desk", to: "/m/retail/management/pricing", icon: Tag },
      {
        label: "Inventory Visibility",
        to: "/m/retail/management/inventory",
        icon: Eye,
      },
      {
        label: "Device Control",
        to: "/m/retail/management/devices",
        icon: MonitorDot,
      },
      {
        label: "Audit Ledger",
        to: "/m/retail/management/audit",
        icon: FileText,
      },
    ],
  },
];

const ROUTE_LABELS: Record<string, string> = Object.fromEntries(
  SECTIONS.flatMap((section) =>
    section.items.map((item) => [
      item.to.replace("/m/retail/", ""),
      item.label,
    ]),
  ),
);

export const RetailManagementShell: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const session = useSession();
  const { activeStore, activeChannel } = useRetail();
  const isConfigured = !!activeStore || !!activeChannel;
  const location = useLocation();

  const segments = location.pathname
    .replace("/m/retail", "")
    .split("/")
    .filter(Boolean);
  const breadcrumbs = segments.map((segment, index) => ({
    label: ROUTE_LABELS[segment] ?? segment.replace(/-/g, " "),
    path: `/m/retail/${segments.slice(0, index + 1).join("/")}`,
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
                    <Link to="/m/retail/workspace">Retail</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {breadcrumbs.map((item, index) => (
                  <React.Fragment key={item.path}>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      {index === breadcrumbs.length - 1 ? (
                        <BreadcrumbPage className="capitalize">
                          {item.label}
                        </BreadcrumbPage>
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
            <div className="flex justify-between items-center bg-white p-4 rounded-[1.5rem] border-2 border-slate-100 shadow-sm">
              <PageHeader
                title="Retail Management"
                subtitle="Enterprise-grade multi-store governance and control."
              />
              <div className="flex items-center gap-4">
                <RetailContextSwitcher />
                <div className="h-8 w-[1px] bg-slate-200" />
                <RetailModeSwitchControl />
              </div>
            </div>
          </div>
        }
        left={
          <ScrollArea className="h-full max-h-[calc(100vh-120px)]">
            <div className="space-y-6 p-4">
              <WorkspacePanel>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p className="text-sm font-semibold text-foreground italic flex items-center gap-2">
                    {activeChannel ? (
                      <Globe className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <Store className="w-4 h-4 text-blue-600" />
                    )}
                    {activeStore?.name ||
                      activeChannel?.name ||
                      "No Store Selected"}
                  </p>
                  <p className="font-bold uppercase tracking-tighter text-[10px]">
                    Context: {session.tenantId}
                  </p>
                </div>
              </WorkspacePanel>
              {SECTIONS.map((section) => (
                <div key={section.title} className="space-y-2">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                    {section.title}
                  </p>
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isDisabled =
                        !isConfigured && item.to !== "/m/retail/workspace";
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          end={item.to === "/m/retail/workspace"}
                          onClick={(e) => {
                            if (isDisabled) e.preventDefault();
                          }}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition-all",
                              isDisabled
                                ? "opacity-40 cursor-not-allowed pointer-events-none grayscale"
                                : isActive
                                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                                  : "text-slate-500 hover:bg-blue-50 hover:text-blue-600",
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
        {children}
      </PageShell>
    </div>
  );
};
