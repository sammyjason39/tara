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
  Plus,
  CheckCircle2,
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
import type { RetailStore, RetailStoreType } from "@/core/types/retail/retail";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useRetail } from "../context/RetailContext";
import { RegisterStoreDialog } from "./modals/RegisterStoreDialog";
import { cn } from "@/lib/utils";

const StoreProfile = () => {
  const session = useSession();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [stores, setStores] = useState<RetailStore[]>([]);
  const [selectedStore, setSelectedStore] = useState<RetailStore | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  const { activeStore } = useRetail();
  const activeStoreId = activeStore?.id;

  useEffect(() => {
    const fetchStores = async () => {
      if (!session.tenantId) return;
      try {
        const data = await retailService.listStores(session.tenantId!, session);
        setStores(data);

        // Priority: Active Store from Context > First Store in List
        if (activeStore) {
          const match = data.find((s) => s.id === activeStore.id);
          if (match) setSelectedStore(match);
          else if (data.length > 0) setSelectedStore(data[0]);
        } else if (data.length > 0) {
          setSelectedStore(data[0]);
        }
      } catch (error) {
        console.error("Failed to fetch stores", error);
      }
    };
    fetchStores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.tenantId, activeStoreId]);

  const handleSave = async () => {
    if (!selectedStore) return;
    setIsSaving(true);
    try {
      await retailService.updateStore(
        session.tenantId!,
        session,
        selectedStore,
      );
      toast({
        title: "Profile Updated",
        description: "Store metadata and compliance settings synchronized.",
      });
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to update store.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegisterSuccess = (created: RetailStore) => {
    setStores((prev) => [...prev, created]);
    setSelectedStore(created);
    toast({
      title: "Store Registered",
      description: `${created.name} is now active in your tenant.`,
    });
  };

  const handleDecommission = async () => {
    if (!selectedStore) return;
    if (
      !confirm(
        "CRITICAL WARNING: This will immediately freeze all POS operations and invalidate fiscal connectivity for this store. Authorize decommissioning?",
      )
    )
      return;

    try {
      await retailService.deleteStore(
        session.tenantId!,
        session,
        selectedStore.id,
      );
      const remaining = stores.filter((s) => s.id !== selectedStore.id);
      setStores(remaining);
      setSelectedStore(remaining[0] || null);
      toast({
        title: "Decommissioning Protocol Started",
        description:
          "Fiscal bridge disconnected. Store status moved to TERMINATED.",
        variant: "destructive",
      });
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to decommission store.",
        variant: "destructive",
      });
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
          <div className="lg:col-span-2 space-y-8 relative">
            {!selectedStore && (
              <div className="absolute inset-0 z-10 bg-white/70 backdrop-blur-[1px] rounded-3xl flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-slate-300 mr-2">
                <Store className="w-16 h-16 text-slate-300 mb-6" />
                <h3 className="text-2xl font-black italic text-slate-700 uppercase tracking-tighter">
                  No Branch Selected
                </h3>
                <p className="text-sm font-medium text-slate-500 max-w-sm mb-6 mt-2">
                  The profile configuration is currently locked. Please select
                  an existing branch from the Store Registry on the right, or
                  click "Register New" to create your first branch.
                </p>
              </div>
            )}
            <Card
              className={cn(
                "shadow-xl border-slate-200 rounded-3xl overflow-hidden text-left",
                !selectedStore && "opacity-50 pointer-events-none",
              )}
            >
              <CardHeader className="bg-slate-900 text-white p-6">
                <CardTitle className="flex items-center gap-2 text-xl font-black italic tracking-tighter">
                  <Building2 className="w-6 h-6 text-blue-400" />
                  BRANCH IDENTITY
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Store Name
                    </Label>
                    <Input
                      value={selectedStore?.name || ""}
                      onChange={(e) =>
                        setSelectedStore((prev) =>
                          prev ? { ...prev, name: e.target.value } : null,
                        )
                      }
                      className="h-12 font-bold italic border-slate-200 focus:border-blue-500 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Store Type
                    </Label>
                    <select
                      value={selectedStore?.type || "flagship"}
                      onChange={(e) =>
                        setSelectedStore((prev) =>
                          prev
                            ? {
                                ...prev,
                                type: e.target.value as RetailStoreType,
                              }
                            : null,
                        )
                      }
                      className="w-full h-12 rounded-xl border border-slate-200 px-3 font-bold italic text-sm bg-white"
                    >
                      <option value="flagship">Flagship</option>
                      <option value="express">Express</option>
                      <option value="kiosk">Kiosk</option>
                      <option value="pop-up">Pop-Up</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Store Global ID
                    </Label>
                    <div className="relative">
                      <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        defaultValue="ZVX-RE-JKT-001"
                        disabled
                        className="h-12 pl-12 font-mono text-xs bg-slate-50 border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Tax ID (NPWP)
                    </Label>
                    <Input
                      defaultValue="01.234.567.8-901.000"
                      className="h-12 font-mono text-xs border-slate-200 focus:border-blue-500 rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Physical Address
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-4 w-4 h-4 text-slate-400" />
                    <Input
                      value={selectedStore?.address || ""}
                      onChange={(e) =>
                        setSelectedStore((prev) =>
                          prev ? { ...prev, address: e.target.value } : null,
                        )
                      }
                      className="h-12 pl-12 font-bold italic border-slate-200 focus:border-blue-500 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Phone
                    </Label>
                    <Input
                      value={selectedStore?.phone || ""}
                      onChange={(e) =>
                        setSelectedStore((prev) =>
                          prev ? { ...prev, phone: e.target.value } : null,
                        )
                      }
                      className="h-12 font-bold border-slate-200 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Email
                    </Label>
                    <Input
                      value={selectedStore?.email || ""}
                      onChange={(e) =>
                        setSelectedStore((prev) =>
                          prev ? { ...prev, email: e.target.value } : null,
                        )
                      }
                      className="h-12 font-bold border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <Badge className="bg-blue-600 font-black italic px-4 py-1">
                    HYBRID_BRANCH
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-slate-300 text-slate-500 font-black italic px-4 py-1"
                  >
                    VAT_REGISTERED
                  </Badge>
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
                  {
                    day: "Weekday Schedule",
                    time: "09:00 - 22:00",
                    active: true,
                  },
                  {
                    day: "Weekend Schedule",
                    time: "10:00 - 23:00",
                    active: true,
                  },
                  {
                    day: "Public Holidays",
                    time: "12:00 - 20:00",
                    active: false,
                  },
                ].map((sched, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all"
                  >
                    <span className="text-sm font-black italic text-slate-700">
                      {sched.day}
                    </span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-mono font-bold text-slate-500 bg-white px-3 py-1 rounded-lg border">
                        {sched.time}
                      </span>
                      <div
                        className={`w-2 h-2 rounded-full ${sched.active ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-slate-300"}`}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="shadow-lg border-slate-200 rounded-3xl overflow-hidden mt-8">
              <CardHeader className="bg-slate-50 border-b p-6">
                <CardTitle className="flex items-center gap-2 text-sm font-black italic uppercase tracking-widest text-slate-500">
                  <Globe className="w-5 h-5 text-indigo-600" />
                  Store Specific Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <Tabs defaultValue="general" className="w-full">
                  <TabsList className="mb-6">
                    <TabsTrigger
                      value="general"
                      className="font-bold italic text-xs uppercase"
                    >
                      General Rules
                    </TabsTrigger>
                    <TabsTrigger
                      value="inventory"
                      className="font-bold italic text-xs uppercase"
                    >
                      Inventory Mapping
                    </TabsTrigger>
                    <TabsTrigger
                      value="tax"
                      className="font-bold italic text-xs uppercase"
                    >
                      Tax & Compliance
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="general" className="space-y-6">
                    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100">
                      <div>
                        <div className="text-sm font-black italic">
                          Auto-Generate Receipt
                        </div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                          Generate PDF immediately after payment
                        </div>
                      </div>
                      <Switch
                        checked={
                          (selectedStore?.settings?.autoReceipt as boolean) ||
                          false
                        }
                        onCheckedChange={(checked) =>
                          setSelectedStore((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  settings: {
                                    ...prev.settings,
                                    autoReceipt: checked,
                                  },
                                }
                              : null,
                          )
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100">
                      <div>
                        <div className="text-sm font-black italic">
                          Restricted Returns
                        </div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                          Only allow returns within 7 days
                        </div>
                      </div>
                      <Switch
                        checked={
                          (selectedStore?.settings
                            ?.restrictedReturns as boolean) || false
                        }
                        onCheckedChange={(checked) =>
                          setSelectedStore((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  settings: {
                                    ...prev.settings,
                                    restrictedReturns: checked,
                                  },
                                }
                              : null,
                          )
                        }
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="inventory" className="space-y-4">
                    <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Available Categories
                      </Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[
                          "Apparel",
                          "Footwear",
                          "Accessories",
                          "Electronics",
                          "Home & Garden",
                          "Beauty",
                        ].map((cat) => {
                          const visibleCategories =
                            (selectedStore?.settings
                              ?.visibleCategories as string[]) || [];
                          const isSelected = visibleCategories.includes(cat);
                          return (
                            <div
                              key={cat}
                              onClick={() => {
                                if (!selectedStore) return;
                                const current =
                                  (selectedStore?.settings
                                    ?.visibleCategories as string[]) || [];
                                const updated = isSelected
                                  ? current.filter((c: string) => c !== cat)
                                  : [...current, cat];
                                setSelectedStore({
                                  ...selectedStore,
                                  settings: {
                                    ...(selectedStore.settings || {}),
                                    visibleCategories: updated,
                                  },
                                });
                              }}
                              className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${isSelected ? "border-indigo-600 bg-indigo-50/50 text-indigo-900 shadow-sm" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"}`}
                            >
                              <span className="text-xs font-bold italic tracking-tight">
                                {cat}
                              </span>
                              <div
                                className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300"}`}
                              >
                                {isSelected && (
                                  <CheckCircle2 className="w-3 h-3" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="tax" className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Fiscal ID / NPWP
                      </Label>
                      <Input
                        value={(selectedStore?.settings?.taxId as string) || ""}
                        onChange={(e) =>
                          setSelectedStore((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  settings: {
                                    ...prev.settings,
                                    taxId: e.target.value,
                                  },
                                }
                              : null,
                          )
                        }
                        placeholder="01.234.567.8-901.000"
                        className="h-12 border-slate-200 rounded-xl font-mono text-xs"
                      />
                    </div>
                  </TabsContent>
                </Tabs>
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
                    <div className="text-[10px] text-slate-500 font-black uppercase mb-1">
                      Store Fingerprint
                    </div>
                    <div className="text-sm font-mono flex items-center gap-2">
                      sha256:JKT_9921_...88a
                      <ChevronRight className="w-4 h-4 ml-auto text-slate-700" />
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-white/5 border border-white/10 shadow-inner group cursor-pointer hover:bg-white/10 transition-all">
                    <div className="text-[10px] text-slate-500 font-black uppercase mb-1">
                      Fiscal Connection
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-xs font-black italic uppercase tracking-tighter text-green-400">
                        Direct Tax Interface
                      </span>
                    </div>
                  </div>
                </div>

                <Separator className="bg-white/10" />

                <div className="space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Authorized Officer
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-black italic border-2 border-white/10">
                      SA
                    </div>
                    <div>
                      <div className="text-xs font-black italic">
                        System Architect
                      </div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter italic">
                        Lvl 9 Clearance
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-indigo-100 rounded-3xl overflow-hidden">
              <CardHeader className="p-6 pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-indigo-900 italic">
                  Support & Escalation
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-indigo-50 transition-all cursor-pointer">
                    <Phone className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-bold italic tracking-tight text-slate-600">
                      +62 21 555 0199
                    </span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-indigo-50 transition-all cursor-pointer">
                    <Mail className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-bold italic tracking-tight text-slate-600">
                      jakarta.hub@zenvix.io
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full h-10 rounded-xl text-[10px] font-black uppercase border-indigo-200 text-indigo-700 hover:bg-indigo-100 italic gap-2 transition-all"
                >
                  <Users className="w-4 h-4" /> Regional Contacts
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-slate-200 overflow-hidden shadow-xl">
              <CardHeader className="bg-slate-50 border-b py-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500">
                    Store Registry
                  </CardTitle>
                  <RegisterStoreDialog onSuccess={handleRegisterSuccess} />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {stores.map((s) => (
                    <div
                      key={s.id}
                      className={`p-6 flex items-center justify-between cursor-pointer transition-all hover:bg-slate-50 ${selectedStore?.id === s.id ? "bg-blue-50 border-r-4 border-blue-600" : ""}`}
                      onClick={() => setSelectedStore(s)}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black italic text-[10px] ${selectedStore?.id === s.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"}`}
                        >
                          {s.code}
                        </div>
                        <div>
                          <div className="text-sm font-black italic tracking-tight">
                            {s.name}
                          </div>
                          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            {s.status}
                          </div>
                        </div>
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 ${selectedStore?.id === s.id ? "text-blue-600" : "text-slate-300"}`}
                      />
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
                {isSaving ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Save className="w-6 h-6 text-blue-500" /> Save All Changes
                  </>
                )}
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
