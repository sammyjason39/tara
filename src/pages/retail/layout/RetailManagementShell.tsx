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
  Home,
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
      { label: "Back to Core", to: "/core", icon: Home },
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
      {
        label: "Commerce Channels",
        to: "/m/retail/management/ecommerce",
        icon: Globe,
      },
      { label: "Staff Roles", to: "/m/retail/management/staff", icon: Users },
      {
        label: "Shift Control",
        to: "/m/retail/management/shifts",
        icon: Clock,
      },
      {
        label: "Staff Schedule",
        to: "/m/retail/management/schedule",
        icon: Users,
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
                  <Link to="/core" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-all">CORE</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-slate-300" />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/m/retail/workspace" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-all">RETAIL HUB</Link>
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
          <div className="space-y-6 p-6">
            <WorkspacePanel className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl overflow-hidden relative">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-2xl -mr-12 -mt-12" />
              <div className="space-y-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10 shadow-inner">
                    {activeChannel ? (
                      <Globe className="w-5 h-5 text-sky-400" />
                    ) : (
                      <Store className="w-5 h-5 text-indigo-400" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 leading-none mb-1">
                      Active Business Unit
                    </span>
                    <p className="text-[13px] font-black italic tracking-tight truncate max-w-[140px]">
                      {activeStore?.name ||
                        activeChannel?.name ||
                        "Zenvix Retail Hub"}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/30">
                      Company
                    </span>
                    <span className="text-[10px] font-black truncate max-w-[100px] text-indigo-300 uppercase">
                      {activeStore?.name ? "Enterprise Hub" : "Zenvix Corp"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/30">
                      Branch
                    </span>
                    <span className="text-[10px] font-black text-sky-300 uppercase truncate max-w-[100px]">
                      {activeStore?.name || "Global Scope"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/30">
                      Operator
                    </span>
                    <span className="text-[10px] font-black text-white uppercase truncate max-w-[100px]">
                      {session?.user_id?.slice(0, 8)}
                    </span>
                  </div>
                </div>
              </div>
            </WorkspacePanel>

            <div className="space-y-8">
              {SECTIONS.map((section) => (
                <div key={section.title} className="space-y-3">
                  <p className="px-3 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
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
                              "flex items-center gap-4 rounded-2xl px-4 py-3 text-[13px] font-black italic transition-all duration-300",
                              isDisabled
                                ? "opacity-30 cursor-not-allowed pointer-events-none grayscale"
                                : isActive
                                  ? "bg-slate-900 text-white shadow-[0_10px_20px_rgba(0,0,0,0.1)] scale-[1.02]"
                                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
                            )
                          }
                        >
                          <Icon
                            className={cn(
                              "h-4 w-4",
                              !isDisabled && "text-indigo-500",
                            )}
                          />
                          <span className="tracking-tight uppercase">
                            {item.label}
                          </span>
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        }
        footer={
          <div className="pt-12 pb-8 border-t border-slate-100 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400 px-2 transition-opacity hover:opacity-100 opacity-60">
            <div className="flex flex-col gap-1">
              <p>© 2026 ZENVIX RETAIL SYSTEM • V1.0.X_PATCH_EST</p>
              <div className="flex items-center gap-4 text-slate-300">
                <span>IDENTITY: {activeStore?.name || "GLOBAL"}</span>
                <span>OS: WINDOWS_X64</span>
              </div>
            </div>
            <div className="flex items-center gap-8">
              <span className="flex items-center gap-2 group cursor-default">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                API_UPLINK:{" "}
                <span className="text-emerald-600 transition-colors group-hover:text-emerald-500">
                  ACTIVE
                </span>
              </span>
              <span className="flex items-center gap-2 group cursor-default">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                WEBSOCKET:{" "}
                <span className="text-emerald-600 transition-colors group-hover:text-emerald-500">
                  ENCRYPTED
                </span>
              </span>
              <span className="flex items-center gap-2 group cursor-default">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
                NODE_HEALTH:{" "}
                <span className="text-blue-600 transition-colors group-hover:text-blue-500">
                  NOMINAL
                </span>
              </span>
            </div>
          </div>
        }
      >
        {children}
      </PageShell>
    </div>
  );
};
