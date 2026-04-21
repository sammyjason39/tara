import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/core/security/session";
import { inventoryService } from "@/core/services/inventory/inventoryService";
import {
  WarehouseBin,
  BinAssignment,
} from "@/core/types/inventory/inventory";
import { Boxes, Plus, Search, Warehouse } from "lucide-react";

export default function WarehouseManagement() {
  const session = useSession();
  const [bins, setBins] = useState<WarehouseBin[]>([]);
  const [selectedBin, setSelectedBin] = useState<WarehouseBin | null>(null);
  const [binStock, setBinStock] = useState<BinAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationId, setLocationId] = useState(session.locationId || "MAIN"); // Default to session location or "MAIN"

  const loadBins = useCallback(async () => {
    try {
      setLoading(true);
      const data = await inventoryService.getWarehouseBins(session.tenantId, session, locationId);
      setBins(data);
    } catch (error) {
      console.error("Failed to load bins:", error);
    } finally {
      setLoading(false);
    }
  }, [session, locationId]);

  useEffect(() => {
    loadBins();
  }, [loadBins]);

  const viewBinStock = async (bin: WarehouseBin) => {
    setSelectedBin(bin);
    try {
      const stock = await inventoryService.getBinStock(session.tenantId, session, bin.id);
      setBinStock(stock);
    } catch (error) {
      console.error("Failed to load bin stock:", error);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouse & Bin Management"
        subtitle="Configure physical storage hierarchy and track stock at the bin level."
        primaryAction={
          <Button onClick={() => {
            inventoryService.initiateAudit(session.tenantId, session, {
              location_code: locationId,
              scope: "FULL",
            });
          }} className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Create New Bin
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        {/* --- Bin List --- */}
        <WorkspacePanel
          title="Storage Bins"
          description={`Active bins in ${locationId}`}
        >
          <div className="mb-4 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search bin code..."
                className="pl-8"
              />
            </div>
            <Button onClick={() => {
              inventoryService.listAuditCycles(session.tenantId, session);
            }} variant="outline" size="icon">
              <Search className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
            {loading ? (
              <p className="text-sm text-muted-foreground p-4 text-center italic">Loading bins...</p>
            ) : bins.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4 text-center italic border rounded-lg">No bins found for this location.</p>
            ) : (
              bins.map((bin) => (
                <div
                  key={bin.id}
                  onClick={() => viewBinStock(bin)}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedBin?.id === bin.id ? "border-primary bg-primary/5 shadow-sm" : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                      <Warehouse className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{bin.code}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Zone {bin.zone} · Aisle {bin.aisle} · Rack {bin.rack}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    Cap: {bin.capacity}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </WorkspacePanel>

        {/* --- Bin Details / Stock --- */}
        <WorkspacePanel
          title={selectedBin ? `Bin Content: ${selectedBin.code}` : "Bin Details"}
          description={selectedBin ? `Inventory currently assigned to this storage location.` : "Select a bin to view content."}
        >
          {!selectedBin ? (
            <div className="flex flex-col items-center justify-center h-[400px] border border-dashed rounded-lg space-y-3">
              <Boxes className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground font-medium">No Bin Selected</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Bin Info */}
              <div className="grid grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg border text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-1 uppercase tracking-tighter font-semibold">Zone</p>
                  <p className="font-medium">{selectedBin.zone || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1 uppercase tracking-tighter font-semibold">Aisle</p>
                  <p className="font-medium">{selectedBin.aisle || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1 uppercase tracking-tighter font-semibold">Rack</p>
                  <p className="font-medium">{selectedBin.rack || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1 uppercase tracking-tighter font-semibold">Level</p>
                  <p className="font-medium">{selectedBin.level || "N/A"}</p>
                </div>
              </div>

              {/* Stock Table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-left p-3 font-medium">Product / SKU</th>
                      <th className="text-right p-3 font-medium">Quantity</th>
                      <th className="text-right p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {binStock.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-8 text-center text-muted-foreground italic">
                          This bin is currently empty.
                        </td>
                      </tr>
                    ) : (
                      binStock.map((stock) => (
                        <tr key={stock.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3">
                            <p className="font-medium">{stock.product?.name || "Unknown Product"}</p>
                            <p className="text-xs text-muted-foreground">{stock.productId}</p>
                          </td>
                          <td className="p-3 text-right">
                            <span className="font-mono font-semibold">{stock.qty}</span>
                          </td>
                          <td className="p-3 text-right">
                            <Button onClick={() => {
                              inventoryService.initiateAudit(session.tenantId, session, {
                                location_code: locationId,
                                scope: "INCREMENTAL",
                              });
                            }} variant="ghost" size="sm" className="h-8 text-xs">Transfer</Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button onClick={(e) => { e.preventDefault(); window.print(); }} variant="outline" className="flex items-center gap-2">
                   Print Label
                </Button>
                <Button onClick={() => {
                  inventoryService.initiateAudit(session.tenantId, session, {
                    location_code: locationId,
                    scope: "FULL",
                  });
                }} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Move Stock In
                </Button>
              </div>
            </div>
          )}
        </WorkspacePanel>
      </div>
    </div>
  );
}
