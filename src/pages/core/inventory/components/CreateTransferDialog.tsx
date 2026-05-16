import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input as UIInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  AlertCircle, 
  Package, 
  MapPin, 
  ArrowRight, 
  Search, 
  Trash2, 
  Barcode,
  Minus,
  Plus as PlusIcon,
  ShoppingBag,
  Layers,
  Activity
} from "lucide-react";
import { inventoryService } from "@/core/services/inventory/inventoryService";
import { useSession } from "@/core/security/session";
import { toast } from "@/hooks/use-toast";
import type { InventoryItemMaster, InventoryStockBalance } from "@/core/types/inventory/inventory";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface TransferItem {
  id: string; // Internal unique ID for the list
  item: InventoryItemMaster;
  quantity: number;
  maxQuantity: number;
}

interface CreateTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateTransferDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateTransferDialogProps) {
  const session = useSession();
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Dependency Data
  const [allItems, setAllItems] = useState<InventoryItemMaster[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [stockBalances, setStockBalances] = useState<Record<string, number>>({});
  
  // Selection State
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<TransferItem[]>([]);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load basic dependencies on open
  useEffect(() => {
    if (open) {
      loadInitialData();
    }
  }, [open]);

  // Load stock balances when fromLocation changes
  useEffect(() => {
    if (fromLocation) {
      loadStockBalances();
    } else {
      setStockBalances({});
    }
  }, [fromLocation]);

  const loadInitialData = async () => {
    setFetching(true);
    try {
      const [itemsData, locationsData] = await Promise.all([
        inventoryService.listItems(session.tenant_id, session, undefined, 1, 500),
        inventoryService.listLocations(session.tenant_id, session),
      ]);
      setAllItems(itemsData);
      setLocations(locationsData);
    } catch (err) {
      console.error("Failed to load transfer dependencies:", err);
    } finally {
      setFetching(false);
    }
  };

  const loadStockBalances = async () => {
    try {
      const balances = await inventoryService.listBalances(
        session.tenant_id, 
        session, 
        fromLocation, 
        undefined, 
        1, 
        1000
      );
      const balanceMap: Record<string, number> = {};
      balances.forEach(b => {
        balanceMap[b.item_id] = b.quantity;
      });
      setStockBalances(balanceMap);
      
      // Update max quantities for already added items if location changes
      setSelectedItems(prev => prev.map(item => ({
        ...item,
        maxQuantity: balanceMap[item.item.id] || 0
      })));
    } catch (err) {
      console.error("Failed to load stock balances:", err);
    }
  };

  const reset = () => {
    setFromLocation("");
    setToLocation("");
    setSearchQuery("");
    setSelectedItems([]);
    setError(null);
  };

  const addItemToList = (item: InventoryItemMaster) => {
    const existing = selectedItems.find(si => si.item.id === item.id);
    const maxQty = stockBalances[item.id] || 0;

    if (maxQty <= 0) {
      toast({
        title: "Out of Stock",
        description: `${item.name} is not available at the selected origin.`,
        variant: "destructive"
      });
      return;
    }

    if (existing) {
      if (existing.quantity >= maxQty) {
        toast({
          title: "Max Reached",
          description: `Cannot add more of ${item.name}. Stock limit is ${maxQty}.`,
        });
        return;
      }
      setSelectedItems(prev => prev.map(si => 
        si.item.id === item.id 
          ? { ...si, quantity: si.quantity + 1 } 
          : si
      ));
    } else {
      setSelectedItems(prev => [
        ...prev,
        {
          id: Math.random().toString(36).substring(2, 9),
          item,
          quantity: 1,
          maxQuantity: maxQty
        }
      ]);
    }
    setSearchQuery("");
  };

  const handleBarcodeSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Check in-memory list first
    const found = allItems.find(i => 
      i.barcode === searchQuery || 
      i.sku.toLowerCase() === searchQuery.toLowerCase()
    );

    if (found) {
      addItemToList(found);
    } else {
      // Try backend lookup
      setLoading(true);
      try {
        const item = await inventoryService.lookupItemByBarcode(session.tenant_id, session, searchQuery);
        if (item) {
          addItemToList(item);
        } else {
          toast({
            title: "Not Found",
            description: `Item with barcode/SKU "${searchQuery}" not recognized.`,
            variant: "destructive"
          });
        }
      } catch (err) {
        console.error("Lookup error:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const updateItemQuantity = (id: string, newQty: number) => {
    setSelectedItems(prev => prev.map(item => {
      if (item.id === id) {
        const qty = Math.min(Math.max(1, newQty), item.maxQuantity);
        return { ...item, quantity: qty };
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setSelectedItems(prev => prev.filter(item => item.id !== id));
  };

  const totalItems = selectedItems.length;
  const totalPcs = selectedItems.reduce((acc, item) => acc + item.quantity, 0);

  const handleExecute = async () => {
    if (!fromLocation || !toLocation) {
      setError("Origin and Destination are required.");
      return;
    }
    if (fromLocation === toLocation) {
      setError("Origin and Destination must be different.");
      return;
    }
    if (selectedItems.length === 0) {
      setError("Please add at least one item to transfer.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await Promise.all(selectedItems.map(item => 
        inventoryService.createStockTransfer(session.tenant_id, session, {
          item_id: item.item.id,
          from_location_id: fromLocation,
          to_location_id: toLocation,
          quantity: item.quantity,
          reason: "Multi-item Transfer Protocol",
        })
      ));
      
      toast({
        title: "Logistics Executed",
        description: `Successfully initiated ${totalItems} transfers with ${totalPcs} pieces.`,
      });
      
      onSuccess();
      onOpenChange(false);
      reset();
    } catch (err: any) {
      setError(err?.message || "Execution failed. Check your connectivity.");
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (itemId: string) => {
    // In a real app, this would come from the item or a service
    // Placeholder or computed path
    const apiBase = (window as any).VITE_API_URL || "http://150.109.15.108:3001";
    return `${apiBase}/v1/inventory/items/${itemId}/image/thumbnail`;
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] bg-slate-950 border-slate-800 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl flex flex-col">
        <DialogHeader className="shrink-0 h-28 bg-gradient-to-r from-indigo-600/20 to-violet-600/20 border-b border-slate-800/50 p-8 flex flex-row items-end justify-between m-0 space-y-0">
          <div>
            <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter text-white leading-none">
              Logistics Protocol
            </DialogTitle>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mt-2 flex items-center gap-2">
              <Activity className="h-3 w-3" /> New Asset Transfer
            </p>
          </div>
          <Badge variant="outline" className="bg-slate-950/50 border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400 h-8 px-4 rounded-xl">
            {totalItems} Items | {totalPcs} PCS
          </Badge>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          {/* Origin/Dest Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900/30 p-6 rounded-[2rem] border border-slate-800/50">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-2">
                <MapPin className="h-3 w-3" /> Origin Node
              </Label>
              <Select value={fromLocation} onValueChange={setFromLocation}>
                <SelectTrigger className="h-14 bg-slate-950 border-slate-800 rounded-2xl font-black italic tracking-tight text-lg shadow-inner">
                  <SelectValue placeholder="Select Origin..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-800 bg-slate-950/95 backdrop-blur-xl">
                  {locations.map(loc => (
                    <SelectItem key={loc.id} value={loc.id} className="font-bold text-base">
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-2">
                <ArrowRight className="h-3 w-3" /> Destination Node
              </Label>
              <Select value={toLocation} onValueChange={setToLocation}>
                <SelectTrigger className="h-14 bg-slate-950 border-slate-800 rounded-2xl font-black italic tracking-tight text-lg shadow-inner">
                  <SelectValue placeholder="Select Destination..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-800 bg-slate-950/95 backdrop-blur-xl">
                  {locations.map(loc => (
                    <SelectItem key={loc.id} value={loc.id} className="font-bold text-base">
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Search Section */}
          <div className="space-y-4">
            <div className="relative group">
              <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                <Barcode className="h-6 w-6 text-indigo-500 group-focus-within:animate-pulse" />
              </div>
              <form onSubmit={handleBarcodeSearch}>
                <UIInput
                  ref={searchInputRef}
                  placeholder="Scan barcode or type SKU / Name..."
                  className="h-16 pl-16 pr-6 bg-slate-900 border-slate-800 rounded-3xl font-bold text-lg shadow-2xl focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:italic placeholder:font-normal placeholder:opacity-30"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={!fromLocation}
                />
              </form>
              {!fromLocation && (
                <p className="text-[10px] font-bold text-amber-500/70 italic mt-2 ml-4">
                  Select an Origin node first to enable item scanning.
                </p>
              )}
            </div>
          </div>

          {/* Items List */}
          <div className="space-y-4">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-2">
              <Layers className="h-3 w-3" /> Manifest Items
            </Label>
            
            <div className="space-y-2">
              {selectedItems.length === 0 ? (
                <div className="h-60 flex flex-col items-center justify-center text-slate-700 bg-slate-900/20 rounded-3xl border border-dashed border-slate-800">
                  <ShoppingBag className="h-12 w-12 mb-4 opacity-20" />
                  <p className="text-sm font-black uppercase tracking-[0.2em] italic">Manifest Empty</p>
                </div>
              ) : (
                selectedItems.map((item, index) => (
                  <div 
                    key={item.id} 
                    className="group flex items-center gap-4 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 p-3 rounded-2xl transition-all shadow-sm"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-950 flex items-center justify-center text-[10px] font-black text-slate-600 border border-slate-800">
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    
                    <div className="w-14 h-14 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                       {(item.item as any).image_url ? (
                         <img 
                           src={(item.item as any).image_url} 
                           alt={item.item.name} 
                           className="h-full w-full object-cover"
                         />
                       ) : (
                         <Package className="h-6 w-6 text-slate-800" />
                       )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black uppercase tracking-tighter text-slate-200 truncate leading-none">
                        {item.item.name}
                      </p>
                      <p className="text-[10px] font-mono font-bold text-indigo-400 mt-1 uppercase">
                        {item.item.sku}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-lg hover:bg-rose-500/10 hover:text-rose-500"
                        onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <div className="w-10 text-center">
                        <p className="text-sm font-black italic">{item.quantity}</p>
                        <p className="text-[8px] font-bold text-slate-600 uppercase">Max: {item.maxQuantity}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-500"
                        onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                      >
                        <PlusIcon className="h-3 w-3" />
                      </Button>
                    </div>

                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-10 w-10 rounded-xl hover:bg-rose-500 hover:text-white transition-colors"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-8 mb-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400 font-bold shrink-0">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <DialogFooter className="shrink-0 p-8 bg-slate-900/40 border-t border-slate-800 gap-4 flex flex-row items-center">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="h-14 px-8 rounded-2xl border-slate-800 font-black uppercase tracking-[0.2em] text-[10px] hover:bg-slate-800 transition-all m-0"
          >
            Abort
          </Button>
          <Button
            onClick={handleExecute}
            disabled={loading || selectedItems.length === 0}
            className="flex-1 h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl shadow-indigo-500/20 group transition-all transform hover:scale-[1.01] active:scale-[0.99] m-0"
          >
            {loading ? (
              <span className="flex items-center gap-2 animate-pulse">
                Authorizing Security Clearance...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Execute Transfer Protocol <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
