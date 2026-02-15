import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { ApprovalStatusBadge } from "@/core/tools/ApprovalStatusBadge";
import { FeedbackAlert } from "@/core/tools/FeedbackAlert";
import { useSession } from "@/core/security/session";
import { procurementService } from "@/core/services/procurement/procurementService";
import type { SupplierBranch, SupplierMaster } from "@/core/types/procurement/procurement";

export default function SupplierDesk() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [masterDialogOpen, setMasterDialogOpen] = useState(false);
  const [branchDialogOpen, setBranchDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [categories, setCategories] = useState("General");
  const [supplierId, setSupplierId] = useState("");
  const [branchCode, setBranchCode] = useState("JKT");
  const [branchName, setBranchName] = useState("");
  const [location, setLocation] = useState("Jakarta");
  const [leadTimeDays, setLeadTimeDays] = useState("3");
  const [recBranchCode, setRecBranchCode] = useState("JKT");
  const [recCategory, setRecCategory] = useState("Machinery");
  const [masters, setMasters] = useState<SupplierMaster[]>([]);
  const [branches, setBranches] = useState<SupplierBranch[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierMaster | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<SupplierBranch | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clearStatus = () => {
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const refresh = useCallback(() => {
    setMasters(procurementService.listSupplierMasters(session.tenantId));
    setBranches(procurementService.listSupplierBranches(session.tenantId));
  }, [session.tenantId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filteredMasters = useMemo(
    () =>
      masters.filter((item) =>
        search
          ? `${item.name} ${item.taxId}`.toLowerCase().includes(search.toLowerCase())
          : true,
      ),
    [masters, search],
  );

  const recommendations = useMemo(
    () =>
      procurementService.getSupplierRecommendations(session.tenantId, {
        branchCode: recBranchCode,
        category: recCategory,
      }),
    [recBranchCode, recCategory, session.tenantId],
  );

  const createMaster = () => {
    if (!name.trim()) return;
    try {
      procurementService.createSupplierMaster(session.tenantId, session, {
        name,
        taxId,
        categories: categories.split(",").map((item) => item.trim()).filter(Boolean),
      });
      setStatusMessage(`Supplier Master "${name}" created and routed for compliance vetting.`);
      setMasterDialogOpen(false);
      setName("");
      setTaxId("");
      setCategories("General");
      refresh();
    } catch (err) {
      setErrorMessage("Failed to create supplier master.");
    }
  };

  const createBranch = () => {
    if (!supplierId) return;
    try {
      procurementService.createSupplierBranch(session.tenantId, session, {
        supplierId,
        branchCode,
        branchName: branchName || `${branchCode} Branch`,
        location,
        leadTimeDays: Number(leadTimeDays || "0"),
      });
      setStatusMessage(`Supplier branch "${branchName || branchCode}" added successfully.`);
      setBranchDialogOpen(false);
      setBranchName("");
      setLeadTimeDays("3");
      refresh();
    } catch (err) {
      setErrorMessage("Failed to add supplier branch.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplier Desk"
        subtitle="Supplier master and branch operations with onboarding workflow and recommendation support."
        primaryAction={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setBranchDialogOpen(true)}>
              Add Supplier Branch
            </Button>
            <Button onClick={() => setMasterDialogOpen(true)}>Add Supplier Master</Button>
          </div>
        }
        secondaryActions={
          <Input
            placeholder="Search supplier name or tax ID"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-w-[220px]"
          />
        }
      />

      <FeedbackAlert message={statusMessage} error={errorMessage} onClear={clearStatus} />

      <WorkspacePanel title="Supplier Master" description="Global supplier identity, compliance posture, and risk tier.">
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <DataTableShell total={filteredMasters.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Supplier</th>
                <th className="p-3 text-left">Tax ID</th>
                <th className="p-3 text-left">Compliance</th>
                <th className="p-3 text-left">Global Rating</th>
                <th className="p-3 text-left">Risk Tier</th>
              </tr>
            </thead>
            <tbody>
              {filteredMasters.map((supplier) => (
                <tr
                  key={supplier.id}
                  className="cursor-pointer border-t hover:bg-muted/50"
                  onClick={() => setSelectedSupplier(supplier)}
                >
                  <td className="p-3 font-medium">{supplier.name}</td>
                  <td className="p-3 text-muted-foreground">{supplier.taxId}</td>
                  <td className="p-3">
                    <ApprovalStatusBadge status={supplier.complianceStatus} />
                  </td>
                  <td className="p-3 text-muted-foreground">{supplier.globalRating}</td>
                  <td className="p-3 text-muted-foreground">{supplier.riskTier}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>

      <WorkspacePanel title="Supplier Branch Profiles" description="Branch-aware local ratings, lead time, and risk controls.">
        <DataTableShell total={branches.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Branch</th>
                <th className="p-3 text-left">Supplier ID</th>
                <th className="p-3 text-left">Location</th>
                <th className="p-3 text-left">Lead Time</th>
                <th className="p-3 text-left">Local Rating</th>
                <th className="p-3 text-left">Risk Tier</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((branch) => (
                <tr
                  key={branch.id}
                  className="cursor-pointer border-t hover:bg-muted/50"
                  onClick={() => setSelectedBranch(branch)}
                >
                  <td className="p-3 font-medium">
                    {branch.branchCode} - {branch.branchName}
                  </td>
                  <td className="p-3 text-muted-foreground">{branch.supplierId}</td>
                  <td className="p-3 text-muted-foreground">{branch.location}</td>
                  <td className="p-3 text-muted-foreground">{branch.leadTimeDays} days</td>
                  <td className="p-3 text-muted-foreground">{branch.localRating}</td>
                  <td className="p-3 text-muted-foreground">{branch.riskTier}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>

      <WorkspacePanel title="Recommendation Engine" description="Category and branch-aware supplier recommendation ranking.">
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <Select value={recBranchCode} onValueChange={setRecBranchCode}>
            <SelectTrigger>
              <SelectValue placeholder="Branch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="JKT">JKT</SelectItem>
              <SelectItem value="SBY">SBY</SelectItem>
              <SelectItem value="DPS">DPS</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Category" value={recCategory} onChange={(event) => setRecCategory(event.target.value)} />
        </div>
        <DataTableShell total={recommendations.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Supplier</th>
                <th className="p-3 text-left">Branch</th>
                <th className="p-3 text-left">Score</th>
                <th className="p-3 text-left">Risk</th>
                <th className="p-3 text-left">Unit Price</th>
                <th className="p-3 text-left">Lead Time</th>
              </tr>
            </thead>
            <tbody>
              {recommendations.map((item) => (
                <tr key={`${item.supplierId}-${item.supplierBranchId}`} className="border-t">
                  <td className="p-3 font-medium">{item.supplierName}</td>
                  <td className="p-3 text-muted-foreground">{item.branchName}</td>
                  <td className="p-3 text-muted-foreground">{item.score}</td>
                  <td className="p-3 text-muted-foreground">{item.riskTier}</td>
                  <td className="p-3 text-muted-foreground">{item.unitPrice?.toLocaleString() ?? "-"}</td>
                  <td className="p-3 text-muted-foreground">{item.leadTimeDays} days</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>

      <Dialog open={masterDialogOpen} onOpenChange={setMasterDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Supplier Master</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Supplier Name" value={name} onChange={(event) => setName(event.target.value)} />
            <Input placeholder="Tax ID" value={taxId} onChange={(event) => setTaxId(event.target.value)} />
            <Input
              placeholder="Categories (comma separated)"
              value={categories}
              onChange={(event) => setCategories(event.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button onClick={createMaster}>Create and Route</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={branchDialogOpen} onOpenChange={setBranchDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Supplier Branch</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger>
                <SelectValue placeholder="Supplier" />
              </SelectTrigger>
              <SelectContent>
                {masters.map((master) => (
                  <SelectItem key={master.id} value={master.id}>
                    {master.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Branch Code" value={branchCode} onChange={(event) => setBranchCode(event.target.value.toUpperCase())} />
            <Input placeholder="Branch Name" value={branchName} onChange={(event) => setBranchName(event.target.value)} />
            <Input placeholder="Location" value={location} onChange={(event) => setLocation(event.target.value)} />
            <Input
              placeholder="Lead Time (days)"
              type="number"
              value={leadTimeDays}
              onChange={(event) => setLeadTimeDays(event.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button onClick={createBranch}>Create Branch</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!selectedSupplier} onOpenChange={() => setSelectedSupplier(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Supplier Master Detail</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 text-sm gap-y-2">
              <span className="text-muted-foreground">Supplier ID:</span>
              <span className="font-mono text-xs">{selectedSupplier?.id}</span>
              <span className="text-muted-foreground">Name:</span>
              <span className="font-semibold">{selectedSupplier?.name}</span>
              <span className="text-muted-foreground">Tax ID:</span>
              <span>{selectedSupplier?.taxId}</span>
              <span className="text-muted-foreground">Categories:</span>
              <span className="flex flex-wrap gap-1">
                {selectedSupplier?.categories.map(c => (
                  <span key={c} className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{c}</span>
                ))}
              </span>
              <span className="text-muted-foreground">Compliance:</span>
              <span><ApprovalStatusBadge status={selectedSupplier?.complianceStatus ?? ""} /></span>
              <span className="text-muted-foreground">Rating:</span>
              <span>{selectedSupplier?.globalRating} / 5</span>
              <span className="text-muted-foreground">Risk Tier:</span>
              <span className="font-bold">{selectedSupplier?.riskTier}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedBranch} onOpenChange={() => setSelectedBranch(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Branch Profile Detail</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 text-sm gap-y-2">
              <span className="text-muted-foreground">Branch Code:</span>
              <span className="font-bold">{selectedBranch?.branchCode}</span>
              <span className="text-muted-foreground">Branch Name:</span>
              <span>{selectedBranch?.branchName}</span>
              <span className="text-muted-foreground">Location:</span>
              <span>{selectedBranch?.location}</span>
              <span className="text-muted-foreground">Lead Time:</span>
              <span>{selectedBranch?.leadTimeDays} days</span>
              <span className="text-muted-foreground">Local Rating:</span>
              <span>{selectedBranch?.localRating} / 5</span>
              <span className="text-muted-foreground">Risk Tier:</span>
              <span className="font-bold">{selectedBranch?.riskTier}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

