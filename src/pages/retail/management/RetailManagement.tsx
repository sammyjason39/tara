import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ShieldAlert,
  Lock,
  ArrowRight,
  TrendingUp,
  History,
} from "lucide-react";
import { useSession } from "@/core/security/session";
import { Roles } from "@/core/security/roles";
import { retailService } from "@/core/services/retail/retailService";
import { ecommerceHubService } from "@/core/services/retail/ecommerceHubService";
import type {
  RetailOrder,
  RetailStore,
  RetailChannel,
} from "@/core/types/retail/retail";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// New Premium Components
import { CommandCenterHeader } from "./components/command/CommandCenterHeader";
import { CommandCenterStats } from "./components/command/CommandCenterStats";
import { NodeConnectivityGrid } from "./components/command/NodeConnectivityGrid";
import { CommandCenterSidebar } from "./components/command/CommandCenterSidebar";
import { AIInsightEngine } from "./components/command/AIInsightEngine";
import { ResourceHeatmap } from "./components/command/ResourceHeatmap";
import { GlobalActivityFeed } from "./components/command/GlobalActivityFeed";

export default function RetailManagement() {
  const session = useSession();
  const [orders, setOrders] = useState<RetailOrder[]>([]);
  const [stores, setStores] = useState<RetailStore[]>([]);
  const [channels, setChannels] = useState<RetailChannel[]>([]);
  const [inventoryStats, setInventoryStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // RBAC: Only HOD, owner, superadmins and admins
  const isAuthorized = useMemo(() => {
    const allowedRoles = [
      Roles.DEPT_HEAD,
      Roles.FINANCE_DEPT_HEAD,
      Roles.HR_DEPT_HEAD,
      Roles.OWNER,
      Roles.SUPERADMIN,
      Roles.COMPANY_ADMIN,
    ];
    return allowedRoles.includes(session.role);
  }, [session.role]);

  const refreshGlobalState = useCallback(async () => {
    if (!isAuthorized) return;
    try {
      setLoading(true);
      const [orderList, storeList, channelList, invStats] = await Promise.all([
        retailService.listOrders(session.tenantId, session),
        retailService.listStores(session.tenantId, session),
        ecommerceHubService.listChannels(session),
        retailService.getInventoryStats(session.tenantId, session),
      ]);
      setOrders(orderList);
      setStores(storeList);
      setChannels(channelList);
      setInventoryStats(invStats);
    } catch (err) {
      console.error("[Command Center] System Synchronization Failure", err);
    } finally {
      setLoading(false);
    }
  }, [session, isAuthorized]);

  useEffect(() => {
    refreshGlobalState();
  }, [refreshGlobalState]);

  if (!isAuthorized) {
    return (
      <div className="flex h-[calc(100vh-100px)] items-center justify-center p-6 bg-slate-900 overflow-hidden">
        {/* Animated Background Shield */}
        <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
          <div className="absolute -top-1/2 -left-1/4 w-[150%] h-[150%] bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.2)_0%,transparent_70%)] animate-pulse" />
        </div>

        <Card className="max-w-md w-full rounded-[3rem] border-none shadow-2xl bg-white/10 backdrop-blur-3xl p-12 text-center space-y-8 relative overflow-hidden ring-1 ring-white/20">
          <div className="mx-auto w-24 h-24 rounded-[2rem] bg-red-500/10 flex items-center justify-center border-2 border-red-500/30 shadow-[0_0_40px_rgba(239,68,68,0.2)]">
            <Lock className="w-10 h-10 text-red-500" />
          </div>
          <div className="space-y-3">
            <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white leading-tight">
              Security Protocol: <br /> Restricted Access
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
              Genesis Command requires Dept Head clearance (HOD) or Executive
              authorization to access global oversight assets.
            </p>
          </div>
          <Button
            className="w-full h-14 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 font-black italic uppercase text-[11px] tracking-[0.2em] group gap-3 shadow-xl"
            onClick={() => window.history.back()}
          >
            Terminal Return{" "}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Card>
      </div>
    );
  }

  const totalSales = orders.reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <div className="min-h-screen bg-slate-50/50 selection:bg-blue-600 selection:text-white">
      <div className="max-w-[1800px] mx-auto p-6 md:p-12 lg:p-16 space-y-16">
        {/* Header Tier */}
        <CommandCenterHeader
          locationName={session.locationId}
          onRefresh={refreshGlobalState}
          isLoading={loading}
        />

        {/* Global KPI Tier */}
        <CommandCenterStats
          totalSales={totalSales}
          orderCount={orders.length}
          activeTerminals="12/12"
          systemStatus="OPTIMAL (24ms)"
        />

        {/* Mission Critical Deck */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-12">
          <div className="xl:col-span-3 space-y-12">
            {/* Split Tier: AI Insights & Node Health */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <AIInsightEngine />
              <NodeConnectivityGrid stores={stores} channels={channels} />
            </div>

            {/* Resource Heatmap Section */}
            <ResourceHeatmap stores={stores} />

            {/* Performance Visualizer */}
            <Card className="rounded-[4rem] border-none shadow-2xl bg-white overflow-hidden group">
              <CardHeader className="p-12 border-b flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-indigo-600 text-white">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-3xl font-black italic uppercase tracking-tighter">
                      Fleet Revenue Matrix
                    </CardTitle>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 ml-14">
                    Global multi-channel performance synchronization
                  </p>
                </div>
                <div className="flex gap-2 p-2 bg-slate-50 rounded-[1.5rem] self-start md:self-center">
                  {[
                    "Intra-Day Telemetry",
                    "7-Day Velocity",
                    "Quarterly Consensus",
                  ].map((tab) => (
                    <Button disabled title="Not available yet"
                      key={tab}
                      variant="ghost"
                      size="sm"
                      className={
                        tab === "Intra-Day Telemetry"
                          ? "bg-white shadow-md font-black italic text-[11px] uppercase h-11 px-8 rounded-xl ring-1 ring-slate-200"
                          : "font-black italic text-[11px] uppercase h-11 px-8 text-slate-400 hover:text-slate-900"
                      }
                    >
                      {tab}
                    </Button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="p-12">
                <div className="h-[500px] bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center space-y-6 group-hover:bg-slate-50 transition-colors">
                  <div className="p-8 rounded-[2rem] bg-white border shadow-sm group-hover:scale-110 transition-transform duration-700">
                    <History className="w-12 h-12 text-blue-600 animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-2xl font-black italic uppercase tracking-tighter text-slate-900">
                      Visualizing Data Stream
                    </p>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                      [Awaiting high-fidelity telemetry sync...]
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Integration & Activity Sidebar */}
          <div className="space-y-12">
            <GlobalActivityFeed />
            <CommandCenterSidebar
              inventoryStats={inventoryStats}
              syncStatus={{ finance: "OK", hr: "OK", it: "OK" }}
              recentOrders={orders}
            />
          </div>
        </div>

        {/* Security / System Footer */}
        <div className="pt-16 border-t border-slate-200 flex flex-col lg:flex-row items-center justify-between gap-10 text-[10px] font-black italic text-slate-400 uppercase tracking-[0.3em]">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-emerald-500" />
              <span className="text-slate-900">
                Audit-First Integrity Protocol
              </span>
            </div>
            <div className="h-4 w-px bg-slate-200" />
            <span>RLS Context: {session.tenantId}</span>
            <div className="h-4 w-px bg-slate-200" />
            <span>Node: {session.locationId || "ROOT_CONTEXT"}</span>
          </div>
          <div className="flex items-center gap-10">
            <span className="hover:text-blue-600 cursor-pointer transition-colors border-b border-transparent hover:border-blue-600">
              Infrastructure Map
            </span>
            <span className="hover:text-amber-600 cursor-pointer transition-colors border-b border-transparent hover:border-amber-600">
              Access Logs
            </span>
            <span className="hover:text-indigo-600 cursor-pointer transition-colors border-b border-transparent hover:border-indigo-600 font-bold">
              Zenvix OS Cloud v2.4.9
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
