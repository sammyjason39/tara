import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package, 
  TrendingUp, 
  MapPin, 
  History, 
  Edit3, 
  Trash2, 
  Activity,
  Box,
  BarChart2,
  Tag
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/core/api/apiClient";
import { useSession } from "@/core/security/session";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface ItemDetailsModalProps {
  item: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

export function ItemDetailsModal({
  item,
  open,
  onOpenChange,
  onUpdated,
}: ItemDetailsModalProps) {
  const session = useSession();
  const [movements, setMovements] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDecommissioning, setIsDecommissioning] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});

  useEffect(() => {
    if (open && item) {
      fetchExtraData();
    }
  }, [open, item]);

  const fetchExtraData = async () => {
    setLoading(true);
    try {
      const [moveData, balanceData] = await Promise.all([
        apiRequest<any[]>(`/inventory/movements?item_id=${item.id}`, "GET", session),
        apiRequest<any[]>(`/inventory/balances?item_id=${item.id}`, "GET", session),
      ]);
      setMovements(moveData || []);
      setBalances(balanceData || []);
    } catch (error: any) {
      console.error("Failed to fetch details", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      await apiRequest(`/inventory/items/${item.id}`, "PATCH", session, editData);
      toast({ title: "Identity Updated", description: "Item metadata and status have been successfully synchronized." });
      setIsEditing(false);
      onUpdated();
    } catch (error: any) {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    }
  };

  const handleDecommission = async () => {
    try {
      await apiRequest(`/inventory/items/${item.id}`, "DELETE", session);
      toast({ title: "Item Decommissioned", description: "Identity has been archived and removed from active circulation." });
      setIsDecommissioning(false);
      onOpenChange(false);
      onUpdated();
    } catch (error: any) {
      toast({ title: "Action Failed", description: error.message, variant: "destructive" });
    }
  };

  // Aggregate balances by location to avoid redundancy
  const aggregatedBalances = balances.reduce((acc: any[], curr: any) => {
    const locId = curr.location_id;
    const existing = acc.find(b => b.location_id === locId);
    if (existing) {
      existing.quantity += curr.quantity;
      existing.reserved += curr.reserved_quantity || 0;
      existing.in_transit += curr.in_transit_quantity || 0;
    } else {
      acc.push({ 
        location_id: locId,
        location_name: curr.location?.name || `Storage Node #${locId.slice(0,4)}`,
        quantity: curr.quantity,
        reserved: curr.reserved_quantity || 0,
        in_transit: curr.in_transit_quantity || 0
      });
    }
    return acc;
  }, []);


  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl rounded-[3rem] border-none shadow-2xl bg-white dark:bg-slate-950 p-0 overflow-hidden">
        <div className="bg-slate-900 p-8 text-white">
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-indigo-400 font-black text-[10px] uppercase tracking-[0.3em]">
                <Package className="h-3 w-3" /> SKU: {item.sku}
              </div>
              <DialogTitle className="text-3xl font-black tracking-tighter uppercase italic">
                {item.name}
              </DialogTitle>
            </div>
            <Badge 
              variant="outline" 
              className={`font-black tracking-[0.2em] rounded-xl px-4 py-1.5 uppercase ${
                item.status === 'REJECT' ? 'border-rose-500 text-rose-500 bg-rose-500/10' :
                item.status === 'REPAIR' ? 'border-amber-500 text-amber-500 bg-amber-500/10' :
                item.status === 'DELETED' || item.status === 'deleted' ? 'border-slate-500 text-slate-500 bg-slate-500/10' :
                'border-indigo-500/50 text-indigo-400'
              }`}
            >
              {item.status || 'Active'}
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Category</span>
              <p className="font-bold">{item.category || "General"}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Unit of Measure</span>
              <p className="font-bold">{item.uom || item.unit || "Units"}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Available Stock</span>
              <p className="text-2xl font-black text-indigo-400">{item.currentStock || 0}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Threshold</span>
              <p className="font-bold text-rose-400">{item.minStock || 0}</p>
            </div>
          </div>
        </div>

        <ScrollArea className="max-h-[65vh]">
          <div className="p-8">
            {isEditing ? (
              <div className="space-y-6 mb-8 p-6 rounded-[2rem] bg-slate-50 dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/30">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Item Name</label>
                    <input 
                      value={editData.name} 
                      onChange={e => setEditData({...editData, name: e.target.value})}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Global Status</label>
                    <Select
                      value={editData.status}
                      onValueChange={(val) => setEditData({ ...editData, status: val })}
                    >
                      <SelectTrigger className="h-12 rounded-xl bg-slate-950/50 border-white/5 font-bold italic text-white">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl bg-slate-900 border-white/10 text-white">
                        <SelectItem value="active">ACTIVE</SelectItem>
                        <SelectItem value="REPAIR">REPAIR</SelectItem>
                        <SelectItem value="REJECT">REJECT</SelectItem>
                        <SelectItem value="DISCONTINUED">DISCONTINUED</SelectItem>
                        <SelectItem value="DRAFT">DRAFT</SelectItem>
                        <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Identity Description</label>
                  <textarea 
                    value={editData.description} 
                    onChange={e => setEditData({...editData, description: e.target.value})}
                    rows={3}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  />
                </div>
              </div>
            ) : null}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3 rounded-2xl bg-slate-100 dark:bg-slate-900 p-1 mb-8">
              <TabsTrigger value="overview" className="rounded-xl font-black text-[10px] uppercase tracking-widest">Overview</TabsTrigger>
              <TabsTrigger value="movements" className="rounded-xl font-black text-[10px] uppercase tracking-widest">Movements</TabsTrigger>
              <TabsTrigger value="locations" className="rounded-xl font-black text-[10px] uppercase tracking-widest">Storage Nodes</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Activity className="h-3 w-3" /> Item Description
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium italic">
                    {item.description || "No description provided for this item identity."}
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <BarChart2 className="h-3 w-3" /> Quick Stats
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-1">In Transit</p>
                      <p className="text-xl font-black">0</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Reserved</p>
                      <p className="text-xl font-black">0</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-6 border-t">
                  {isDecommissioning ? (
                    <div className="flex flex-col gap-2 w-full">
                      <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 mb-2">
                        <p className="text-[10px] font-black uppercase text-rose-600 mb-1">⚠️ Critical Warning</p>
                        <p className="text-xs font-bold text-rose-500 leading-relaxed">
                          Decommissioning will archive this identity. It will no longer appear in active inventory cycles and requires audit clearance. 
                          This action is persistent. Continue?
                        </p>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="ghost" onClick={() => setIsDecommissioning(false)} className="rounded-xl h-12 px-6 font-black text-[10px] uppercase tracking-widest">
                          Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDecommission} className="rounded-xl h-12 px-6 font-black text-[10px] uppercase tracking-widest bg-rose-600 shadow-lg shadow-rose-200">
                          Confirm Decommission
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Button 
                        onClick={() => {
                          setEditData({ name: item.name, description: item.description, status: item.status || 'active' });
                          setIsEditing(!isEditing);
                        }}
                        variant="outline" 
                        className="rounded-xl h-12 px-6 font-black text-[10px] uppercase tracking-widest border-slate-200"
                      >
                        <Edit3 className="h-3 w-3 mr-2" /> {isEditing ? "Discard Changes" : "Edit Identity"}
                      </Button>
                      {isEditing && (
                        <Button onClick={handleUpdate} className="rounded-xl h-12 px-6 font-black text-[10px] uppercase tracking-widest bg-indigo-600 text-white shadow-lg shadow-indigo-200">
                          Save Changes
                        </Button>
                      )}
                      <Button 
                        onClick={() => setIsDecommissioning(true)}
                        variant="outline" 
                        className="rounded-xl h-12 px-6 font-black text-[10px] uppercase tracking-widest text-rose-500 border-rose-100 hover:bg-rose-50"
                      >
                        <Trash2 className="h-3 w-3 mr-2" /> Decommission
                      </Button>
                    </>
                  )}
                </div>
            </TabsContent>

            <TabsContent value="movements">
              <ScrollArea className="h-[400px] pr-4">
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
                  </div>
                ) : movements.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center opacity-20 italic">
                    <History className="h-12 w-12 mb-2" />
                    <p className="font-bold">No movement history</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {movements.map((move, i) => (
                      <div key={i} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-xl ${move.quantity > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                            {move.quantity > 0 ? <TrendingUp className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase tracking-widest">{move.movement_type}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">{move.reference_id}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-black ${move.quantity > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {move.quantity > 0 ? '+' : ''}{move.quantity}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400">{new Date(move.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="locations">
               <ScrollArea className="h-[400px] pr-4">
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
                  </div>
                ) : aggregatedBalances.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center opacity-20 italic">
                    <MapPin className="h-12 w-12 mb-2" />
                    <p className="font-bold">No storage data</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {aggregatedBalances.map((bal, i) => (
                      <div key={i} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <MapPin className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase tracking-widest">{bal.location_name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">
                              {bal.reserved > 0 ? `${bal.reserved} reserved • ` : ''}
                              {bal.in_transit > 0 ? `${bal.in_transit} in-transit • ` : ''}
                              Operational Storage
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-black text-slate-900 dark:text-white">
                            {bal.quantity}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">On Hand</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
           </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
