import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { inventoryService } from "@/core/services/inventory/inventoryService";
import { useSession } from "@/core/security/session";
import { FeedbackAlert } from "@/core/tools/FeedbackAlert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Package,
  Truck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ClipboardList,
} from "lucide-react";
import { format } from "date-fns";

export function TransferDesk() {
  const session = useSession();
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Action Dialogs
  const [selectedTransfer, setSelectedTransfer] = useState<any | null>(null);
  const [isShipOpen, setIsShipOpen] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await inventoryService.listStockTransfers(session.tenant_id, session);
      setTransfers(data);
    } catch (err: any) {
      setErrorMessage("Failed to load transfers: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handlePick = async (id: string) => {
    setIsBusy(true);
    try {
      await inventoryService.pickStockTransfer(session.tenant_id, session, id);
      setStatusMessage("Transfer items picked and reserved.");
      refresh();
    } catch (err: any) {
      setErrorMessage("Picking failed: " + err.message);
    } finally {
      setIsBusy(false);
    }
  };

  const handleShip = async () => {
    if (!trackingNumber.trim()) {
      setErrorMessage("Tracking number is required.");
      return;
    }
    setIsBusy(true);
    try {
      await inventoryService.shipStockTransfer(session.tenant_id, session, selectedTransfer.id, trackingNumber);
      setStatusMessage("Transfer marked as In-Transit.");
      setIsShipOpen(false);
      setTrackingNumber("");
      refresh();
    } catch (err: any) {
      setErrorMessage("Shipping failed: " + err.message);
    } finally {
      setIsBusy(false);
    }
  };

  const handleReceive = async (id: string) => {
    setIsBusy(true);
    try {
      await inventoryService.receiveStockTransfer(session.tenant_id, session, id);
      setStatusMessage("Shipment accepted and stock updated.");
      refresh();
    } catch (err: any) {
      setErrorMessage("Receiving failed: " + err.message);
    } finally {
      setIsBusy(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "REQUESTED":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-black italic text-[10px] uppercase">Requested</Badge>;
      case "PICKED":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-black italic text-[10px] uppercase">Picked</Badge>;
      case "IN_TRANSIT":
        return <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 font-black italic text-[10px] uppercase animate-pulse">In-Transit</Badge>;
      case "RECEIVED":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-black italic text-[10px] uppercase">Received</Badge>;
      default:
        return <Badge variant="outline" className="font-black italic text-[10px] uppercase">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <FeedbackAlert
        message={statusMessage}
        error={errorMessage}
        onClear={() => {
          setStatusMessage(null);
          setErrorMessage(null);
        }}
      />

      <Card className="rounded-[2.5rem] border-white/50 bg-white/50 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="p-8 border-b border-white/40 flex items-center justify-between bg-slate-900/5">
          <div>
            <h2 className="text-2xl font-black tracking-tighter text-slate-900 uppercase italic leading-none">
              Transfer Desk
            </h2>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mt-2">
              Internal logistics and stock rebalancing pipeline
            </p>
          </div>
        </div>
        <div className="p-4">
        <DataTableShell total={transfers.length} page={1} pageSize={20}>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-900/5 text-[10px] uppercase text-slate-400 border-b">
                <th className="p-6 text-left font-black tracking-widest">Item Info</th>
                <th className="p-6 text-left font-black tracking-widest">Route</th>
                <th className="p-6 text-left font-black tracking-widest">Status</th>
                <th className="p-6 text-left font-black tracking-widest">Timeline</th>
                <th className="p-6 text-right font-black tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transfers.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground italic">
                    No active transfers found.
                  </td>
                </tr>
              )}
              {(Array.isArray(transfers) ? transfers : []).map((t) => (
                <tr key={t.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-primary">{t.item_masters.name}</span>
                      <span className="text-xs text-muted-foreground font-mono">{t.item_masters.sku}</span>
                      <div className="flex items-center gap-1 mt-1 font-bold">
                        <Package className="h-3 w-3" />
                        <span>Qty: {t.quantity}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-slate-100">{t.from_location.code}</span>
                      </div>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">{t.to_location.code}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    {getStatusBadge(t.status)}
                    {t.tracking_number && (
                      <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1 font-mono uppercase">
                        <Truck className="h-2.5 w-2.5" /> {t.tracking_number}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col text-[11px] gap-1">
                      {t.requested_at && (
                        <span className="text-muted-foreground">Req: {format(new Date(t.requested_at), "MMM d, HH:mm")}</span>
                      )}
                      {t.received_at && (
                        <span className="text-green-600 font-medium flex items-center gap-1">
                           <CheckCircle2 className="h-3 w-3" /> Recv: {format(new Date(t.received_at), "MMM d, HH:mm")}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      {t.status === "REQUESTED" && (
                        <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => handlePick(t.id)} disabled={isBusy}>
                          <ClipboardList className="h-3.5 w-3.5" /> Pick
                        </Button>
                      )}
                      {(t.status === "PICKED" || t.status === "REQUESTED") && (
                        <Button size="sm" variant="outline" className="h-8 gap-1 bg-slate-900 text-white hover:bg-slate-800" onClick={() => {
                          setSelectedTransfer(t);
                          setIsShipOpen(true);
                        }} disabled={isBusy}>
                          <Truck className="h-3.5 w-3.5" /> Ship
                        </Button>
                      )}
                      {t.status === "IN_TRANSIT" && (
                        <Button size="sm" variant="default" className="h-8 gap-1 bg-green-600 hover:bg-green-700" onClick={() => handleReceive(t.id)} disabled={isBusy}>
                          <CheckCircle2 className="h-3.5 w-3.5" /> Accept Shipment
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </DataTableShell>
        </div>
      </Card>

      {/* Shipping Dialog */}
      <Dialog open={isShipOpen} onOpenChange={setIsShipOpen}>
        <DialogContent className="rounded-[2rem] border-white/50 backdrop-blur-2xl bg-white/80 shadow-2xl sm:max-w-[500px]">
          <DialogHeader className="p-2">
            <DialogTitle className="flex items-center gap-3 text-2xl font-black tracking-tighter text-slate-900 uppercase italic leading-none">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
                <Truck className="h-6 w-6" />
              </div>
              Ship Inventory
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-6">
            <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-[1.5rem] flex gap-4 text-xs text-slate-600 leading-relaxed italic font-medium">
               <AlertCircle className="h-5 w-5 text-indigo-500 shrink-0" />
               <p>Marking this as shipped will move items into the <strong className="text-indigo-600">Transit Pool</strong>. This action reserves the stock and cannot be undone until received.</p>
            </div>
            <div className="space-y-3 px-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Tracking / Waybill ID</label>
              <Input 
                className="h-12 rounded-xl bg-white border-slate-100 shadow-inner font-bold italic placeholder:text-slate-300"
                placeholder="e.g. TRK-ZEN-9821" 
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 p-2 pt-0">
            <Button variant="outline" className="rounded-xl font-black italic text-[10px] uppercase tracking-widest h-12 px-6" onClick={() => setIsShipOpen(false)} disabled={isBusy}>Cancel</Button>
            <Button className="rounded-xl bg-slate-900 text-white font-black italic text-[10px] uppercase tracking-widest h-12 px-8" onClick={handleShip} disabled={isBusy}>Confirm Shipment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
