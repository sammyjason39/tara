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
  BreadcrumbAction,
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
  FolderOpen,
  Layers,
  Megaphone,
  MessageSquare,
  PlaySquare,
  ScrollText,
  Shield,
  Workflow,
  Rocket,
  ShieldCheck,
  Zap,
  Target,
  ChevronRight,
  Monitor,
  ActivitySquare,
  Network,
  Cpu,
  Bot,
  Search,
  Settings
} from "lucide-react";

type MenuItem = { label: string; to: string; icon: React.ElementType };
type MenuSection = { title: string; items: MenuItem[] };

const SECTIONS: MenuSection[] = [
  {
    title: "Intelligence",
    items: [
      { label: "Marketing Command", to: "/core/marketing/dashboard", icon: ActivitySquare },
      { label: "Analytics & ROI", to: "/core/marketing/analytics", icon: BadgeDollarSign },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Customer 360", to: "/core/marketing/customer-360", icon: Contact2 },
      { label: "Campaign Studio", to: "/core/marketing/campaigns", icon: Megaphone },
      { label: "Funnel Matrix", to: "/core/marketing/funnels", icon: Layers },
      { label: "Lead Ingestion", to: "/core/marketing/lead-capture", icon: Database },
      { label: "Staff Schedule", to: "/core/marketing/schedule", icon: Users },
    ],
  },
  {
    title: "Engagement",
    items: [
      { label: "Nurture Studio", to: "/core/marketing/nurture", icon: Workflow },
      { label: "Neural Inbox", to: "/core/marketing/inbox", icon: MessageSquare },
      { label: "Execution Desk", to: "/core/marketing/execution", icon: PlaySquare },
      { label: "Scheduler", to: "/core/marketing/appointments", icon: Calendar },
    ],
  },
  {
    title: "Governance",
    items: [
      { label: "Connected Clouds", to: "/core/marketing/connected-accounts", icon: Cable },
      { label: "Tactical Alerts", to: "/core/marketing/alerts", icon: BellRing },
      { label: "Asset Vault", to: "/core/marketing/creative-library", icon: FolderOpen },
      { label: "Brand Shield", to: "/core/marketing/white-label", icon: Shield },
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-indigo-500/30 overflow-hidden flex flex-col">
      <PageShell
        header={
          <div className="space-y-6 px-4 py-4">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/core" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-all flex items-center gap-2">
                       <Monitor className="h-3 w-3" /> CORE
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-slate-300" />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/core/marketing" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-all">MARKETING ENGINE</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {breadcrumbs.map((item, index) => (
                  <React.Fragment key={item.path}>
                    <BreadcrumbSeparator className="text-slate-300" />
                    <BreadcrumbItem>
                      {index === breadcrumbs.length - 1 ? (
                        <BreadcrumbPage className="text-[10px] font-black uppercase tracking-widest text-indigo-600 italic">{item.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link to={item.path} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-all">
                            {item.label}
                          </Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
            
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-6">
                  <div className="h-14 w-14 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-indigo-600/20 group hover:rotate-12 transition-transform duration-500">
                     <Megaphone className="h-8 w-8 text-white" />
                  </div>
                  <div>
                     <h2 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase italic leading-none">Marketing Command</h2>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] leading-relaxed italic mt-1.5 flex items-center gap-2">
                        <ActivitySquare className="h-3.5 w-3.5 text-indigo-500" /> Omnichannel Growth & Intelligence Matrix
                     </p>
                  </div>
               </div>
               
               <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                     <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Node Verified</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
                     <Settings className="h-5 w-5 text-slate-400" />
                  </Button>
               </div>
            </div>
          </div>
        }
        left={
          <div className="h-full flex flex-col bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border-r border-slate-200/50 dark:border-slate-800/50 relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
            
            <ScrollArea className="flex-1 relative z-10">
              <div className="p-8 space-y-12">
                {/* Tactical Status Card */}
                <div className="p-8 rounded-[2.5rem] bg-indigo-900 text-white shadow-2xl shadow-indigo-900/20 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 h-32 w-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-1000" />
                  <div className="relative z-10 space-y-4">
                     <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                           <ShieldCheck className="h-5 w-5 text-white" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 italic">Identity Verified</p>
                     </div>
                     <div className="space-y-1">
                        <p className="text-base font-black tracking-tighter truncate uppercase italic">{session.tenant_id}</p>
                        <Badge className="bg-indigo-600 border-none text-[8px] font-black px-3 py-1 rounded-full text-white uppercase tracking-widest shadow-lg">
                           {session.role} CORE
                        </Badge>
                     </div>
                  </div>
                </div>

                {SECTIONS.map((section) => (
                  <div key={section.title} className="space-y-6">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 pl-4 border-l-2 border-indigo-600/20">
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
                                "group flex items-center gap-4 rounded-2xl px-5 py-4 text-[11px] font-black uppercase tracking-widest transition-all duration-500 relative overflow-hidden",
                                isActive
                                  ? "bg-white dark:bg-slate-800 text-indigo-600 shadow-xl shadow-indigo-500/10 translate-x-3 border-l-4 border-l-indigo-600"
                                  : "text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50 hover:text-indigo-500 hover:translate-x-2",
                              )
                            }
                          >
                            <Icon className={cn("h-5 w-5 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6")} />
                            <span className="flex-1 truncate">{item.label}</span>
                            <ChevronRight className={cn("h-3 w-3 transition-all duration-500 opacity-0 group-hover:opacity-100", location.pathname === item.to ? "opacity-100" : "")} />
                          </NavLink>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            {/* Health Pulse Footer */}
            <div className="p-8 border-t border-slate-200/50 dark:border-slate-800/50 bg-white/20 dark:bg-slate-900/20 backdrop-blur-2xl relative z-10">
               <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 group hover:shadow-xl transition-all duration-500">
                  <div className="flex items-center gap-4">
                     <div className="relative">
                        <div className="h-3 w-3 rounded-full bg-emerald-500 animate-ping absolute inset-0 opacity-40" />
                        <div className="h-3 w-3 rounded-full bg-emerald-500 relative z-10 shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
                     </div>
                     <div className="space-y-0.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white leading-none">Intelligence Hub</p>
                        <p className="text-[8px] font-black uppercase tracking-widest text-emerald-500 animate-pulse italic leading-none">Synced & Secure</p>
                     </div>
                  </div>
                  <Target className="h-5 w-5 text-slate-300 group-hover:text-indigo-600 transition-colors" />
               </div>
            </div>
          </div>
        }
      >
        <div className="p-0 h-full overflow-y-auto bg-slate-50 dark:bg-slate-950">
           <Outlet />
        </div>
      </PageShell>
    </div>
  );
}
