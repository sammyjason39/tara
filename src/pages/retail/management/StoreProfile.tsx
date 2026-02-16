import React, { useState, useEffect } from "react";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { 
  Store, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  Mail, 
  Phone, 
  Users, 
  Fingerprint, 
  Lock, 
  Globe, 
  Building2, 
  ChevronRight, 
  Save, 
  Trash2, 
  RefreshCw,
  Plus
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/core/security/session";
import { retailService } from "@/core/services/retail/retailService";
import type { RetailStore } from "@/core/types/retail/retail";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { nextId } from "@/core/repositories/hr/storage";

const StoreProfile = () => {
  const session = useSession();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [stores, setStores] = useState<RetailStore[]>([]);
  const [selectedStore, setSelectedStore] = useState<RetailStore | null>(null);
  const [newStore, setNewStore] = useState<Partial<RetailStore>>({});
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    const data = retailService.listStores(session.tenantId!);
    setStores(data);
    if (data.length > 0) setSelectedStore(data[0]);
  }, [session.tenantId]);

  const handleSave = async () => {
    if (!selectedStore) return;
    setIsSaving(true);
    try {
      retailService.updateStore(session.tenantId!, session, selectedStore);
      toast({ title: "Profile Updated", description: "Store metadata and compliance settings synchronized." });
    } catch (e) {
      toast({ title: "Error", description: "Failed to update store.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegister = () => {
    if (!newStore.name || !newStore.code) return;
    setIsRegistering(true);
    const store: RetailStore = {
      id: nextId("STR"),
      tenantId: session.tenantId!,
      name: newStore.name,
      code: newStore.code,
      address: newStore.address || "",
      status: "active",
      warehouseId: "wh-auto",
      managerId: session.userId,
      locationId: `loc-${newStore.code}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      retailService.createStore(session.tenantId!, session, store);
      setStores([...stores, store]);
      setSelectedStore(store);
      setNewStore({});
      toast({ title: "Store Registered", description: `${store.name} is now active in your tenant.` });
    } catch (e) {
      toast({ title: "Error", description: "Registration failed.", variant: "destructive" });
    } finally {
      setIsRegistering(false);
    }
  };

  const handleDecommission = () => {
    if (!selectedStore) return;
    if (!confirm("CRITICAL WARNING: This will immediately freeze all POS operations and invalidate fiscal connectivity for this store. Authorize decommissioning?")) return;
    
    try {
      retailService.deleteStore(session.tenantId!, session, selectedStore.id);
      const remaining = stores.filter(s => s.id !== selectedStore.id);
      setStores(remaining);
      setSelectedStore(remaining[0] || null);
      toast({ 
        title: "Decommissioning Protocol Started", 
        description: "Fiscal bridge disconnected. Store status moved to TERMINATED.",
        variant: "destructive"
      });
    } catch (e) {
      toast({ title: "Error", description: "Failed to decommission store.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Store Profile & Configuration" 
        subtitle="Manage store identity, legal entity mapping, and operational security."
      />
      
      <WorkspacePanel>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card className="shadow-xl border-slate-200 rounded-3xl overflow-hidden">
              <CardHeader className="bg-slate-900 text-white p-6">
                 <CardTitle className="flex items-center gap-2 text-xl font-black italic tracking-tighter">
                   <Building2 className="w-6 h-6 text-blue-400" />
                   CORPORATE IDENTITY
                 </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Legal Entity Name</Label>
                    <Input defaultValue="PT. Zenvix Retail International" className="h-12 font-bold italic border-slate-200 focus:border-blue-500 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Trading Name (DBA)</Label>
                    <Input defaultValue="Jakarta Flagship Hub" className="h-12 font-bold italic border-slate-200 focus:border-blue-500 rounded-xl" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Store Global ID</Label>
                    <div className="relative">
                       <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                       <Input defaultValue="ZVX-RE-JKT-001" disabled className="h-12 pl-12 font-mono text-xs bg-slate-50 border-slate-200 rounded-xl" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tax ID (NPWP)</Label>
                    <Input defaultValue="01.234.567.8-901.000" className="h-12 font-mono text-xs border-slate-200 focus:border-blue-500 rounded-xl" />
                  </div>
                </div>

                <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Physical Address</Label>
                   <div className="relative">
                      <MapPin className="absolute left-4 top-4 w-4 h-4 text-slate-400" />
                      <Input defaultValue="Centennial Tower, 12th Floor, Jl. Gatot Subroto No. 24, Jakarta Selatan, 12930" className="h-12 pl-12 font-bold italic border-slate-200 focus:border-blue-500 rounded-xl" />
                   </div>
                </div>

                <div className="flex gap-4">
                   <Badge className="bg-blue-600 font-black italic px-4 py-1">HYBRID_BRANCH</Badge>
                   <Badge variant="outline" className="border-slate-300 text-slate-500 font-black italic px-4 py-1">VAT_REGISTERED</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-slate-200 rounded-3xl overflow-hidden">
              <CardHeader className="bg-slate-50 border-b p-6">
                <CardTitle className="flex items-center gap-2 text-sm font-black italic uppercase tracking-widest text-slate-500">
                  <Clock className="w-5 h-5 text-indigo-600" />
                  Operational Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-4">
                {[
                  { day: "Weekday Schedule", time: "09:00 - 22:00", active: true },
                  { day: "Weekend Schedule", time: "10:00 - 23:00", active: true },
                  { day: "Public Holidays", time: "12:00 - 20:00", active: false },
                ].map((sched, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all">
                     <span className="text-sm font-black italic text-slate-700">{sched.day}</span>
                     <div className="flex items-center gap-4">
                        <span className="text-sm font-mono font-bold text-slate-500 bg-white px-3 py-1 rounded-lg border">{sched.time}</span>
                        <div className={`w-2 h-2 rounded-full ${sched.active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-slate-300'}`} />
                     </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card className="bg-slate-900 text-white shadow-2xl rounded-3xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform">
                 <ShieldCheck className="w-24 h-24" />
              </div>
              <CardHeader className="p-8 pb-0">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 italic flex items-center gap-2">
                  <Lock className="w-4 h-4" /> Compliance Vault
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="space-y-4">
                   <div className="p-5 rounded-2xl bg-white/5 border border-white/10 shadow-inner group cursor-pointer hover:bg-white/10 transition-all">
                      <div className="text-[10px] text-slate-500 font-black uppercase mb-1">Store Fingerprint</div>
                      <div className="text-sm font-mono flex items-center gap-2">
                         sha256:JKT_9921_...88a
                         <ChevronRight className="w-4 h-4 ml-auto text-slate-700" />
                      </div>
                   </div>

                   <div className="p-5 rounded-2xl bg-white/5 border border-white/10 shadow-inner group cursor-pointer hover:bg-white/10 transition-all">
                      <div className="text-[10px] text-slate-500 font-black uppercase mb-1">Fiscal Connection</div>
                      <div className="flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-green-500" />
                         <span className="text-xs font-black italic uppercase tracking-tighter text-green-400">Direct Tax Interface</span>
                      </div>
                   </div>
                </div>
                
                <Separator className="bg-white/10" />

                <div className="space-y-2">
                   <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Authorized Officer</div>
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-black italic border-2 border-white/10">SA</div>
                      <div>
                         <div className="text-xs font-black italic">System Architect</div>
                         <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter italic">Lvl 9 Clearance</div>
                      </div>
                   </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-indigo-100 rounded-3xl overflow-hidden">
               <CardHeader className="p-6 pb-2">
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest text-indigo-900 italic">Support & Escalation</CardTitle>
               </CardHeader>
               <CardContent className="p-6 space-y-4">
                  <div className="space-y-3">
                     <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-indigo-50 transition-all cursor-pointer">
                        <Phone className="w-4 h-4 text-indigo-500" />
                        <span className="text-xs font-bold italic tracking-tight text-slate-600">+62 21 555 0199</span>
                     </div>
                     <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-indigo-50 transition-all cursor-pointer">
                        <Mail className="w-4 h-4 text-indigo-500" />
                        <span className="text-xs font-bold italic tracking-tight text-slate-600">jakarta.hub@zenvix.io</span>
                     </div>
                  </div>
                  <Button variant="outline" className="w-full h-10 rounded-xl text-[10px] font-black uppercase border-indigo-200 text-indigo-700 hover:bg-indigo-100 italic gap-2 transition-all">
                     <Users className="w-4 h-4" /> Regional Contacts
                  </Button>
               </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-slate-200 overflow-hidden shadow-xl">
               <CardHeader className="bg-slate-50 border-b py-6">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500">Store Registry</CardTitle>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 text-blue-600 font-black italic gap-1">
                          <Plus className="w-4 h-4" /> Register New
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="rounded-[2rem]">
                        <DialogHeader>
                          <DialogTitle className="font-black italic text-2xl uppercase tracking-tighter">New Store Registration</DialogTitle>
                          <DialogDescription className="font-bold italic">Assign unique code and identifiers for the new branch.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Store Name</Label>
                            <Input value={newStore.name || ""} onChange={e => setNewStore({...newStore, name: e.target.value})} className="h-12 rounded-xl font-bold italic" placeholder="e.g. Jakarta South Plaza" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Unique Code</Label>
                            <Input value={newStore.code || ""} onChange={e => setNewStore({...newStore, code: e.target.value})} className="h-12 rounded-xl font-bold italic" placeholder="e.g. JK-002" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Address</Label>
                            <Input value={newStore.address || ""} onChange={e => setNewStore({...newStore, address: e.target.value})} className="h-12 rounded-xl font-bold italic" placeholder="Full physical address" />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button 
                            className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white font-black italic rounded-xl shadow-xl uppercase tracking-widest"
                            onClick={handleRegister}
                            disabled={isRegistering || !newStore.name || !newStore.code}
                          >
                            {isRegistering ? <RefreshCw className="w-5 h-5 animate-spin" /> : "Authorize Branch Activation"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
               </CardHeader>
               <CardContent className="p-0">
                  <div className="divide-y divide-slate-100">
                     {stores.map((s) => (
                        <div 
                          key={s.id} 
                          className={`p-6 flex items-center justify-between cursor-pointer transition-all hover:bg-slate-50 ${selectedStore?.id === s.id ? 'bg-blue-50 border-r-4 border-blue-600' : ''}`}
                          onClick={() => setSelectedStore(s)}
                        >
                           <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black italic text-[10px] ${selectedStore?.id === s.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                 {s.code}
                              </div>
                              <div>
                                 <div className="text-sm font-black italic tracking-tight">{s.name}</div>
                                 <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{s.status}</div>
                              </div>
                           </div>
                           <ChevronRight className={`w-4 h-4 ${selectedStore?.id === s.id ? 'text-blue-600' : 'text-slate-300'}`} />
                        </div>
                     ))}
                  </div>
               </CardContent>
            </Card>

            <div className="flex flex-col gap-3">
               <Button 
                className="w-full h-16 rounded-2xl bg-slate-900 hover:bg-slate-800 font-black italic uppercase tracking-widest shadow-2xl gap-3"
                onClick={handleSave}
                disabled={isSaving || !selectedStore}
               >
                 {isSaving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><Save className="w-6 h-6 text-blue-500" /> Save All Changes</>}
               </Button>
               <Button 
                  variant="ghost" 
                  className="w-full h-12 rounded-2xl text-[10px] font-black uppercase text-red-500 hover:bg-red-50 italic gap-2"
                  onClick={handleDecommission}
                  disabled={!selectedStore}
                >
                 <Trash2 className="w-4 h-4" /> Decommission Store
               </Button>
            </div>
          </div>
        </div>
      </WorkspacePanel>
    </div>
  );
};

export default StoreProfile;
