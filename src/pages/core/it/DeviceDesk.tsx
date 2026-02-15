import { useState } from "react";
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
import { ApprovalStatusBadge } from "@/core/tools/ApprovalStatusBadge";
import { FeedbackAlert } from "@/core/tools/FeedbackAlert";

const devices = [
  { id: "DEV-3301", type: "Laptop", location: "HQ-1", owner: "Ava Reynolds", status: "Active" },
  { id: "DEV-3302", type: "Scanner", location: "Warehouse-2", owner: "Operations", status: "Assigned" },
  { id: "DEV-3298", type: "Router", location: "Branch-5", owner: "Network", status: "Monitoring" },
];

export default function DeviceDesk() {
  const [search, setSearch] = useState("");
  const [selectedDevice, setSelectedDevice] = useState<any | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const clearStatus = () => {
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const filtered = devices.filter((dev) =>
    search ? dev.id.toLowerCase().includes(search.toLowerCase()) : true,
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
                <th className="p-3 text-left">Device</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Location</th>
                <th className="p-3 text-left">Owner</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((dev) => (
                 <tr
                  key={dev.id}
                  className="border-t cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedDevice(dev)}
                >
                  <td className="p-3 font-medium">{dev.id}</td>
                  <td className="p-3 text-muted-foreground">{dev.type}</td>
                  <td className="p-3 text-muted-foreground">{dev.location}</td>
                  <td className="p-3 text-muted-foreground">{dev.owner}</td>
                  <td className="p-3">
                    <Badge variant="secondary">{dev.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign New Device</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Input placeholder="Serial / Device ID" />
            <Select>
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
            <Input placeholder="Target Location" />
            <Button
              className="w-full"
              onClick={() => {
                try {
                  setCreateOpen(false);
                  setStatusMessage("Device assignment request routed for physical verification.");
                } catch (err) {
                  setErrorMessage("Failed to request assignment.");
                }
              }}
            >
              Request Assignment
            </Button>
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
              <span className="font-mono">{selectedDevice?.id}</span>
              <span className="text-muted-foreground">Type:</span>
              <span className="font-semibold">{selectedDevice?.type}</span>
              <span className="text-muted-foreground">Location:</span>
              <span>{selectedDevice?.location}</span>
              <span className="text-muted-foreground">Current Owner:</span>
              <span>{selectedDevice?.owner}</span>
              <span className="text-muted-foreground">Status:</span>
              <span><Badge variant="outline">{selectedDevice?.status}</Badge></span>
            </div>
            <div className="border-t pt-2 text-xs text-muted-foreground italic">
              Zenvix IT-AM: Managed via LAN-first physical mapping. Last scanned: {new Date().toISOString().slice(0, 10)}.
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  try {
                    setStatusMessage(`Audit signal sent for device ${selectedDevice.id}.`);
                    setSelectedDevice(null);
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
                onClick={() => {
                  try {
                    setStatusMessage(`Wipe command queued for ${selectedDevice.id}. Security policy enforced.`);
                    setSelectedDevice(null);
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
