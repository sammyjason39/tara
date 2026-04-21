import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageShell } from "@/core/ui/PageShell";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Globe2,
  Layers,
  Timer,
  ServerCrash,
  Link2,
  Database,
  Loader2,
} from "lucide-react";
import { useSession } from "@/core/security/session";
import { itService } from "@/core/services/it/itService";
import { adminService } from "@/core/services/adminService";
import { RequestModal } from "@/core/ui/RequestModal";
import { useToast } from "@/hooks/use-toast";

const moduleActivity = [
  {
    id: "mod-1",
    name: "Retail Ops",
    status: "Stable",
    throughput: "2.1k tx/hr",
    latency: "120 ms",
  },
  {
    id: "mod-2",
    name: "F&B Operations",
    status: "Degraded",
    throughput: "1.5k tx/hr",
    latency: "260 ms",
  },
  {
    id: "mod-3",
    name: "Workforce",
    status: "Stable",
    throughput: "840 tx/hr",
    latency: "95 ms",
  },
  {
    id: "mod-4",
    name: "Compliance",
    status: "Stable",
    throughput: "210 checks/hr",
    latency: "180 ms",
  },
];

const alertsQueue = [
  {
    id: "alert-1",
    title: "Payment gateway retry queue growing",
    detail: "Asia Pacific region experiencing elevated latency.",
    severity: "High",
    time: "7 minutes ago",
  },
  {
    id: "alert-2",
    title: "Store #221 inventory sync delayed",
    detail: "Last sync 48 minutes ago.",
    severity: "Medium",
    time: "38 minutes ago",
  },
  {
    id: "alert-3",
    title: "Workforce onboarding backlog",
    detail: "12 requests pending in HR queue.",
    severity: "Low",
    time: "Today, 06:20",
  },
];

const checklistItems = [
  { id: "check-1", label: "Morning store health check", status: "Complete" },
  {
    id: "check-2",
    label: "Daily financial reconciliation",
    status: "In progress",
  },
  { id: "check-3", label: "Critical alerts review", status: "Complete" },
  { id: "check-4", label: "Vendor SLAs verified", status: "Pending" },
];

const tenantVisibility = [
  { id: "ten-1", name: "North America", uptime: "99.98%", incidents: "2 open" },
  { id: "ten-2", name: "Asia Pacific", uptime: "99.72%", incidents: "5 open" },
  { id: "ten-3", name: "EMEA", uptime: "99.91%", incidents: "1 open" },
];

const statusBadge = (status: string) => {
  if (status === "Stable") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (status === "Degraded") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  return "bg-slate-50 text-slate-600 border-slate-200";
};

export default function CoreOperations() {
  const session = useSession();
  const { toast } = useToast();
  const [overviewData, setOverviewData] = useState<any | null>(null);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [iotDevices, setIotDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [itOverview, sync, iot] = await Promise.all([
          itService.getOverview(session.tenant_id, session),
          adminService.getSyncStatus(session),
          adminService.getIotDevices(session)
        ]);
        setOverviewData(itOverview);
        setSyncStatus(sync.data);
        setIotDevices(iot.data);
      } catch (err) {
        console.error("Failed to load operations data", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [session]);

  const handleInspect = async (component: string) => {
    try {
      const health = await itService.getSystemHealth(session.tenant_id, session);
      const filtered = health.filter(h => h.component.toLowerCase().includes(component.toLowerCase()));
      
      if (filtered.length > 0) {
        toast({
          title: `Health Check: ${component}`,
          description: `Nodes: ${filtered.length} | Avg Latency: ${Math.round(filtered.reduce((acc, curr) => acc + curr.latencyMs, 0) / filtered.length)}ms`,
        });
      } else {
        toast({
          title: "Health Check",
          description: `No active nodes found for ${component}. System may be in idle state.`,
        });
      }
    } catch (err) {
      toast({
        title: "Health Check Failed",
        description: "Unable to reach ITGateway telemetry service.",
        variant: "destructive"
      });
    }
  };

  const handleLaunchBridge = async (data: { title: string; reason: string }) => {
    try {
      await adminService.createRequest(session.tenant_id, session, {
        type: "INCIDENT_BRIDGE",
        title: data.title,
        description: data.reason,
      });
      toast({
        title: "Incident Bridge Requested",
        description: "Crisis management team has been notified.",
      });
    } catch (err) {
      toast({
        title: "Bridge Initiation Failed",
        description: "Unable to reach emergency services.",
        variant: "destructive",
      });
    }
  };

  const retailStats = overviewData?.moduleContributions?.retail;

  return (
    <PageShell
      header={
        <PageHeader
          title="Operations Command Center"
          subtitle="Real-time visibility into platform operations, incidents, and tenant health."
          primaryAction={<Button onClick={() => setIsModalOpen(true)}>Launch incident bridge</Button>}
          secondaryActions={<Button onClick={(e) => { e.preventDefault(); const c = "data:text/csv;charset=utf-8,Fallback Data\nExported Row"; const l = document.createElement("a"); l.href = encodeURI(c); l.download = "export.csv"; l.click(); }} variant="outline">Export daily log</Button>}
        />
      }
    >
      <div className="space-y-6">
        {/* --- SYSTEM OBSERVABILITY OVERLAY --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WorkspacePanel 
            title="Global Sync Health" 
            description="Operational data synchronization across branches and edge gateways."
          >
            {syncStatus ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border">
                  <div className="flex items-center gap-3">
                    <Database className={`h-5 w-5 ${syncStatus.is_healthy ? 'text-emerald-500' : 'text-rose-500'}`} />
                    <div>
                      <p className="text-sm font-semibold">Persistence Queue</p>
                      <p className="text-xs text-muted-foreground">{syncStatus.pending_count} pending / {syncStatus.failed_count} failed</p>
                    </div>
                  </div>
                  <Badge variant={syncStatus.is_healthy ? "outline" : "destructive"}>
                    {syncStatus.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs px-2">
                  <span className="text-muted-foreground">Sync Latency</span>
                  <span className="font-mono">{syncStatus.sync_latency_min === -1 ? 'N/A' : `${syncStatus.sync_latency_min}m`}</span>
                </div>
              </div>
            ) : (
              <div className="h-24 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            )}
          </WorkspacePanel>

          <WorkspacePanel 
            title="Edge IoT Network" 
            description="Connected hardware and sensor telemetry status."
          >
             <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2 rounded bg-muted/30 border">
                    <p className="text-xs text-muted-foreground uppercase">Online</p>
                    <p className="text-lg font-bold text-emerald-500">{iotDevices.filter(d => d.status === 'ONLINE' || d.status === 'ACTIVE').length}</p>
                  </div>
                  <div className="text-center p-2 rounded bg-muted/30 border">
                    <p className="text-xs text-muted-foreground uppercase">Offline</p>
                    <p className="text-lg font-bold text-rose-500">{iotDevices.filter(d => d.status === 'OFFLINE' || d.status === 'DISCONNECTED').length}</p>
                  </div>
                  <div className="text-center p-2 rounded bg-muted/30 border">
                    <p className="text-xs text-muted-foreground uppercase">Alerts</p>
                    <p className="text-lg font-bold text-amber-500">{iotDevices.filter(d => d.status === 'ALERT' || d.status === 'WARNING').length}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Button variant="ghost" size="sm" className="text-[10px] h-6" onClick={() => handleInspect("Edge")}>
                    Inspect Edge Nodes
                  </Button>
                </div>
             </div>
          </WorkspacePanel>
        </div>

        {/* --- MODULE CONTRIBUTIONS --- */}
        {retailStats && (
          <WorkspacePanel
            title="Module Contributions: Retail Infrastructure"
            description="Live device health and ecommerce channel connectivity from the active Retail module."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-5 dark:border-indigo-900/30 dark:bg-indigo-950/20">
                <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-400">
                  <span className="text-sm font-medium">
                    POS Devices Online
                  </span>
                </div>
                <div className="mt-4 flex items-end gap-2">
                  <span className="text-3xl font-bold tracking-tight text-indigo-900 dark:text-indigo-100">
                    {retailStats.posDevices?.online || 0}
                  </span>
                  <span className="text-sm text-indigo-600 dark:text-indigo-400 mb-1">
                    of {retailStats.posDevices?.total || 0} total
                  </span>
                </div>
                <div className="mt-2 text-xs text-indigo-600 dark:text-indigo-400">
                  Payment terminals in active stores
                </div>
              </div>

              <div
                className={`rounded-xl border p-5 shadow-sm ${retailStats.posDevices?.offline > 0 ? "border-rose-200 bg-rose-50/50 dark:border-rose-900/50 dark:bg-rose-950/20" : ""}`}
              >
                <div
                  className={`flex items-center justify-between ${retailStats.posDevices?.offline > 0 ? "text-rose-700 dark:text-rose-400" : "text-muted-foreground"}`}
                >
                  <span className="text-sm font-medium">Offline Devices</span>
                  <ServerCrash className="h-4 w-4" />
                </div>
                <div className="mt-4">
                  <span
                    className={`text-2xl font-semibold tracking-tight ${retailStats.posDevices?.offline > 0 ? "text-rose-900 dark:text-rose-100" : ""}`}
                  >
                    {retailStats.posDevices?.offline || 0}
                  </span>
                </div>
                <div
                  className={`mt-2 text-xs ${retailStats.posDevices?.offline > 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"}`}
                >
                  {retailStats.posDevices?.offline > 0
                    ? "Requires technician dispatch"
                    : "All POS devices healthy"}
                </div>
              </div>

              <div className="rounded-xl border p-5 shadow-sm">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-sm font-medium">
                    Ecommerce Connectors
                  </span>
                  <Link2 className="h-4 w-4" />
                </div>
                <div className="mt-4 flex items-end gap-2">
                  <span className="text-2xl font-semibold tracking-tight">
                    {retailStats.ecommerceChannels?.active || 0}
                  </span>
                  <span className="text-sm text-muted-foreground mb-1">
                    of {retailStats.ecommerceChannels?.total || 0} active
                  </span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Syncing inventory and orders
                </div>
              </div>
            </div>
          </WorkspacePanel>
        )}
        {/* ----------------------------- */}

        <WorkspacePanel
          title="Live module activity"
          description="Operational throughput and stability by service."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {moduleActivity.map((module) => (
              <div key={module.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {module.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Throughput {module.throughput}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={statusBadge(module.status)}
                  >
                    {module.status}
                  </Badge>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4" />
                    Latency {module.latency}
                  </div>
                  <Button onClick={() => handleInspect(module.name)} size="sm" variant="outline">
                    Inspect
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </WorkspacePanel>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <WorkspacePanel
            title="Alerts & issues queue"
            description="Escalations requiring immediate review."
          >
            <div className="space-y-4">
              {alertsQueue.map((alertItem) => (
                <div key={alertItem.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {alertItem.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {alertItem.detail}
                      </p>
                    </div>
                    <Badge variant="secondary">{alertItem.severity}</Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      {alertItem.time}
                    </div>
                    <Button onClick={(e) => { e.preventDefault(); toast({ title: "Alert Review", description: `Opening investigation for: ${alertItem.title}` }); }} size="sm" variant="outline">
                      Review
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </WorkspacePanel>

          <WorkspacePanel
            title="Daily operational checklist"
            description="Core tasks and control points for today."
          >
            <div className="space-y-3">
              {checklistItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    {item.status === "Complete" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : item.status === "In progress" ? (
                      <ClipboardCheck className="h-4 w-4 text-amber-500" />
                    ) : (
                      <Layers className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {item.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.status}
                      </p>
                    </div>
                  </div>
                  <Button onClick={(e) => { e.preventDefault(); toast({ title: "Checklist Item", description: `Viewing details for ${item.label}` }); }} size="sm" variant="outline">
                    View
                  </Button>
                </div>
              ))}
            </div>
          </WorkspacePanel>
        </div>

        <WorkspacePanel
          title="Cross-tenant operational visibility"
          description="Performance and incident posture across regions."
        >
          <div className="grid gap-4 md:grid-cols-3">
            {tenantVisibility.map((tenant) => (
              <div key={tenant.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {tenant.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Uptime {tenant.uptime}
                    </p>
                  </div>
                  <Globe2 className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{tenant.incidents}</span>
                  <Button onClick={() => handleInspect(tenant.name)} size="sm" variant="outline">
                    Drill in
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </WorkspacePanel>
      </div>

      <RequestModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleLaunchBridge}
        title="Launch Incident Bridge"
        description="Establish an emergency communication channel for active critical incidents."
        defaultTitle="Critical Incident Bridge Request"
      />
    </PageShell>
  );
}
