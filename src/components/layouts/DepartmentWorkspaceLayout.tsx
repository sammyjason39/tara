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
  headerActions?: React.ReactNode;
  children?: React.ReactNode;
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
  headerActions,
  children,
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
  const breadcrumbs = (Array.isArray(segments) ? segments : []).map((segment, index) => ({
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
          <div className="space-y-4 px-4 md:px-10 py-4 md:py-8 border-b border-white/5 bg-white/5 backdrop-blur-md">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/core" className={cn("text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 transition-all flex items-center gap-2", `hover:${textC}`)}>
                       <Monitor className="h-3 w-3" /> CORE_SYSTEM
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-slate-800" />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to={basePath} className={cn("text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 transition-all", `hover:${textC}`)}>{engineName}</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {(Array.isArray(breadcrumbs) ? breadcrumbs : []).map((item, index) => (
                  <React.Fragment key={item.path}>
                    <BreadcrumbSeparator className="text-slate-800" />
                    <BreadcrumbItem>
                      {index === breadcrumbs.length - 1 ? (
                        <BreadcrumbPage className={cn("text-[9px] font-black uppercase tracking-[0.2em] italic", textC)}>{item.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link to={item.path} className={cn("text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 transition-all", `hover:${textC}`)}>
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
               <div className="flex items-center gap-4 md:gap-8">
                  <div className={cn("h-12 w-12 md:h-20 md:w-20 rounded-2xl md:rounded-[2.5rem] flex items-center justify-center shadow-2xl group hover:rotate-12 transition-all duration-500 border border-white/10", bgC, shadowC)}>
                     <HeaderIcon className="h-6 w-6 md:h-10 md:w-10 text-white" />
                  </div>
                  <div>
                     <h2 className="text-xl md:text-5xl font-black tracking-tighter text-slate-900 dark:text-white uppercase italic leading-none">{title}</h2>
                     <p className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] leading-relaxed italic mt-2 md:mt-4 flex items-center gap-2">
                        <Target className={cn("h-3 w-3 md:h-4 md:w-4", textC)} /> {subtitle}
                     </p>
                  </div>
               </div>
               
               <div className="flex items-center gap-2 md:gap-4">
                  {headerActions}
                  <div className="hidden sm:flex items-center gap-3 bg-white dark:bg-slate-900/50 px-4 py-2.5 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
                     <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse", bgC)} />
                     <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Telemetry Active</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-10 w-10 md:h-14 md:w-14 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all">
                     <Settings className="h-5 w-5 md:h-6 md:w-6 text-slate-500" />
                  </Button>
               </div>
            </div>
          </div>
        }
        left={
          <div className="h-full flex flex-col bg-white/40 dark:bg-slate-950/80 backdrop-blur-2xl border-r border-slate-200/50 dark:border-white/5 relative overflow-hidden w-64 md:w-80">
            <div className={cn("absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b pointer-events-none opacity-20", fromC5)} />
            
            <ScrollArea className="flex-1 relative z-10">
              <div className="p-4 md:p-8 space-y-12">
                <SidebarIdentityCard />

                {(Array.isArray(sections) ? sections : []).map((section) => (
                  <div key={section.title} className="space-y-6">
                    <p className={cn("text-[9px] font-black uppercase tracking-[0.5em] text-slate-500 pl-4 border-l-2", borderC20)}>
                      {section.title}
                    </p>
                    <div className="space-y-1.5">
                      {(Array.isArray(section.items) ? section.items : []).map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.to || (item.to === basePath && location.pathname === `${basePath}/`);
                        return (
                          <NavLink
                            key={item.to}
                            to={item.to}
                            className={cn(
                                "group flex items-center gap-4 rounded-2xl px-4 py-4 text-[10px] font-black uppercase tracking-widest transition-all duration-500 relative overflow-hidden",
                                isActive
                                  ? cn("bg-white dark:bg-white/10 shadow-2xl translate-x-4 border-l-4", textC, shadowC, borderLC)
                                  : cn("text-slate-500 hover:bg-white/50 dark:hover:bg-white/5 hover:translate-x-2", hoverTextC),
                              )
                            }
                          >
                            <Icon className={cn("h-5 w-5 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6")} />
                            <span className="flex-1 truncate tracking-[0.1em]">{item.label}</span>
                            <ChevronRight className={cn("h-3 w-3 transition-all duration-500 opacity-0 group-hover:opacity-100", isActive ? "opacity-100" : "")} />
                          </NavLink>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            <div className="p-6 border-t border-slate-200/50 dark:border-white/5 bg-white/20 dark:bg-slate-900/40 backdrop-blur-3xl relative z-10">
               <div className="flex items-center justify-between p-5 rounded-[1.5rem] bg-white dark:bg-white/5 shadow-xl border border-slate-100 dark:border-white/5 group hover:shadow-2xl transition-all duration-500 cursor-pointer">
                  <div className="flex items-center gap-4">
                     <div className="relative">
                        <div className={cn("h-2.5 w-2.5 rounded-full animate-ping absolute inset-0 opacity-40", bgC)} />
                        <div className={cn("h-2.5 w-2.5 rounded-full relative z-10 shadow-lg", bgC)} />
                     </div>
                     <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white leading-none">{pulseLabel}</p>
                        <p className={cn("text-[8px] font-black uppercase tracking-[0.2em] animate-pulse italic leading-none", textC)}>Operational</p>
                     </div>
                  </div>
                  <PulseIcon className={cn("h-5 w-5 text-slate-500 transition-colors", `group-hover:${textC}`)} />
               </div>
            </div>
          </div>
        }
      >
        <div className="p-0 h-full overflow-y-auto bg-slate-50 dark:bg-slate-950">
          <ErrorBoundary>
            {children || <Outlet />}
          </ErrorBoundary>
        </div>
      </PageShell>
    </div>
  );
}
