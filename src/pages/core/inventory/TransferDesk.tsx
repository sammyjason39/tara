import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
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
      const data = await inventoryService.listStockTransfers(session.tenantId, session);
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
      await inventoryService.pickStockTransfer(session.tenantId, session, id);
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
      await inventoryService.shipStockTransfer(session.tenantId, session, selectedTransfer.id, trackingNumber);
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
      await inventoryService.receiveStockTransfer(session.tenantId, session, id);
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
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Requested</Badge>;
      case "PICKED":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Picked</Badge>;
      case "IN_TRANSIT":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 animate-pulse">In-Transit</Badge>;
      case "RECEIVED":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Received</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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

      <WorkspacePanel
        title="Transfer Desk"
        description="Manage the full lifecycle of internal stock movements."
      >
        <DataTableShell total={transfers.length} page={1} pageSize={20}>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-xs uppercase text-muted-foreground border-b">
                <th className="p-4 text-left">Item Info</th>
                <th className="p-4 text-left">Route</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-left">Audit Log</th>
                <th className="p-4 text-right">Actions</th>
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
              {transfers.map((t) => (
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
      </WorkspacePanel>

      {/* Shipping Dialog */}
      <Dialog open={isShipOpen} onOpenChange={setIsShipOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" /> Ship Inventory
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg flex gap-3 text-sm text-blue-800">
               <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
               <p>Marking this as shipped will move the items into a <strong>Virtual Transit Pool</strong>, removing them from the source location's available stock.</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tracking / Waybill Number</label>
              <Input 
                placeholder="e.g. TRK-9821038" 
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsShipOpen(false)} disabled={isBusy}>Cancel</Button>
            <Button onClick={handleShip} disabled={isBusy}>Confirm Shipment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
