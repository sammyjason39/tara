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
  Wallet,
  HandCoins,
  LayoutGrid,
  Banknote,
  FileSpreadsheet,
  FileText,
  FileSignature,
  BookOpen,
  CreditCard,
  Receipt,
  Lock,
  ShieldCheck,
  BarChart3,
  GitBranch,
  Settings2,
  ChevronRight,
  Monitor,
  Target,
  Settings,
  Scale,
  RefreshCcw,
  Cpu
} from "lucide-react";
import { SidebarIdentityCard } from "@/core/ui/SidebarIdentityCard";
import { Button } from "@/components/ui/button";

type MenuItem = { label: string; to: string; icon: React.ElementType };
type MenuSection = { title: string; items: MenuItem[] };

const SECTIONS: MenuSection[] = [
  {
    title: "Intelligence",
    items: [
      { label: "CFO Dashboard", to: "/core/finance", icon: LayoutGrid },
      { label: "Financial Insights", to: "/core/finance/insights", icon: BarChart3 },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Money Desk", to: "/core/finance/moneydesk", icon: Banknote },
      { label: "Treasury Map", to: "/core/finance/treasury", icon: Wallet },
      { label: "Ledger Core", to: "/core/finance/ledger", icon: BookOpen },
      { label: "PayFlow Hub", to: "/core/finance/payflow", icon: RefreshCcw },
    ],
  },
  {
    title: "Transactions",
    items: [
      { label: "Receivables", to: "/core/finance/receivables", icon: HandCoins },
      { label: "Payables", to: "/core/finance/payables", icon: CreditCard },
      { label: "Invoice Capture", to: "/core/finance/invoices", icon: Receipt },
      { label: "JV Desk", to: "/core/finance/jv", icon: FileSignature },
    ],
  },
  {
    title: "Governance",
    items: [
      { label: "Period Close", to: "/core/finance/close", icon: Lock },
      { label: "Audit Vault", to: "/core/finance/audit", icon: ShieldCheck },
      { label: "Policy Manager", to: "/core/finance/policy", icon: Scale },
      { label: "Staff Schedule", to: "/core/finance/schedule", icon: Settings2 },
      { label: "Administration", to: "/core/finance/admin", icon: Cpu },
    ],
  },
];

const ROUTE_LABELS: Record<string, string> = Object.fromEntries(
  SECTIONS.flatMap((section) =>
    section.items.map((item) => [item.to.replace("/core/finance/", ""), item.label]),
  ),
);

export default function FinanceWorkspaceLayout() {
  const session = useSession();
  const location = useLocation();

  const segments = location.pathname.replace("/core/finance", "").split("/").filter(Boolean);
  const breadcrumbs = segments.map((segment, index) => ({
    label: ROUTE_LABELS[segment] ?? segment.replace(/-/g, " "),
    path: `/core/finance/${segments.slice(0, index + 1).join("/")}`,
  }));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-emerald-500/30 overflow-hidden flex flex-col">
      <PageShell
        header={
          <div className="space-y-6 px-4 py-4">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/core" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-emerald-600 transition-all flex items-center gap-2">
                       <Monitor className="h-3 w-3" /> CORE
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-slate-300" />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/core/finance" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-emerald-600 transition-all">FINANCE ENGINE</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {breadcrumbs.map((item, index) => (
                  <React.Fragment key={item.path}>
                    <BreadcrumbSeparator className="text-slate-300" />
                    <BreadcrumbItem>
                      {index === breadcrumbs.length - 1 ? (
                        <BreadcrumbPage className="text-[10px] font-black uppercase tracking-widest text-emerald-600 italic">{item.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link to={item.path} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-emerald-600 transition-all">
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
                  <div className="h-14 w-14 bg-emerald-600 rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-emerald-600/20 group hover:rotate-12 transition-transform duration-500">
                     <Wallet className="h-8 w-8 text-white" />
                  </div>
                  <div>
                     <h2 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase italic leading-none">Finance Command</h2>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] leading-relaxed italic mt-1.5 flex items-center gap-2">
                        <Target className="h-3.5 w-3.5 text-emerald-500" /> Strategic Capital & Fiscal Intelligence Matrix
                     </p>
                  </div>
               </div>
               
               <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                     <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fiscal Node Verified</span>
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
            <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />
            
            <ScrollArea className="flex-1 relative z-10">
              <div className="p-8 space-y-12">
                <SidebarIdentityCard />

                {SECTIONS.map((section) => (
                  <div key={section.title} className="space-y-6">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 pl-4 border-l-2 border-emerald-600/20">
                      {section.title}
                    </p>
                    <div className="space-y-1">
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.to || (item.to === "/core/finance" && location.pathname === "/core/finance/");
                        return (
                          <NavLink
                            key={item.to}
                            to={item.to}
                            className={cn(
                                "group flex items-center gap-4 rounded-2xl px-5 py-4 text-[11px] font-black uppercase tracking-widest transition-all duration-500 relative overflow-hidden",
                                isActive
                                  ? "bg-white dark:bg-slate-800 text-emerald-600 shadow-xl shadow-emerald-500/10 translate-x-3 border-l-4 border-l-emerald-600"
                                  : "text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50 hover:text-emerald-500 hover:translate-x-2",
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
            
            {/* Health Pulse Footer */}
            <div className="p-8 border-t border-slate-200/50 dark:border-slate-800/50 bg-white/20 dark:bg-slate-900/20 backdrop-blur-2xl relative z-10">
               <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 group hover:shadow-xl transition-all duration-500">
                  <div className="flex items-center gap-4">
                     <div className="relative">
                        <div className="h-3 w-3 rounded-full bg-emerald-500 animate-ping absolute inset-0 opacity-40" />
                        <div className="h-3 w-3 rounded-full bg-emerald-500 relative z-10 shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
                     </div>
                     <div className="space-y-0.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white leading-none">Fiscal Pulse</p>
                        <p className="text-[8px] font-black uppercase tracking-widest text-emerald-500 animate-pulse italic leading-none">Synced & Secure</p>
                     </div>
                  </div>
                  <Scale className="h-5 w-5 text-slate-300 group-hover:text-emerald-600 transition-colors" />
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
