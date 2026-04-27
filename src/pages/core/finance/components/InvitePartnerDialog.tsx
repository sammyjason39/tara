import React, { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { financeService } from "@/core/services/finance/financeService";
import { useSession } from "@/core/security/session";
import { Mail, Percent, ShieldCheck } from "lucide-react";
import { useNotifications } from "@/contexts/NotificationContext";

interface InvitePartnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profiles: any[];
}

export function InvitePartnerDialog({ open, onOpenChange, profiles }: InvitePartnerDialogProps) {
  const session = useSession();
  const { addNotification } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: "",
    jv_profile_id: "",
    role: "NON_OPERATOR",
    revenue_share: "10",
    profit_share: "10"
  });

  const handleInvite = async () => {
    if (!form.email || !form.jv_profile_id) return;
    setLoading(true);
    try {
      await financeService.inviteJVPartner(session, {
        ...form,
        revenue_share: parseFloat(form.revenue_share),
        profit_share: parseFloat(form.profit_share)
      });
      addNotification({
        type: "success",
        title: "Invitation Sent",
        message: `Joint Venture invitation has been sent to ${form.email}`
      });
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      addNotification({
        type: "error",
        title: "Invitation Failed",
        message: "Could not send invitation. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] glass-morphism border-gray-200/50 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Mail className="h-5 w-5" />
            Invite JV Partner
          </DialogTitle>
          <DialogDescription>
            Send an invitation to a partner tenant. They will be automatically linked once they accept.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Partner Email</Label>
            <Input 
              id="email" 
              placeholder="admin@partner-tenant.com" 
              value={form.email}
              onChange={e => setForm({...form, email: e.target.value})}
              className="bg-white/50"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="profile" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Target JV Profile</Label>
            <Select 
              value={form.jv_profile_id} 
              onValueChange={v => setForm({...form, jv_profile_id: v})}
            >
              <SelectTrigger className="bg-white/50">
                <SelectValue placeholder="Select a profile" />
              </SelectTrigger>
              <SelectContent>
                {profiles.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Rev Share %</Label>
              <div className="relative">
                <Percent className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="number" 
                  className="pl-9 bg-white/50"
                  value={form.revenue_share}
                  onChange={e => setForm({...form, revenue_share: e.target.value})}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Profit Share %</Label>
              <div className="relative">
                <Percent className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="number" 
                  className="pl-9 bg-white/50"
                  value={form.profit_share}
                  onChange={e => setForm({...form, profit_share: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Operational Role</Label>
            <Select 
              value={form.role} 
              onValueChange={v => setForm({...form, role: v})}
            >
              <SelectTrigger className="bg-white/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NON_OPERATOR">Non-Operator (Passive)</SelectItem>
                <SelectItem value="OPERATOR">Co-Operator (Active)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            onClick={handleInvite} 
            disabled={loading || !form.email || !form.jv_profile_id}
            className="gap-2 shadow-lg shadow-primary/20"
          >
            <ShieldCheck className="h-4 w-4" />
            {loading ? "Sending..." : "Send Invitation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
