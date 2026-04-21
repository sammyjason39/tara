import React, { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/core/ui/PageHeader";
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
    session.tenantId!,
    session,
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const data = await retailService.listShifts(
          session.tenantId!,
          session,
          session.locationId,
        );
        setShifts(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to fetch shifts", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [session.tenantId, session.locationId, session]);

  const stats = useMemo(() => {
    const active = shifts.filter((s) => s.status === "open").length;
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
    setScheduledShifts((prev) => prev.filter((s) => s.id !== shiftId));
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
      const affectedCount = scheduledShifts.filter(
        (s) => s.status === "draft",
      ).length;
      await addSignature(
        "Superadmin",
        session.userId,
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
      await retailService.reconcileShift(session.tenantId!, session, activeShift.id);
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

  if (isLoading) {

    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Activity className="w-8 h-8 text-emerald-600 animate-pulse" />
          <p className="text-sm font-black italic uppercase tracking-widest text-slate-400">
            Synchronizing Biometrics & Schedules...
          </p>
        </div>
      </div>
    );
  }

  const draftCount = scheduledShifts.filter((s) => s.status === "draft").length;

  return (
    <div className="flex flex-col min-h-full">
      <div className="px-6 py-6 border-b bg-white shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Workforce Intelligence Hub"
          subtitle={`Node: ${session.locationId || "CENTRAL"} • Labor Efficiency: ${stats.efficiency}% • Risk: LOW`}
        />
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="h-11 rounded-xl px-4 font-black italic border-slate-200 text-xs uppercase tracking-widest gap-2 hover:bg-slate-50 text-slate-700"
            onClick={() => setIsAuditModalOpen(true)}
          >
            <FileText className="w-3.5 h-3.5" /> Core HR Ledger
          </Button>
          <Button
            onClick={() =>
              draftCount > 0
                ? setIsGovernanceModalOpen(true)
                : toast({
                    title: "No Drafts",
                    description: "No draft shifts to publish.",
                  })
            }
            disabled={draftCount === 0}
            <Calendar className="w-4 h-4" /> Publish to Grid ({draftCount})
          </Button>

          {activeShift && (
            <Button
              onClick={handleReconcileActive}
              className="h-11 px-6 rounded-xl font-black italic uppercase text-xs tracking-widest gap-2 shadow-lg bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle className="w-4 h-4" /> Reconcile Active Shift
            </Button>
          )}
        </div>

      </div>

      <div className="flex-1 w-full bg-slate-50 p-6 lg:p-8">
        <div className="max-w-[1400px] mx-auto space-y-8">
          {/* Workforce Vitals */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="rounded-[2rem] p-6 bg-white border-none shadow-xl relative overflow-hidden">
              <div className="flex justify-between items-start mb-6">
                <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-600">
                  <Users className="w-5 h-5" />
                </div>
                <Badge className="bg-emerald-50 text-emerald-700 font-black italic text-[8px] uppercase tracking-widest border-none">
                  LIVE
                </Badge>
              </div>
              <div className="text-[10px] font-black italic uppercase tracking-widest text-slate-400 mb-1">
                Personnel on Grid
              </div>
              <div className="text-3xl font-black italic tracking-tighter text-slate-900">
                {stats.active} Members
              </div>
              <div className="text-[10px] font-bold italic text-slate-400 mt-2 uppercase flex items-center gap-1">
                <Activity className="w-3 h-3 text-emerald-500" /> Optimal
                Coverage
              </div>
            </Card>

            <Card className="rounded-[2rem] p-6 bg-white border-none shadow-xl relative overflow-hidden">
              <div className="flex justify-between items-start mb-6">
                <div className="p-4 rounded-2xl bg-blue-50 text-blue-600">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <Badge className="bg-blue-50 text-blue-700 font-black italic text-[8px] uppercase tracking-widest border-none">
                  TARGET: 85%
                </Badge>
              </div>
              <div className="text-[10px] font-black italic uppercase tracking-widest text-slate-400 mb-1">
                Labor Efficiency
              </div>
              <div className="text-3xl font-black italic tracking-tighter text-slate-900">
                {stats.efficiency}%
              </div>
              <div className="text-[10px] font-bold italic text-slate-400 mt-2 uppercase flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-500" /> Near Peak Capacity
              </div>
            </Card>

            <Card className="rounded-[2rem] p-6 bg-white border-none shadow-xl relative overflow-hidden">
              <div className="flex justify-between items-start mb-6">
                <div className="p-4 rounded-2xl bg-amber-50 text-amber-600">
                  <Award className="w-5 h-5" />
                </div>
                <Badge className="bg-amber-50 text-amber-700 font-black italic text-[8px] uppercase tracking-widest border-none">
                  ELITE
                </Badge>
              </div>
              <div className="text-[10px] font-black italic uppercase tracking-widest text-slate-400 mb-1">
                Service Velocity
              </div>
              <div className="text-3xl font-black italic tracking-tighter text-slate-900">
                1.8m
              </div>
              <div className="text-[10px] font-bold italic text-slate-400 mt-2 uppercase">
                Avg. Interaction Time
              </div>
            </Card>

            <Card className="rounded-[2rem] p-6 bg-slate-900 text-white shadow-2xl relative overflow-hidden group">
              <ShieldAlert className="absolute -right-8 -bottom-8 w-32 h-32 opacity-10 group-hover:scale-110 transition-transform" />
              <div className="relative z-10">
                <div className="text-[10px] font-black italic uppercase tracking-widest text-amber-400 mb-4">
                  Compliance Guard
                </div>
                <div className="text-4xl font-black italic tracking-tighter text-emerald-400">
                  SECURE
                </div>
                <div className="text-[10px] font-bold italic opacity-60 mt-4 uppercase">
                  No Overtime Violations
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-3 space-y-8">
              {/* Advanced Schedule Maker component */}
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

            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Performance Feed */}
              <Card className="rounded-[2.5rem] bg-white border-none shadow-xl p-8 space-y-8">
                <div className="text-[10px] font-black italic uppercase tracking-widest text-slate-400">
                  Operational Pulse
                </div>
                <div className="space-y-6">
                  {[
                    { label: "Check-in Accuracy", value: 100, trend: "UP" },
                    { label: "Roster Adherence", value: 92, trend: "STABLE" },
                    {
                      label: "Service Score",
                      value: 4.8,
                      trend: "UP",
                      suffix: "/5",
                    },
                  ].map((item, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between items-end italic">
                        <span className="text-[10px] font-black text-slate-500 uppercase">
                          {item.label}
                        </span>
                        <span className="text-sm font-black text-slate-900">
                          {item.value}
                          {item.suffix || "%"}
                        </span>
                      </div>
                      <Progress
                        value={item.value > 5 ? item.value * 20 : item.value}
                        className="h-1 bg-slate-100"
                      />
                    </div>
                  ))}
                </div>
              </Card>

              {/* Shift Suggestion */}
              <Card className="rounded-[2.5rem] bg-indigo-600 text-white p-8 group cursor-pointer hover:bg-indigo-700 transition-all overflow-hidden relative border-none">
                <UserCheck className="absolute -right-8 -bottom-8 w-40 h-40 opacity-10 group-hover:scale-110 transition-transform" />
                <div className="relative space-y-6 text-center">
                  <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto shadow-xl backdrop-blur-sm">
                    <Timer className="w-7 h-7" />
                  </div>
                  <h4 className="text-xl font-black italic tracking-tighter uppercase">
                    Optimal Roster
                  </h4>
                  <p className="text-xs font-medium opacity-70 leading-relaxed italic px-4">
                    Traffic peak detected at 17:00. Suggested: Add 2 cashiers to
                    Front End.
                  </p>
                  <Button disabled title="Not available yet" className="w-full bg-white text-indigo-900 hover:bg-white/90 h-12 font-black italic uppercase tracking-widest rounded-xl text-[10px]">
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
