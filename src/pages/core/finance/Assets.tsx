// src/pages/core/finance/Assets.tsx
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { ApprovalStatusBadge } from "@/core/tools/ApprovalStatusBadge";
import { useSession } from "@/core/security/session";
import { financeService } from "@/core/services/finance/financeService";
import type { Asset } from "@/core/repositories/finance/financeRepository";

export default function Assets() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetForm, setAssetForm] = useState<{
    name: string;
    type: Asset["type"];
    department: string;
    value: number;
  }>({
    name: "",
    type: "EQUIPMENT",
    department: "",
    value: 0,
  });

  // Load assets on mount and when session changes
  useEffect(() => {
    const loadAssets = async () => {
      const data = await financeService.listAssets(session.tenantId, session);
      setAssets(data);
    };
    loadAssets();
  }, [session]);

  const filteredAssets = assets.filter((a) =>
    search ? a.name.toLowerCase().includes(search.toLowerCase()) : true,
  );

  const handleCreateAsset = async () => {
    const newAsset = await financeService.createAsset(
      session.tenantId,
      session,
      assetForm,
    );
    setAssets((prev) => [...prev, newAsset]);
    setDialogOpen(false);
    setAssetForm({ name: "", type: "EQUIPMENT", department: "", value: 0 });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assets"
        subtitle="Manage company assets: fixed assets, depreciation, assignments, acquisitions, and disposals."
        primaryAction={
          <Button onClick={() => setDialogOpen(true)}>New Asset</Button>
        }
        secondaryActions={
          <Input
            placeholder="Search assets"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-[220px]"
          />
        }
      />

      <WorkspacePanel
        title="Asset List"
        description="All company assets with details and status."
      >
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <DataTableShell total={filteredAssets.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Asset Name</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Department</th>
                <th className="p-3 text-left">Value</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="p-3 font-medium">{a.name}</td>
                  <td className="p-3 text-muted-foreground">{a.type}</td>
                  <td className="p-3 text-muted-foreground">{a.department}</td>
                  <td className="p-3 text-muted-foreground">
                    {a.value.toLocaleString()}
                  </td>
                  <td className="p-3">
                    <ApprovalStatusBadge status={a.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>

      {/* Dialog: New Asset */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Asset</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Asset Name"
              value={assetForm.name}
              onChange={(e) =>
                setAssetForm({ ...assetForm, name: e.target.value })
              }
            />
            <Select
              value={assetForm.type}
              onValueChange={(v: Asset["type"]) =>
                setAssetForm({ ...assetForm, type: v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Asset Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EQUIPMENT">Equipment</SelectItem>
                <SelectItem value="VEHICLE">Vehicle</SelectItem>
                <SelectItem value="FURNITURE">Furniture</SelectItem>
                <SelectItem value="BUILDING">Building</SelectItem>
                <SelectItem value="SOFTWARE">Software</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Assigned Department"
              value={assetForm.department}
              onChange={(e) =>
                setAssetForm({ ...assetForm, department: e.target.value })
              }
            />
            <Input
              placeholder="Asset Value"
              type="number"
              value={assetForm.value}
              onChange={(e) =>
                setAssetForm({ ...assetForm, value: Number(e.target.value) })
              }
            />
            <div className="flex justify-end gap-2">
              <Button onClick={handleCreateAsset}>Submit & Route</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
