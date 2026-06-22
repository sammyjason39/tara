import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { useSession } from "@/core/security/session";
import { paymentService } from "@/core/services/payment/paymentService";
import type { PosDevice, DevicePool } from "@/core/types/payment/payment";
import { safeText } from "@/lib/format";
import { EmptyState } from "@/components/shared/AsyncState";

export default function DeviceRoutingDesk() {
  const session = useSession();
  const [refreshKey, setRefreshKey] = useState(0);
  const [devices, setDevices] = useState<PosDevice[]>([]);
  const [pools, setPools] = useState<DevicePool[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<Map<string, PosDevice | null>>(new Map());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [devicesData, poolsData] = await Promise.all([
          paymentService.listDevices(session.tenant_id, session),
          paymentService.listDevicePools(session.tenant_id, session),
        ]);
        setDevices(devicesData);
        setPools(poolsData);

        // Resolve selected devices for each pool
        const selectedMap = new Map<string, PosDevice | null>();
        for (const pool of poolsData) {
          const selected = await paymentService.resolveDeviceForLocation(session.tenant_id, pool.location);
          selectedMap.set(pool.location, selected);
        }
        setSelectedDevices(selectedMap);
      } catch (error) {
        console.error("Failed to fetch device routing data:", error);
      }
    };
    fetchData();
  }, [refreshKey, session]);

  const setStatus = (deviceId: string, status: PosDevice["status"]) => {
    paymentService.setDeviceStatus(session.tenant_id, session, deviceId, status);
    setRefreshKey((value) => value + 1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Device Routing Engine"
        subtitle="POS hardware pools with approved device enforcement and failover routing."
      />

      <WorkspacePanel title="Device Pools" description="Location pools with primary and fallback hardware order.">
        <div className="grid gap-3 md:grid-cols-2">
          {(Array.isArray(pools) ? pools : []).map((pool) => {
            const selected = selectedDevices.get(pool.location);
            return (
              <div key={pool.id} className="rounded-lg border p-3">
                <p className="text-sm font-medium">{pool.location}</p>
                <p className="text-xs text-muted-foreground">Primary: {pool.primaryDeviceId}</p>
                <p className="text-xs text-muted-foreground">Fallback: {pool.fallbackDeviceIds.join(", ")}</p>
                <div className="mt-2">
                  <Badge variant={selected ? "secondary" : "destructive"}>
                    {selected ? `Active route: ${selected.deviceCode}` : "No approved online device"}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
        {(Array.isArray(pools) ? pools : []).length === 0 ? (
          <EmptyState
            title="No device pools"
            description="No location device pools are configured for this tenant scope yet."
          />
        ) : null}
      </WorkspacePanel>

      <WorkspacePanel title="Device Governance" description="Payment cannot execute on unapproved or offline hardware.">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3 text-left">Device</th>
              <th className="p-3 text-left">Location</th>
              <th className="p-3 text-left">Provider</th>
              <th className="p-3 text-left">Approval</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(Array.isArray(devices) ? devices : []).map((device) => (
              <tr key={device.id} className="border-t">
                <td className="p-3 font-medium">{device.deviceCode}</td>
                <td className="p-3 text-muted-foreground">{device.location}</td>
                <td className="p-3 text-muted-foreground">{safeText(device.providerId)}</td>
                <td className="p-3">
                  <Badge variant={device.approved ? "secondary" : "destructive"}>
                    {device.approved ? "APPROVED" : "UNAPPROVED"}
                  </Badge>
                </td>
                <td className="p-3">
                  <Badge variant={device.status === "ONLINE" ? "secondary" : "outline"}>
                    {device.status}
                  </Badge>
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setStatus(device.id, "ONLINE")}>Online</Button>
                    <Button size="sm" variant="outline" onClick={() => setStatus(device.id, "MAINTENANCE")}>Maintenance</Button>
                    <Button size="sm" variant="destructive" onClick={() => setStatus(device.id, "OFFLINE")}>Offline</Button>
                  </div>
                </td>
              </tr>
            ))}
            {(Array.isArray(devices) ? devices : []).length === 0 ? (
              <tr>
                <td colSpan={6} className="p-0">
                  <EmptyState
                    title="No devices registered"
                    description="No POS devices exist for this tenant scope yet."
                  />
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </WorkspacePanel>
    </div>
  );
}

