import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Truck, Globe, Zap, Shield, AlertCircle } from "lucide-react";

interface FutureIntegrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
}

export function FutureIntegrationDialog({
  open,
  onOpenChange,
  title = "Courier Integration",
}: FutureIntegrationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[3rem] p-0 overflow-hidden border-none shadow-2xl bg-slate-950 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 via-transparent to-emerald-500/10 pointer-events-none" />
        
        <DialogHeader className="p-10 text-center relative z-10">
          <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] bg-indigo-600 mx-auto mb-6 shadow-2xl shadow-indigo-600/40 border border-white/20">
            <Truck className="h-10 w-10 text-white" />
          </div>
          <DialogTitle className="text-3xl font-black tracking-tighter uppercase italic">
            {title}
          </DialogTitle>
          <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mt-2">
            Protocol Expansion Pending
          </div>
        </DialogHeader>

        <div className="px-10 pb-10 space-y-6 relative z-10">
          <p className="text-slate-400 text-sm font-medium leading-relaxed text-center italic">
            "Automated courier dispatching and real-time fleet synchronization is currently under development in the Zenvix Labs."
          </p>

          <div className="space-y-3">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
              <Globe className="h-5 w-5 text-indigo-400" />
              <div className="text-xs font-bold text-slate-300">Global API Webhooks</div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
              <Zap className="h-5 w-5 text-amber-400" />
              <div className="text-xs font-bold text-slate-300">Instant Rate Calculation</div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
              <Shield className="h-5 w-5 text-emerald-400" />
              <div className="text-xs font-bold text-slate-300">Secure Transit Insurance</div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-widest">
            <AlertCircle className="h-3 w-3" /> Targeted Release: Q3 2026
          </div>
        </div>

        <DialogFooter className="p-8 bg-white/5 border-t border-white/5 flex flex-col gap-3 relative z-10">
          <Button 
            className="w-full rounded-2xl h-14 bg-white text-slate-950 font-black uppercase tracking-widest text-xs hover:bg-slate-100 transition-all hover:scale-[1.02] active:scale-[0.98]"
            onClick={() => onOpenChange(false)}
          >
            Acknowledge Protocol
          </Button>
          <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest text-center">
            Zenvix Advanced Logistics Research Division
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
