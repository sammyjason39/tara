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
import { PageShell } from "@/core/ui/PageShell";
import { useSession } from "@/core/security/session";
import { cn } from "@/lib/utils";
import { 
  ChevronRight, 
  Monitor, 
  Target, 
  Settings,
  LucideIcon
} from "lucide-react";
import { SidebarIdentityCard } from "@/core/ui/SidebarIdentityCard";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

export type MenuItem = { label: string; to: string; icon: LucideIcon };
export type MenuSection = { title: string; items: MenuItem[] };

interface DepartmentWorkspaceLayoutProps {
  title: string;
  subtitle: string;
  headerIcon: LucideIcon;
  accentColor: string; // e.g., 'emerald', 'rose', 'amber', 'orange', 'blue', 'purple', 'indigo'
  engineName: string; // e.g., 'FINANCE ENGINE'
  pulseLabel: string; // e.g., 'Fiscal Pulse'
  pulseIcon: LucideIcon;
  sections: MenuSection[];
  routeLabels: Record<string, string>;
  basePath: string; // e.g., '/core/finance'
}

export default function DepartmentWorkspaceLayout({
  title,
  subtitle,
  headerIcon: HeaderIcon,
  accentColor,
  engineName,
  pulseLabel,
  pulseIcon: PulseIcon,
  sections,
  routeLabels,
  basePath,
}: DepartmentWorkspaceLayoutProps) {
  const session = useSession();
  const location = useLocation();

  React.useEffect(() => {
    console.log(`[DepartmentWorkspaceLayout:${engineName}] Mounted`, {
      path: location.pathname,
      tenant_id: session.tenant_id,
      location_id: session.location_id,
      role: session.role,
      permissions: session.permissions?.length,
    });
  }, [engineName, location.pathname, session]);

  const segments = location.pathname.replace(basePath, "").split("/").filter(Boolean);
  const breadcrumbs = segments.map((segment, index) => ({
    label: routeLabels[segment] ?? segment.replace(/-/g, " "),
    path: `${basePath}/${segments.slice(0, index + 1).join("/")}`,
  }));

  // Define accent color classes
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-600 bg-emerald-600 shadow-emerald-600/20 border-l-emerald-600 border-emerald-600/20 hover:text-emerald-500 from-emerald-500/5",
    rose: "text-rose-600 bg-rose-600 shadow-rose-600/20 border-l-rose-600 border-rose-600/20 hover:text-rose-500 from-rose-500/5",
    amber: "text-amber-600 bg-amber-600 shadow-amber-600/20 border-l-amber-600 border-amber-600/20 hover:text-amber-500 from-amber-500/5",
    orange: "text-orange-600 bg-orange-600 shadow-orange-600/20 border-l-orange-600 border-orange-600/20 hover:text-orange-500 from-orange-500/5",
    blue: "text-blue-600 bg-blue-600 shadow-blue-600/20 border-l-blue-600 border-blue-600/20 hover:text-blue-500 from-blue-500/5",
    purple: "text-purple-600 bg-purple-600 shadow-purple-600/20 border-l-purple-600 border-purple-600/20 hover:text-purple-500 from-purple-500/5",
    indigo: "text-indigo-600 bg-indigo-600 shadow-indigo-600/20 border-l-indigo-600 border-indigo-600/20 hover:text-indigo-500 from-indigo-500/5",
    slate: "text-slate-600 bg-slate-600 shadow-slate-600/20 border-l-slate-600 border-slate-600/20 hover:text-slate-500 from-slate-500/5",
  };

  const c = colorMap[accentColor] || colorMap.indigo;
  const [textC, bgC, shadowC, borderLC, borderC20, hoverTextC, fromC5] = c.split(" ");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans overflow-hidden flex flex-col">
      <PageShell
        header={
          <div className="space-y-6 px-6 py-6">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/core" className={cn("text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all flex items-center gap-2", `hover:${textC}`)}>
                       <Monitor className="h-3 w-3" /> CORE
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-slate-300" />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to={basePath} className={cn("text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all", `hover:${textC}`)}>{engineName}</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {breadcrumbs.map((item, index) => (
                  <React.Fragment key={item.path}>
                    <BreadcrumbSeparator className="text-slate-300" />
                    <BreadcrumbItem>
                      {index === breadcrumbs.length - 1 ? (
                        <BreadcrumbPage className={cn("text-[10px] font-black uppercase tracking-widest italic", textC)}>{item.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link to={item.path} className={cn("text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all", `hover:${textC}`)}>
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
                  <div className={cn("h-14 w-14 rounded-[1.5rem] flex items-center justify-center shadow-2xl group hover:rotate-12 transition-transform duration-500", bgC, shadowC)}>
                     <HeaderIcon className="h-8 w-8 text-white" />
                  </div>
                  <div>
                     <h2 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase italic leading-none">{title}</h2>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] leading-relaxed italic mt-1.5 flex items-center gap-2">
                        <Target className={cn("h-3.5 w-3.5", textC)} /> {subtitle}
                     </p>
                  </div>
               </div>
               
               <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                     <span className={cn("h-2 w-2 rounded-full animate-pulse", bgC)} />
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
            <div className={cn("absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b pointer-events-none", fromC5)} />
            
            <ScrollArea className="flex-1 relative z-10">
              <div className="p-6 space-y-10">
                <SidebarIdentityCard />

                {sections.map((section) => (
                  <div key={section.title} className="space-y-6">
                    <p className={cn("text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 pl-4 border-l-2", borderC20)}>
                      {section.title}
                    </p>
                    <div className="space-y-1">
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.to || (item.to === basePath && location.pathname === `${basePath}/`);
                        return (
                          <NavLink
                            key={item.to}
                            to={item.to}
                            className={cn(
                                "group flex items-center gap-4 rounded-2xl px-4 py-3.5 text-[11px] font-black uppercase tracking-widest transition-all duration-500 relative overflow-hidden",
                                isActive
                                  ? cn("bg-white dark:bg-slate-800 shadow-xl translate-x-3 border-l-4", textC, shadowC, borderLC)
                                  : cn("text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50 hover:translate-x-2", hoverTextC),
                              )
                            }
                          >
                            <Icon className={cn("h-5 w-5 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6")} />
                            <span className="flex-1 truncate">{item.label}</span>
                            <ChevronRight className={cn("h-3 w-3 transition-all duration-500 opacity-0 group-hover:opacity-100", isActive ? "opacity-100" : "")} />
                          </NavLink>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            <div className="p-6 border-t border-slate-200/50 dark:border-slate-800/50 bg-white/20 dark:bg-slate-900/20 backdrop-blur-2xl relative z-10">
               <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 group hover:shadow-xl transition-all duration-500">
                  <div className="flex items-center gap-4">
                     <div className="relative">
                        <div className={cn("h-3 w-3 rounded-full animate-ping absolute inset-0 opacity-40", bgC)} />
                        <div className={cn("h-3 w-3 rounded-full relative z-10 shadow-lg", bgC)} />
                     </div>
                     <div className="space-y-0.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white leading-none">{pulseLabel}</p>
                        <p className={cn("text-[8px] font-black uppercase tracking-widest animate-pulse italic leading-none", textC)}>Synced & Secure</p>
                     </div>
                  </div>
                  <PulseIcon className={cn("h-5 w-5 text-slate-300 transition-colors", `group-hover:${textC}`)} />
               </div>
            </div>
          </div>
        }
      >
        <div className="p-0 h-full overflow-y-auto bg-slate-50 dark:bg-slate-950">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </PageShell>
    </div>
  );
}
