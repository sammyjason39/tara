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
        type: "INCIDENT_BRIDGE",
        title: data.title,
        description: data.reason,
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
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Tactical Intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Tactical Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white shadow-lg shadow-amber-500/20">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest italic">Live Operations Flow</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tactical Control Layer</p>
          </div>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="h-11 rounded-xl bg-slate-900 px-6 font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800"
        >
          <PhoneCall className="mr-2 h-3.5 w-3.5" />
          Launch Incident Bridge
        </Button>
      </div>

      {/* Primary Telemetry Layer */}
      <LiveModuleActivity data={tacticalData.moduleActivity} />

      {/* System Integrity Layer */}
      <div className="grid gap-8 lg:grid-cols-2">
        <GlobalSyncHealthPanel data={tacticalData.syncHealth} />
        <AuditIntegrityPanel data={tacticalData.auditIntegrity} />
      </div>

      {/* Operational Flow Layer */}
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RetailShiftMatrix data={tacticalData.retailShifts} />
        </div>
        <WorkflowPipeline data={tacticalData.workflowItems} />
      </div>

      {/* Edge & Alerts Layer */}
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DeviceNetworkTable data={tacticalData.iotDevices} />
        </div>
        <div className="space-y-8">
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
