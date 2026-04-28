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
  LayoutDashboard,
  Wallet,
  Activity,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  Target
} from "lucide-react";

type MenuItem = { label: string; to: string; icon: React.ElementType };
type MenuSection = { title: string; items: MenuItem[] };

const SECTIONS: MenuSection[] = [
  {
    title: "Intelligence",
    items: [
      { label: "Sales Overview", to: "/core/sales/overview", icon: LayoutDashboard },
      { label: "Executive Forecast", to: "/core/sales/forecast", icon: TrendingUp },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Command Center", to: "/core/sales/dashboard", icon: Gauge },
      { label: "Lead Injection", to: "/core/sales/leads", icon: Rocket },
      { label: "Pipeline Matrix", to: "/core/sales/pipeline", icon: ClipboardList },
      { label: "Opportunity Desk", to: "/core/sales/opps", icon: BadgeDollarSign },
      { label: "Staff Schedule", to: "/core/sales/schedule", icon: Users },
    ],
  },
  {
    title: "Fulfillment",
    items: [
      { label: "Quote Approval", to: "/core/sales/quotes", icon: Bot },
      { label: "Order Desk", to: "/core/sales/orders", icon: ShoppingBag },
      { label: "Neural Timeline", to: "/core/sales/timeline", icon: ListTodo },
    ],
  },
  {
    title: "Leadership",
    items: [
      { label: "Manager Control", to: "/core/sales/manager", icon: ShieldCheck },
      { label: "Yield Engine", to: "/core/sales/incentives", icon: Wallet },
      { label: "Compliance Log", to: "/core/sales/audit", icon: ScrollText },
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-indigo-500/30">
      <PageShell
        header={
          <div className="space-y-4 px-2">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/core" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors">Core</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-slate-300" />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/core/sales" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors">Sales Intelligence</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {breadcrumbs.map((item, index) => (
                  <React.Fragment key={item.path}>
                    <BreadcrumbSeparator className="text-slate-300" />
                    <BreadcrumbItem>
                      {index === breadcrumbs.length - 1 ? (
                        <BreadcrumbPage className="text-[10px] font-black uppercase tracking-widest text-indigo-600">{item.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link to={item.path} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors">
                            {item.label}
                          </Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
            <div className="flex items-center gap-4">
               <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                  <Activity className="h-6 w-6 text-white" />
               </div>
               <div>
                  <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Sales Workspace</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">End-to-End Strategic Revenue Orchestration</p>
               </div>
            </div>
          </div>
        }
        left={
          <div className="h-full flex flex-col bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-800/50">
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-10">
                {/* Tactical Status Card */}
                <div className="p-6 rounded-[2rem] bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 h-20 w-20 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl group-hover:scale-150 transition-transform duration-1000" />
                  <div className="relative z-10 space-y-3">
                     <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60 italic">Node Status</p>
                     <div className="space-y-1">
                        <p className="text-sm font-black tracking-tight">{session.tenant_id}</p>
                        <Badge variant="outline" className="bg-white/20 border-none text-[8px] font-black px-2 py-0 h-4 text-white uppercase tracking-widest">
                           {session.role}
                        </Badge>
                     </div>
                  </div>
                </div>

                {SECTIONS.map((section) => (
                  <div key={section.title} className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 pl-4">
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
                                "group flex items-center gap-4 rounded-2xl px-4 py-3 text-[11px] font-black uppercase tracking-widest transition-all duration-300",
                                isActive
                                  ? "bg-white dark:bg-slate-800 text-indigo-600 shadow-lg shadow-indigo-500/5 translate-x-1"
                                  : "text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50 hover:text-indigo-500 hover:translate-x-1",
                              )
                            }
                          >
                            <Icon className={cn("h-4 w-4 transition-transform group-hover:scale-110")} />
                            {item.label}
                          </NavLink>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            {/* Health Pulse Footer */}
            <div className="p-6 border-t border-slate-200/50 dark:border-slate-800/50 bg-white/20 dark:bg-slate-900/20 backdrop-blur-md">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                     <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Telemetry Syncing</p>
                  </div>
                  <Target className="h-4 w-4 text-slate-300" />
               </div>
            </div>
          </div>
        }
      >
        <div className="p-0 lg:p-0">
           <Outlet />
        </div>
      </PageShell>
    </div>
  );
}
