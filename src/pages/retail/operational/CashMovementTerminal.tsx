import React, { useState } from 'react';
import { 
  ArrowDownCircle, ArrowUpCircle, Banknote, History, 
  ChevronRight, Lock, ShieldCheck, RefreshCw, X, AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRetail } from '../context/RetailContext';
import { GlassCard } from '@/components/shared/GlassCard';
import { CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useSession } from '@/core/security/session';
import { toast } from '@/hooks/use-toast';
import { retailService } from '@/core/services/retail/retailService';
import { formatCurrency } from '@/lib/format';

const CashMovementTerminal = () => {
  const navigate = useNavigate();
  const { activeShift, refreshState } = useRetail();
  const session = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [type, setType] = useState<'CASH_OUT' | 'CASH_IN'>('CASH_OUT');
  const [amount, setAmount] = useState<string>("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const parseAmount = (val: string) => {
    if (!val) return 0;
    const cleaned = val.replace(/[,.]/g, '');
    return parseInt(cleaned) || 0;
  };

  const handleSubmit = async () => {
    if (!activeShift) {
      toast({ title: "Terminal Locked", description: "No active shift detected.", variant: "destructive" });
      return;
    }

    const numAmount = parseAmount(amount);
    if (numAmount <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid cash amount.", variant: "destructive" });
      return;
    }

    if (!reason.trim()) {
      toast({ title: "Reason Required", description: "Please provide a reason for this movement.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      await retailService.recordCashMovement(
        session.tenant_id,
        activeShift.id,
        {
          amount: numAmount,
          type,
          reason,
          notes,
        },
        session
      );

      toast({ 
        title: "Movement Recorded", 
        description: `${type === 'CASH_OUT' ? 'Deducted' : 'Added'} ${formatCurrency(numAmount, "IDR", "id-ID")} to register.`,
      });
      
      await refreshState();
      navigate('/m/retail/operational/gateway');
    } catch (error: any) {
      console.error("[CashMovement] Failed to record movement:", error);
      toast({ 
        title: "Movement Failed", 
        description: error.message || "Failed to record cash movement", 
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 relative selection:bg-primary/30">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 p-32 opacity-[0.02] pointer-events-none">
        <Banknote className="w-[40rem] h-[40rem]" />
      </div>

      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-secondary/40 rounded-2xl flex items-center justify-center border border-border backdrop-blur-xl">
              <Banknote className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-foreground italic tracking-tighter uppercase leading-none mb-2">
                Cash Movement
              </h1>
              <p className="text-muted-foreground font-bold uppercase tracking-[0.3em] text-[10px] flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-success" /> Petty Cash & Register Adjustments
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-16 h-16 rounded-2xl bg-secondary/40 border border-border hover:bg-accent text-foreground"
            onClick={() => navigate('/m/retail/operational/gateway')}
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 flex-1">
          {/* Main Controls */}
          <div className="lg:col-span-12 space-y-8">
            <GlassCard className="bg-secondary/40 border-border backdrop-blur-2xl rounded-[3rem] overflow-hidden shadow-2xl">
              <CardContent className="p-12 space-y-12">
                
                {/* Movement Type Toggle */}
                <div className="flex p-2 bg-card/50 rounded-[2rem] border border-border/40">
                  <button
                    onClick={() => setType('CASH_OUT')}
                    className={`flex-1 h-20 rounded-[1.5rem] flex items-center justify-center gap-4 transition-all ${
                      type === 'CASH_OUT' 
                      ? 'bg-destructive text-foreground shadow-xl shadow-destructive/20' 
                      : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <ArrowDownCircle className={`w-6 h-6 ${type === 'CASH_OUT' ? 'text-foreground' : 'text-destructive'}`} />
                    <span className="font-black uppercase tracking-widest italic">Cash Out</span>
                  </button>
                  <button
                    onClick={() => setType('CASH_IN')}
                    className={`flex-1 h-20 rounded-[1.5rem] flex items-center justify-center gap-4 transition-all ${
                      type === 'CASH_IN' 
                      ? 'bg-success text-foreground shadow-xl shadow-success/20' 
                      : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <ArrowUpCircle className={`w-6 h-6 ${type === 'CASH_IN' ? 'text-foreground' : 'text-success'}`} />
                    <span className="font-black uppercase tracking-widest italic">Cash In</span>
                  </button>
                </div>

                {/* Amount Input */}
                <div className="relative group bg-secondary/40 border border-border rounded-3xl p-8 hover:bg-accent/40 transition-colors focus-within:border-primary">
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-4 italic text-center">
                    Enter Amount
                  </div>
                  <div className="relative">
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 text-5xl font-black text-muted-foreground italic tracking-tighter">
                      Rp
                    </span>
                    <Input
                      className="h-32 pl-24 text-7xl font-black text-center border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/30 text-foreground tracking-tighter italic"
                      placeholder="0"
                      type="tel"
                      value={amount}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        if (raw) {
                          setAmount(parseInt(raw, 10).toLocaleString('id-ID'));
                        } else {
                          setAmount("");
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground italic px-4 flex items-center gap-3">
                      <AlertCircle className="w-4 h-4" /> Primary Reason
                    </label>
                    <Input 
                      placeholder="e.g., Office Supplies, Cleaning, Petty Cash..."
                      className="h-20 bg-secondary/40 border-none rounded-2xl px-8 font-bold text-foreground placeholder:text-muted-foreground/30 focus:bg-accent/40 transition-all"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground italic px-4 flex items-center gap-3">
                      <History className="w-4 h-4" /> Additional Context
                    </label>
                    <Input 
                      placeholder="Handover notes, specific item list..."
                      className="h-20 bg-secondary/40 border-none rounded-2xl px-8 font-bold text-foreground placeholder:text-muted-foreground/30 focus:bg-accent/40 transition-all"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>

                {/* Action */}
                <Button
                  className={`w-full h-28 text-3xl font-black italic uppercase tracking-[0.3em] shadow-2xl rounded-[2.5rem] relative overflow-hidden transition-all active:scale-[0.98] ${
                    type === 'CASH_OUT' 
                    ? 'bg-destructive hover:bg-destructive text-foreground shadow-destructive/20' 
                    : 'bg-success hover:bg-success text-foreground shadow-success/20'
                  }`}
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-12 h-12 animate-spin" />
                  ) : (
                    <div className="flex items-center gap-8">
                      <div className="w-16 h-16 rounded-2xl bg-foreground/20 flex items-center justify-center text-foreground shadow-xl">
                        {type === 'CASH_OUT' ? <ArrowDownCircle className="w-9 h-9" /> : <ArrowUpCircle className="w-9 h-9" />}
                      </div>
                      <span>Authorize {type === 'CASH_OUT' ? 'Cash Out' : 'Cash In'}</span>
                    </div>
                  )}
                </Button>

              </CardContent>
            </GlassCard>

            <div className="flex items-center justify-center gap-6 px-12 py-5 bg-secondary/40 rounded-full border border-border backdrop-blur-xl max-w-fit mx-auto">
              <ShieldCheck className="w-6 h-6 text-primary" />
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] italic">
                This transaction will be appended to the <span className="text-foreground italic">Fiscal Audit Ledger</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashMovementTerminal;
