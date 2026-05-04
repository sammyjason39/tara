import React, { useState } from 'react';
import { 
  ArrowDownCircle, ArrowUpCircle, Banknote, History, 
  ChevronRight, Lock, ShieldCheck, RefreshCw, X, AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRetail } from '../context/RetailContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import retailService from '@/core/services/retail/retailService';

const CashMovementTerminal = () => {
  const navigate = useNavigate();
  const { activeShift } = useRetail();
  const { session } = useAuth();
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
      await (retailService as any).recordCashMovement(
        session.tenant_id!,
        activeShift.id,
        {
          amount: numAmount,
          type,
          reason,
          notes,
        }
      );

      toast({ 
        title: "Movement Recorded", 
        description: `${type === 'CASH_OUT' ? 'Deducted' : 'Added'} Rp ${numAmount.toLocaleString()} to register.`,
      });
      
      navigate('/m/retail/operational/gateway');
    } catch (error: any) {
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
    <div className="min-h-screen bg-slate-950 flex flex-col p-4 md:p-8 relative overflow-hidden selection:bg-indigo-500/30">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 p-32 opacity-[0.02] pointer-events-none">
        <Banknote className="w-[40rem] h-[40rem]" />
      </div>

      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 backdrop-blur-xl">
              <Banknote className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none mb-2">
                Cash Movement
              </h1>
              <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px] flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> Petty Cash & Register Adjustments
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white"
            onClick={() => navigate('/m/retail/operational/gateway')}
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 flex-1">
          {/* Main Controls */}
          <div className="lg:col-span-12 space-y-8">
            <Card className="bg-white/5 border-white/10 backdrop-blur-2xl rounded-[3rem] overflow-hidden shadow-2xl">
              <CardContent className="p-12 space-y-12">
                
                {/* Movement Type Toggle */}
                <div className="flex p-2 bg-slate-900/50 rounded-[2rem] border border-white/5">
                  <button
                    onClick={() => setType('CASH_OUT')}
                    className={`flex-1 h-20 rounded-[1.5rem] flex items-center justify-center gap-4 transition-all ${
                      type === 'CASH_OUT' 
                      ? 'bg-rose-500 text-white shadow-xl shadow-rose-500/20' 
                      : 'text-slate-500 hover:text-white'
                    }`}
                  >
                    <ArrowDownCircle className={`w-6 h-6 ${type === 'CASH_OUT' ? 'text-white' : 'text-rose-500'}`} />
                    <span className="font-black uppercase tracking-widest italic">Cash Out</span>
                  </button>
                  <button
                    onClick={() => setType('CASH_IN')}
                    className={`flex-1 h-20 rounded-[1.5rem] flex items-center justify-center gap-4 transition-all ${
                      type === 'CASH_IN' 
                      ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20' 
                      : 'text-slate-500 hover:text-white'
                    }`}
                  >
                    <ArrowUpCircle className={`w-6 h-6 ${type === 'CASH_IN' ? 'text-white' : 'text-emerald-500'}`} />
                    <span className="font-black uppercase tracking-widest italic">Cash In</span>
                  </button>
                </div>

                {/* Amount Input */}
                <div className="relative group">
                  <span className="absolute left-8 top-1/2 -translate-y-1/2 text-6xl font-black text-white/10 italic tracking-tighter group-focus-within:text-indigo-500/30 transition-colors">
                    Rp
                  </span>
                  <Input
                    className="h-40 pl-32 text-8xl font-black text-center border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-white/5 text-white tracking-tighter italic"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/10 rounded-full group-focus-within:bg-indigo-500 transition-colors" />
                </div>

                {/* Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 italic px-4 flex items-center gap-3">
                      <AlertCircle className="w-4 h-4" /> Primary Reason
                    </label>
                    <Input 
                      placeholder="e.g., Office Supplies, Cleaning, Petty Cash..."
                      className="h-20 bg-white/5 border-none rounded-2xl px-8 font-bold text-white placeholder:text-slate-700 focus:bg-white/10 transition-all"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 italic px-4 flex items-center gap-3">
                      <History className="w-4 h-4" /> Additional Context
                    </label>
                    <Input 
                      placeholder="Handover notes, specific item list..."
                      className="h-20 bg-white/5 border-none rounded-2xl px-8 font-bold text-white placeholder:text-slate-700 focus:bg-white/10 transition-all"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>

                {/* Action */}
                <Button
                  className={`w-full h-28 text-3xl font-black italic uppercase tracking-[0.3em] shadow-2xl rounded-[2.5rem] relative overflow-hidden transition-all active:scale-[0.98] ${
                    type === 'CASH_OUT' 
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20' 
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                  }`}
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-12 h-12 animate-spin" />
                  ) : (
                    <div className="flex items-center gap-8">
                      <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-white shadow-xl">
                        {type === 'CASH_OUT' ? <ArrowDownCircle className="w-9 h-9" /> : <ArrowUpCircle className="w-9 h-9" />}
                      </div>
                      <span>Authorize {type === 'CASH_OUT' ? 'Cash Out' : 'Cash In'}</span>
                    </div>
                  )}
                </Button>

              </CardContent>
            </Card>

            <div className="flex items-center justify-center gap-6 px-12 py-5 bg-white/5 rounded-full border border-white/10 backdrop-blur-xl max-w-fit mx-auto">
              <ShieldCheck className="w-6 h-6 text-indigo-500" />
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] italic">
                This transaction will be appended to the <span className="text-white italic">Fiscal Audit Ledger</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashMovementTerminal;
