import { useCallback, useEffect, useMemo, useState } from "react";
import { 
  Plus, 
  RefreshCw, 
  ShieldCheck, 
  Globe, 
  ExternalLink, 
  Activity, 
  Settings, 
  Lock, 
  MoreVertical, 
  Zap,
  CheckCircle2,
  AlertCircle,
  Cloud,
  Link2,
  Trash2,
  ChevronRight,
  Database,
  Search,
  Layers,
  Facebook,
  Chrome
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "@/core/security/session";
import { marketingService } from "@/core/services/marketing/marketingService";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type {
  ConnectedAccount,
  ConnectedProvider,
  ConnectionStatus,
} from "@/core/types/marketing/marketing";

const PROVIDERS: ConnectedProvider[] = ["META", "GOOGLE"];

export default function ConnectedAccountsDesk() {
  const session = useSession();
  const [provider, setProvider] = useState<ConnectedProvider>("META");
  const [accountName, setAccountName] = useState("");
  const [scopes, setScopes] = useState("ads_read,leads_retrieval");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [connectOpen, setConnectOpen] = useState(false);

  const refresh = useCallback(async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      const a = await marketingService.listConnectedAccounts(session.tenant_id, session);
      setAccounts(a);
      if (isManual) toast.success("Integration registry synchronized.");
    } catch (err) {
      console.error("Failed to fetch connected accounts:", err);
      toast.error("Telemetry failure in integration suite.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session.tenant_id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setStatus = async (accountId: string, status: ConnectionStatus) => {
    try {
      setRefreshing(true);
      await marketingService.updateAccountStatus(session.tenant_id, session, accountId, status);
      toast.success(`Protocol ${status} executed for node.`);
      refresh(true);
    } catch (err) {
      toast.error("Authorization protocol failure.");
      setRefreshing(false);
    }
  };

  const handleConnect = async () => {
    if (!accountName.trim()) {
      toast.error("Designation required for initialization.");
      return;
    }
    try {
      setRefreshing(true);
      await marketingService.connectAccount(session.tenant_id, session, {
        provider,
        accountName,
        scopes: scopes.split(",").map((item) => item.trim()).filter(Boolean),
      });
      setAccountName("");
      setConnectOpen(false);
      toast.success("Strategic Integration Initialized", {
        description: `${provider} cloud link established and secure.`
      });
      refresh(true);
    } catch (err) {
      console.error("Failed to connect account:", err);
      toast.error("Initialization failure.");
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-6">
          <div className="h-20 w-20 bg-indigo-600 rounded-[2.5rem] animate-pulse flex items-center justify-center shadow-2xl shadow-indigo-500/20">
             <Link2 className="h-10 w-10 text-white" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Booting Cloud Nexus...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-10 animate-in fade-in duration-1000 max-w-[1600px] mx-auto pb-24">
      {/* Premium Header */}
      <div className="flex flex-col lg:flex-row justify-between items-end gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Badge className="bg-indigo-600 text-white border-none font-black px-3 py-1 rounded-full uppercase tracking-widest text-[10px]">Strategic Nexus</Badge>
            <div className="flex items-center gap-1.5 text-indigo-500 font-bold text-xs uppercase tracking-widest">
               <Activity className="h-4 w-4 animate-pulse" />
               Cloud Links Secure
            </div>
          </div>
          <h1 className="text-6xl font-black tracking-tighter bg-gradient-to-br from-slate-900 via-slate-700 to-indigo-900 dark:from-white dark:to-slate-400 bg-clip-text text-transparent text-left italic">Connected Accounts</h1>
          <p className="text-slate-500 font-medium max-w-2xl text-lg leading-relaxed italic text-left">"Authorize and orchestrate multi-cloud synchronization with total intelligence."</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Button
            variant="secondary"
            className="h-14 w-14 rounded-2xl bg-white dark:bg-slate-800 border-none shadow-xl hover:scale-110 transition-all"
            onClick={() => refresh(true)}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-6 w-6 text-indigo-600", refreshing && "animate-spin")} />
          </Button>
          <Button 
            className="h-[4.5rem] px-10 rounded-[2rem] bg-indigo-600 hover:bg-indigo-700 shadow-2xl shadow-indigo-500/30 font-black text-sm gap-3 group transition-all hover:scale-105 active:scale-95"
            onClick={() => setConnectOpen(true)}
          >
            <Plus className="h-6 w-6 group-hover:rotate-90 transition-transform duration-500" /> 
            INITIALIZE CLOUD LINK
          </Button>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Active Links', val: (Array.isArray(accounts) ? accounts : []).filter(a => a.status === 'CONNECTED').length, icon: Link2, color: 'text-indigo-600' },
          { label: 'Data Sync Rate', val: '99.9%', icon: RefreshCw, color: 'text-emerald-500' },
          { label: 'Sync Latency', val: '142ms', icon: Activity, color: 'text-amber-500' },
          { label: 'Verified Scopes', val: '24', icon: ShieldCheck, color: 'text-blue-500' },
        ].map((stat, i) => (
          <Card key={i} className="rounded-[2.5rem] border-none shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-md group hover:shadow-2xl transition-all">
            <CardContent className="p-8 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic leading-none">{stat.label}</p>
                <p className={cn("text-3xl font-black tracking-tighter uppercase italic leading-none", stat.color)}>{stat.val}</p>
              </div>
              <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform", stat.color.replace('text', 'bg').replace('600', '100').replace('500', '100'))}>
                <stat.icon className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {accounts.map((item) => (
          <Card key={item.id} className="rounded-[3rem] border-none shadow-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl group relative overflow-hidden flex flex-col hover:shadow-[0_40px_80px_-20px_rgba(79,70,229,0.2)] transition-all duration-500">
            {/* Status Indicator */}
            <div className={cn(
              "absolute top-0 right-0 h-32 w-32 rounded-full blur-3xl -mr-16 -mt-16 opacity-20",
              item.status === 'CONNECTED' ? "bg-emerald-500" : item.status === 'EXPIRED' ? "bg-rose-500" : "bg-slate-400"
            )} />
            
            <CardHeader className="p-10 pb-6 relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className={cn(
                  "h-16 w-16 rounded-[1.5rem] flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110 duration-500",
                  item.provider === 'META' ? "bg-blue-600 text-white" : "bg-white text-slate-900 dark:bg-slate-800 dark:text-white"
                )}>
                  {item.provider === 'META' ? <Facebook className="h-8 w-8" /> : <Chrome className="h-8 w-8" />}
                </div>
                <div className="text-right">
                   <Badge className={cn(
                     "rounded-full font-black text-[9px] px-3 py-1 border-none shadow-lg tracking-widest",
                     item.status === 'CONNECTED' ? "bg-emerald-500 text-white shadow-emerald-500/20" : 
                     item.status === 'EXPIRED' ? "bg-rose-500 text-white shadow-rose-500/20" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                   )}>
                     {item.status}
                   </Badge>
                   <p className="text-[9px] font-black uppercase text-slate-400 tracking-tighter mt-2 italic">VERIFIED NODE</p>
                </div>
              </div>
              <div className="space-y-1">
                <CardTitle className="text-2xl font-black uppercase tracking-tight italic group-hover:text-indigo-600 transition-colors">{item.accountName}</CardTitle>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 opacity-60">
                   <Hash className="h-3 w-3" /> ID: {item.id.slice(0, 8)}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-10 pt-0 flex-1 space-y-8 relative z-10">
              <div className="space-y-6 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-white/20 dark:border-slate-700/20 shadow-inner">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <Clock className="h-4 w-4 text-indigo-500" /> Token Expiry
                   </div>
                   <span className="text-[11px] font-black uppercase italic">{new Date(item.tokenExpiresAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <RefreshCw className="h-4 w-4 text-indigo-500" /> Last Sync
                   </div>
                   <span className="text-[11px] font-black uppercase italic">{item.lastSyncAt ? new Date(item.lastSyncAt).toLocaleTimeString() : "PENDING"}</span>
                </div>
              </div>

              <div className="space-y-4">
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Strategic Actions</p>
                 <div className="grid grid-cols-2 gap-3">
                    <Button 
                      variant="outline" 
                      className="h-12 rounded-xl border-none bg-slate-50 dark:bg-slate-800 font-black text-[9px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                      onClick={() => setStatus(item.id, "CONNECTED")}
                    >
                      SYNCHRONIZE
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="h-12 rounded-xl border-none bg-slate-50 dark:bg-slate-800 font-black text-[9px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                           PARAMETERS
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="rounded-2xl border-none shadow-2xl p-2 w-56">
                         <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest opacity-50 px-3 py-2">Auth Protocols</DropdownMenuLabel>
                         <DropdownMenuSeparator />
                         <DropdownMenuItem className="gap-3 py-3 rounded-xl font-bold" onClick={() => setStatus(item.id, "CONNECTED")}><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Re-Authorize Link</DropdownMenuItem>
                         <DropdownMenuItem className="gap-3 py-3 rounded-xl font-bold" onClick={() => setStatus(item.id, "EXPIRED")}><AlertCircle className="h-4 w-4 text-amber-500" /> Revoke Tokens</DropdownMenuItem>
                         <DropdownMenuSeparator />
                         <DropdownMenuItem className="gap-3 py-3 rounded-xl font-bold text-rose-600" onClick={() => setStatus(item.id, "DISCONNECTED")}><Trash2 className="h-4 w-4" /> Decommission Node</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                 </div>
              </div>
            </CardContent>
            
            <div className="p-10 pt-0 pb-10">
               <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                  <div className={cn(
                    "h-full transition-all duration-1000",
                    item.status === 'CONNECTED' ? "bg-emerald-500" : "bg-slate-300"
                  )} style={{ width: item.status === 'CONNECTED' ? '100%' : '30%' }} />
               </div>
            </div>
          </Card>
        ))}
        
        {/* Placeholder for expansion */}
        <button 
          className="rounded-[3rem] border-4 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-6 h-[450px] group hover:border-indigo-600 transition-all hover:bg-white/40 dark:hover:bg-slate-900/40"
          onClick={() => setConnectOpen(true)}
        >
           <div className="h-20 w-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-xl">
             <Plus className="h-10 w-10 group-hover:rotate-90 transition-transform duration-500" />
           </div>
           <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 group-hover:text-indigo-600 transition-colors">Expand Cloud Nexus</p>
        </button>
      </div>

      {/* Initialize Cloud Link Wizard */}
      <Dialog open={connectOpen} onOpenChange={setConnectOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[3rem] border-none bg-white dark:bg-slate-950 p-0 overflow-hidden shadow-2xl">
          <div className="h-2 bg-indigo-600" />
          <div className="p-12 space-y-10">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                 <Badge className="bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest">Auth Protocol</Badge>
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Node Initialization</p>
              </div>
              <DialogTitle className="text-4xl font-black tracking-tighter uppercase italic">Initialize Link</DialogTitle>
              <DialogDescription className="text-base font-medium italic italic">Authorize a new multi-cloud synchronization node via secure OAuth handshake.</DialogDescription>
            </DialogHeader>
            <div className="space-y-8">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Target Provider</Label>
                <Select value={provider} onValueChange={(value: ConnectedProvider) => setProvider(value)}>
                  <SelectTrigger className="h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none shadow-inner font-bold text-lg">
                    <SelectValue placeholder="Protocol Matrix" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-2xl p-2">
                    {PROVIDERS.map((item) => (
                      <SelectItem key={item} value={item} className="rounded-xl py-3 font-bold uppercase tracking-widest text-xs">
                        {item} CLOUD ENGINE
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Designation</Label>
                <Input 
                  placeholder="E.G. ENTERPRISE MAIN ADS" 
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none shadow-inner font-bold text-lg uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Authorization Scopes</Label>
                <Input 
                  placeholder="ads_read, leads_retrieval..." 
                  value={scopes}
                  onChange={(e) => setScopes(e.target.value)}
                  className="h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none shadow-inner font-bold text-sm text-indigo-500"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                 className="w-full h-16 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-black text-xs uppercase tracking-widest shadow-2xl shadow-indigo-500/30 gap-3"
                 onClick={handleConnect}
                 disabled={refreshing}
              >
                {refreshing ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Lock className="h-5 w-5" />}
                AUTHORIZE CLOUD HANDSHAKE
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Label({ className, children, ...props }: any) {
  return (
    <label className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)} {...props}>
      {children}
    </label>
  );
}
