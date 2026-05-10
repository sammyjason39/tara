import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input as UIInput } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { useSession } from "@/core/security/session";
import { inventoryService } from "@/core/services/inventory/inventoryService";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import type {
  InventoryAdjustmentRequest,
  InventoryItemMaster,
} from "@/core/types/inventory/inventory";
import { Activity, Box, Database, History, MapPin, User, FileText } from "lucide-react";

export default function InventoryAdjustments() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [itemId, setItemId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [delta, setDelta] = useState("0");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [adjustments, setAdjustments] = useState<InventoryAdjustmentRequest[]>([]);
  const [items, setItems] = useState<InventoryItemMaster[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  
  const [selectedAdj, setSelectedAdj] = useState<InventoryAdjustmentRequest | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [adj, itm, loc, dep] = await Promise.all([
        inventoryService.listAdjustments(session.tenant_id, session),
        inventoryService.listItems(session.tenant_id, session),
        inventoryService.listLocations(session.tenant_id, session),
        inventoryService.listDepartments(session.tenant_id, session),
      ]);
      setAdjustments(adj);
      setItems(itm);
      setLocations(loc);
      setDepartments(dep);
    } catch (err) {
      console.error("Failed to fetch inventory adjustments data:", err);
      toast({
        title: "Error",
        description: "Failed to load adjustment data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [session.tenant_id, session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(
    () =>
      (Array.isArray(adjustments) ? adjustments : []).filter((item) =>
        search
          ? `${item.id} ${item.reason} ${item.status}`
              .toLowerCase()
              .includes(search.toLowerCase())
          : true,
      ),
    [adjustments, search],
  );

  const handleRequest = async () => {
    if (!itemId || !locationId || !delta || !reason) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      await inventoryService.requestAdjustment(
        session.tenant_id,
        session,
        {
          item_id: itemId,
          location_id: locationId,
          department_id: departmentId || undefined,
          requested_delta: Number(delta || "0"),
          reason: reason,
        },
      );
      
      toast({
        title: "Success",
        description: "Adjustment request submitted successfully.",
      });
      
      setItemId("");
      setReason("");
      setDelta("0");
      refresh();
    } catch (err: any) {
      toast({
        title: "Request Failed",
        description: err.message || "Could not submit adjustment request.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await inventoryService.approveAdjustment(
        session.tenant_id,
        session,
        id,
      );
      toast({
        title: "Approved",
        description: "Adjustment has been applied to stock levels.",
      });
      setSelectedAdj(null);
      refresh();
    } catch (err: any) {
      toast({
        title: "Approval Failed",
        description: err.message || "Could not approve adjustment.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center space-y-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
        <p className="text-muted-foreground font-bold italic animate-pulse">Loading adjustments engine...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <PageHeader
        title="Inventory Command"
        subtitle="Dynamic stock control & supply chain visibility matrix"
        secondaryActions={
          <div className="flex items-center gap-3 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800">
            <FilterBar searchValue={search} onSearchChange={setSearch} />
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Creation Panel */}
        <div className="lg:col-span-1">
          <WorkspacePanel
            title="Create Adjustment"
            description="Submit stock correction with reason and approval trace."
            icon={Box}
          >
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Select Item</label>
                <Select value={itemId} onValueChange={setItemId}>
                  <SelectTrigger className="w-full bg-slate-900/50 border-slate-800 rounded-xl font-bold">
                    <SelectValue placeholder="Choose product..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-slate-800 bg-slate-950/95 backdrop-blur-xl">
                    {items.map(item => (
                      <SelectItem key={item.id} value={item.id} className="font-bold">
                        {item.name} ({item.sku})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Location</label>
                  <Select value={locationId} onValueChange={setLocationId}>
                    <SelectTrigger className="w-full bg-slate-900/50 border-slate-800 rounded-xl font-bold">
                      <SelectValue placeholder="Loc..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-slate-800 bg-slate-950/95 backdrop-blur-xl">
                      {locations.map(loc => (
                        <SelectItem key={loc.id} value={loc.id} className="font-bold">
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Department</label>
                  <Select value={departmentId} onValueChange={setDepartmentId}>
                    <SelectTrigger className="w-full bg-slate-900/50 border-slate-800 rounded-xl font-bold">
                      <SelectValue placeholder="Dept..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-slate-800 bg-slate-950/95 backdrop-blur-xl">
                      {departments.map(dep => (
                        <SelectItem key={dep.id} value={dep.id} className="font-bold">
                          {dep.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Adjustment Delta (+/-)</label>
                <UIInput
                  type="number"
                  placeholder="0"
                  value={delta}
                  onChange={(e) => setDelta(e.target.value)}
                  className="h-12 bg-slate-900/50 border-slate-800 rounded-xl font-black text-xl text-center text-indigo-400"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Reason for Correction</label>
                <Textarea
                  placeholder="Explain why this adjustment is needed..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="bg-slate-900/50 border-slate-800 rounded-xl font-bold resize-none h-24"
                />
              </div>

              <Button 
                onClick={handleRequest} 
                disabled={submitting}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 group"
              >
                {submitting ? "Processing..." : "Submit for Approval"}
                {!submitting && <Activity className="ml-2 h-4 w-4 group-hover:animate-pulse" />}
              </Button>
            </div>
          </WorkspacePanel>
        </div>

        {/* Queue Panel */}
        <div className="lg:col-span-2">
          <WorkspacePanel
            title="Adjustment Queue"
            description="Pending and completed adjustment approvals."
            icon={History}
          >
            <DataTableShell total={filtered.length} page={1} pageSize={10}>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="p-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Reference</th>
                    <th className="p-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Item</th>
                    <th className="p-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Location</th>
                    <th className="p-4 text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground">Delta</th>
                    <th className="p-4 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-20 text-center text-muted-foreground font-bold italic">
                        No adjustment records found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((item) => (
                      <tr 
                        key={item.id} 
                        onClick={() => setSelectedAdj(item)}
                        className="group hover:bg-slate-900/40 cursor-pointer transition-all border-l-2 border-l-transparent hover:border-l-indigo-500"
                      >
                        <td className="p-4">
                          <div className="font-mono text-[11px] font-bold text-slate-400 truncate w-24">
                            #{item.id.slice(0, 8)}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-200">
                            {items.find(i => i.id === item.item_id)?.name || item.item_id}
                          </div>
                          <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-tighter">
                            {items.find(i => i.id === item.item_id)?.sku || "N/A"}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3 text-indigo-500" />
                            <span className="font-bold text-slate-300 text-xs">
                              {locations.find(l => l.id === item.location_id)?.name || item.location_id}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <span className={cn(
                            "font-black text-sm",
                            item.requested_delta > 0 ? "text-emerald-400" : "text-rose-400"
                          )}>
                            {item.requested_delta > 0 ? "+" : ""}{item.requested_delta}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <Badge variant="outline" className={cn(
                            "font-black text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full border-none shadow-sm",
                            item.status === "APPROVED" ? "bg-emerald-500/10 text-emerald-500" :
                            item.status === "REJECTED" ? "bg-rose-500/10 text-rose-500" :
                            "bg-indigo-500/10 text-indigo-400 animate-pulse"
                          )}>
                            {item.status.replace("_", " ")}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </DataTableShell>
          </WorkspacePanel>
        </div>
      </div>

      {/* Details Modal */}
      <Dialog open={!!selectedAdj} onOpenChange={(open) => !open && setSelectedAdj(null)}>
        <DialogContent className="max-w-xl bg-slate-950 border-slate-800 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
          {selectedAdj && (
            <>
              <div className="h-24 bg-gradient-to-r from-indigo-600/20 to-violet-600/20 border-b border-slate-800 p-8 flex items-end">
                <div>
                  <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">Adjustment Detail</h2>
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Request Trace #{selectedAdj.id.slice(0, 8)}</p>
                </div>
              </div>
              
              <div className="p-8 space-y-8">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-500/10 rounded-xl">
                        <Box className="h-5 w-5 text-indigo-500" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Product</p>
                        <p className="font-bold text-slate-200 truncate w-40">{items.find(i => i.id === selectedAdj.item_id)?.name || "Unknown"}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-500/10 rounded-xl">
                        <MapPin className="h-5 w-5 text-indigo-500" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Location</p>
                        <p className="font-bold text-slate-200">{locations.find(l => l.id === selectedAdj.location_id)?.name || "N/A"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-500/10 rounded-xl">
                        <Activity className="h-5 w-5 text-indigo-500" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Delta</p>
                        <p className={cn("font-black text-xl", selectedAdj.requested_delta > 0 ? "text-emerald-400" : "text-rose-400")}>
                          {selectedAdj.requested_delta > 0 ? "+" : ""}{selectedAdj.requested_delta} Units
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-500/10 rounded-xl">
                        <User className="h-5 w-5 text-indigo-500" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Requested By</p>
                        <p className="font-bold text-slate-200 text-xs">User ID: {selectedAdj.requested_by.slice(0, 12)}...</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-slate-900/50 rounded-3xl border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-3 w-3 text-indigo-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Reason / Justification</span>
                  </div>
                  <p className="text-sm font-bold text-slate-300 leading-relaxed italic">
                    "{selectedAdj.reason}"
                  </p>
                </div>
              </div>

              <DialogFooter className="p-8 bg-slate-900/30 border-t border-slate-800 gap-3">
                {selectedAdj.status === "PENDING_APPROVAL" ? (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={() => setSelectedAdj(null)}
                      className="rounded-xl font-black uppercase tracking-widest border-slate-800"
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={() => {
                        toast({ title: "Feature Pending", description: "Rejection logic coming soon." });
                      }}
                      className="rounded-xl font-black uppercase tracking-widest"
                    >
                      Reject
                    </Button>
                    <Button 
                      onClick={() => handleApprove(selectedAdj.id)}
                      className="rounded-xl font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                      Approve & Apply
                    </Button>
                  </>
                ) : (
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedAdj(null)}
                    className="w-full rounded-xl font-black uppercase tracking-widest border-slate-800"
                  >
                    Close Record
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
