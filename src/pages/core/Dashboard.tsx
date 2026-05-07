import { useNavigate } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as React from "react";
import { 
  RefreshCw, 
  Search, 
  Rocket, 
  LayoutDashboard,
  Bell,
  Briefcase
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/core/security/session";
import { adminService } from "@/core/services";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OperationsView } from "@/components/shared/OperationsView";
import { PageShell } from "@/core/ui/PageShell";
import { PageHeader } from "@/core/ui/PageHeader";
import { ExecutiveKpiRow } from "@/components/dashboard/ExecutiveKpiRow";
import { FinancialTrajectoryChart } from "@/components/dashboard/FinancialTrajectoryChart";
import { ArApWaterfallChart } from "@/components/dashboard/ArApWaterfallChart";
import { CashPositionWidget } from "@/components/dashboard/CashPositionWidget";
import { BranchLeaderboard } from "@/components/dashboard/BranchLeaderboard";
import { HrCapitalWidget } from "@/components/dashboard/HrCapitalWidget";
import { PayrollBurnTrendChart } from "@/components/dashboard/PayrollBurnTrendChart";
import { AttendanceGauge } from "@/components/dashboard/AttendanceGauge";
import { InventoryHealthWidget } from "@/components/dashboard/InventoryHealthWidget";
import { ProcurementPipelineWidget } from "@/components/dashboard/ProcurementPipelineWidget";
import { SalesPipelineFunnel } from "@/components/dashboard/SalesPipelineFunnel";
import { AlertsRiskMatrix } from "@/components/dashboard/AlertsRiskMatrix";
import { MarketingRoiChart } from "@/components/dashboard/MarketingRoiChart";
import { GlobalEventFeed } from "@/components/dashboard/GlobalEventFeed";
import { StrategicScorecard } from "@/components/dashboard/StrategicScorecard";
import { SystemHealthDonut } from "@/components/dashboard/SystemHealthDonut";
import { ComplianceHeatmap } from "@/components/dashboard/ComplianceHeatmap";
import { DashboardPayload } from "@/types/dashboard.types";
import { StrategicExpansionModal } from "@/components/ui/StrategicExpansionModal";

export default function CoreDashboard() {
  const session = useSession();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardPayload['data'] | null>(null);
  const [expansionOpen, setExpansionOpen] = useState(false);
  const [period, setPeriod] = useState("6M");

  const refresh = useCallback(async (isManual = false, targetPeriod?: string) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      
      const activePeriod = targetPeriod || period;
      const res = await adminService.getDashboardMetrics(session.tenant_id, session, activePeriod);
      if (res) {
        setDashboardData(res);
      }
      
      if (isManual) toast.success("Executive telemetry synchronized.");
    } catch (err) {
      console.error("Dashboard sync failure:", err);
      toast.error("Telemetry failure in executive suite.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session.tenant_id, session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (loading || !dashboardData) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-6">
          <div className="h-20 w-20 bg-indigo-600 rounded-[2.5rem] animate-pulse flex items-center justify-center shadow-2xl shadow-indigo-500/20">
            <LayoutDashboard className="h-10 w-10 text-white" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Synchronizing Executive Intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <PageShell
      header={
        <PageHeader
          title="Executive Command Center"
          subtitle="Enterprise-wide intelligence, growth telemetry, and strategic governance."
          primaryAction={
            <Button onClick={() => setExpansionOpen(true)} className="rounded-[1.2rem] px-8 h-12 gap-3 font-black text-xs uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-500/30 transition-all hover:scale-105 active:scale-95">
              <Rocket className="h-4 w-4" /> STRATEGIC EXPANSION
            </Button>
          }
          secondaryActions={
            <Button 
              variant="outline" 
              className="rounded-[1.2rem] px-6 h-12 font-black text-xs uppercase tracking-widest border-slate-200 bg-white/50 backdrop-blur-sm hover:bg-white transition-all"
              onClick={() => refresh(true)}
              disabled={refreshing}
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </Button>
          }
        />
      }
    >
      <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
        <Tabs defaultValue="overview" className="space-y-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-white/50 dark:bg-slate-900/50 p-4 rounded-[2.5rem] border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-xl">
            <TabsList className="bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-2xl h-12">
              <TabsTrigger value="overview" className="rounded-xl px-8 h-10 data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-indigo-600 font-black text-[10px] uppercase tracking-[0.2em] transition-all">
                Strategic Overview
              </TabsTrigger>
              <TabsTrigger value="operations" className="rounded-xl px-8 h-10 data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-indigo-600 font-black text-[10px] uppercase tracking-[0.2em] transition-all">
                Tactical Flow
              </TabsTrigger>
            </TabsList>

            <div className="hidden lg:flex items-center gap-3">
               <div className="flex flex-col items-end">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Governance Tier</span>
                  <span className="text-[10px] font-bold text-indigo-600">L4 COMMANDER</span>
               </div>
               <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <LayoutDashboard className="h-5 w-5 text-white" />
               </div>
            </div>
          </div>

          <TabsContent value="overview" className="space-y-12 m-0">
            {/* Tier 0: The Strategic Core */}
            <div className="grid gap-8 lg:grid-cols-4">
               <div className="lg:col-span-3">
                  <ExecutiveKpiRow kpis={dashboardData.kpis} />
               </div>
               <StrategicScorecard />
            </div>

            {/* Tier 1: Financial Trajectory & Regional Performance */}
            <div className="grid gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <FinancialTrajectoryChart 
                  data={dashboardData.timeseries.financialOverview} 
                  period={period}
                  onPeriodChange={(p) => {
                    setPeriod(p);
                    refresh(true, p);
                  }}
                />
              </div>
              <BranchLeaderboard data={dashboardData.timeseries.topBranches} />
            </div>

            {/* Tier 2: Resource Allocation & Efficiency */}
            <div className="grid gap-8 lg:grid-cols-4">
               <div className="lg:col-span-2 space-y-8">
                  <HrCapitalWidget distribution={dashboardData.timeseries.hrDistribution} />
                  <div className="grid gap-8 sm:grid-cols-2">
                     <CashPositionWidget />
                     <ArApWaterfallChart />
                  </div>
               </div>
               <div className="space-y-8">
                  <PayrollBurnTrendChart />
                  <AttendanceGauge />
               </div>
               <SalesPipelineFunnel />
            </div>

            {/* Tier 3: Supply Chain & Risk Matrix */}
            <div className="grid gap-8 lg:grid-cols-3">
               <div className="lg:col-span-2 grid gap-8 sm:grid-cols-2">
                  <InventoryHealthWidget />
                  <ProcurementPipelineWidget />
               </div>
               <AlertsRiskMatrix data={dashboardData.timeseries.alertsByModule as any} />
            </div>

            {/* Tier 4: Growth & Compliance */}
            <div className="grid gap-8 lg:grid-cols-3">
               <MarketingRoiChart data={dashboardData.timeseries.campaignCorrelation} />
               <SystemHealthDonut data={dashboardData.timeseries.moduleHealth} />
               <ComplianceHeatmap />
            </div>

            {/* Tier 5: Global Intelligence Feed */}
            <div className="grid gap-8 lg:grid-cols-3">
               <div className="lg:col-span-2">
                  <GlobalEventFeed activities={dashboardData.activities} />
               </div>
               <div className="rounded-[2.5rem] bg-slate-900 p-10 text-white shadow-2xl relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  <div className="relative z-10 space-y-8">
                     <div className="h-14 w-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-xl border border-white/10">
                        <Briefcase className="h-7 w-7 text-indigo-400" />
                     </div>
                     <div className="space-y-3">
                        <h4 className="text-2xl font-black italic uppercase tracking-tighter">Strategic Support</h4>
                        <p className="text-sm text-slate-400 font-medium leading-relaxed">Your dedicated executive assistant is ready for tactical support and complex modeling.</p>
                     </div>
                     <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl h-14 shadow-xl shadow-indigo-500/20 transition-all active:scale-95">
                        CONNECT TO COMMAND
                     </Button>
                  </div>
               </div>
            </div>
          </TabsContent>

          <TabsContent value="operations" className="m-0">
            <OperationsView />
          </TabsContent>
        </Tabs>
      </div>

      <StrategicExpansionModal 
        isOpen={expansionOpen} 
        onClose={() => setExpansionOpen(false)}
        feature=""
      />
    </PageShell>
  );
}

