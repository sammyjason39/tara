import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Laptop, Network, ShieldCheck } from "lucide-react";
import { FeedbackAlert } from "@/core/tools/FeedbackAlert";
import { useSession } from "@/core/security/session";
import { itSettingsService, type ITDevice } from "@/core/services/it/itSettingsService";

export default function DeviceDesk() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [devices, setDevices] = useState<ITDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<ITDevice | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const fetchDevices = async () => {
      setLoading(true);
      try {
        const data = await itSettingsService.getDevices(session.tenantId, session);
        setDevices(data);
      } catch (err) {
        setErrorMessage("Failed to fetch devices.");
      } finally {
        setLoading(false);
      }
    };
    fetchDevices();
  }, [session.tenantId, session, version]);

  const clearStatus = () => {
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const filtered = devices.filter((dev) =>
    search ? dev.id.toLowerCase().includes(search.toLowerCase()) || dev.deviceName.toLowerCase().includes(search.toLowerCase()) : true,
  );

  return (
    <div className="space-y-6">
      <FeedbackAlert message={statusMessage} error={errorMessage} onClear={clearStatus} />
      <PageHeader
        title="Devices"
        subtitle="Assign devices to locations, keep LAN-first inventory in sync."
        primaryAction={<Button onClick={() => setCreateOpen(true)}>Assign Device</Button>}
        secondaryActions={
          <Input
            placeholder="Search devices"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-[220px]"
          />
        }
      />

      <WorkspacePanel title="Device map" description="Physical/logical asset mapping with owners.">
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <DataTableShell total={filtered.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Device Name</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Location</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-3 text-center">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="p-3 text-center text-muted-foreground">No devices found.</td></tr>
              ) : (
                filtered.map((dev) => (
                   <tr
                    key={dev.id}
                    className="border-t cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedDevice(dev)}
                  >
                    <td className="p-3 font-medium">{dev.deviceName}</td>
                    <td className="p-3 text-muted-foreground">{dev.deviceType}</td>
                    <td className="p-3 text-muted-foreground">{dev.locationId || "Unassigned"}</td>
                    <td className="p-3">
                      <Badge variant={dev.status === "active" ? "default" : "secondary"}>{dev.status}</Badge>
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">{new Date(dev.lastSeen).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden" aria-describedby="device-create-description">
          <DialogHeader className="sr-only">
            <DialogTitle>Assign New Device</DialogTitle>
          </DialogHeader>
          <div id="device-create-description" className="sr-only">Register a new IT asset.</div>
          <div className="grid md:grid-cols-[1fr_2fr]">
            <div className="bg-muted p-6 flex flex-col justify-between">
              <div>
                <Laptop className="w-8 h-8 text-primary mb-4" />
                <DialogTitle className="text-xl mb-2">Assign New Device</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Register a physical or logical IT asset to the centralized inventory map.
                </p>
                <div className="mt-8 space-y-4">
                  <div className="flex items-start gap-3 text-sm">
                    <div className="mt-0.5"><Network className="w-4 h-4 text-muted-foreground" /></div>
                    <div>
                      <p className="font-medium">LAN-First Sync</p>
                      <p className="text-muted-foreground text-xs">Device state syncs via LAN.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-primary/5 p-4 rounded-lg mt-8 border border-primary/10">
                <p className="text-xs text-primary font-medium flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Policy Enforcement
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Registered devices are subject to MDM policies.
                </p>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <Input placeholder="Device Name" id="reg-device-name" />
                <Select onValueChange={(val) => ((window as any)._regDeviceType = val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Device Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="laptop">Laptop</SelectItem>
                    <SelectItem value="mobile">Mobile</SelectItem>
                    <SelectItem value="iot">IoT / Edge</SelectItem>
                    <SelectItem value="network">Network Gear</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Target Location ID" id="reg-location-id" />
                <div className="flex justify-end gap-3 pt-4 mt-6 border-t">
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                  <Button
                    onClick={async () => {
                      try {
                        const deviceName = (document.getElementById("reg-device-name") as HTMLInputElement).value;
                        const locationId = (document.getElementById("reg-location-id") as HTMLInputElement).value;
                        const deviceType = (window as any)._regDeviceType || "iot";

                        await itSettingsService.registerDevice(session.tenantId, session, {
                          deviceName,
                          deviceType,
                          locationId,
                          status: "active",
                        });
                        
                        setCreateOpen(false);
                        setStatusMessage("Device registered successfully.");
                        setVersion((prev) => prev + 1);
                      } catch (err) {
                        setErrorMessage("Failed to register device.");
                      }
                    }}
                  >
                    Register Device
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedDevice} onOpenChange={() => setSelectedDevice(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Device Lifecycle Detail</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 text-sm gap-y-2">
              <span className="text-muted-foreground">Device ID:</span>
              <span className="font-mono text-xs">{selectedDevice?.id}</span>
              <span className="text-muted-foreground">Name:</span>
              <span className="font-semibold">{selectedDevice?.deviceName}</span>
              <span className="text-muted-foreground">Type:</span>
              <span>{selectedDevice?.deviceType}</span>
              <span className="text-muted-foreground">Location:</span>
              <span>{selectedDevice?.locationId || "N/A"}</span>
              <span className="text-muted-foreground">Status:</span>
              <span><Badge variant="outline">{selectedDevice?.status}</Badge></span>
            </div>
            <div className="border-t pt-2 text-xs text-muted-foreground italic">
              Zenvix IT-AM: Managed via LAN-first physical mapping. Last seen: {selectedDevice ? new Date(selectedDevice.lastSeen).toLocaleString() : "N/A"}.
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={async () => {
                  try {
                    if (selectedDevice) {
                      await itSettingsService.updateDeviceStatus(session.tenantId, session, selectedDevice.id, "audited");
                      setStatusMessage(`Audit signal sent for device ${selectedDevice.deviceName}.`);
                      setVersion((prev) => prev + 1);
                      setSelectedDevice(null);
                    }
                  } catch (err) {
                    setErrorMessage("Failed to trigger audit.");
                  }
                }}
              >
                Trigger Audit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="flex-1"
                onClick={async () => {
                  try {
                    if (selectedDevice) {
                      await itSettingsService.updateDeviceStatus(session.tenantId, session, selectedDevice.id, "wiped");
                      setStatusMessage(`Wipe command queued for ${selectedDevice.deviceName}. Security policy enforced.`);
                      setVersion((prev) => prev + 1);
                      setSelectedDevice(null);
                    }
                  } catch (err) {
                    setErrorMessage("Remote wipe failed.");
                  }
                }}
              >
                Remote Wipe
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
