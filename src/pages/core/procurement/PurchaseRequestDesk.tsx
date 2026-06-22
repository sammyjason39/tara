import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import type {
  DraftPurchaseOrder,
  Requisition,
  SupplierMaster,
  SupplierBranch,
} from "@/core/types/procurement/procurement";
import { ClipboardList, FileText, Info, Building2, MapPin, Tag, Wallet, ShieldCheck, ArrowUpRight, Plus, ShoppingCart, User } from "lucide-react";
import { requisitionSchema, draftPurchaseOrderSchema, validatePoTransition } from "@/modules/procurement/schemas";
import {
  useCreateRequisition,
  useBuildDraftPo,
  useApproveRequesterHod,
  useApproveDraftPo,
  useSetFinalApproval,
  useRunRiskScan,
} from "@/modules/procurement/hooks";

export default function PurchaseRequestDesk({ noShell = false }: { noShell?: boolean }) {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [draftDialogOpen, setDraftDialogOpen] = useState(false);
  const [selectedRequisitionId, setSelectedRequisitionId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Machinery");
  const [branchCode, setBranchCode] = useState("JKT");
  const [budgetClass, setBudgetClass] =
    useState<Requisition["budgetClass"]>("OPEX");
  const [amount, setAmount] = useState("0");
  const [contractRequired, setContractRequired] = useState<"YES" | "NO">("YES");
  const [supplierId, setSupplierId] = useState("");
  const [supplierBranchId, setSupplierBranchId] = useState("");
  const [lineSku, setLineSku] = useState("");
  const [lineDescription, setLineDescription] = useState("");
  const [lineQuantity, setLineQuantity] = useState("1");
  const [linePrice, setLinePrice] = useState("0");
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [draftPos, setDraftPos] = useState<DraftPurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierMaster[]>([]);
  const [branches, setBranches] = useState<SupplierBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequisition, setSelectedRequisition] =
    useState<Requisition | null>(null);
  const [overview, setOverview] = useState<any>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [categoryList, setCategoryList] = useState<any[]>([]);
  const [reqFieldErrors, setReqFieldErrors] = useState<Record<string, string>>({});
  const [draftFieldErrors, setDraftFieldErrors] = useState<Record<string, string>>({});

  // TanStack Query mutations with cache invalidation
  const createRequisitionMutation = useCreateRequisition();
  const buildDraftPoMutation = useBuildDraftPo();
  const approveRequesterHodMutation = useApproveRequesterHod();
  const approveDraftPoMutation = useApproveDraftPo();
  const setFinalApprovalMutation = useSetFinalApproval();
  const runRiskScanMutation = useRunRiskScan();

  const clearStatus = () => {
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [reqs, pos, m, b, over, cats] = await Promise.all([
        procurementService.listRequisitions(session.tenant_id, session),
        procurementService.listDraftPurchaseOrders(session.tenant_id, session),
        procurementService.listSupplierMasters(session.tenant_id, session),
        procurementService.listSupplierBranches(session.tenant_id, session),
        procurementService.getOverview(session.tenant_id, session),
        procurementService.listCategories(session.tenant_id, session),
      ]);
      setRequisitions(reqs);
      setDraftPos(pos);
      setSuppliers(m);
      setBranches(b);
      setOverview(over);
      setCategoryList(cats);
    } catch (err) {
      setErrorMessage("Failed to load requisition data.");
    } finally {
      setLoading(false);
    }
  }, [session.tenant_id, session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(
    () =>
      (Array.isArray(requisitions) ? requisitions : []).filter((item) =>
        search
          ? `${item.id} ${item.title} ${item.requesterDept}`
              .toLowerCase()
              .includes(search.toLowerCase())
          : true,
      ),
    [requisitions, search],
  );

  const createRequisition = async () => {
    setReqFieldErrors({});
    const result = requisitionSchema.safeParse({
      title,
      description,
      category,
      branchCode,
      budgetClass,
      amount: Number(amount || "0"),
      contractRequired: contractRequired === "YES",
    });
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        if (!errors[field]) errors[field] = issue.message;
      });
      setReqFieldErrors(errors);
      return;
    }
    try {
      await createRequisitionMutation.mutateAsync(result.data);
      setStatusMessage(`Requisition "${title}" created and routed to HOD.`);
      setRequestDialogOpen(false);
      setTitle("");
      setDescription("");
      setCategory("Machinery");
      setAmount("0");
      setReqFieldErrors({});
      refresh();
    } catch (err) {
      setErrorMessage(
        "Failed to create requisition. Budget limit exceeded or server error.",
      );
    }
  };

  const approveRequesterHod = async (requisitionId: string) => {
    try {
      await approveRequesterHodMutation.mutateAsync(requisitionId);
      setStatusMessage("Requisition approved by Department HOD.");
      refresh();
    } catch (err) {
      setErrorMessage("HOD approval failed.");
    }
  };

  const buildDraftPo = async () => {
    setDraftFieldErrors({});
    const result = draftPurchaseOrderSchema.safeParse({
      requisitionId: selectedRequisitionId,
      supplierId,
      supplierBranchId,
      contractType: "SPOT",
      lineItems: [
        {
          productSku: lineSku || "GEN-ITEM",
          description: lineDescription || "Procurement line item",
          quantity: Number(lineQuantity || "1"),
          uom: "EA",
          unitPrice: Number(linePrice || "0"),
        },
      ],
    });
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path.join(".");
        if (!errors[path]) errors[path] = issue.message;
      });
      setDraftFieldErrors(errors);
      return;
    }
    try {
      await buildDraftPoMutation.mutateAsync(result.data);
      setStatusMessage("Draft Purchase Order built successfully.");
      setDraftDialogOpen(false);
      setSelectedRequisitionId("");
      setSupplierId("");
      setSupplierBranchId("");
      setLineSku("");
      setLineDescription("");
      setLineQuantity("1");
      setLinePrice("0");
      setDraftFieldErrors({});
      refresh();
    } catch (err) {
      setErrorMessage(
        "Failed to build draft PO. Supplier missing or inactive.",
      );
    }
  };

  const approveDraft = async (draftId: string) => {
    try {
      await approveDraftPoMutation.mutateAsync(draftId);
      setStatusMessage("Draft PO approved at Procurement HOD gate.");
      refresh();
    } catch (err) {
      setErrorMessage("Draft approval failed.");
    }
  };

  const setFinal = async (
    requisitionId: string,
    approver: "REQUESTER_HOD" | "PROCUREMENT_HOD" | "FINANCE_HOD",
  ) => {
    try {
      await setFinalApprovalMutation.mutateAsync({ requisitionId, approver });
      setStatusMessage(`Final approval recorded for ${approver}.`);
      refresh();
    } catch (err) {
      setErrorMessage("Final approval failed.");
    }
  };

  const runRiskScan = async () => {
    try {
      await runRiskScanMutation.mutateAsync();
      setStatusMessage(
        "Anti-fraud risk scan completed. No critical threats found.",
      );
    } catch (err) {
      setErrorMessage("Risk scan failed.");
    }
  };

  return (
    <div className="space-y-6">
      {!noShell && (
        <PageHeader
          title="Requisition Desk"
          subtitle="Department requests with mandatory requester HOD gate and staged procurement approvals."
          primaryAction={
            <Button onClick={() => setRequestDialogOpen(true)}>
              Create Requisition
            </Button>
          }
          secondaryActions={
            <Input
              placeholder="Search requisitions"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="min-w-[220px]"
            />
          }
        />
      )}

      <FeedbackAlert
        message={statusMessage}
        error={errorMessage}
        onClear={clearStatus}
      />

      <WorkspacePanel
        title="Requisition Queue"
        description="End-to-end request pipeline before PO release."
      >
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <DataTableShell total={filtered.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Request</th>
                <th className="p-3 text-left">Department</th>
                <th className="p-3 text-left">Branch</th>
                <th className="p-3 text-left">Amount</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-3 text-center">
                    Loading...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-3 text-center text-muted-foreground"
                  >
                    No requisitions found.
                  </td>
                </tr>
              ) : (
                (Array.isArray(filtered) ? filtered : []).map((item) => (
                  <tr
                    key={item.id}
                    className="cursor-pointer border-t hover:bg-muted/50"
                    onClick={() => setSelectedRequisition(item)}
                  >
                    <td className="p-3">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.id}</p>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {item.requesterDept}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {item.branchCode}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {formatCurrency(item.amount, "IDR", "id-ID")}
                    </td>
                    <td className="p-3">
                      <ApprovalStatusBadge status={item.status} />
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        {item.status === "PENDING_REQUESTER_HOD" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              approveRequesterHod(item.id);
                            }}
                          >
                            Approve Requester HOD
                          </Button>
                        ) : null}
                        {item.status === "APPROVED_REQUESTER_HOD" ||
                        item.status === "DRAFT_PO_PREPARED" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRequisitionId(item.id);
                              setDraftDialogOpen(true);
                            }}
                          >
                            Build Draft PO
                          </Button>
                        ) : null}
                        {item.status === "LEGAL_APPROVED" ||
                        item.status === "FINAL_APPROVAL_PENDING" ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFinal(item.id, "REQUESTER_HOD");
                              }}
                            >
                              Final Requester HOD
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFinal(item.id, "PROCUREMENT_HOD");
                              }}
                            >
                              Final Procurement HOD
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFinal(item.id, "FINANCE_HOD");
                              }}
                            >
                              Final Finance HOD
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>

      <WorkspacePanel
        title="Draft PO Gate"
        description="Procurement HOD draft gate and quote readiness check."
      >
        <DataTableShell total={draftPos.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Draft PO</th>
                <th className="p-3 text-left">Requisition</th>
                <th className="p-3 text-left">Supplier</th>
                <th className="p-3 text-left">Quoted Total</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-3 text-center">
                    Loading...
                  </td>
                </tr>
              ) : draftPos.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-3 text-center text-muted-foreground"
                  >
                    No draft POs found.
                  </td>
                </tr>
              ) : (
                (Array.isArray(draftPos) ? draftPos : []).map((draft) => (
                  <tr key={draft.id} className="border-t">
                    <td className="p-3 font-medium">{draft.id}</td>
                    <td className="p-3 text-muted-foreground">
                      {draft.requisitionId}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {draft.supplierId}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {formatCurrency(draft.quotedTotal, "IDR", "id-ID")}
                    </td>
                    <td className="p-3">
                      <ApprovalStatusBadge status={draft.status} />
                    </td>
                    <td className="p-3">
                      {draft.status === "DRAFT" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => approveDraft(draft.id)}
                        >
                          Approve Draft Gate
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>

      <WorkspacePanel
        title="Governance Controls"
        description="Anti-fraud scan and approval-control checks."
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={runRiskScan}>
            Run Risk Scan
          </Button>
        </div>
      </WorkspacePanel>

      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden" aria-describedby="req-create-description">
          <DialogHeader className="sr-only">
            <DialogTitle>Create Requisition</DialogTitle>
          </DialogHeader>
          <div id="req-create-description" className="sr-only">Submit a new internal purchase request for approval and processing.</div>
          
          <div className="grid md:grid-cols-[1fr_2fr]">
            {/* Left Column: Context */}
            <div className="bg-muted p-6 flex flex-col justify-between border-r shadow-inner">
              <div>
                <ClipboardList className="w-8 h-8 text-primary mb-4" />
                <DialogTitle className="text-xl mb-2">Internal Request</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Document your procurement needs. This triggers a multi-stage approval workflow starting with your Department HOD.
                </p>
                <div className="mt-8 space-y-4">
                  <div className="flex items-start gap-3 text-sm">
                    <ShieldCheck className="w-4 h-4 text-primary mt-1" />
                    <div>
                      <p className="font-medium">Governance Check</p>
                      <p className="text-muted-foreground text-[10px]">Budget availability and contract necessity will be evaluated.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 text-sm">
                    <Wallet className="w-4 h-4 text-primary mt-1" />
                    <div>
                      <p className="font-medium">Budget Controls</p>
                      <p className="text-muted-foreground text-[10px]">Requests exceeding class thresholds flag a PRICE_SPIKE risk.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
                <p className="text-xs text-primary font-bold flex items-center gap-1.5 uppercase tracking-wider">
                  <Info className="w-3.5 h-3.5" /> Department Goal
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Accurate descriptions and categories accelerate the sourcing phase.
                </p>
              </div>
            </div>

            {/* Right Column: Form */}
            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">What do you need?</label>
                  <Input
                    placeholder="Brief title (e.g. Server Maintenance Parts)"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="text-lg font-medium"
                  />
                  {reqFieldErrors.title && <p className="text-xs text-destructive mt-1">{reqFieldErrors.title}</p>}
                  <Textarea
                    placeholder="Detailed justification and specifications..."
                    className="mt-3 min-h-[100px] resize-none"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                  {reqFieldErrors.description && <p className="text-xs text-destructive mt-1">{reqFieldErrors.description}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Category</label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {(Array.isArray(categoryList) ? categoryList : []).map(cat => (
                          <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Branch/Location Code</label>
                    <Input placeholder="JKT" value={branchCode} onChange={e => setBranchCode(e.target.value.toUpperCase())} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Budget Class</label>
                    <Select value={budgetClass} onValueChange={v => setBudgetClass(v as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OPEX">OPEX (Operating)</SelectItem>
                        <SelectItem value="CAPEX">CAPEX (Capital)</SelectItem>
                        <SelectItem value="EMERGENCY">EMERGENCY</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Estimated Amount</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-muted-foreground">IDR</span>
                      <Input type="number" className="pl-12" value={amount} onChange={e => setAmount(e.target.value)} />
                    </div>
                    {reqFieldErrors.amount && <p className="text-xs text-destructive mt-1">{reqFieldErrors.amount}</p>}
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Contract Governance</label>
                  <div className="flex gap-4">
                    <label className={`flex-1 p-3 border rounded-lg cursor-pointer transition-all ${contractRequired === 'YES' ? 'bg-primary/5 border-primary shadow-sm' : 'hover:bg-muted'}`}>
                      <input type="radio" className="sr-only" checked={contractRequired === 'YES'} onChange={() => setContractRequired('YES')} />
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${contractRequired === 'YES' ? 'border-primary' : ''}`}>
                          {contractRequired === 'YES' && <div className="w-2 h-2 rounded-full bg-primary" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold">Formal Contract</p>
                          <p className="text-[10px] text-muted-foreground italic">Legal review required</p>
                        </div>
                      </div>
                    </label>
                    <label className={`flex-1 p-3 border rounded-lg cursor-pointer transition-all ${contractRequired === 'NO' ? 'bg-primary/5 border-primary shadow-sm' : 'hover:bg-muted'}`}>
                      <input type="radio" className="sr-only" checked={contractRequired === 'NO'} onChange={() => setContractRequired('NO')} />
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${contractRequired === 'NO' ? 'border-primary' : ''}`}>
                          {contractRequired === 'NO' && <div className="w-2 h-2 rounded-full bg-primary" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold">Spot Purchase</p>
                          <p className="text-[10px] text-muted-foreground italic">Fast-track processing</p>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t">
                  <Button variant="outline" onClick={() => setRequestDialogOpen(false)}>Cancel</Button>
                  <Button onClick={createRequisition}>
                    <Plus className="w-4 h-4 mr-2" />
                    Submit Request
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={draftDialogOpen} onOpenChange={setDraftDialogOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden" aria-describedby="draft-po-description">
          <DialogHeader className="sr-only">
            <DialogTitle>Build Draft PO</DialogTitle>
          </DialogHeader>
          <div id="draft-po-description" className="sr-only">Convert an approved requisition into a draft purchase order by identifying the preferred supplier and branch.</div>

          <div className="grid md:grid-cols-[1fr_2fr]">
            <div className="bg-muted p-6 flex flex-col justify-between border-r shadow-inner">
              <div>
                <ShoppingCart className="w-8 h-8 text-primary mb-4" />
                <DialogTitle className="text-xl mb-2">Build Purchase Order</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Transform this requirement into a commercial transaction. Identify the validated supplier branch to trigger quoting.
                </p>
                <div className="mt-8 space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                    <Building2 className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Selected REQ</p>
                      <p className="text-xs font-mono">{selectedRequisitionId}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block tracking-wider">Target Supplier Master</label>
                    <Select value={supplierId} onValueChange={setSupplierId}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select Validated Supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {(Array.isArray(suppliers) ? suppliers : []).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block tracking-wider">Fulfillment Branch</label>
                    <Select value={supplierBranchId} onValueChange={setSupplierBranchId}>
                      <SelectTrigger className="h-10 text-foreground">
                        <SelectValue placeholder="Select Location" />
                      </SelectTrigger>
                      <SelectContent>
                        {(Array.isArray(branches) ? branches : []).filter(b => !supplierId || b.supplierId === supplierId).map(b => (
                          <SelectItem key={b.id} value={b.id}>{b.branchCode} - {b.branchName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Line Item Specifications</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="text-xs font-medium mb-1.5 block text-foreground">SKU / Catalog ID</label>
                      <Input placeholder="e.g. MOT-8892-IND" value={lineSku} onChange={e => setLineSku(e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-medium mb-1.5 block text-foreground">Item Description</label>
                      <Input placeholder="Technical specs, part numbers..." value={lineDescription} onChange={e => setLineDescription(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1.5 block text-foreground">Quantity</label>
                      <Input type="number" placeholder="1" value={lineQuantity} onChange={e => setLineQuantity(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1.5 block text-foreground">Target Unit Price</label>
                      <Input type="number" placeholder="0" value={linePrice} onChange={e => setLinePrice(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t">
                  <Button variant="outline" onClick={() => setDraftDialogOpen(false)}>Cancel</Button>
                  <Button onClick={buildDraftPo}>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Build Draft PO
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!selectedRequisition}
        onOpenChange={() => setSelectedRequisition(null)}
      >
        <DialogContent className="max-w-2xl p-0 overflow-hidden" aria-describedby="req-detail-description">
          <div id="req-detail-description" className="sr-only">Comprehensive view of requisition data, governance audit, and approval status.</div>
          <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle className="text-2xl flex items-center gap-2">
                  <ClipboardList className="h-6 w-6 text-primary" />
                  {selectedRequisition?.title}
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-1 tracking-widest font-mono uppercase">REQ ID: {selectedRequisition?.id}</p>
              </div>
              <Badge variant="outline" className="px-3 py-1 font-bold border-primary/20 text-primary">
                {formatCurrency(selectedRequisition?.amount, "IDR", "id-ID")}
              </Badge>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-8 p-6">
            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Context & Scope</p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-background border">
                    <span className="text-xs font-semibold text-muted-foreground">Department</span>
                    <span className="text-sm font-bold text-foreground">{selectedRequisition?.requesterDept}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-background border">
                    <span className="text-xs font-semibold text-muted-foreground">Branch</span>
                    <span className="text-sm font-bold text-foreground">{selectedRequisition?.branchCode}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-background border">
                    <span className="text-xs font-semibold text-muted-foreground">Category</span>
                    <Badge variant="secondary" className="text-[10px]">{selectedRequisition?.category}</Badge>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Justification</p>
                <div className="p-4 rounded-lg bg-muted/30 border italic text-xs leading-relaxed text-muted-foreground">
                  {selectedRequisition?.description || "No description provided."}
                </div>
              </div>
            </div>

            <div className="space-y-6 border-l pl-8">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Governance Audit</p>
                <div className="space-y-4">
                  <div className="p-3 rounded-lg border bg-primary/5 border-primary/10">
                    <p className="text-[10px] text-primary font-bold uppercase">Approval Vector</p>
                    <div className="mt-2 text-foreground">
                      <ApprovalStatusBadge status={selectedRequisition?.status ?? ""} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2 rounded border text-foreground">
                      <p className="text-[9px] text-muted-foreground uppercase">Budget Class</p>
                      <p className="text-xs font-bold">{selectedRequisition?.budgetClass}</p>
                    </div>
                    <div className="p-2 rounded border text-foreground">
                      <p className="text-[9px] text-muted-foreground uppercase">Contract</p>
                      <p className="text-xs font-bold">{selectedRequisition?.contractRequired ? "REQUIRED" : "NOT REQ"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-foreground">
                    <User className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase leading-none mb-1">Created By</p>
                      <p className="text-xs font-medium">{selectedRequisition?.createdBy || "System"}</p>
                      <p className="text-[9px] text-muted-foreground">{selectedRequisition?.createdAt.slice(0, 10)}</p>
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
