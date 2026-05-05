import React, { useState } from "react";
import {
  Power,
  Banknote,
  ShieldCheck,
  RefreshCw,
  Fingerprint,
  ChevronRight,
  Store,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { retailService } from "@/core/services/retail/retailService";
import { useSession } from "@/core/security/session";
import { useRetail } from "../context/RetailContext";
import { useNavigate } from "react-router-dom";

const ShiftOpenTerminal = () => {
  const session = useSession();
  const navigate = useNavigate();
    const { activeStore, refreshState } = useRetail();
    const { toast } = useToast();
    
    const [openingCash, setOpeningCash] = useState<string>("0");
    const [isOpening, setIsOpening] = useState(false);
    const [isAcknowledged, setIsAcknowledged] = useState(false);
  
    const handleOpenShift = async () => {
      if (!activeStore?.id) {
        toast({ title: "Store Missing", description: "Node identity not verified.", variant: "destructive" });
        return;
      }
      if (!isAcknowledged) {
        toast({ title: "Protocol Required", description: "Please acknowledge the fiscal responsibility protocol.", variant: "destructive" });
        return;
      }
  
      setIsOpening(true);
      try {
        await retailService.openShift(
          session.tenant_id!,
          session,
          activeStore.id,
          parseInt(openingCash.replace(/[^0-9]/g, '')) || 0,
          "terminal-pos"
        );
        toast({ title: "Session Initialized", description: "Fiscal shift is now active." });
        await refreshState();
      navigate("/m/retail/operational/gateway");
    } catch (error: any) {
      console.error("Failed to open shift", error);
      toast({ 
        title: "Initialization Failed", 
        description: error.message || "Could not link with fiscal authority.", 
        variant: "destructive" 
      });
    } finally {
      setIsOpening(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 md:p-8 relative overflow-hidden">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[45%] h-[45%] bg-indigo-500/10 blur-[130px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[35%] h-[35%] bg-emerald-500/10 blur-[120px] rounded-full animate-pulse" />
      </div>

      <div className="max-w-4xl w-full relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left: Protocol & Identity */}
          <div className="flex flex-col justify-center space-y-8">
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-[1.75rem] bg-indigo-600 flex items-center justify-center text-white shadow-2xl shadow-indigo-600/30">
                <Power className="w-8 h-8" />
              </div>
              <h1 className="text-5xl font-black text-white italic tracking-tighter uppercase leading-[0.9]">
                Shift<br />Initialize
              </h1>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                <Store className="w-4 h-4" />
                {activeStore?.name || "Global Retail Node"}
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-white uppercase tracking-tight">Fiscal Compliance Ready</p>
                  <p className="text-xs text-slate-500 leading-relaxed">System has verified all peripheral links and tax authority connectors.</p>
                </div>
              </div>
              
              <div className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                <Fingerprint className="w-6 h-6 text-indigo-400 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-white uppercase tracking-tight">Staff Auth: {session.user_id?.slice(0, 8) || "UNVERIFIED"}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">Session will be hard-linked to your employee signature.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Input Terminal */}
          <Card className="bg-slate-900/40 border-white/10 backdrop-blur-2xl rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden">
            <CardContent className="p-10 space-y-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] italic">Declaration</span>
                  <Banknote className="w-5 h-5 text-indigo-500" />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Opening Cash Float (Rp)</label>
                  <div className="relative group">
                    <Input
                      type="tel"
                      value={openingCash}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        if (raw) {
                          setOpeningCash(parseInt(raw, 10).toLocaleString('id-ID'));
                        } else {
                          setOpeningCash("");
                        }
                      }}
                      className="h-20 bg-white/5 border-2 border-white/10 text-3xl font-black text-white rounded-2xl px-6 focus:border-indigo-500/50 focus:ring-0 transition-all placeholder:text-slate-800"
                      placeholder="0"
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-700 font-black italic tracking-tighter">IDR</div>
                  </div>
                </div>
              </div>

              <Separator className="bg-white/5" />

              <div className="space-y-4">
                <button 
                  onClick={() => setIsAcknowledged(!isAcknowledged)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                    isAcknowledged 
                    ? "bg-indigo-600/10 border-indigo-500/50 text-white" 
                    : "bg-white/5 border-white/10 text-slate-500 hover:border-white/20"
                  }`}
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                    isAcknowledged ? "bg-indigo-600 shadow-lg shadow-indigo-600/40" : "bg-slate-800"
                  }`}>
                    {isAcknowledged && <ShieldCheck className="w-4 h-4 text-white" />}
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider italic text-left">
                    I acknowledge full fiscal responsibility for this shift's cash flow.
                  </span>
                </button>
              </div>

              <Button
                onClick={handleOpenShift}
                disabled={isOpening}
                className="w-full h-20 bg-white hover:bg-slate-100 text-slate-950 rounded-[1.5rem] font-black italic text-xl uppercase tracking-tighter shadow-2xl shadow-white/5 active:scale-95 transition-all group"
              >
                {isOpening ? (
                  <RefreshCw className="w-8 h-8 animate-spin" />
                ) : (
                  <>
                    Initialize Terminal
                    <ChevronRight className="w-8 h-8 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>

              <p className="text-[9px] text-center text-slate-600 font-bold uppercase tracking-[0.2em] leading-relaxed">
                Atomic verification enabled • ID: {session.tenant_id?.slice(0, 8)}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ShiftOpenTerminal;
