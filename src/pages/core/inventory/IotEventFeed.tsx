import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/core/security/session";
import { inventoryService } from "@/core/services/inventory/inventoryService";
import {
  InventoryIotEvent,
} from "@/core/types/inventory/inventory";
import { Radio, RefreshCw, Cpu, Database, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/AsyncState";
import { formatDateTime } from "@/lib/format";

export default function IotEventFeed() {
  const session = useSession();
  const [events, setEvents] = useState<InventoryIotEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const data = await inventoryService.listIotEvents(session.tenant_id, session);
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load IoT events:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    loadEvents();
    // Simulate real-time polling every 10 seconds
    const interval = setInterval(loadEvents, 10000);
    return () => clearInterval(interval);
  }, [loadEvents]);

  const mapSeverity = (type: string) => {
    switch (type) {
      case "TEMP_ALERT": return "destructive";
      case "RFID_SCAN": return "default";
      case "BARCODE_SCAN": return "outline";
      default: return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="IoT & RFID Event Stream"
        subtitle="Real-time monitoring of sensor data, gate scans, and telemetry points."
        primaryAction={
          <Button onClick={loadEvents} variant="outline" className="flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh Feed
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <WorkspacePanel
          title="Live Activity Feed"
          description="Most recent 50 events across all registered devices."
        >
          <div className="border rounded-lg overflow-hidden">
            {error ? (
              <ErrorState
                title="Couldn't load the event stream"
                description="The IoT and RFID telemetry feed failed to load. Check your connection and try again."
                onRetry={loadEvents}
              />
            ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left p-3 font-medium">Device / Event</th>
                  <th className="text-left p-3 font-medium">SKU / Item</th>
                  <th className="text-left p-3 font-medium">Location</th>
                  <th className="text-left p-3 font-medium">Time</th>
                  <th className="text-right p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-muted-foreground italic">
                      {loading ? "Streaming live data..." : "No events detected in the last 24 hours."}
                    </td>
                  </tr>
                ) : (
                  (Array.isArray(events) ? events : []).map((event) => (
                    <tr key={event.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                           <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
                           <div>
                             <p className="font-medium">{event.eventType}</p>
                             <p className="text-[10px] text-muted-foreground font-mono">{event.deviceId}</p>
                           </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="font-medium">{event.sku || "N/A"}</span>
                      </td>
                      <td className="p-3">
                         <div className="flex items-center gap-1.5">
                           <MapPin className="h-3 w-3 text-muted-foreground" />
                           <span className="text-xs">{event.locationId || "Unknown"}</span>
                         </div>
                      </td>
                      <td className="p-3 text-muted-foreground text-xs">
                        {formatDateTime(event.createdAt)}
                      </td>
                      <td className="p-3 text-right">
                        <Badge variant={event.processed ? "outline" : "default"} className="text-[10px]">
                           {event.processed ? "PROCESSED" : "PENDING"}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            )}
          </div>
        </WorkspacePanel>

        <WorkspacePanel
          title="System Health"
          description="Edge gateway and telemetry status."
        >
          <div className="space-y-4">
             <div className="p-4 rounded-lg bg-success border border-success/20">
                <div className="flex items-center justify-between mb-2">
                   <p className="text-sm font-medium text-success">Gate-01 (Main Warehouse)</p>
                   <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                </div>
                <p className="text-xs text-muted-foreground uppercase">Status: Online · Last Scan: 2m ago</p>
             </div>

             <div className="p-4 rounded-lg bg-success border border-success/20">
                <div className="flex items-center justify-between mb-2">
                   <p className="text-sm font-medium text-success">Gate-02 (Loading Dock)</p>
                   <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                </div>
                <p className="text-xs text-muted-foreground uppercase">Status: Online · Last Scan: 15m ago</p>
             </div>

             <div className="p-4 rounded-lg bg-warning border border-warning">
                <div className="flex items-center justify-between mb-2">
                   <p className="text-sm font-medium text-warning">Temp-Sensor-04 (Cold Storage)</p>
                   <div className="h-2 w-2 rounded-full bg-warning" />
                </div>
                <p className="text-xs text-muted-foreground uppercase">Status: High Signal Noise · 4.2°C</p>
             </div>

             <Button onClick={(e) => { e.preventDefault(); alert("Detailed View:\n\nMetadata: " + (typeof window !== "undefined" ? window.location.pathname : "N/A")); }} variant="ghost" className="w-full text-xs text-muted-foreground hover:text-foreground">
                <Database className="h-3 w-3 mr-2" /> View Audit Records
             </Button>
          </div>
        </WorkspacePanel>
      </div>
    </div>
  );
}
