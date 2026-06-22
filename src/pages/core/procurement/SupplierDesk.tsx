import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { ApprovalStatusBadge } from "@/core/tools/ApprovalStatusBadge";
import { FeedbackAlert } from "@/core/tools/FeedbackAlert";
import { useSession } from "@/core/security/session";
import { procurementService } from "@/core/services/procurement/procurementService";
import { formatCurrency } from "@/lib/format";
import type { SupplierBranch, SupplierMaster, SupplierRecommendation } from "@/core/types/procurement/procurement";
import { Building2, Globe, User, Mail, Phone, MapPin, Tag, Info, ArrowUpRight, Plus, Trash2 } from "lucide-react";
import { supplierMasterSchema, supplierBranchSchema, categorySchema } from "@/modules/procurement/schemas";
import {
  useCreateSupplierMaster,
  useCreateSupplierBranch,
  useUpsertCategory,
  useDeleteCategory,
} from "@/modules/procurement/hooks";

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
  const [recommendations, setRecommendations] = useState<SupplierRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [recLoading, setRecLoading] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierMaster | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<SupplierBranch | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New Rich Data States
  const [website, setWebsite] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");
  const [fullAddress, setFullAddress] = useState("");

  // Category Management States
  const [categoryList, setCategoryList] = useState<{ id: string; name: string; description?: string }[]>([]);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");

  // Validation error states
  const [masterFieldErrors, setMasterFieldErrors] = useState<Record<string, string>>({});
  const [branchFieldErrors, setBranchFieldErrors] = useState<Record<string, string>>({});
  const [categoryFieldErrors, setCategoryFieldErrors] = useState<Record<string, string>>({});

  // TanStack Query mutations
  const createSupplierMasterMutation = useCreateSupplierMaster();
  const createSupplierBranchMutation = useCreateSupplierBranch();
  const upsertCategoryMutation = useUpsertCategory();
  const deleteCategoryMutation = useDeleteCategory();

  const clearStatus = () => {
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [m, b, cats] = await Promise.all([
        procurementService.listSupplierMasters(session.tenant_id, session),
        procurementService.listSupplierBranches(session.tenant_id, session),
        procurementService.listCategories(session.tenant_id, session),
      ]);
      setMasters(m);
      setBranches(b);
      setCategoryList(cats);
    } catch (err) {
      setErrorMessage("Failed to load supplier data.");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const fetchRecs = async () => {
      setRecLoading(true);
      try {
        const recs = await procurementService.getSupplierRecommendations(session.tenant_id, session, {
          branchCode: recBranchCode,
          category: recCategory,
        });
        setRecommendations(recs);
      } catch (err) {
        setErrorMessage("Failed to load recommendations.");
      } finally {
        setRecLoading(false);
      }
    };
    fetchRecs();
  }, [recBranchCode, recCategory, session.tenant_id, session]);

  const filteredMasters = useMemo(
    () =>
      (Array.isArray(masters) ? masters : []).filter((item) =>
        search
          ? `${item.name} ${item.taxId}`.toLowerCase().includes(search.toLowerCase())
          : true,
      ),
    [masters, search],
  );

  const createMaster = async () => {
    setMasterFieldErrors({});
    const result = supplierMasterSchema.safeParse({
      name,
      taxId,
      categories,
      website: website || undefined,
      contactPerson: contactPerson || undefined,
      contactEmail: contactEmail || undefined,
      contactPhone: contactPhone || undefined,
      address: address || undefined,
    });
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        if (!errors[field]) errors[field] = issue.message;
      });
      setMasterFieldErrors(errors);
      return;
    }
    try {
      await createSupplierMasterMutation.mutateAsync(result.data);
      setStatusMessage(`Supplier Master "${name}" created and routed for compliance vetting.`);
      setMasterDialogOpen(false);
      resetMasterForm();
      setMasterFieldErrors({});
      refresh();
    } catch (err) {
      setErrorMessage("Failed to create supplier master.");
    }
  };

  const resetMasterForm = () => {
    setName("");
    setTaxId("");
    setCategories("General");
    setWebsite("");
    setContactPerson("");
    setContactEmail("");
    setContactPhone("");
    setAddress("");
  };

  const createBranch = async () => {
    setBranchFieldErrors({});
    const result = supplierBranchSchema.safeParse({
      supplierId,
      branchCode,
      branchName: branchName || undefined,
      location,
      leadTimeDays: Number(leadTimeDays || "0"),
      fullAddress: fullAddress || undefined,
      contactPerson: contactPerson || undefined,
      contactEmail: contactEmail || undefined,
      contactPhone: contactPhone || undefined,
    });
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        if (!errors[field]) errors[field] = issue.message;
      });
      setBranchFieldErrors(errors);
      return;
    }
    try {
      await createSupplierBranchMutation.mutateAsync(result.data);
      setStatusMessage(`Supplier branch "${branchName || branchCode}" added successfully.`);
      setBranchDialogOpen(false);
      resetBranchForm();
      setBranchFieldErrors({});
      refresh();
    } catch (err) {
      setErrorMessage("Failed to add supplier branch.");
    }
  };

  const resetBranchForm = () => {
    setBranchName("");
    setLeadTimeDays("3");
    setFullAddress("");
    setContactPerson("");
    setContactEmail("");
    setContactPhone("");
  };

  const handleCreateCategory = async () => {
    setCategoryFieldErrors({});
    const result = categorySchema.safeParse({ name: newCatName, description: newCatDesc || undefined });
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        if (!errors[field]) errors[field] = issue.message;
      });
      setCategoryFieldErrors(errors);
      return;
    }
    try {
      await upsertCategoryMutation.mutateAsync(result.data);
      setNewCatName("");
      setNewCatDesc("");
      setCategoryFieldErrors({});
      refresh();
    } catch (err) {
      setErrorMessage("Failed to create category.");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteCategoryMutation.mutateAsync(id);
      refresh();
    } catch (err) {
      setErrorMessage("Failed to deactivate category.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplier Desk"
        subtitle="Supplier master and branch operations with onboarding workflow and recommendation support."
        primaryAction={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCategoryDialogOpen(true)}>
              <Tag className="w-4 h-4 mr-2" />
              Manage Categories
            </Button>
            <Button variant="outline" onClick={() => setBranchDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Branch
            </Button>
            <Button onClick={() => setMasterDialogOpen(true)}>
              <Building2 className="w-4 h-4 mr-2" />
              Add Supplier Master
            </Button>
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
              {loading ? (
                <tr><td colSpan={5} className="p-3 text-center">Loading...</td></tr>
              ) : filteredMasters.length === 0 ? (
                <tr><td colSpan={5} className="p-3 text-center text-muted-foreground">No suppliers found.</td></tr>
              ) : (
                (Array.isArray(filteredMasters) ? filteredMasters : []).map((supplier) => (
                  <tr
                    key={supplier.id}
                    className="cursor-pointer border-t hover:bg-muted/50"
                    onClick={() => setSelectedSupplier(supplier)}
                  >
                    <td className="p-3 font-medium">{supplier.name}</td>
                    <td className="p-3 text-muted-foreground">{supplier.taxId}</td>
                    <td className="p-3">
                      <ApprovalStatusBadge status={supplier.complianceStatus || "PENDING"} />
                    </td>
                    <td className="p-3 text-muted-foreground">{supplier.globalRating}</td>
                    <td className="p-3 text-muted-foreground">{supplier.riskTier}</td>
                  </tr>
                ))
              )}
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
              {loading ? (
                <tr><td colSpan={6} className="p-3 text-center">Loading...</td></tr>
              ) : branches.length === 0 ? (
                <tr><td colSpan={6} className="p-3 text-center text-muted-foreground">No branches found.</td></tr>
              ) : (
                (Array.isArray(branches) ? branches : []).map((branch) => (
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
                ))
              )}
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
              {recLoading ? (
                <tr><td colSpan={6} className="p-3 text-center">Loading...</td></tr>
              ) : recommendations.length === 0 ? (
                <tr><td colSpan={6} className="p-3 text-center text-muted-foreground">No recommendations for this criteria.</td></tr>
              ) : (
                (Array.isArray(recommendations) ? recommendations : []).map((item) => (
                  <tr key={`${item.supplierId}-${item.supplierBranchId}`} className="border-t">
                    <td className="p-3 font-medium">{item.supplierName}</td>
                    <td className="p-3 text-muted-foreground">{item.branchName}</td>
                    <td className="p-3 text-muted-foreground">{item.score}</td>
                    <td className="p-3 text-muted-foreground">{item.riskTier}</td>
                    <td className="p-3 text-muted-foreground">{formatCurrency(item.unitPrice, "IDR", "id-ID")}</td>
                    <td className="p-3 text-muted-foreground">{item.leadTimeDays} days</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>

      <Dialog open={masterDialogOpen} onOpenChange={setMasterDialogOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden" aria-describedby="master-create-description">
          <DialogHeader className="sr-only">
            <DialogTitle>Create Supplier Master</DialogTitle>
          </DialogHeader>
          <div id="master-create-description" className="sr-only">Register a global supplier identity with rich contact profile and tax compliance details.</div>
          
          <div className="grid md:grid-cols-[1fr_2fr]">
            {/* Left Info Panel */}
            <div className="bg-muted p-6 flex flex-col justify-between border-r">
              <div>
                <ArrowUpRight className="w-8 h-8 text-primary mb-4" />
                <DialogTitle className="text-xl mb-2 text-foreground">Supplier Onboarding</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Register a global supplier identity. This triggers automatic compliance vetting and legal compliance tracking.
                </p>
                <div className="mt-8 space-y-4">
                  <div className="flex items-start gap-3 text-sm">
                    <div className="mt-0.5"><Building2 className="w-4 h-4 text-primary" /></div>
                    <div>
                      <p className="font-medium text-foreground">Global Identity</p>
                      <p className="text-muted-foreground text-xs">Standardizes supplier data across all regions.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 text-sm">
                    <div className="mt-0.5"><Tag className="w-4 h-4 text-primary" /></div>
                    <div>
                      <p className="font-medium text-foreground">Category Mapping</p>
                      <p className="text-muted-foreground text-xs">Ensures correct recommendation during search.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-primary/5 p-4 rounded-lg mt-8 border border-primary/10">
                <p className="text-xs text-primary font-medium flex items-center gap-1.5">
                  <Info className="w-4 h-4" /> Compliance Note
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tax IDs (NPWP/VAT) are verified against official records before approval.
                </p>
              </div>
            </div>

            {/* Right Form Panel */}
            <div className="p-6">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block tracking-wider">Official Supplier Name</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-primary" />
                      <Input
                        className="pl-9"
                        placeholder="e.g. PT. Nusantara Tech Hub"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block tracking-wider">Tax ID (NPWP)</label>
                    <Input
                      placeholder="01.234.567.8-091.000"
                      value={taxId}
                      onChange={(event) => setTaxId(event.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block tracking-wider">Website</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-2.5 h-4 w-4 text-primary" />
                      <Input
                        className="pl-9"
                        placeholder="https://www.example.com"
                        value={website}
                        onChange={(event) => setWebsite(event.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-2 border-t mt-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Contact Profile & Address</p>
                  <div className="grid grid-cols-2 gap-4 text-foreground">
                    <div>
                      <label className="text-xs font-medium mb-1.5 block">Person in Charge</label>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input className="pl-9 h-9" placeholder="Full Name" value={contactPerson} onChange={e => setContactPerson(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1.5 block">Contact Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input className="pl-9 h-9" placeholder="billing@vendor.com" value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1.5 block">Contact Phone</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input className="pl-9 h-9" placeholder="+62 81..." value={contactPhone} onChange={e => setContactPhone(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1.5 block">HQ Address</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input className="pl-9 h-9" placeholder="Street, Building, Floor" value={address} onChange={e => setAddress(e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block tracking-wider">Product Categories</label>
                  <Input
                    placeholder="Electronics, Machinery (Comma separated)"
                    value={categories}
                    onChange={(event) => setCategories(event.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground mt-2 italic flex items-center gap-1">
                    <Info className="w-3 h-3" /> Tip: Accurate categories improve your recommendation score.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => { setMasterDialogOpen(false); resetMasterForm(); }}>Cancel</Button>
                  <Button onClick={createMaster}>Create and Route</Button>
                </div>
                {Object.keys(masterFieldErrors).length > 0 && (
                  <div className="space-y-1 pt-2">
                    {Object.entries(masterFieldErrors).map(([field, msg]) => (
                      <p key={field} className="text-xs text-destructive">{msg}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={branchDialogOpen} onOpenChange={setBranchDialogOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden" aria-describedby="branch-create-description">
          <DialogHeader className="sr-only">
            <DialogTitle>Add Supplier Branch</DialogTitle>
          </DialogHeader>
          <div id="branch-create-description" className="sr-only">Add a new fulfillment location for an existing supplier master to enable local lead-time tracking.</div>
          
          <div className="grid md:grid-cols-[1fr_2fr]">
            <div className="bg-muted p-6 flex flex-col justify-between border-r shadow-inner">
              <div>
                <MapPin className="w-8 h-8 text-primary mb-4" />
                <DialogTitle className="text-xl mb-2 text-foreground">Add Branch</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Expand your supplier's geographical presence to optimize logistics and lead-time calculations.
                </p>
                <div className="mt-8 space-y-4">
                  <div className="flex items-start gap-3 text-sm rounded-lg p-3 bg-background/50 border">
                    <div className="mt-0.5"><Building2 className="w-4 h-4 text-primary" /></div>
                    <div>
                      <p className="font-medium text-foreground">Parent Master</p>
                      <p className="text-muted-foreground text-[10px]">Inherits global risk profile.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block tracking-wider">Parent Supplier</label>
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Identify Supplier Master" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Array.isArray(masters) ? masters : []).map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block tracking-wider">Branch Code</label>
                    <Input placeholder="JKT-SBY-01" value={branchCode} onChange={e => setBranchCode(e.target.value.toUpperCase())} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block tracking-wider">Branch Nickname</label>
                    <Input placeholder="Surabaya East Hub" value={branchName} onChange={e => setBranchName(e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <div className="col-span-2">
                    <label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block tracking-wider">Full Fulfillment Address</label>
                    <Input placeholder="Warehouse B, Industrial Zone 4" value={fullAddress} onChange={e => setFullAddress(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block tracking-wider">Lead Time (Days)</label>
                    <Input type="number" value={leadTimeDays} onChange={e => setLeadTimeDays(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block tracking-wider">Location City</label>
                    <Input placeholder="Jakarta" value={location} onChange={e => setLocation(e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <div>
                    <label className="text-xs font-medium mb-1.5 block">Local Contact Name</label>
                    <Input className="h-9" placeholder="Branch Manager" value={contactPerson} onChange={e => setContactPerson(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1.5 block">Local Phone</label>
                    <Input className="h-9" placeholder="+62..." value={contactPhone} onChange={e => setContactPhone(e.target.value)} />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => { setBranchDialogOpen(false); resetBranchForm(); }}>Cancel</Button>
                  <Button onClick={createBranch}>Confirm Addition</Button>
                </div>
                {Object.keys(branchFieldErrors).length > 0 && (
                  <div className="space-y-1 pt-2">
                    {Object.entries(branchFieldErrors).map(([field, msg]) => (
                      <p key={field} className="text-xs text-destructive">{msg}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" />
              Category Management
            </DialogTitle>
            <DialogDescription>Define per-company product categories for improved procurement analytics.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="rounded-xl border p-4 bg-muted/30">
              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Add New Category</p>
              <div className="grid gap-3">
                <Input placeholder="Category Name (e.g. Raw Materials)" value={newCatName} onChange={e => setNewCatName(e.target.value)} />
                {categoryFieldErrors.name && <p className="text-xs text-destructive">{categoryFieldErrors.name}</p>}
                <Input placeholder="Description (Optional)" value={newCatDesc} onChange={e => setNewCatDesc(e.target.value)} />
                <Button onClick={handleCreateCategory} className="w-full">
                  <Plus className="w-4 h-4 mr-2" /> Create Category
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Active Categories</label>
              <div className="grid gap-2 overflow-y-auto max-h-[300px] pr-2">
                {(Array.isArray(categoryList) ? categoryList : []).map(cat => (
                  <div key={cat.id} className="flex items-center justify-between p-3 rounded-lg border bg-background hover:border-primary/50 transition-colors group">
                    <div>
                      <p className="font-semibold text-sm">{cat.name}</p>
                      <p className="text-xs text-muted-foreground">{cat.description || "No description"}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteCategory(cat.id)} className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!selectedSupplier} onOpenChange={() => setSelectedSupplier(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden" aria-describedby="master-detail-description">
          <div id="master-detail-description" className="sr-only">Comprehensive view of supplier compliance, rating, and contact profile.</div>
          <DialogHeader className="p-6 pb-4 border-b">
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle className="text-2xl flex items-center gap-2">
                  <Building2 className="h-6 w-6 text-primary" />
                  {selectedSupplier?.name}
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-1 uppercase tracking-widest font-mono">Tax ID: {selectedSupplier?.taxId}</p>
              </div>
              <Badge variant={selectedSupplier?.riskTier === "LOW" ? "default" : "destructive"} className="px-3 py-1">
                {selectedSupplier?.riskTier} RISK
              </Badge>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-8 p-6">
            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Compliance & Performance</p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50 border">
                    <span className="text-xs font-medium">Status</span>
                    <ApprovalStatusBadge status={selectedSupplier?.complianceStatus || "PENDING"} />
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <span className="text-xs font-medium">Platform Rating</span>
                    <span className="font-bold text-primary">{selectedSupplier?.globalRating} / 100</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Categories</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedSupplier?.categories.map(c => (
                    <Badge key={c} variant="outline" className="text-[10px] py-0 px-2 font-normal">{c}</Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6 border-l pl-8">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Contact Profile</p>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center"><User className="w-4 h-4 text-muted-foreground" /></div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold">Rep</p>
                      <p className="text-sm font-medium">{selectedSupplier?.contactPerson || "-"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center"><Mail className="w-4 h-4 text-muted-foreground" /></div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold">Email</p>
                      <p className="text-sm font-medium">{selectedSupplier?.contactEmail || "-"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center"><Globe className="w-4 h-4 text-muted-foreground" /></div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold">Wesbite</p>
                      <p className="text-sm font-medium text-primary hover:underline cursor-pointer">{selectedSupplier?.website || "-"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedBranch} onOpenChange={() => setSelectedBranch(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden" aria-describedby="branch-detail-description">
          <div id="branch-detail-description" className="sr-only">Branch fulfillment profile and local rating details.</div>
          <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle className="text-xl flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  {selectedBranch?.branchName}
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">CODE: <span className="font-mono tracking-widest">{selectedBranch?.branchCode}</span></p>
              </div>
              <Badge variant="outline" className="border-primary/20 text-primary">
                {selectedBranch?.location}
              </Badge>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-8 p-6">
            <div className="space-y-6 text-foreground">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Logistics Meta</p>
                <div className="space-y-2">
                  <div className="p-3 rounded-lg border bg-muted/30">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Standard Lead Time</p>
                    <p className="text-lg font-semibold">{selectedBranch?.leadTimeDays} Days</p>
                  </div>
                  <div className="p-3 rounded-lg border bg-muted/30">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Local Quality Rating</p>
                    <p className="text-lg font-semibold">{selectedBranch?.localRating} / 100</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Full Address</p>
                <p className="text-sm leading-relaxed text-muted-foreground italic">
                  {selectedBranch?.fullAddress || "No detailed address provided."}
                </p>
              </div>
            </div>

            <div className="space-y-6 border-l pl-8">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Local Handoff</p>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Point of Contact</p>
                      <p className="text-sm font-medium">{selectedBranch?.contactPerson || "-"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-foreground">
                    <Phone className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Phone</p>
                      <p className="text-sm font-medium">{selectedBranch?.contactPhone || "-"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-foreground">
                    <Mail className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Email</p>
                      <p className="text-sm font-medium">{selectedBranch?.contactEmail || "-"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

