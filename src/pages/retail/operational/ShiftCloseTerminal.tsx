import React, { useState, useEffect } from "react";
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
  ShieldAlert,
  Fingerprint,
  X,
  ArrowDownCircle,
  ArrowUpCircle,
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

const ShiftCloseTerminal = () => {
  const session = useSession();
  const { activeStore, activeChannel, activeShift, refreshState, isLoading: isContextLoading } = useRetail();
  const [expectedCash, setExpectedCash] = useState<number>(0);
  const [expectedCard, setExpectedCard] = useState<number>(0);
  const [actualCash, setActualCash] = useState<string>("");
  const [explanation, setExplanation] = useState("");
  const [closingNote, setClosingNote] = useState("");
  const [complianceNote, setComplianceNote] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isContextLoading && activeShift) {
      setExpectedCash(activeShift.expectedCash ? Number(activeShift.expectedCash) : 0);
      setExpectedCard(0);
      setIsLoading(false);
    } else if (!isContextLoading && !activeShift && !isClosed) {
      setIsLoading(false);
    }
  }, [activeShift, isContextLoading, isClosed]);

  const parseAmount = (val: string | number) => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    // For IDR, strip everything that isn't a digit to avoid locale parsing bugs
    const clean = val.toString().replace(/[^0-9]/g, '');
    return parseInt(clean, 10) || 0;
  };

  const variance = actualCash ? parseAmount(actualCash) - expectedCash : 0;
  const needsExplanation = Math.abs(variance) > 10000;

  interface CashMovement {
    amount: number | string;
    type: "CASH_IN" | "CASH_OUT";
  }

  const totalCashOut = (activeShift?.cash_movements as CashMovement[] || [])
    .filter((m) => m.type === "CASH_OUT")
    .reduce((sum, m) => sum + Number(m.amount), 0);

  const totalCashIn = (activeShift?.cash_movements as CashMovement[] || [])
    .filter((m) => m.type === "CASH_IN")
    .reduce((sum, m) => sum + Number(m.amount), 0);

  const netAdjustments = totalCashIn - totalCashOut;

  const handleCloseShift = async () => {
    if (!activeShift) {
      toast({ title: "Session Missing", description: "No active shift detected on this node.", variant: "destructive" });
      return;
    }
    if (!actualCash) {
      toast({ title: "Input Required", description: "Please enter the physical tender count.", variant: "destructive" });
      return;
    }
    if (!closingNote.trim() || !complianceNote.trim()) {
      toast({ title: "Incomplete Protocol", description: "Closing and Compliance notes are mandatory.", variant: "destructive" });
      return;
    }
    if (needsExplanation && !explanation) {
      toast({ title: "Policy Violation", description: "Variance explanation is mandatory for discrepancies > Rp 10,000", variant: "destructive" });
      return;
    }

    setIsClosing(true);
    try {
      await retailService.closeShift(
        session.tenant_id!,
        session,
        activeShift.id,
        parseAmount(actualCash),
        explanation,
        closingNote,
        complianceNote,
      );

      toast({ title: "Shift Reconciled", description: `Node session ${(activeShift?.id || "").slice(-6).toUpperCase()} locked in Zenvix Vault.` });
      setIsClosed(true);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Sync failed";
      toast({ title: "Commit Failed", description: message, variant: "destructive" });
    } finally {
      setIsClosing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-400 font-black italic uppercase tracking-[0.25em]">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[50%] h-[50%] bg-indigo-500/20 blur-[150px] rounded-full animate-pulse" />
        </div>
        <RefreshCw className="w-16 h-16 mb-8 animate-spin text-indigo-500 relative z-10" />
        <span className="relative z-10 text-white">Hydrating Fiscal Telemetry...</span>
      </div>
    );
  }

  if (!activeShift && !isClosed) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-slate-500">
        <div className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center mb-8 border border-white/10 shadow-2xl">
          <Lock className="w-10 h-10 text-slate-700" />
        </div>
        <h2 className="text-3xl font-black italic text-white tracking-tighter uppercase mb-2">
          Node Locked
        </h2>
        <p className="font-bold uppercase tracking-widest text-[10px] text-slate-600">
          No active shift detected on this terminal
        </p>
      </div>
    );
  }

  if (isClosed) {
    return (
      <div className="h-[calc(100vh-64px)] flex items-center justify-center bg-slate-950 p-8">
        <Card className="max-w-2xl w-full border-none bg-emerald-500/5 backdrop-blur-3xl shadow-2xl rounded-[3rem] overflow-hidden">
          <CardContent className="p-16 text-center space-y-10">
            <div className="w-32 h-32 bg-emerald-600 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/30 transform rotate-12 transition-transform hover:rotate-0 duration-500">
              <ShieldCheck className="w-16 h-16 text-white" />
            </div>
            <div>
              <h2 className="text-4xl font-black italic text-white tracking-tighter uppercase">
                Reconciled & Sealed
              </h2>
              <p className="text-emerald-500 font-black mt-3 tracking-[0.3em] text-[10px] uppercase italic">
                Compliance ID: <span className="text-white">ZVX-RECON-{(activeShift?.id || "").slice(-8).toUpperCase()}</span>
              </p>
            </div>
            <Separator className="bg-emerald-500/20" />
            <div className="grid grid-cols-2 gap-8 text-left">
              <div className="p-8 bg-white/5 rounded-[2rem] border border-emerald-500/20 shadow-inner">
                <div className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest mb-2 italic">
                  Physical Tender
                </div>
                <div className="text-3xl font-black italic tracking-tighter text-white">
                  Rp {parseAmount(actualCash).toLocaleString()}
                </div>
              </div>
              <div className="p-8 bg-white/5 rounded-[2rem] border border-emerald-500/20 shadow-inner">
                <div className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest mb-2 italic">
                  Ledger Variance
                </div>
                <div className={`text-3xl font-black italic tracking-tighter ${variance < 0 ? "text-rose-500" : variance > 0 ? "text-amber-500" : "text-emerald-500"}`}>
                  Rp {variance.toLocaleString()}
                </div>
              </div>
            </div>
            <Button
              className="w-full h-20 bg-emerald-600 hover:bg-emerald-500 text-white font-black italic gap-4 rounded-2xl shadow-2xl shadow-emerald-600/20 transition-all uppercase tracking-[0.2em] text-sm"
              onClick={async () => {
                await refreshState();
                window.location.href = "/m/retail/operational/gateway";
              }}
            >
              <FileText className="w-7 h-7" /> Archive & Restart Node
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] overflow-hidden bg-slate-900 relative flex selection:bg-indigo-500 selection:text-white">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[45%] h-[45%] bg-indigo-500/10 blur-[130px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[35%] h-[35%] bg-blue-500/10 blur-[120px] rounded-full animate-pulse" />
      </div>

      <div className="flex-1 overflow-y-auto p-8 relative z-10 custom-scrollbar">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                <Landmark className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">
                  Shift Reconciliation
                </h1>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] ml-1">
                  Terminal ID: {session.location_id || "LOCAL_VAULT"} • v2.4.0
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span className="text-[10px] font-black italic uppercase text-emerald-500 tracking-widest">
                  Compliance: ACTIVE
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-none bg-blue-600/10 backdrop-blur-3xl shadow-2xl rounded-[2.5rem] relative overflow-hidden group">
              <div className="absolute -right-8 -bottom-8 opacity-10 group-hover:scale-125 transition-transform">
                <Banknote className="w-32 h-32 text-blue-500" />
              </div>
              <CardHeader className="pb-4 p-10">
                <CardTitle className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] leading-none flex items-center gap-3 italic">
                  <Calculator className="w-4 h-4" /> Expected Cash Tender
                </CardTitle>
              </CardHeader>
              <CardContent className="px-10 pb-10">
                <div className="text-6xl font-black text-white tracking-tighter italic">
                  Rp {expectedCash.toLocaleString()}
                </div>
                {netAdjustments !== 0 && (
                  <div className={`mt-3 text-[10px] font-black uppercase tracking-widest italic flex items-center gap-2 ${netAdjustments < 0 ? "text-rose-500" : "text-emerald-500"}`}>
                    {netAdjustments < 0 ? <ArrowDownCircle className="w-3 h-3" /> : <ArrowUpCircle className="w-3 h-3" />}
                    Petty Cash: {netAdjustments < 0 ? "-" : "+"}Rp {Math.abs(netAdjustments).toLocaleString()}
                  </div>
                )}
                <p className="text-[10px] text-blue-500 mt-4 uppercase font-black italic tracking-widest opacity-60">
                  Aggregated from Live Transaction Stream
                </p>
              </CardContent>
            </Card>

            <Card className="border-none bg-white/5 backdrop-blur-3xl shadow-2xl rounded-[2.5rem] group overflow-hidden">
              <CardHeader className="pb-4 p-10">
                <CardTitle className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] leading-none flex items-center gap-3 italic">
                  <ChevronRight className="w-4 h-4 text-indigo-500" /> Electronic Settlements
                </CardTitle>
              </CardHeader>
              <CardContent className="px-10 pb-10">
                <div className="text-6xl font-black text-white tracking-tighter italic">
                  Rp {expectedCard.toLocaleString()}
                </div>
                <p className="text-[10px] text-slate-500 mt-4 uppercase font-black italic tracking-widest opacity-60 text-right">
                  Verified PCI Gateway Consolidations
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-2xl border-none bg-white/5 backdrop-blur-3xl overflow-hidden rounded-[3rem]">
            <CardHeader className="bg-slate-950 text-white p-12 border-b border-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-3xl font-black italic tracking-tighter uppercase">
                    Physical Tender Audit
                  </CardTitle>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-1">
                    Node: {activeStore?.name || "Global Hub"}
                  </p>
                </div>
                <Fingerprint className="w-12 h-12 text-blue-600 opacity-50" />
              </div>
            </CardHeader>
            <CardContent className="p-12 space-y-12">
              <div className="flex flex-col items-center justify-center p-16 bg-white/[0.02] rounded-[3.5rem] border-4 border-dashed border-white/10 relative group transition-all hover:bg-white/[0.04] hover:border-indigo-500/30">
                <div className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] mb-10 italic">
                  Input Final Physical Count (IDR)
                </div>
                <div className="relative w-full max-w-xl">
                  <span className="absolute left-8 top-1/2 -translate-y-1/2 text-6xl font-black text-white/10 italic tracking-tighter transition-colors group-focus-within:text-indigo-500/30">
                    Rp
                  </span>
                  <Input
                    className="h-32 pl-32 text-8xl font-black text-center border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-white/5 text-white tracking-tighter italic"
                    placeholder="0"
                    type="tel"
                    value={actualCash}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      if (raw) {
                        setActualCash(parseInt(raw, 10).toLocaleString('id-ID'));
                      } else {
                        setActualCash("");
                      }
                    }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 rounded-full shadow-[0_0_20px_rgba(79,70,229,0.4)]" />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-3 italic px-2">
                    <FileCheck className="w-5 h-5 text-indigo-500" /> Operational Summary
                  </label>
                  <Textarea
                    placeholder="Handover notes, operational remarks, or shift highlights..."
                    className="min-h-[120px] border-none bg-white/5 focus:bg-white/10 p-8 rounded-[2rem] text-sm font-bold italic text-white transition-all custom-scrollbar"
                    value={closingNote}
                    onChange={(e) => setClosingNote(e.target.value)}
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-500 flex items-center gap-3 italic px-2">
                    <ShieldAlert className="w-5 h-5" /> Fiscal Compliance Declaration
                  </label>
                  <Textarea
                    placeholder="Declare overrides, confirm tax integrity, and sign-off on totals..."
                    className="min-h-[120px] border-none bg-white/5 focus:bg-white/10 p-8 rounded-[2rem] text-sm font-bold italic text-white transition-all custom-scrollbar"
                    value={complianceNote}
                    onChange={(e) => setComplianceNote(e.target.value)}
                  />
                </div>
              </div>

              {actualCash && (
                <div className={`p-10 rounded-[2.5rem] border-2 flex flex-col justify-center transition-all animate-in slide-in-from-bottom-8 duration-700 ${needsExplanation ? "bg-rose-500/10 border-rose-500/30 shadow-[0_0_50px_rgba(244,63,94,0.1)]" : "bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.1)]"}`}>
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-2 italic">
                        Calculated Reconciliation Delta
                      </div>
                      <div className={`text-6xl font-black italic tracking-tighter ${variance < 0 ? "text-rose-500" : variance > 0 ? "text-amber-500" : "text-emerald-500"}`}>
                        Rp {variance.toLocaleString()}
                      </div>
                    </div>
                    {needsExplanation && (
                      <div className="flex-1 max-w-md space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500 flex items-center gap-3 italic">
                          <AlertCircle className="w-5 h-5 animate-pulse" /> Discrepancy Justification Mandatory
                        </label>
                        <Textarea
                          placeholder="Provide root cause for Audit Vault..."
                          className="min-h-[100px] border-none bg-black/20 focus:bg-black/40 p-6 rounded-2xl text-sm font-bold italic text-white"
                          value={explanation}
                          onChange={(e) => setExplanation(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col items-center gap-8 pb-12">
            <Button
              className="w-full h-28 text-3xl font-black italic uppercase tracking-[0.3em] bg-white text-slate-950 hover:bg-indigo-50 shadow-2xl rounded-[2.5rem] group relative overflow-hidden transition-all active:scale-[0.98]"
              onClick={handleCloseShift}
              disabled={isClosing}
            >
              {isClosing ? (
                <RefreshCw className="w-12 h-12 animate-spin text-indigo-600" />
              ) : (
                <div className="flex items-center gap-8">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl group-hover:scale-110 transition-transform">
                    <Lock className="w-9 h-9" />
                  </div>
                  <span>Seal & Commit Shift</span>
                </div>
              )}
            </Button>
            <div className="flex items-center gap-6 px-12 py-5 bg-white/5 rounded-full border border-white/10 backdrop-blur-xl">
              <ShieldCheck className="w-6 h-6 text-emerald-500" />
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] italic">
                Secure Hash will be appended to the <span className="text-white">Zenvix Fiscal Ledger</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShiftCloseTerminal;
