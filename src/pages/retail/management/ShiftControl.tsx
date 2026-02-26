import React, { useState, useEffect } from "react";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import {
  Clock,
  Calendar,
  Lock,
  Unlock,
  AlertTriangle,
  ShieldAlert,
  Zap,
  Timer,
  Users,
  UserPlus,
  RefreshCw,
  Power,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { retailService } from "@/core/services/retail/retailService";
import { useSession } from "@/core/security/session";
import { useRetail } from "../context/RetailContext";
import type { RetailShift } from "@/core/types/retail/retail";

const ShiftControl = () => {
  const session = useSession();
  const { activeStore, activeChannel } = useRetail();
  const [shifts, setShifts] = useState<RetailShift[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await retailService.listShifts(
          session.tenantId!,
          session,
          session.locationId,
        );
        setShifts(data);
      } catch (error) {
        console.error("Failed to fetch shifts", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [session.tenantId, session.locationId, session]);

  const activeShift = shifts.find((s) => s.status === "open");

  const handleToggleStore = async () => {
    if (!session.locationId) {
      toast({
        title: "Location Not Selected",
        description: "Please select a branch before opening a shift.",
        variant: "destructive",
      });
      return;
    }

    setIsSyncing(true);
    try {
      if (activeShift) {
        await retailService.closeShift(
          session.tenantId!,
          session,
          activeShift.id,
          5000,
        ); // Mock closing balance
        toast({
          title: "Shift Session Closed",
          description: `All terminals for shift ${activeShift.id} have been synchronized.`,
        });
      } else {
        const newShift = await retailService.openShift(
          session.tenantId!,
          session,
          session.locationId,
          1000,
        );
        toast({
          title: "New Shift Opened",
          description: `Shift ${newShift.id} is now live mapping to ${session.locationId}.`,
        });
      }
      // Refresh data
      const data = await retailService.listShifts(
        session.tenantId!,
        session,
        session.locationId,
      );
      setShifts(data);
    } catch (error) {
      console.error("Shift toggle failed", error);
      toast({
        title: "Operation Failed",
        description: "Could not update shift state.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workforce & Session Control"
        subtitle={`${activeStore?.name || activeChannel?.name || session.tenantId} • Operational Gatekeeping • Roster Enforcement`}
      />

      <WorkspacePanel>
        <div
          className={`flex flex-col md:flex-row items-center justify-between p-8 rounded-[2.5rem] mb-8 shadow-2xl transition-all border-4 ${activeShift ? "bg-slate-900 border-green-500/30" : "bg-red-950/20 border-red-500/30"}`}
        >
          <div className="flex items-center gap-6 mb-6 md:mb-0">
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center border-2 ${activeShift ? "bg-green-500/10 border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.2)]" : "bg-red-500/10 border-red-500/50"}`}
            >
              {activeShift ? (
                <Unlock className="w-10 h-10 text-green-400" />
              ) : (
                <Lock className="w-10 h-10 text-red-500" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2
                  className={`text-3xl font-black italic tracking-tighter ${activeShift ? "text-white" : "text-red-500"}`}
                >
                  {activeShift ? "STORE LIVE" : "TERMINALS LOCKED"}
                </h2>
                {activeShift && (
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
                )}
              </div>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                {activeShift
                  ? `Session ID: ${activeShift.id}`
                  : "NO ACTIVE SESSION"}{" "}
                • {activeStore?.name || activeChannel?.name || "Global Hub"}
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <Button
              variant={activeShift ? "destructive" : "default"}
              className={`h-16 px-10 rounded-2xl font-black italic tracking-widest uppercase gap-3 shadow-xl ${!activeShift && "bg-green-600 hover:bg-green-700"}`}
              onClick={handleToggleStore}
              disabled={isSyncing || isLoading}
            >
              {isSyncing ? (
                <RefreshCw className="w-6 h-6 animate-spin" />
              ) : activeShift ? (
                <>
                  <Power className="w-6 h-6" /> Terminate Day
                </>
              ) : (
                <>
                  <Zap className="w-6 h-6" /> Initialize Day
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card className="shadow-xl border-slate-200 rounded-[2rem] overflow-hidden">
              <CardHeader className="bg-slate-50 border-b p-6 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-black italic uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <Timer className="w-5 h-5 text-blue-600" />
                  Active Shift Timeline
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-blue-600 font-bold italic text-xs gap-1 hover:bg-blue-50"
                >
                  <UserPlus className="w-3 h-3" /> Adjust Roster
                </Button>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-6">
                  {isLoading ? (
                    <div className="py-10 text-center text-slate-400 font-black italic uppercase tracking-widest animate-pulse">
                      Scanning Roster Hub...
                    </div>
                  ) : shifts.length > 0 ? (
                    shifts.map((s, i) => (
                      <div
                        key={i}
                        className="group p-6 rounded-2xl border border-slate-100 hover:border-blue-100 transition-all bg-white relative"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black italic shadow-lg">
                              {s.employeeId.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-black italic text-slate-900 tracking-tight">
                                {s.employeeId}
                              </div>
                              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                Store: {s.storeId} • Open:{" "}
                                {new Date(s.startTime).toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                          <Badge
                            className={`${s.status === "open" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"} font-black italic border-none text-[8px] tracking-widest uppercase`}
                          >
                            {s.status}
                          </Badge>
                        </div>
                        <Progress
                          value={s.status === "open" ? 45 : 100}
                          className="h-1.5 bg-slate-100"
                        />
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-red-500"
                          >
                            <Power className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-10 text-center text-slate-400 font-black italic uppercase tracking-widest">
                      No Recent Shift Activity
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-slate-900 text-white shadow-xl rounded-3xl overflow-hidden group">
                <CardHeader>
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500 italic">
                    Labor Compliance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex justify-between items-end">
                    <div className="text-5xl font-black italic tracking-tighter">
                      100%
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-black opacity-40 uppercase">
                        Safe Hours
                      </div>
                      <Badge className="bg-amber-600 font-black italic text-[9px]">
                        NO_VIOLATIONS
                      </Badge>
                    </div>
                  </div>
                  <Progress value={100} className="h-2 bg-slate-800" />
                  <p className="text-[10px] text-slate-400 italic">
                    All break protocols verified by biometric attendance sync.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-indigo-100 bg-indigo-50/20 shadow-xl rounded-3xl overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest text-indigo-900 italic">
                    Auto-Verification
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-white/60 p-4 rounded-xl border border-indigo-100">
                    <div className="text-xs font-black italic mb-1">
                      Terminal Auth Pulse
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-indigo-400" />
                      <span className="text-[10px] font-bold text-slate-500 tracking-tighter uppercase italic">
                        Matched with JD Roster Entry
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full text-[10px] font-black uppercase border-indigo-200 text-indigo-700 hover:bg-indigo-100 italic h-10 transition-all"
                  >
                    Verification Logs
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="space-y-8">
            <Card className="border-red-200 bg-red-50/20 shadow-xl rounded-[2.5rem] overflow-hidden border-2">
              <CardHeader className="p-8 pb-0">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-red-700 italic flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" /> Emergency Protocol
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="space-y-3">
                  <div className="text-sm font-black italic tracking-tight text-red-950">
                    Immediate Terminal Shutdown
                  </div>
                  <p className="text-xs text-red-800/80 leading-relaxed font-medium">
                    Instantly lock all point-of-sale systems, weighing scales,
                    and receiving terminals across the branch.
                  </p>
                </div>
                <Button className="w-full h-14 bg-red-600 hover:bg-red-700 text-white font-black italic uppercase tracking-widest shadow-lg shadow-red-900/20 gap-2">
                  <Lock className="w-5 h-5" /> LOCK BRANCH NOW
                </Button>
                <Separator className="bg-red-200" />
                <div className="bg-white p-4 rounded-xl border border-red-100">
                  <div className="text-[10px] font-black text-red-700 uppercase mb-2 italic">
                    Policy Override Required
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium leading-relaxed italic">
                    Use this only for verified security breaches or regulatory
                    enforcement.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-slate-200 rounded-3xl overflow-hidden group">
              <CardHeader className="p-6 pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">
                  Workforce Pulse
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="w-10 h-10 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center font-black italic text-slate-300 text-xs shadow-sm"
                      >
                        U{i}
                      </div>
                    ))}
                    <div className="w-10 h-10 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center text-white font-black text-xs shadow-sm">
                      +2
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-black italic">
                      {shifts.filter((s) => s.status === "open").length} Online
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                      Active Terminal Coverage
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  className="w-full h-12 text-[10px] font-black uppercase text-blue-600 gap-2 italic hover:bg-blue-50 border-2 border-dashed border-slate-200 group-hover:border-blue-200 transition-all rounded-2xl"
                >
                  Broadcast to Team <Zap className="w-3 h-3" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </WorkspacePanel>
    </div>
  );
};

export default ShiftControl;
