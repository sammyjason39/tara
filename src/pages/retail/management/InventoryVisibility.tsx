import React, { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { 
  Eye, 
  Package, 
  AlertTriangle, 
  ArrowRight, 
  Layers, 
  Globe, 
  Store, 
  ShieldAlert, 
  Search, 
  Filter,
  RefreshCw,
  Plus,
  ArrowDownToLine,
  Truck,
  Trash2, 
  Edit3, 
  ChevronRight,
  MoreVertical,
  MinusCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { retailService } from "@/core/services/retail/retailService";
import { useSession } from "@/core/security/session";
import { nextId } from "@/core/repositories/hr/storage";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ItemDetailModal } from "./modals/ItemDetailModal";
import { TransferTrackingModal } from "./modals/TransferTrackingModal";

const InventoryVisibility = () => {
  const session = useSession();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [inventory, setInventory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [correctionQty, setCorrectionQty] = useState<number>(0);
  const [newItem, setNewItem] = useState<any>({ category: 'FINISHED_GOOD' });
  const [isRegistering, setIsRegistering] = useState(false);

  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [isItemDetailOpen, setIsItemDetailOpen] = useState(false);
  const [selectedDetailItem, setSelectedDetailItem] = useState<any | null>(null);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [trackingTransferId, setTrackingTransferId] = useState<string>("");

  useEffect(() => {
    const fetchData = () => {
      try {
        const data = retailService.listInventory(session.tenantId);
        setInventory(data);
      } catch (error) {
        console.error("Failed to fetch inventory", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [session.tenantId]);

  const stats = useMemo(() => {
    const totalSOH = inventory.reduce((sum, item) => sum + item.stock, 0);
    const ats = Math.floor(totalSOH * 0.85); // Mock 85% ATS
    const critical = inventory.filter(item => item.stock < 15).length;
    const reserved = totalSOH - ats;

    return { totalSOH, ats, critical, reserved };
  }, [inventory]);

  const filteredInventory = inventory.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleManualCorrection = () => {
    if (!selectedItem) return;
    setIsCorrecting(true);
    try {
      // In a real app, this would hit repository
      toast({ 
        title: "Correction Logged", 
        description: `Manual adjustment of ${correctionQty} units for ${selectedItem.name} has been synchronized.` 
      });
      setInventory(prev => prev.map(item => 
        item.sku === selectedItem.sku ? { ...item, stock: correctionQty } : item
      ));
      setSelectedItem(null);
    } catch (e) {
      toast({ title: "Error", description: "Failed to apply correction.", variant: "destructive" });
    } finally {
      setIsCorrecting(false);
    }
  };

  const handleRegisterItem = () => {
    if (!newItem.name || !newItem.sku) return;
    setIsRegistering(true);
    const item = {
      id: nextId("ITM"),
      sku: newItem.sku,
      name: newItem.name,
      category: newItem.category,
      stock: 0, // Fresh items start with 0 stock
    };

    try {
      // Mocking inventory add (since it usually joins with inventory repo)
      setInventory([...inventory, item]);
      setNewItem({ category: 'FINISHED_GOOD' });
      toast({ title: "SKU Registered", description: `${item.name} added to Item Master.` });
    } catch (e) {
      toast({ title: "Error", description: "Registration failed.", variant: "destructive" });
    } finally {
      setIsRegistering(false);
    }
  };

  const handleDeleteItem = (sku: string) => {
    if (!confirm("Are you sure you want to remove this item from the Master? All associated stock will be written off.")) return;
    setInventory(inventory.filter(i => i.sku !== sku));
    toast({ title: "Item Removed", description: "SKU has been decommissioned from active inventory.", variant: "destructive" });
  };

  const handleItemClick = (item: any) => {
    setSelectedDetailItem(item);
    setIsItemDetailOpen(true);
  };

  const handleTrackTransfer = (transferId: string) => {
    setTrackingTransferId(transferId);
    setIsTrackingOpen(true);
  };

  const handleItemEdit = (item: any) => {
    setEditingItem(item);
    toast({ title: "Edit Mode", description: `Editing ${item.name}` });
  };

  const handleItemDelete = (sku: string) => {
    handleDeleteItem(sku);
  };

  const handleInitiatePO = (item: any) => {
    toast({ 
      title: "P.O. Draft Created", 
      description: `Draft Purchase Order for ${item.name} has been dispatched to Zenvix Procurement Hub.` 
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Inventory Visibility" 
        subtitle={`${session.tenantId} • Available-to-Sell (ATS) • Channel Allocation Control`}
      />
      
      <WorkspacePanel>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-lg border-slate-200 hover:border-blue-200 transition-all border-l-4 border-l-blue-600">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-blue-50 p-2 rounded-xl text-blue-600">
                  <Package className="w-5 h-5" />
                </div>
                <Badge className="bg-slate-100 text-slate-600 border-none font-black italic">SOH</Badge>
              </div>
              <div className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Stock On-Hand</div>
              <div className="text-3xl font-black italic text-slate-900 tracking-tighter">{stats.totalSOH.toLocaleString()}</div>
              <p className="text-[10px] font-bold text-slate-400 mt-2 italic flex items-center gap-1">
                <Globe className="w-3 h-3" /> Global Valuation: Rp {(stats.totalSOH * 85000 / 1000000).toFixed(1)}M
              </p>
            </CardContent>
          </Card>
          
          <Card className="shadow-lg border-slate-200 hover:border-emerald-200 transition-all border-l-4 border-l-emerald-600">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600">
                  <Globe className="w-5 h-5" />
                </div>
                <Badge className="bg-emerald-100 text-emerald-700 border-none font-black italic text-[9px]">ATS_ACTIVE</Badge>
              </div>
              <div className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Available to Sell</div>
              <div className="text-3xl font-black italic text-slate-900 tracking-tighter">{stats.ats.toLocaleString()}</div>
              <p className="text-[10px] font-bold text-slate-400 mt-2 italic">Excl. Damage & Reservations</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-lg border-slate-200 hover:border-amber-200 transition-all border-l-4 border-l-amber-500">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-amber-50 p-2 rounded-xl text-amber-600">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <Badge variant="destructive" className="border-none font-black italic text-[9px]">CRITICAL</Badge>
              </div>
              <div className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Stockouts Immersion</div>
              <div className="text-3xl font-black italic text-slate-900 tracking-tighter">{stats.critical} SKUs</div>
              <p className="text-[10px] font-bold text-slate-400 mt-2 italic">Est. Revenue Loss Potential</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-lg border-slate-200 hover:border-indigo-200 transition-all border-l-4 border-l-indigo-600">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600">
                  <Layers className="w-5 h-5" />
                </div>
                <Badge className="bg-indigo-100 text-indigo-700 border-none font-black italic text-[9px]">SYNCED</Badge>
              </div>
              <div className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Reserved Stock</div>
              <div className="text-3xl font-black italic text-slate-900 tracking-tighter">{stats.reserved.toLocaleString()}</div>
              <p className="text-[10px] font-bold text-slate-400 mt-2 italic">Ecommerce & B2B Contracts</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-4 mb-8 bg-slate-50 p-4 rounded-3xl border border-slate-200">
           <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                className="pl-12 h-14 bg-white border-slate-200 rounded-2xl text-sm font-bold italic placeholder:text-slate-300 focus-visible:ring-blue-500" 
                placeholder="Search Item ID, Barcode, or Category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
           </div>
            <div className="flex gap-2">
               <Dialog>
                 <DialogTrigger asChild>
                   <Button variant="outline" className="h-14 px-6 rounded-2xl gap-2 font-black italic border-slate-200 hover:bg-slate-100">
                     <Plus className="w-5 h-5 text-blue-600" /> New SKU
                   </Button>
                 </DialogTrigger>
                 <DialogContent className="rounded-[2rem]">
                   <DialogHeader>
                     <DialogTitle className="font-black italic text-2xl uppercase tracking-tighter">SKU Master Registry</DialogTitle>
                     <DialogDescription className="font-bold italic">Add new identifiable item to global inventory.</DialogDescription>
                   </DialogHeader>
                   <div className="grid gap-4 py-4">
                     <div className="space-y-1">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Item Name</Label>
                       <Input value={newItem.name || ""} onChange={e => setNewItem({...newItem, name: e.target.value})} className="h-12 rounded-xl font-bold italic" placeholder="e.g. Premium Coffee Beans" />
                     </div>
                     <div className="space-y-1">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">SKU Code</Label>
                       <Input value={newItem.sku || ""} onChange={e => setNewItem({...newItem, sku: e.target.value})} className="h-12 rounded-xl font-bold italic" placeholder="e.g. COF-PR-99" />
                     </div>
                     <div className="space-y-1">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</Label>
                       <Input value={newItem.category || ""} onChange={e => setNewItem({...newItem, category: e.target.value})} className="h-12 rounded-xl font-bold italic" placeholder="e.g. Beverages" />
                     </div>
                   </div>
                   <DialogFooter>
                     <Button 
                       className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white font-black italic rounded-xl shadow-xl uppercase tracking-widest"
                       onClick={handleRegisterItem}
                       disabled={isRegistering || !newItem.name || !newItem.sku}
                     >
                       {isRegistering ? <RefreshCw className="w-5 h-5 animate-spin" /> : "Authorize Global SKU"}
                     </Button>
                   </DialogFooter>
                 </DialogContent>
               </Dialog>

               <Dialog>
                 <DialogTrigger asChild>
                   <Button className="h-14 px-8 rounded-2xl gap-2 bg-slate-900 hover:bg-slate-800 font-black italic shadow-xl">
                     <RefreshCw className="w-5 h-5" /> Stock Correction
                   </Button>
                 </DialogTrigger>
                 <DialogContent className="rounded-[2rem] border-slate-200">
                <DialogHeader>
                  <DialogTitle className="font-black italic text-2xl tracking-tighter uppercase">Inventory Adjustment</DialogTitle>
                  <DialogDescription className="font-bold italic">Override system stock totals. All changes are logged for forensic audit.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target SKU / Item</Label>
                    <select 
                      className="w-full h-12 rounded-xl border-slate-200 font-bold italic text-sm px-4 focus:ring-blue-500"
                      onChange={(e) => {
                        const item = inventory.find(i => i.sku === e.target.value);
                        setSelectedItem(item);
                        setCorrectionQty(item?.stock || 0);
                      }}
                    >
                      <option value="">Select Item...</option>
                      {inventory.map(i => <option key={i.sku} value={i.sku}>{i.name} ({i.sku})</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Actual Count (Physical)</Label>
                    <Input 
                      type="number" 
                      value={correctionQty} 
                      onChange={(e) => setCorrectionQty(parseInt(e.target.value) || 0)}
                      className="h-12 rounded-xl font-bold italic" 
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white font-black italic rounded-xl shadow-xl uppercase tracking-widest"
                    onClick={handleManualCorrection}
                    disabled={!selectedItem || isCorrecting}
                  >
                    {isCorrecting ? <RefreshCw className="w-5 h-5 animate-spin" /> : "Commit Adjustment"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card className="shadow-xl border-slate-200 rounded-3xl overflow-hidden">
            <CardHeader className="bg-slate-900 text-white p-6">
              <CardTitle className="flex items-center gap-2 text-xl font-black italic tracking-tighter">
                <ShieldAlert className="w-6 h-6 text-red-500" />
                CRITICAL THRESHOLDS
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
                {isLoading ? (
                  <div className="text-center py-12 text-slate-400 font-black italic uppercase text-xs tracking-widest animate-pulse">Scanning Inventory...</div>
                ) : filteredInventory.length > 0 ? (
                  filteredInventory.filter(i => i.stock < 50).map((item, i) => (
                    <div 
                      key={i} 
                      onClick={() => handleItemClick(item)}
                      className="group p-6 rounded-[2rem] bg-slate-50 border border-slate-100 hover:border-red-200 hover:bg-red-50/20 transition-all cursor-pointer"
                    >
                       <div className="flex justify-between items-start mb-4">
                          <div>
                             <div className="text-sm font-black italic tracking-tight">{item.name}</div>
                             <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.sku} • Category: {item.category}</div>
                          </div>
                          <Badge variant="outline" className="border-red-600 text-red-600 font-black italic text-[10px]">{Math.round((item.stock/50)*100)}% SAFETY</Badge>
                       </div>
                       <Progress value={(item.stock / 50) * 100} className="h-3 bg-slate-200" />
                       <div className="flex justify-between mt-3 gap-2">
                          <div className="text-[10px] font-black italic text-slate-500 uppercase flex-1 mt-2">Available: <span className="text-red-600">{item.stock} Units</span></div>
                          <div className="flex gap-2">
                             <Button 
                               variant="ghost" 
                               size="sm" 
                               className="h-9 px-3 text-[10px] font-black uppercase text-blue-600 gap-1 italic hover:bg-blue-100"
                               onClick={() => handleInitiatePO(item)}
                             >
                                <ArrowDownToLine className="w-4 h-4" /> P.O.
                             </Button>
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                   <Button variant="ghost" size="sm" className="h-9 w-9 text-slate-400 hover:text-slate-900">
                                      <MoreVertical className="w-4 h-4" />
                                   </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-xl font-bold italic">
                                   <DropdownMenuItem className="text-blue-600 focus:text-blue-600 cursor-pointer">
                                      <Edit3 className="w-4 h-4 mr-2" /> Quick Edit
                                   </DropdownMenuItem>
                                   <DropdownMenuItem 
                                     className="text-red-600 focus:text-red-600 cursor-pointer"
                                     onClick={() => handleDeleteItem(item.sku)}
                                   >
                                      <Trash2 className="w-4 h-4 mr-2" /> Remove SKU
                                   </DropdownMenuItem>
                                </DropdownMenuContent>
                             </DropdownMenu>
                          </div>
                       </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-400 font-black italic uppercase text-xs tracking-widest">No Critical Alerts</div>
                )}
            </CardContent>
          </Card>

          <Card className="shadow-xl border-slate-200 rounded-3xl overflow-hidden">
            <CardHeader className="bg-slate-100 text-slate-600 p-6">
              <CardTitle className="flex items-center gap-2 text-xl font-black italic tracking-tighter">
                <Globe className="w-6 h-6 text-indigo-600" />
                CHANNEL ALLOCATION
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
               <div className="space-y-4">
                  <div className="flex justify-between items-center bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100 border-dashed">
                     <div className="flex items-center gap-4">
                        <div className="bg-indigo-600 p-3 rounded-2xl text-white">
                           <Globe className="w-6 h-6" />
                        </div>
                        <div>
                           <div className="text-sm font-black italic uppercase">Ecommerce Sync</div>
                           <div className="text-[10px] text-indigo-600 font-bold tracking-tighter uppercase">ATS Buffer: 10% Reserve</div>
                        </div>
                     </div>
                     <Badge className="bg-emerald-100 text-emerald-700 font-black italic border-none">ACTIVE</Badge>
                  </div>

                  <div className="flex justify-between items-center bg-blue-50/50 p-6 rounded-3xl border border-blue-100 border-dashed">
                     <div className="flex items-center gap-4">
                        <div className="bg-blue-600 p-3 rounded-2xl text-white">
                           <Store className="w-6 h-6" />
                        </div>
                        <div>
                           <div className="text-sm font-black italic uppercase">Walk-in Retail</div>
                           <div className="text-[10px] text-blue-600 font-bold tracking-tighter uppercase">Physical Store Priority</div>
                        </div>
                     </div>
                     <Badge className="bg-emerald-100 text-emerald-700 font-black italic border-none">ACTIVE</Badge>
                  </div>
               </div>

               <Separator />

               <div className="p-8 rounded-[2.5rem] bg-indigo-900 text-white relative overflow-hidden group">
                  <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:rotate-12 transition-transform">
                     <RefreshCw className="w-32 h-32" />
                  </div>
                  <div className="relative space-y-4">
                     <div className="text-3xl font-black italic tracking-tighter">Smart AI Reordering</div>
                     <p className="text-xs opacity-70 italic leading-relaxed">System predicts stockouts in <strong>4 locations</strong> based on festive season trends. Proactive transfer suggested.</p>
                     <Button className="w-full bg-white text-indigo-900 hover:bg-indigo-50 font-black italic h-14 rounded-2xl shadow-xl">
                        Review Transfer Suggestions <ArrowRight className="w-5 h-5 ml-2" />
                     </Button>
                  </div>
               </div>
            </CardContent>
          </Card>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
           <div className="p-6 border-b bg-slate-50 flex items-center justify-between">
              <div className="text-sm font-black italic uppercase tracking-widest text-slate-500">Live Intake & Transfer Stream</div>
              <Badge className="bg-blue-600 font-black italic">3 IN TRANSIT</Badge>
           </div>
           <div className="divide-y divide-slate-100">
              {[
                { id: "TF-8802", from: "Surabaya DC", status: "IN_TRANSIT", eta: "2 Hours", type: "Replenishment" },
                { id: "TF-8803", from: "Jakarta North", status: "PICKING", eta: "Tomorrow", type: "Inter-store" },
              ].map((transfer, i) => (
                <div key={i} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-all">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-black italic">
                         <Truck className="w-6 h-6" />
                      </div>
                      <div>
                         <div className="text-sm font-black italic flex items-center gap-2">
                           {transfer.id}
                           <Badge variant="outline" className="text-[8px] font-black h-4 px-1">{transfer.type}</Badge>
                         </div>
                         <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Orig: {transfer.from} • ETA: {transfer.eta}</div>
                      </div>
                   </div>
                   <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-blue-600 font-black italic text-xs gap-1 group"
                      onClick={() => handleTrackTransfer(transfer.id)}
                   >
                      Track <ArrowUpRight className="group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform w-3 h-3" />
                   </Button>
                </div>
              ))}
           </div>
        </div>
      </WorkspacePanel>

      <ItemDetailModal
        item={selectedDetailItem}
        isOpen={isItemDetailOpen}
        onClose={() => setIsItemDetailOpen(false)}
        onEdit={handleItemEdit}
        onDelete={handleItemDelete}
      />

      <TransferTrackingModal
        transferId={trackingTransferId}
        isOpen={isTrackingOpen}
        onClose={() => setIsTrackingOpen(false)}
      />
    </div>
  );
};

// Internal icon for consistency
const ArrowUpRight = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M7 7h10v10"/><path d="M7 17 17 7"/>
  </svg>
);

export default InventoryVisibility;
