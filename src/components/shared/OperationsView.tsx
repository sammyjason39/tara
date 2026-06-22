import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Loader2,
  Zap,
  PhoneCall
} from "lucide-react";
import { useSession } from "@/core/security/session";
import { adminService } from "@/core/services/adminService";
import { RequestModal } from "@/core/ui/RequestModal";
import { useToast } from "@/hooks/use-toast";
import { LiveModuleActivity } from "@/components/dashboard/LiveModuleActivity";
import { GlobalSyncHealthPanel } from "@/components/dashboard/GlobalSyncHealthPanel";
import { WorkflowPipeline } from "@/components/dashboard/WorkflowPipeline";
import { OperationalAlertsQueue } from "@/components/dashboard/OperationalAlertsQueue";
import { OperationalChecklist } from "@/components/dashboard/OperationalChecklist";
import { DeviceNetworkTable } from "@/components/dashboard/DeviceNetworkTable";
import { RetailShiftMatrix } from "@/components/dashboard/RetailShiftMatrix";
import { AuditIntegrityPanel } from "@/components/dashboard/AuditIntegrityPanel";
import { TacticalPayload } from "@/types/dashboard.types";

export function OperationsView() {
  const session = useSession();
  const { toast } = useToast();
  const [tacticalData, setTacticalData] = useState<TacticalPayload['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await adminService.getDashboardTactical(session);
        if (res) {
          setTacticalData(res);
        }
      } catch (err) {
        console.error("Failed to load tactical flow data", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [session]);

  const handleLaunchBridge = async (data: { title: string; reason: string }) => {
    try {
      await adminService.createRequest(session.tenant_id, session, {
        type: "incident_bridge",
        title: data.title,
        detail: data.reason,
      });
      toast({ title: "Incident Bridge Requested" });
    } catch (err) {
      toast({ title: "Bridge Initiation Failed", variant: "destructive" });
    }
  };

  if (loading || !tacticalData) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Loading Tactical Intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000 pb-20">
      {/* Tactical Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-10 rounded-[3rem] bg-muted border border-border shadow-3xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
        <div className="relative z-10 flex items-center gap-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-warning text-white shadow-2xl shadow-amber-500/40 border border-warning/50 animate-pulse-slow">
            <Zap className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter italic text-white">Live Operations Flow</h2>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Tactical Control Layer v2.0</p>
          </div>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="relative z-10 h-16 rounded-2xl bg-white text-muted-foreground px-10 font-black text-xs uppercase tracking-[0.25em] shadow-2xl hover:bg-primary hover:text-white transition-all duration-500 active:scale-95 border-none"
        >
          <PhoneCall className="mr-3 h-4 w-4" />
          Launch Incident Bridge
        </Button>
      </div>

      {/* Primary Telemetry Layer */}
      <LiveModuleActivity data={tacticalData.moduleActivity} />

      {/* System Integrity Layer */}
      <div className="grid gap-10 lg:grid-cols-2">
        <GlobalSyncHealthPanel data={tacticalData.syncHealth} />
        <AuditIntegrityPanel data={tacticalData.auditIntegrity} />
      </div>

      {/* Operational Flow Layer */}
      <div className="grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RetailShiftMatrix data={tacticalData.retailShifts} />
        </div>
        <WorkflowPipeline data={tacticalData.workflowItems} />
      </div>

      {/* Edge & Alerts Layer */}
      <div className="grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DeviceNetworkTable data={tacticalData.iotDevices} />
        </div>
        <div className="space-y-10">
          <OperationalAlertsQueue data={tacticalData.alertsQueue} />
          <OperationalChecklist />
        </div>
      </div>

      <RequestModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleLaunchBridge}
        title="Launch Incident Bridge"
        description="Establish emergency communication."
        defaultTitle="Incident Bridge Request"
      />
    </div>
  );
}
