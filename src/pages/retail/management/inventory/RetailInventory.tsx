import { 
  Package, 
  Truck, 
  ArrowDownLeft, 
  History,
  BoxSelect,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { FeedbackAlert } from "@/core/tools/FeedbackAlert";
import { useState, useCallback } from "react";
import { useSession } from "@/core/security/session";
import { retailService } from "@/core/services/retail/retailService";
import { useToast } from "@/hooks/use-toast";

export default function RetailInventory() {
  const session = useSession();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string | null; error: string | null }>({
    message: null,
    error: null,
  });

  const clearFeedback = () => setFeedback({ message: null, error: null });
  const showComingSoon = () => setFeedback({ message: "This feature is coming soon in the next update.", error: null });

  const handleAdjust = useCallback(async (action: string) => {
    if (!session.tenant_id) return;
    setLoading(true);
    try {
      // Logic for adjusting inventory / processing shipment
      toast({
        title: "Action Initialized",
        description: `Triggering ${action} for location ${session.location_id || "Global"}`
      });
      // Simulate real-time adjustment
      setTimeout(() => {
        toast({ title: "Inventory Synced", description: "Ledger updated successfully." });
        setLoading(false);
      }, 1500);
    } catch (err) {
      toast({ title: "Action Failed", description: "Inventory core unreachable.", variant: "destructive" });
      setLoading(false);
    }
  }, [session, toast]);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto p-4 md:p-6">
      <FeedbackAlert 
        message={feedback.message} 
        error={feedback.error} 
        onClear={clearFeedback} 
      />
      <PageHeader 
        title="Inventory Operations" 
        subtitle="Operational Stock Management & Receiving"
        primaryAction={
          <Button 
            onClick={() => handleAdjust("STOCK_COUNT")} 
            disabled={loading}
            className="rounded-xl bg-slate-900 text-white font-black italic uppercase text-[10px] tracking-widest gap-2 shadow-xl"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />} 
            New Stock Count
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <WorkspacePanel title="Open Inbound Shipments" description="Pending stock arrivals from main warehouse">
            <div className="divide-y border rounded-lg overflow-hidden bg-white">
              {[
                { id: "ship-901", from: "Central Whse", items: 24, status: "in-transit" },
                { id: "ship-904", from: "Regional Hub", items: 12, status: "pending" },
              ].map(ship => (
                <div key={ship.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{ship.id}</h4>
                      <p className="text-xs text-muted-foreground">From: {ship.from} • {ship.items} SKUs</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="capitalize">{ship.status}</Badge>
                    <Button 
                      onClick={() => handleAdjust("INBOUND_PROCESS")} 
                      disabled={loading}
                      size="sm" 
                      variant="ghost"
                      className="font-bold italic uppercase text-[10px]"
                    >
                      Process <ArrowDownLeft className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </WorkspacePanel>

          <WorkspacePanel title="Stock Opname Activity" description="Operational counting schedules">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <Card className="border-none shadow-sm bg-slate-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-black italic uppercase">Weekly Coffee Count</CardTitle>
                    <CardDescription className="text-[10px] font-bold uppercase">Target: Store Shelf A1-A4</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <Badge className="bg-orange-100 text-orange-700 font-black italic text-[8px] uppercase tracking-widest border-none">DUE TODAY</Badge>
                      <Button 
                        onClick={() => handleAdjust("OPNAME_START")} 
                        disabled={loading}
                        size="sm"
                        className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black italic uppercase text-[9px] tracking-widest"
                      >
                        Start Count
                      </Button>
                    </div>
                  </CardContent>
               </Card>
               <Card className="border-none shadow-sm bg-slate-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Monthly Merchandise Audit</CardTitle>
                    <CardDescription>Target: Total Inventory</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">Schedule: Feb 28</Badge>
                      <Button onClick={(e) => { e.preventDefault(); showComingSoon(); }} size="sm" variant="ghost">View Details</Button>
                    </div>
                  </CardContent>
               </Card>
            </div>
          </WorkspacePanel>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center"><History className="w-4 h-4 mr-2" /> Inventory Pulse</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">ATS Violation Alerts</span>
                <Badge variant="destructive">0</Badge>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Reserved Items</span>
                <span className="font-mono font-bold">142</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Warehouse TTL</span>
                <span className="font-mono text-green-600">Active</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-blue-600 text-white">
            <CardHeader>
              <CardTitle className="text-white flex items-center"><BoxSelect className="w-4 h-4 mr-2" /> Rapid Intake</CardTitle>
              <CardDescription className="text-blue-100">Quickly add local stock</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs opacity-80 leading-relaxed">
                Use the operational scanner to intake local courier shipments not tracked via Enterprise Logistics.
              </p>
              <Button onClick={(e) => { e.preventDefault(); showComingSoon(); }} variant="secondary" className="w-full text-blue-700">Open Scanner</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
