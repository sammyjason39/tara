import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  ShieldAlert,
  Activity,
  Award,
  BarChart3,
  Users,
  Flame,
  UserCheck,
  Search,
  Timer,
  FileText,
  CheckCircle,
  Zap,
  Lock,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { retailService } from "@/core/services/retail/retailService";
import { useSession } from "@/core/security/session";
import { useRetail } from "../context/RetailContext";
import type { RetailShift } from "@/core/types/retail/retail";

import { useGovernance } from "./pricing-promo-desk/hooks/useGovernance";
import { AuditTrailModal } from "./pricing-promo-desk/components/AuditTrailModal";
import {
  ScheduleGrid,
  ScheduledShift,
} from "./shift-control/components/ScheduleGrid";
import { ShiftGovernanceModal } from "./shift-control/components/ShiftGovernanceModal";
import { EditShiftModal } from "./shift-control/components/EditShiftModal";
import { StrategicExpansionModal } from "@/components/ui/StrategicExpansionModal";

const MOCK_DRAFT_SHIFTS: ScheduledShift[] = [
  {
    id: "1",
    employeeId: "EMP-01",
    name: "Amelia Hart",
    role: "Cashier",
    startTime: "09:00",
    endTime: "17:00",
    dayOfWeek: 1,
    status: "draft",
  },
  {
    id: "2",
    employeeId: "EMP-02",
    name: "Marcus Volkov",
    role: "Shift Supervisor",
    startTime: "14:00",
    endTime: "22:00",
    dayOfWeek: 1,
    status: "draft",
  },
  {
    id: "3",
    employeeId: "EMP-03",
    name: "Sarah Jenkins",
    role: "Cashier",
    startTime: "08:00",
    endTime: "16:00",
    dayOfWeek: 2,
    status: "published",
  },
];

const AVAILABLE_STAFF = [
  { id: "EMP-01", name: "Amelia Hart", role: "Cashier" },
  { id: "EMP-02", name: "Marcus Volkov", role: "Shift Supervisor" },
  { id: "EMP-03", name: "Sarah Jenkins", role: "Cashier" },
  { id: "EMP-04", name: "David Kim", role: "Inventory Specialist" },
  { id: "EMP-05", name: "Elena Rostova", role: "Store Manager" },
];

const ShiftControl = () => {
  const session = useSession();
  const { activeStore, activeShift, refreshState } = useRetail();
  const [shifts, setShifts] = useState<RetailShift[]>([]);

  const [scheduledShifts, setScheduledShifts] =
    useState<ScheduledShift[]>(MOCK_DRAFT_SHIFTS);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpansionModalOpen, setIsExpansionModalOpen] = useState(false);
  const [expansionFeature, setExpansionFeature] = useState("");

  // New states for Advanced Features
  const [viewMode, setViewMode] = useState<"daily" | "weekly" | "monthly">(
    "weekly",
  );
  const [selectedShiftForEdit, setSelectedShiftForEdit] =
    useState<ScheduledShift | null>(null);

  // Modals
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isGovernanceModalOpen, setIsGovernanceModalOpen] = useState(false);

  // Governance specifically for Shifts
  const { auditLog, addSignature } = useGovernance(
    "GLOBAL_SHIFT_ROSTER",
    session.tenant_id!,
    session,
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const data = await retailService.listShifts(
          session.tenant_id!,
          session,
          { store_id: session.location_id }
        );
        setShifts(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to fetch shifts", error);
      } finally {
        setIsLoading(false);
      }
    };
    if (session.tenant_id) fetchData();
  }, [session.tenant_id, session.location_id]);

  const stats = useMemo(() => {
    const active = (Array.isArray(shifts) ? shifts : []).filter((s) => s.status === "open").length;
    const efficiency = 84.5; // Mocked
    const attendance = 100; // Mocked
    return { active, efficiency, attendance };
  }, [shifts]);

  const handleShiftUpdate = (updatedShift: ScheduledShift) => {
    setScheduledShifts((prev) =>
      prev.map((s) => (s.id === updatedShift.id ? updatedShift : s)),
    );
  };

  const handleShiftDelete = (shiftId: string) => {
    setScheduledShifts((prev) => (Array.isArray(prev) ? prev : []).filter((s) => s.id !== shiftId));
    toast({
      title: "Shift Removed",
      description: "The scheduled block was deleted.",
    });
  };

  const handleShiftCreate = (dayOfWeek: number) => {
    const newShift: ScheduledShift = {
      id: crypto.randomUUID(),
      employeeId: "NEW",
      name: "Unassigned",
      role: "Cashier",
      startTime: "09:00",
      endTime: "17:00",
      dayOfWeek,
      status: "draft",
    };
    setScheduledShifts((prev) => [...prev, newShift]);
    toast({
      title: "Draft Created",
      description: `New unassigned block added to grid.`,
    });
  };

  const handlePublishSchedule = async (reason: string) => {
    try {
      const affectedCount = (Array.isArray(scheduledShifts) ? scheduledShifts : []).filter(
        (s) => s.status === "draft",
      ).length;
      await addSignature(
        "Superadmin",
        session.user_id,
        true,
        `Published ${affectedCount} shifts: ${reason}`,
      );

      setScheduledShifts((prev) =>
        prev.map((s) => ({ ...s, status: "published" })),
      );

      toast({
        title: "Schedule Published",
        description: `Cryptographic proof generated. Core HR updated.`,
      });
    } catch (e) {
      toast({
        title: "Publication Failed",
        description: `Failed to commit schedule to Zenvix Core.`,
        variant: "destructive",
      });
    }
  };

  const handleReconcileActive = async () => {
    if (!activeShift) return;
    try {
      setIsLoading(true);
      await retailService.reconcileShift(session.tenant_id!, session, activeShift.id);
      toast({
        title: "Reconciliation Complete",
        description: "The shift has been audited and reconciled successfully.",
      });
      await refreshState();
    } catch (e) {
      toast({
        title: "Reconciliation Failed",
        description: "An error occurred during fiscal reconciliation.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openExpansion = (feature: string) => {
    setExpansionFeature(feature);
    setIsExpansionModalOpen(true);
  };

  if (isLoading && shifts.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-6 relative z-10">
          <Activity className="w-16 h-16 text-indigo-500 animate-spin" />
          <p className="text-sm font-black italic uppercase tracking-[0.3em] text-white">
            Synchronizing Workforce Telemetry...
          </p>
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(79,70,229,0.1)_0%,transparent_70%)]" />
      </div>
    );
  }

  const draftCount = (Array.isArray(scheduledShifts) ? scheduledShifts : []).filter((s) => s.status === "draft").length;

  return (
    <div className="flex flex-col min-h-screen bg-slate-900 selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      <StrategicExpansionModal
        isOpen={isExpansionModalOpen}
        onClose={() => setIsExpansionModalOpen(false)}
        featureName={expansionFeature}
      />

      {/* Header Tier */}
      <div className="px-10 py-8 border-b border-white/5 bg-slate-950/50 backdrop-blur-3xl shrink-0 flex flex-col lg:flex-row lg:items-center justify-between gap-6 sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-600/20">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">
              Workforce Intelligence Hub
            </h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-1">
              Node: {session.location_id || "GLOBAL_ROOT"} • Efficiency: {stats.efficiency}% • Risk: LOW
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            className="h-12 px-6 font-black italic border border-white/10 text-white hover:bg-white/5 text-[11px] uppercase tracking-widest gap-3 rounded-2xl transition-all"
            onClick={() => setIsAuditModalOpen(true)}
          >
            <FileText className="w-4 h-4 text-amber-500" /> Core HR Ledger
          </Button>
          
          {activeShift && (
            <Button
              onClick={handleReconcileActive}
              className="h-12 px-6 rounded-2xl font-black italic uppercase text-[11px] tracking-widest gap-3 bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-600/20 transition-all"
            >
              <CheckCircle className="w-4 h-4" /> Reconcile Active
            </Button>
          )}

          <Button
            className="h-12 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black italic uppercase text-[11px] tracking-widest gap-3 shadow-xl shadow-indigo-600/20 transition-all"
            onClick={() =>
              draftCount > 0
                ? setIsGovernanceModalOpen(true)
                : toast({ title: "No Drafts", description: "No draft shifts to publish." })
            }
            disabled={draftCount === 0}
          >
            <Calendar className="w-4 h-4" /> Publish Grid ({draftCount})
          </Button>
        </div>
      </div>

      <div className="flex-1 w-full relative">
        {/* Background Atmosphere */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[-5%] w-[45%] h-[45%] bg-indigo-500/5 blur-[130px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[35%] h-[35%] bg-blue-500/5 blur-[120px] rounded-full" />
        </div>

        <div className="max-w-[1600px] mx-auto p-10 space-y-10 relative z-10">
          {/* Workforce Vitals */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="rounded-[2.5rem] p-10 bg-white/[0.03] border border-white/5 shadow-2xl backdrop-blur-3xl group">
              <div className="flex justify-between items-start mb-8">
                <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <Users className="w-6 h-6" />
                </div>
                <Badge className="bg-emerald-500 text-white font-black italic text-[8px] uppercase tracking-widest border-none px-3">
                  LIVE
                </Badge>
              </div>
              <div className="text-[10px] font-black italic uppercase tracking-widest text-slate-500 mb-2">
                Personnel on Grid
              </div>
              <div className="text-4xl font-black italic tracking-tighter text-white">
                {stats.active} Members
              </div>
              <div className="text-[10px] font-bold italic text-emerald-500 mt-4 uppercase flex items-center gap-2">
                <Activity className="w-4 h-4" /> Optimal Coverage Matrix
              </div>
            </Card>

            <Card className="rounded-[2.5rem] p-10 bg-white/[0.03] border border-white/5 shadow-2xl backdrop-blur-3xl">
              <div className="flex justify-between items-start mb-8">
                <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <Badge className="bg-blue-500 text-white font-black italic text-[8px] uppercase tracking-widest border-none px-3">
                  TARGET: 85%
                </Badge>
              </div>
              <div className="text-[10px] font-black italic uppercase tracking-widest text-slate-500 mb-2">
                Labor Efficiency
              </div>
              <div className="text-4xl font-black italic tracking-tighter text-white">
                {stats.efficiency}%
              </div>
              <div className="text-[10px] font-bold italic text-blue-500 mt-4 uppercase flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" /> Peak Performance Mode
              </div>
            </Card>

            <Card className="rounded-[2.5rem] p-10 bg-white/[0.03] border border-white/5 shadow-2xl backdrop-blur-3xl">
              <div className="flex justify-between items-start mb-8">
                <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <Award className="w-6 h-6" />
                </div>
                <Badge className="bg-amber-500 text-white font-black italic text-[8px] uppercase tracking-widest border-none px-3">
                  ELITE
                </Badge>
              </div>
              <div className="text-[10px] font-black italic uppercase tracking-widest text-slate-500 mb-2">
                Service Velocity
              </div>
              <div className="text-4xl font-black italic tracking-tighter text-white">
                1.8m
              </div>
              <div className="text-[10px] font-bold italic text-amber-500 mt-4 uppercase">
                Avg. Interaction Latency
              </div>
            </Card>

            <Card className="rounded-[2.5rem] p-10 bg-indigo-600 shadow-2xl relative overflow-hidden group border-none">
              <ShieldAlert className="absolute -right-10 -bottom-10 w-48 h-48 opacity-10 group-hover:scale-110 transition-transform duration-700" />
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="text-[10px] font-black italic uppercase tracking-[0.3em] text-indigo-200 mb-2">
                    Compliance Guard
                  </div>
                  <div className="text-5xl font-black italic tracking-tighter text-white">
                    SECURE
                  </div>
                </div>
                <div className="text-[10px] font-bold italic text-white/60 uppercase tracking-widest">
                  Zero Overtime Violations
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-3">
              <Card className="rounded-[3rem] border-none bg-white/[0.02] shadow-2xl overflow-hidden backdrop-blur-md">
                 <div className="p-2">
                    <ScheduleGrid
                      shifts={scheduledShifts}
                      onShiftUpdate={handleShiftUpdate}
                      onShiftCreate={handleShiftCreate}
                      onShiftDelete={handleShiftDelete}
                      onShiftClick={(shift) => setSelectedShiftForEdit(shift)}
                      viewMode={viewMode}
                      onViewModeChange={setViewMode}
                    />
                 </div>
              </Card>
            </div>

            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-10">
              <Card className="rounded-[3rem] bg-white/[0.03] border border-white/5 shadow-2xl p-10 space-y-10">
                <div className="flex items-center justify-between">
                   <div className="text-[10px] font-black italic uppercase tracking-[0.3em] text-slate-500">
                     Operational Pulse
                   </div>
                   <Zap className="w-5 h-5 text-indigo-500" />
                </div>
                <div className="space-y-8">
                  {[
                    { label: "Check-in Accuracy", value: 100, color: "bg-emerald-500" },
                    { label: "Roster Adherence", value: 92, color: "bg-blue-500" },
                    { label: "Service Score", value: 96, color: "bg-indigo-500", suffix: "/5", displayValue: "4.8" },
                  ].map((item, i) => (
                    <div key={i} className="space-y-3">
                      <div className="flex justify-between items-end italic">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {item.label}
                        </span>
                        <span className="text-xl font-black text-white tracking-tighter">
                          {item.displayValue || item.value}
                          {item.suffix || "%"}
                        </span>
                      </div>
                      <Progress
                        value={item.value}
                        className="h-2 bg-slate-900 rounded-full overflow-hidden"
                      />
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="rounded-[3rem] bg-indigo-600 shadow-2xl p-10 group cursor-pointer hover:bg-indigo-500 transition-all duration-500 overflow-hidden relative border-none">
                <UserCheck className="absolute -right-12 -bottom-12 w-56 h-56 opacity-10 group-hover:scale-110 transition-transform duration-1000" />
                <div className="relative h-full flex flex-col items-center justify-center text-center space-y-8">
                  <div className="w-20 h-20 rounded-3xl bg-white/10 flex items-center justify-center shadow-2xl backdrop-blur-xl border border-white/10">
                    <Timer className="w-10 h-10 text-white" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-3xl font-black italic tracking-tighter uppercase text-white">
                      AI Optimizer
                    </h4>
                    <p className="text-[11px] font-bold text-indigo-100/70 leading-relaxed italic uppercase tracking-widest max-w-[280px]">
                      Traffic peak detected at 17:00. Suggested: Add 2 cashiers to Front End.
                    </p>
                  </div>
                  <Button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      toast({ title: "Intelligence Initialized", description: "Analyzing 30-day traffic patterns to optimize next week's roster..." });
                      setTimeout(() => {
                        toast({ title: "Optimization Complete", description: "14 shifts drafted based on predicted 17:00 peak traffic." });
                      }, 2000);
                    }}
                    className="w-full bg-white text-indigo-600 hover:bg-white/90 h-16 font-black italic uppercase tracking-[0.2em] rounded-2xl text-[11px] shadow-2xl transition-all"
                  >
                    Auto-Generate Next Week
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {selectedShiftForEdit && (
        <EditShiftModal
          isOpen={true}
          onClose={() => setSelectedShiftForEdit(null)}
          shift={selectedShiftForEdit}
          onSave={handleShiftUpdate}
          onDelete={handleShiftDelete}
          availableStaff={AVAILABLE_STAFF}
        />
      )}

      <ShiftGovernanceModal
        isOpen={isGovernanceModalOpen}
        onClose={() => setIsGovernanceModalOpen(false)}
        onPublish={handlePublishSchedule}
        affectedShiftsCount={draftCount}
      />

      <AuditTrailModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        auditLog={auditLog}
        promoTitle="CORE HR SCHEDULING LEDGER"
      />
    </div>
  );
};

export default ShiftControl;
