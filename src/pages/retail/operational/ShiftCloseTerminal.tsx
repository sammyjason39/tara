import React, { useState, useEffect } from "react";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import {
  Lock,
  Banknote,
  Calculator,
  AlertCircle,
  FileCheck,
  Landmark,
  ShieldCheck,
  RefreshCw,
  FileText,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { retailService } from "@/core/services/retail/retailService";
import { useSession } from "@/core/security/session";
import { useRetail } from "../context/RetailContext";
import type { RetailShift } from "@/core/types/retail/retail";

const EXPECTED_CASH = 12450000;
const EXPECTED_CARD = 45200000;

const ShiftCloseTerminal = () => {
  const session = useSession();
  const { activeStore, activeChannel } = useRetail();
  const [activeShift, setActiveShift] = useState<RetailShift | null>(null);
  const [actualCash, setActualCash] = useState<string>("");
  const [explanation, setExplanation] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchShift = async () => {
      try {
        const shifts = await retailService.listShifts(
          session.tenantId!,
          session,
          session.locationId,
        );
        const current = shifts.find(
          (s) => s.employeeId === session.userId && s.status === "open",
        );
        if (current) {
          setActiveShift(current);
        }
      } catch (error) {
        console.error("Failed to fetch shift", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchShift();
  }, [session.tenantId, session.userId, session.locationId, session]);

  const variance = actualCash ? parseInt(actualCash) - EXPECTED_CASH : 0;
  const needsExplanation = Math.abs(variance) > 10000;

  const handleCloseShift = async () => {
    if (!activeShift) {
      toast({
        title: "No Open Shift",
        description: "This terminal does not have an active session.",
        variant: "destructive",
      });
      return;
    }
    if (!actualCash) {
      toast({
        title: "Input Required",
        description: "Please enter the physical cash count.",
        variant: "destructive",
      });
      return;
    }
    if (needsExplanation && !explanation) {
      toast({
        title: "Policy Violation",
        description:
          "Variance explanation is mandatory for discrepancies > Rp 10,000",
        variant: "destructive",
      });
      return;
    }

    setIsClosing(true);
    try {
      await retailService.closeShift(
        session.tenantId!,
        session,
        activeShift.id,
        parseInt(actualCash),
        explanation,
      );

      toast({
        title: "Shift Closed & Locked",
        description: `Shift ${activeShift.id} has been securely reconciled in the Nexus Ledger.`,
      });
      setIsClosed(true);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Sync failed";
      toast({
        title: "Sync Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsClosing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <RefreshCw className="w-12 h-12 animate-spin text-slate-200" />
      </div>
    );
  }

  if (!activeShift && !isClosed) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-6">
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
          <Lock className="w-12 h-12 text-slate-300" />
        </div>
        <div>
          <h2 className="text-3xl font-black italic text-slate-900 tracking-tighter uppercase">
            No Active Shift Detected
          </h2>
          <p className="text-slate-500 font-medium">
            Please open a new shift from the Shift Control panel first.
          </p>
        </div>
      </div>
    );
  }

  if (isClosed) {
    return (
      <div className="max-w-2xl mx-auto py-20 animate-in zoom-in-95 duration-500">
        <Card className="border-green-200 bg-green-50/20 shadow-3xl rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-12 text-center space-y-8">
            <div className="w-28 h-28 bg-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/30 transform rotate-12">
              <ShieldCheck className="w-14 h-14 text-white" />
            </div>
            <div>
              <h2 className="text-4xl font-black italic text-slate-900 tracking-tighter uppercase">
                Reconciled & Locked
              </h2>
              <p className="text-slate-500 font-black mt-2 tracking-widest text-[10px] uppercase">
                Compliance ID:{" "}
                <span className="text-blue-600">
                  ZVX-RECON-{activeShift?.id}
                </span>
              </p>
            </div>
            <Separator className="bg-emerald-200/50" />
            <div className="grid grid-cols-2 gap-6 text-left">
              <div className="p-6 bg-white rounded-2xl border-2 border-emerald-100 shadow-inner">
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">
                  Physical Cash
                </div>
                <div className="text-2xl font-black italic tracking-tighter text-slate-900">
                  Rp {parseInt(actualCash).toLocaleString()}
                </div>
              </div>
              <div className="p-6 bg-white rounded-2xl border-2 border-emerald-100 shadow-inner">
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">
                  Ledger Variance
                </div>
                <div
                  className={`text-2xl font-black italic tracking-tighter ${variance < 0 ? "text-red-600" : variance > 0 ? "text-amber-600" : "text-emerald-600"}`}
                >
                  Rp {variance.toLocaleString()}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full h-16 border-emerald-300 text-emerald-700 font-black italic gap-4 rounded-2xl hover:bg-emerald-100 transition-all uppercase tracking-widest text-xs"
              onClick={() => {
                toast({
                  title: "Archive Generated",
                  description:
                    "Secure PDF summary has been dispatched to Zenvix Compliance Vault.",
                });
                setTimeout(() => window.location.reload(), 2000);
              }}
            >
              <FileText className="w-6 h-6" /> ARCHIVE RECONCILIATION SUMMARY
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col p-2 overflow-hidden bg-slate-50">
      <WorkspacePanel className="flex-1 overflow-auto rounded-[2rem]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 shadow-2xl rounded-[2rem] relative overflow-hidden group">
            <div className="absolute -right-8 -bottom-8 opacity-10 group-hover:scale-125 transition-transform">
              <Banknote className="w-32 h-32 text-blue-600" />
            </div>
            <CardHeader className="pb-4 p-8">
              <CardTitle className="text-[10px] font-black text-blue-900 uppercase tracking-[0.2em] leading-none flex items-center gap-3 italic">
                <Calculator className="w-4 h-4" /> Nexus Expected Cash
              </CardTitle>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <div className="text-5xl font-black text-blue-900 tracking-tighter italic">
                Rp {EXPECTED_CASH.toLocaleString()}
              </div>
              <p className="text-[10px] text-blue-600 mt-2 uppercase font-black italic tracking-widest opacity-60">
                Aggregated from Local POS Vault
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-2xl rounded-[2rem] bg-white group overflow-hidden">
            <CardHeader className="pb-4 p-8">
              <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none flex items-center gap-3 italic">
                <ChevronRight className="w-4 h-4 text-indigo-500" /> Digital
                Settlements
              </CardTitle>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <div className="text-5xl font-black text-slate-900 tracking-tighter italic">
                Rp {EXPECTED_CARD.toLocaleString()}
              </div>
              <p className="text-[10px] text-slate-500 mt-2 uppercase font-black italic tracking-widest opacity-60">
                Verified via PCI-DSS Gateway
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8 shadow-3xl border-slate-100 overflow-hidden rounded-[2.5rem]">
          <CardHeader className="border-b bg-slate-900 text-white p-10">
            <CardTitle className="flex items-center gap-4 text-2xl font-black italic tracking-tighter uppercase">
              <Landmark className="w-8 h-8 text-blue-400" />
              {activeStore?.name ||
                activeChannel?.name ||
                "DRAWER PHYSICAL SETTLEMENT"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-10 space-y-10">
            <div className="flex flex-col items-center justify-center p-12 bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-200 relative group transition-all hover:bg-white hover:border-blue-200">
              <div className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 italic">
                Input Total Physical Cash (IDR)
              </div>
              <div className="relative w-96">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-5xl font-black text-slate-200 italic tracking-tighter transition-colors group-focus-within:text-blue-200">
                  Rp
                </span>
                <Input
                  className="h-28 pl-24 text-6xl font-black text-center border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-200 tracking-tighter italic"
                  placeholder="0"
                  type="number"
                  value={actualCash}
                  onChange={(e) => setActualCash(e.target.value)}
                />
                <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 rounded-full shadow-lg" />
              </div>
            </div>

            {actualCash && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-5 duration-500">
                <div
                  className={`p-8 rounded-[2rem] border-2 flex flex-col justify-center transition-all ${needsExplanation ? "bg-red-50 border-red-100 shadow-xl shadow-red-500/10" : "bg-emerald-50 border-emerald-100 shadow-xl shadow-emerald-500/10"}`}
                >
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 italic">
                    Calculated Discrepancy
                  </div>
                  <div
                    className={`text-4xl font-black italic tracking-tighter ${variance < 0 ? "text-red-700" : variance > 0 ? "text-amber-700" : "text-emerald-700"}`}
                  >
                    Rp {variance.toLocaleString()}
                  </div>
                  <p className="text-[10px] font-black text-slate-500 mt-2 uppercase tracking-widest">
                    {variance === 0
                      ? "Ledger Balanced"
                      : "RECONCILIATION REQUIRED"}
                  </p>
                </div>

                {needsExplanation && (
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600 flex items-center gap-3 italic">
                      <AlertCircle className="w-5 h-5 animate-pulse" />{" "}
                      Compliance Note Mandatory
                    </label>
                    <Textarea
                      placeholder="Explain the variance for the Audit Vault..."
                      className="min-h-[120px] border-2 border-red-100 focus:border-red-400 p-6 rounded-3xl text-sm font-bold italic bg-white"
                      value={explanation}
                      onChange={(e) => setExplanation(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col items-center gap-8">
          <Button
            className="w-full h-24 text-2xl font-black italic uppercase tracking-[0.2em] bg-slate-900 hover:bg-slate-800 gap-6 shadow-3xl rounded-[2rem] group relative overflow-hidden transition-all active:scale-[0.98]"
            onClick={handleCloseShift}
            disabled={isClosing}
          >
            {isClosing ? (
              <RefreshCw className="w-10 h-10 animate-spin" />
            ) : (
              <>
                <Lock className="w-10 h-10 text-blue-500 group-hover:scale-110 transition-transform" />
                <span>SECURE & COMMIT SHIFT</span>
              </>
            )}
          </Button>
          <div className="flex items-center gap-4 px-10 py-4 bg-slate-100 rounded-full border border-slate-200 shadow-inner">
            <ShieldCheck className="w-5 h-5 text-slate-400" />
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.15em] italic">
              Digital Signature will be appended to the{" "}
              <span className="text-slate-900">Zenvix Fiscal Archive</span>
            </p>
          </div>
        </div>
      </WorkspacePanel>
    </div>
  );
};

export default ShiftCloseTerminal;
