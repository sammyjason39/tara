import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  AlertTriangle, 
  PackagePlus, 
  CheckSquare, 
  Square,
  Barcode
} from "lucide-react";
import { ItemCreationTab } from "./ItemCreationTab";
import { useSession } from "@/core/security/session";

interface UnresolvedBarcodesModalProps {
  isOpen: boolean;
  onClose: () => void;
  unresolvedBarcodes: string[];
  onFlagAnomalies: (barcodes: string[]) => void;
  onItemsRegistered: (newItems: any[]) => void;
  categoryOptions: { id: string; name: string }[];
}

export const UnresolvedBarcodesModal: React.FC<UnresolvedBarcodesModalProps> = ({
  isOpen,
  onClose,
  unresolvedBarcodes,
  onFlagAnomalies,
  onItemsRegistered,
  categoryOptions,
}) => {
  const session = useSession();
  const [selected, setSelected] = useState<string[]>([]);
  const [showItemCreation, setShowItemCreation] = useState(false);

  // If the modal opens, pre-select all barcodes by default for convenience
  React.useEffect(() => {
    if (isOpen) {
      setSelected(unresolvedBarcodes);
    }
  }, [isOpen, unresolvedBarcodes]);

  const toggleSelectAll = () => {
    if (selected.length === unresolvedBarcodes.length) {
      setSelected([]);
    } else {
      setSelected(unresolvedBarcodes);
    }
  };

  const toggleSelect = (barcode: string) => {
    setSelected(prev => 
      prev.includes(barcode) 
        ? prev.filter(b => b !== barcode) 
        : [...prev, barcode]
    );
  };

  const handleFlagSelected = () => {
    if (selected.length === 0) return;
    onFlagAnomalies(selected);
    // Remove flagged from selection
    setSelected([]);
    
    // If no more unresolved, close
    if (selected.length === unresolvedBarcodes.length) {
      onClose();
    }
  };

  if (showItemCreation) {
    const initialRows = selected.map(barcode => ({
      barcode: barcode,
      sku: barcode, // Default SKU to barcode
      name: `New Item - ${barcode}`, // Placeholder name
    }));

    return (
      <Dialog open={true} onOpenChange={(open) => !open && setShowItemCreation(false)}>
        <DialogContent className="max-w-[95vw] h-[90vh] rounded-[2rem] border-none shadow-2xl bg-slate-50 dark:bg-slate-950 p-0 overflow-y-auto">
          <div className="p-8">
            <ItemCreationTab 
              canWrite={true} 
              session={session} 
              tenantId={session.tenant_id} 
              categoryOptions={categoryOptions}
              onSuccess={(createdItems) => {
                // When items are registered successfully, we need to notify the parent
                onItemsRegistered(createdItems);
                setShowItemCreation(false);
                if (selected.length === unresolvedBarcodes.length) {
                  onClose();
                } else {
                  setSelected([]);
                }
              }}
              initialRows={initialRows}
            />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden border-none rounded-[2rem] shadow-2xl">
        <div className="relative h-32 bg-slate-900 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-[-10%] left-[-10%] w-40 h-40 bg-indigo-500 rounded-full blur-3xl" />
            <div className="absolute bottom-[-20%] right-[-10%] w-60 h-60 bg-amber-500 rounded-full blur-3xl" />
          </div>
          <div className="relative z-10 flex flex-col items-center text-white">
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl mb-2">
              <Barcode className="w-8 h-8 text-indigo-300" />
            </div>
            <h2 className="text-xl font-black italic uppercase tracking-widest">Unresolved Scans</h2>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div>
            <h3 className="font-black text-lg italic text-slate-900 uppercase">Action Required</h3>
            <p className="text-sm text-slate-500 font-medium">
              You scanned {unresolvedBarcodes.length} barcode(s) that are not in the master list. 
              Please resolve them before finalizing the audit.
            </p>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center gap-4">
              <button onClick={toggleSelectAll} className="text-slate-500 hover:text-slate-900 transition-colors">
                {selected.length === unresolvedBarcodes.length ? (
                  <CheckSquare className="w-5 h-5" />
                ) : (
                  <Square className="w-5 h-5" />
                )}
              </button>
              <span className="text-xs font-black uppercase tracking-widest text-slate-500">
                {selected.length} Selected
              </span>
            </div>
            <div className="max-h-[300px] overflow-y-auto p-2">
              {unresolvedBarcodes.map(barcode => (
                <div 
                  key={barcode} 
                  className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors"
                  onClick={() => toggleSelect(barcode)}
                >
                  <Checkbox 
                    checked={selected.includes(barcode)} 
                    onCheckedChange={() => toggleSelect(barcode)} 
                  />
                  <div className="font-mono font-bold text-slate-700 bg-white border border-slate-200 px-3 py-1 rounded-lg">
                    {barcode}
                  </div>
                </div>
              ))}
              {unresolvedBarcodes.length === 0 && (
                <div className="p-8 text-center text-slate-400 font-bold italic">
                  No unresolved barcodes remaining.
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              variant="outline"
              className="flex-1 h-14 rounded-xl border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 hover:text-amber-800 font-black italic uppercase tracking-widest text-xs"
              disabled={selected.length === 0}
              onClick={handleFlagSelected}
            >
              <AlertTriangle className="w-4 h-4 mr-2" /> Flag as Anomalies
            </Button>
            <Button
              className="flex-1 h-14 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black italic uppercase tracking-widest text-xs shadow-xl shadow-indigo-200"
              disabled={selected.length === 0}
              onClick={() => setShowItemCreation(true)}
            >
              <PackagePlus className="w-4 h-4 mr-2" /> Register Selected Items
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
