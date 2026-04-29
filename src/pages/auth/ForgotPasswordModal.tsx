import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogOverlay,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyRound, Mail, ChevronRight, CheckCircle2, ShieldAlert, Loader2 } from "lucide-react";
import { apiRequest } from "@/core/api/apiClient";
import { useToast } from "@/hooks/use-toast";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = "EMAIL" | "RESET" | "SUCCESS";

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [step, setStep] = useState<Step>("EMAIL");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleVerifyEmail = async () => {
    if (!email) return;
    setIsLoading(true);
    try {
      const response = await apiRequest<any>("/v1/auth/verify-email", "POST", { email });
      if (response.exists) {
        setStep("RESET");
      } else {
        toast({
          title: "Account Not Found",
          description: "We couldn't find an account with that email address.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Mismatch",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }
    if (newPassword.length < 6) {
      toast({
        title: "Invalid",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await apiRequest<any>("/v1/auth/reset-password-direct", "POST", {
        email,
        newPassword,
      });
      setStep("SUCCESS");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reset password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep("EMAIL");
    setEmail("");
    setNewPassword("");
    setConfirmPassword("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogOverlay className="bg-slate-950/40 backdrop-blur-md" />
      <DialogContent className="sm:max-w-[440px] bg-white border-none rounded-[2rem] shadow-2xl p-0 overflow-hidden">
        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-slate-100 flex">
          <div className={`h-full bg-blue-600 transition-all duration-500 ${step === 'EMAIL' ? 'w-1/3' : step === 'RESET' ? 'w-2/3' : 'w-full'}`} />
        </div>

        <div className="p-10 space-y-8">
          <DialogHeader className="space-y-3">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
              step === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-blue-600/10 text-blue-600'
            }`}>
              {step === 'EMAIL' && <Mail className="w-7 h-7" />}
              {step === 'RESET' && <KeyRound className="w-7 h-7" />}
              {step === 'SUCCESS' && <CheckCircle2 className="w-7 h-7" />}
            </div>
            <DialogTitle className="text-3xl font-black italic tracking-tighter uppercase text-slate-950 leading-none">
              {step === 'EMAIL' && "Account Recovery"}
              {step === 'RESET' && "Secure Reset"}
              {step === 'SUCCESS' && "All Set!"}
            </DialogTitle>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
              {step === 'EMAIL' && "Enter your work email to verify your identity."}
              {step === 'RESET' && "Establish a new secure credential for your workspace."}
              {step === 'SUCCESS' && "Your password has been updated successfully."}
            </p>
          </DialogHeader>

          {step === 'EMAIL' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-1">Work Email</label>
                <div className="relative">
                  <Input
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-14 px-5 bg-slate-50 border-slate-100 rounded-xl focus-visible:ring-blue-500/20 focus-visible:border-blue-500 font-bold"
                  />
                </div>
              </div>
              <Button
                onClick={handleVerifyEmail}
                disabled={isLoading || !email}
                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black italic tracking-widest uppercase gap-3 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Continue <ChevronRight className="w-5 h-5" /></>}
              </Button>
            </div>
          )}

          {step === 'RESET' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-1">New Password</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-14 px-5 bg-slate-50 border-slate-100 rounded-xl focus-visible:ring-blue-500/20 focus-visible:border-blue-500 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-1">Confirm Password</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-14 px-5 bg-slate-50 border-slate-100 rounded-xl focus-visible:ring-blue-500/20 focus-visible:border-blue-500 font-bold"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 flex gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
                <p className="text-[10px] font-bold text-amber-700 leading-relaxed uppercase tracking-tight">
                  Choose a strong password to protect your corporate identity and access.
                </p>
              </div>

              <Button
                onClick={handleResetPassword}
                disabled={isLoading || !newPassword || !confirmPassword}
                className="w-full h-14 bg-slate-950 hover:bg-slate-900 text-white rounded-xl font-black italic tracking-widest uppercase gap-3 shadow-xl active:scale-95 transition-all"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Update Password"}
              </Button>
            </div>
          )}

          {step === 'SUCCESS' && (
            <div className="space-y-8 animate-in fade-in zoom-in duration-300">
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <div className="p-4 bg-emerald-50 text-emerald-500 rounded-full animate-pulse">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <div>
                  <h3 className="text-xl font-black italic tracking-tighter text-slate-950 uppercase">Update Confirmed</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Identity Access Restored</p>
                </div>
              </div>

              <Button
                onClick={handleClose}
                className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black italic tracking-widest uppercase shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
              >
                Back to Login
              </Button>
            </div>
          )}

          <div className="pt-4 text-center">
            <button
              onClick={handleClose}
              className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 tracking-widest transition-colors"
            >
              Cancel and Return
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
