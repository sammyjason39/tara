import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ShieldAlert,
  Lock,
  ArrowRight,
  TrendingUp,
  Globe,
  Activity
} from "lucide-react";
import { useNavigate } from "react-router-dom";
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
import { FleetRevenueMatrix } from "./components/command/FleetRevenueMatrix";
import { RetailCustomerActivity } from "./RetailCustomerActivity";
import { EcommerceAnalytics } from "./EcommerceAnalytics";

export default function RetailManagement() {
  const navigate = useNavigate();
  const session = useSession();
  const [orders, setOrders] = useState<RetailOrder[]>([]);
  const [stores, setStores] = useState<RetailStore[]>([]);
  const [channels, setChannels] = useState<RetailChannel[]>([]);
  const [inventoryStats, setInventoryStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("fleet");

  const triggerExpansion = (feature: string) => {
    if (feature.includes("Infrastructure") || feature.includes("Node")) {
      navigate("/core/logistics");
      return;
    }
    if (feature.includes("Resource") || feature.includes("Revenue")) {
      navigate("/core/finance");
      return;
    }
    if (feature.includes("Recommendation") || feature.includes("Intelligence")) {
      navigate("/core/sales/intelligence");
      return;
    }
    navigate(\"/core/operations\");
  };

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
        retailService.listOrders(session.tenant_id, session),
        retailService.listStores(session.tenant_id, session),
        ecommerceHubService.listChannels(session),
        retailService.getInventoryStats(session.tenant_id, session),
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
      <div className="flex h-[calc(100vh-100px)] items-center justify-center p-6 bg-background overflow-hidden relative">
        {/* Animated Background Shield */}
        <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-[radial-gradient(circle_at_center,rgba(79,70,229,0.15)_0%,transparent_70%)] animate-pulse" />
        </div>

        <Card className="max-w-md w-full rounded-[2rem] border border-white/5 shadow-2xl bg-white/[0.03] backdrop-blur-3xl p-8 text-center space-y-10 relative overflow-hidden">
          <div className="mx-auto w-28 h-28 rounded-2xl bg-destructive/10 flex items-center justify-center border border-rose-500/20 shadow-[0_0_50px_rgba(244,63,94,0.2)] group hover:scale-110 transition-transform duration-500">
            <Lock className="w-12 h-12 text-destructive group-hover:rotate-12 transition-transform" />
          </div>
          <div className="space-y-4">
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-foreground leading-none">
              Restricted <br /> Access
            </h2>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em] leading-relaxed italic">
              Genesis Command requires Dept Head clearance (HOD) or Executive
              authorization to access global oversight assets.
            </p>
          </div>
          <Button
            className="w-full h-16 rounded-2xl bg-primary text-foreground hover:bg-primary/90 font-black italic uppercase text-[12px] tracking-[0.3em] group gap-4 shadow-[0_20px_40px_rgba(79,70,229,0.3)] transition-all hover:scale-105"
            onClick={() => window.history.back()}
          >
            Terminal Return{" "}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
          </Button>
        </Card>
      </div>
    );
  }

  const totalSales = orders.reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <div className="min-h-screen bg-background selection:bg-primary selection:text-foreground relative overflow-hidden">

      {/* Background Atmosphere */}
      <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[5%] right-[-5%] w-[35%] h-[35%] bg-violet-600/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto p-6 md:p-8 lg:p-10 space-y-20 relative z-10">
        {/* Header Tier */}
        <CommandCenterHeader
          locationName={session.location_id}
          onRefresh={refreshGlobalState}
          isLoading={loading}
          onExpansionRequest={triggerExpansion}
        />

        {/* Global KPI Tier */}
        <CommandCenterStats
          totalSales={totalSales}
          orderCount={orders.length}
          activeTerminals="12/12"
          systemStatus="OPTIMAL (24ms)"
        />

        {/* Mission Critical Deck */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          <div className="xl:col-span-3 space-y-16">
            {/* Split Tier: AI Insights & Node Health */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <AIInsightEngine onExpansionRequest={triggerExpansion} />
              <NodeConnectivityGrid 
                stores={stores} 
                channels={channels} 
                onExpansionRequest={triggerExpansion}
              />
            </div>

            {/* Resource Heatmap Section */}
            <ResourceHeatmap 
              stores={stores} 
              onExpansionRequest={triggerExpansion}
            />

            {/* Performance Visualizer & Multi-Module Hub */}
            <Card className="rounded-2xl border border-white/5 bg-white/[0.03] backdrop-blur-3xl shadow-2xl overflow-hidden group">
              <CardHeader className="p-8 border-b border-white/5 flex flex-col xl:flex-row xl:items-center justify-between gap-8">
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="p-4 rounded-2xl bg-primary text-foreground shadow-xl shadow-indigo-600/20">
                      <TrendingUp className="w-8 h-8" />
                    </div>
                    <CardTitle className="text-2xl font-black italic uppercase tracking-tighter text-foreground">
                      {activeTab === 'fleet' ? 'Fleet Revenue Matrix' : activeTab === 'customers' ? 'Customer Activity' : 'Ecommerce Intelligence'}
                    </CardTitle>
                  </div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.3em] mt-3 ml-20 italic">
                    {activeTab === 'fleet' ? 'Global multi-channel performance synchronization' : activeTab === 'customers' ? 'Identity and engagement telemetry' : 'Real-time digital storefront analytics'}
                  </p>
                </div>
                <div className="flex gap-3 p-3 bg-white/[0.03] backdrop-blur-3xl rounded-2xl self-start xl:self-center border border-white/5">
                  {[
                    { id: "fleet", label: "Fleet Matrix" },
                    { id: "customers", label: "Customer Activity" },
                    { id: "analytics", label: "Ecommerce Analytics" },
                  ].map((tab) => (
                    <Button
                      key={tab.id}
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTab(tab.id)}
                      className={
                        activeTab === tab.id
                          ? "bg-white/[0.08] shadow-2xl font-black italic text-[12px] uppercase h-14 px-10 rounded-xl text-foreground border border-border"
                          : "font-black italic text-[12px] uppercase h-14 px-10 text-muted-foreground hover:text-foreground transition-all"
                      }
                    >
                      {tab.label}
                    </Button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="p-8">
                {activeTab === 'fleet' && (
                  <FleetRevenueMatrix 
                    orders={orders} 
                    stores={stores} 
                    channels={channels} 
                  />
                )}
                {activeTab === 'customers' && (
                  <RetailCustomerActivity onExpansionRequest={triggerExpansion} />
                )}
                {activeTab === 'analytics' && <EcommerceAnalytics />}
              </CardContent>
            </Card>
          </div>

          {/* Integration & Activity Sidebar */}
          <div className="space-y-16">
            <GlobalActivityFeed onExpansionRequest={triggerExpansion} />
            <CommandCenterSidebar
              inventoryStats={inventoryStats}
              syncStatus={{ finance: "OK", hr: "OK", it: "OK" }}
              recentOrders={orders}
              onExpansionRequest={triggerExpansion}
            />
          </div>
        </div>

        {/* Security / System Footer */}
        <div className="pt-20 border-t border-white/5 flex flex-col lg:flex-row items-center justify-between gap-6 text-[11px] font-black italic text-muted-foreground uppercase tracking-[0.4em]">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-success" />
              <span className="text-foreground">
                Audit-First Integrity Protocol
              </span>
            </div>
            <div className="h-5 w-px bg-secondary/40" />
            <span>RLS Context: {session.tenant_id}</span>
            <div className="h-5 w-px bg-secondary/40" />
            <span>Node: {session.location_id || "ROOT_CONTEXT"}</span>
          </div>
          <div className="flex items-center gap-6">
            <span 
              onClick={() => navigate("/m/retail/management/infrastructure-map")}
              className="hover:text-primary cursor-pointer transition-colors border-b border-transparent hover:border-indigo-400"
            >
              Infrastructure Map
            </span>
            <span 
              onClick={() => navigate("/m/retail/management/infrastructure-map")}
              className="hover:text-rose-400 cursor-pointer transition-colors border-b border-transparent hover:border-rose-400"
            >
              Access Logs
            </span>
            <span className="hover:text-foreground cursor-pointer transition-colors font-bold">
              Zenvix OS Cloud v2.4.9
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
