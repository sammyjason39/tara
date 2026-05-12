import React, { useEffect, useState } from "react";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, Save, Download, FileSpreadsheet, Image as ImageIcon, 
  AlertCircle, CheckCircle2, Clock, X, Package, ArrowRight
} from "lucide-react";
import { inventoryService } from "@/core/services/inventory/inventoryService";
import { useSession } from "@/core/security/session";
import { saveStockOpnameReport, ReportItem } from "@/core/tools/explorer/reportingService";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface StockOpnameSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  items: (ReportItem & { id?: string })[];
  locationName: string;
  auditorName: string;
}

export const StockOpnameSummaryModal = ({
  isOpen,
  onClose,
  onConfirm,
  items,
  locationName,
  auditorName,
}: StockOpnameSummaryModalProps) => {
  const session = useSession();
  const [itemImages, setItemImages] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasActioned, setHasActioned] = useState(false);

  // Fetch primary images for items
  useEffect(() => {
    if (isOpen && items.length > 0) {
      items.forEach(async (item) => {
        if (item.id && !itemImages[item.id]) {
          try {
            const images = await inventoryService.listItemImages(session.tenant_id, session, item.id);
            if (images && images.length > 0) {
              const primary = images.find(img => img.is_primary) || images[0];
              setItemImages(prev => ({ ...prev, [item.id!]: primary.url }));
            }
          } catch (e) {
            console.error("Failed to fetch image for", item.sku);
          }
        }
      });
    }
  }, [isOpen, items, session]);

  const handleFinalCommit = async () => {
    if (hasActioned) return;
    setHasActioned(true);
    setIsSaving(true);
    try {
      await saveStockOpnameReport(session, locationName, auditorName, items);
      await onConfirm();
      toast({ 
        title: "Audit Finalized", 
        description: "Report archived to Explorer and stock updated successfully." 
      });
      onClose();
    } catch (e) {
      console.error(e);
      toast({ 
        title: "Commit Failed", 
        description: "System error during finalization. Please retry.", 
        variant: "destructive" 
      });
      setHasActioned(false); // Allow retry
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPDF = () => {
    setHasActioned(true);
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text("Stock Opname Audit Report", 14, 25);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Location: ${locationName}`, 14, 35);
    doc.text(`Auditor: ${auditorName}`, 14, 40);
    doc.text(`Timestamp: ${new Date().toLocaleString()}`, 14, 45);
    
    autoTable(doc, {
      startY: 55,
      head: [['SKU', 'Item Name', 'Expected', 'Actual', 'Variance', 'Status']],
      body: items.map(item => {
        const variance = item.actualCount - (item.systemCount || 0);
        return [
          item.sku,
          item.name,
          item.systemCount || 0,
          item.actualCount,
          variance > 0 ? `+${variance}` : variance,
          variance === 0 ? "IN-SYNC" : variance > 0 ? "SURPLUS" : "DISCREPANCY"
        ];
      }),
      headStyles: { fillStyle: 'fill', fillColor: [59, 130, 246] },
      alternateRowStyles: { fillColor: [245, 247, 250] }
    });
    
    doc.save(`Stock_Opname_${locationName}_${new Date().getTime()}.pdf`);
    toast({ title: "PDF Exported" });
  };

  const handleExportCSV = () => {
    setHasActioned(true);
    const headers = ["SKU", "Item Name", "Expected", "Actual", "Variance"];
    const rows = items.map(item => [
      item.sku,
      `"${item.name}"`,
      item.systemCount || 0,
      item.actualCount,
      item.actualCount - (item.systemCount || 0)
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Stock_Opname_${locationName}_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "CSV Exported" });
  };

  const totalItemsCount = items.reduce((a, b) => a + b.actualCount, 0);
  const variances = items.filter(i => i.actualCount !== (i.systemCount || 0)).length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && !hasActioned) {
        handleFinalCommit();
      }
    }}>
      <DialogContent className="max-w-5xl rounded-[2.5rem] p-0 overflow-hidden bg-slate-50 dark:bg-slate-950 border-none shadow-2xl">
        <div className="flex h-[80vh]">
          {/* Left Panel: Summary & Actions */}
          <div className="w-1/3 bg-slate-900 p-10 flex flex-col justify-between text-white">
            <div className="space-y-8">
              <div className="space-y-2">
                <Badge className="bg-blue-500/20 text-blue-400 border-none font-black italic uppercase tracking-widest text-[9px]">
                  Audit Protocol v2.4
                </Badge>
                <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-none">
                  Review <br /> Commit
                </h2>
              </div>

              <div className="space-y-4">
                <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                  <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Auditor</div>
                  <div className="font-bold italic text-lg">{auditorName}</div>
                </div>
                <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                  <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Location</div>
                  <div className="font-bold italic text-lg">{locationName}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                  <div className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-1">Units</div>
                  <div className="text-2xl font-black italic">{totalItemsCount}</div>
                </div>
                <div className="p-4 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                  <div className="text-[8px] font-black text-rose-500 uppercase tracking-widest mb-1">Variances</div>
                  <div className="text-2xl font-black italic">{variances}</div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Button 
                onClick={handleFinalCommit}
                disabled={isSaving}
                className="w-full h-16 rounded-2xl bg-primary text-primary-foreground font-black italic uppercase tracking-widest text-xs gap-3 shadow-xl">
                {isSaving ? <Clock className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Finalize & Archive
              </Button>
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  onClick={handleExportPDF}
                  className="h-12 rounded-xl bg-white/5 border-white/10 hover:bg-white/10 text-white font-bold italic text-[10px] uppercase tracking-widest gap-2">
                  <FileText className="w-3 h-3" /> PDF
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleExportCSV}
                  className="h-12 rounded-xl bg-white/5 border-white/10 hover:bg-white/10 text-white font-bold italic text-[10px] uppercase tracking-widest gap-2">
                  <FileSpreadsheet className="w-3 h-3" /> CSV
                </Button>
              </div>
            </div>
          </div>

          {/* Right Panel: Item List */}
          <div className="flex-1 flex flex-col">
            <div className="p-8 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white/50 dark:bg-black/50 backdrop-blur-xl">
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic">
                Final Audit Manifest
              </div>
              <Button variant="ghost" size="icon" onClick={() => !hasActioned && handleFinalCommit()} className="rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-all">
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <ScrollArea className="flex-1 p-8">
              <Table>
                <TableHeader>
                  <TableRow className="border-none hover:bg-transparent">
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Item</TableHead>
                    <TableHead className="text-center text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Expected</TableHead>
                    <TableHead className="text-center text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Actual</TableHead>
                    <TableHead className="text-right text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Variance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => {
                    const variance = item.actualCount - (item.systemCount || 0);
                    return (
                      <TableRow key={idx} className="border-slate-100 dark:border-slate-800 hover:bg-slate-100/50 dark:hover:bg-slate-900/50 transition-all group">
                        <TableCell className="py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 shadow-sm overflow-hidden flex items-center justify-center border border-slate-100 dark:border-slate-800">
                              {item.id && itemImages[item.id] ? (
                                <img src={itemImages[item.id]} alt={item.name} className="w-full h-full object-cover" />
                              ) : (
                                <Package className="w-6 h-6 text-slate-300" />
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-black italic text-slate-900 dark:text-white uppercase tracking-tight">{item.name}</div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.sku}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-bold text-slate-400">
                          {item.systemCount || 0}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="inline-flex h-10 w-16 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-black italic">
                            {item.actualCount}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge 
                            variant="outline"
                            className={cn(
                              "rounded-lg px-3 py-1 font-black italic border-none uppercase text-[10px] tracking-widest",
                              variance === 0 ? "bg-emerald-500/10 text-emerald-500" : 
                              variance > 0 ? "bg-blue-500/10 text-blue-500" : "bg-rose-500/10 text-rose-500"
                            )}
                          >
                            {variance === 0 ? "IN-SYNC" : variance > 0 ? `+${variance}` : variance}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
            
            <div className="p-8 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-4 text-slate-400">
                <AlertCircle className="w-5 h-5 text-blue-500 animate-pulse" />
                <p className="text-[10px] font-bold italic uppercase tracking-tight">
                  Final commitment will reconcile all stock variances and update the enterprise ledger.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
