import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import type { ContractRecord, Requisition, SupplierMaster } from "@/core/types/procurement/procurement";
import { FileText, ShieldCheck, Signature, ClipboardList, Info, Building2, User } from "lucide-react";
import { contractPacketSchema } from "@/modules/procurement/schemas";
import {
  useUpsertContract,
  useApproveLegalContract,
  useSignContract,
} from "@/modules/procurement/hooks";

export default function ContractDesk() {
  const navigate = useNavigate();
  const session = useSession();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [requisitionId, setRequisitionId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [contractFieldErrors, setContractFieldErrors] = useState<Record<string, string>>({});

  // TanStack Query mutations
  const upsertContractMutation = useUpsertContract();
  const approveLegalMutation = useApproveLegalContract();
  const signContractMutation = useSignContract();

  const clearStatus = () => {
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [c, r, s] = await Promise.all([
        procurementService.listContracts(session.tenant_id, session),
        procurementService.listRequisitions(session.tenant_id, session),
        procurementService.listSupplierMasters(session.tenant_id, session),
      ]);
      setContracts(c);
      setRequisitions(r);
      setSuppliers(s);
    } catch (err) {
      setErrorMessage("Failed to load contract data.");
    } finally {
      setLoading(false);
    }
  }, [session.tenant_id, session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filteredContracts = useMemo(
    () =>
      (Array.isArray(contracts) ? contracts : []).filter((item) =>
        search
          ? `${item.id} ${item.requisitionId} ${item.supplierId}`
              .toLowerCase()
              .includes(search.toLowerCase())
          : true,
      ),
    [contracts, search],
  );

  const upsertContract = async () => {
    setContractFieldErrors({});
    const result = contractPacketSchema.safeParse({
      requisitionId,
      supplierId,
      notes: notes || undefined,
      attachmentIds: [],
    });
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        if (!errors[field]) errors[field] = issue.message;
      });
      setContractFieldErrors(errors);
      return;
    }
    try {
      await upsertContractMutation.mutateAsync(result.data);
      setStatusMessage("Contract packet created or updated successfully.");
      setDialogOpen(false);
      setRequisitionId("");
      setSupplierId("");
      setNotes("");
      setContractFieldErrors({});
      refresh();
    } catch (err) {
      setErrorMessage("Failed to save contract packet.");
    }
  };

  const approveLegal = async (contractId: string) => {
    try {
      await approveLegalMutation.mutateAsync(contractId);
      setStatusMessage("Legal approval recorded.");
      refresh();
    } catch (err) {
      setErrorMessage("Legal approval failed.");
    }
  };

  const sign = async (contractId: string, party: "SUPPLIER" | "PROCUREMENT_HOD" | "FINANCE_HOD") => {
    try {
      await signContractMutation.mutateAsync({ contractId, party });
      setStatusMessage(`Contract signed by ${party}.`);
      refresh();
    } catch (err) {
      setErrorMessage(`Signature by ${party} failed.`);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contract Desk"
        subtitle="Legal collaboration, signature control, and procurement contract governance."
        primaryAction={<Button onClick={() => setDialogOpen(true)}>Create Contract Packet</Button>}
        secondaryActions={
          <Input
            placeholder="Search contracts"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-w-[220px]"
          />
        }
      />

      <FeedbackAlert message={statusMessage} error={errorMessage} onClear={clearStatus} />

      <WorkspacePanel title="Contract Governance" description="Track legal review and mandatory signatures before PO release.">
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <DataTableShell total={filteredContracts.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Contract</th>
                <th className="p-3 text-left">Requisition</th>
                <th className="p-3 text-left">Supplier</th>
                <th className="p-3 text-left">Version</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-3 text-center">Loading...</td></tr>
              ) : filteredContracts.length === 0 ? (
                <tr><td colSpan={6} className="p-3 text-center text-muted-foreground">No contracts found.</td></tr>
              ) : (
                (Array.isArray(filteredContracts) ? filteredContracts : []).map((contract) => (
                  <tr key={contract.id} className="border-t">
                    <td className="p-3 font-medium">{contract.id}</td>
                    <td className="p-3 text-muted-foreground">{contract.requisitionId}</td>
                    <td className="p-3 text-muted-foreground">{contract.supplierId}</td>
                    <td className="p-3 text-muted-foreground">v{contract.version}</td>
                    <td className="p-3">
                      <ApprovalStatusBadge status={contract.status} />
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        {contract.status === "LEGAL_REVIEW" ? (
                          <Button size="sm" variant="outline" onClick={() => approveLegal(contract.id)}>
                            Approve Legal
                          </Button>
                        ) : null}
                        {contract.status === "LEGAL_APPROVED" || contract.status === "PARTIAL_SIGNED" ? (
                          <>
                            {!contract.signedBySupplier ? (
                              <Button size="sm" variant="outline" onClick={() => sign(contract.id, "SUPPLIER")}>
                                Supplier Sign
                              </Button>
                            ) : null}
                            {!contract.signedByProcurementHod ? (
                              <Button size="sm" variant="outline" onClick={() => sign(contract.id, "PROCUREMENT_HOD")}>
                                Procurement HOD Sign
                              </Button>
                            ) : null}
                            {!contract.signedByFinanceHod ? (
                              <Button size="sm" variant="outline" onClick={() => sign(contract.id, "FINANCE_HOD")}>
                                Finance HOD Sign
                              </Button>
                            ) : null}
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

      <WorkspacePanel title="Signature Completeness" description="Mandatory signatures: Supplier + Procurement HOD + Finance HOD.">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Legal Approved</p>
            <p className="text-lg font-semibold">
              {(Array.isArray(contracts) ? contracts : []).filter((item) => item.status === "LEGAL_APPROVED" || item.status === "SIGNED" || item.status === "PARTIAL_SIGNED").length}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Signed</p>
            <p className="text-lg font-semibold">{(Array.isArray(contracts) ? contracts : []).filter((item) => item.status === "SIGNED").length}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Pending Legal Review</p>
            <p className="text-lg font-semibold">{(Array.isArray(contracts) ? contracts : []).filter((item) => item.status === "LEGAL_REVIEW").length}</p>
          </div>
        </div>
      </WorkspacePanel>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden" aria-describedby="contract-create-description">
          <DialogHeader className="sr-only">
            <DialogTitle>Create or Update Contract Packet</DialogTitle>
          </DialogHeader>
          <div id="contract-create-description" className="sr-only">Initialize or modify a legal packet. This packet must be approved by Legal before any party can sign.</div>

          <div className="grid md:grid-cols-[1fr_2fr]">
            {/* Left Column: Context & Governance */}
            <div className="bg-muted p-6 flex flex-col justify-between border-r shadow-inner">
              <div>
                <ShieldCheck className="w-8 h-8 text-primary mb-4" />
                <DialogTitle className="text-xl mb-2">Contract Packet</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Secure the legal foundation of this procurement. Packets require mandatory Legal Review followed by tri-party signatures.
                </p>
                
                <div className="mt-8 space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-background rounded-lg border border-primary/10 shadow-sm transition-all hover:bg-primary/5">
                    <Building2 className="w-4 h-4 text-primary mt-0.5" />
                    <div>
                      <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Target Entity</p>
                      <p className="text-xs font-semibold">{suppliers.find(s => s.id === supplierId)?.name || 'Pending Selection'}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">Required Signers</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <Badge variant="outline" className="text-[8px] px-1.5 py-0 bg-background border-dashed opacity-50">Supplier Representative</Badge>
                      <Badge variant="outline" className="text-[8px] px-1.5 py-0 bg-background border-dashed opacity-50">Procurement HOD</Badge>
                      <Badge variant="outline" className="text-[8px] px-1.5 py-0 bg-background border-dashed opacity-50">Finance HOD</Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
                <p className="text-xs text-primary font-bold flex items-center gap-1.5 uppercase tracking-wider">
                  <Info className="w-3.5 h-3.5" /> Compliance Mode
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Once created, the status reverts to <span className="text-warning font-bold">LEGAL_REVIEW</span>. Versioning is automatic.
                </p>
              </div>
            </div>

            {/* Right Column: Identification & Terms */}
            <div className="p-6">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block tracking-wider">Source Requisition</label>
                    <Select value={requisitionId} onValueChange={setRequisitionId}>
                      <SelectTrigger className="h-10 text-foreground transition-all focus:ring-1 focus:ring-primary/20">
                        <SelectValue placeholder="Select REQ ID" />
                      </SelectTrigger>
                      <SelectContent>
                        {(Array.isArray(requisitions) ? requisitions : []).map(r => (
                          <SelectItem key={r.id} value={r.id}>{r.id} - {r.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block tracking-wider">Selected Supplier</label>
                    <Select value={supplierId} onValueChange={setSupplierId}>
                      <SelectTrigger className="h-10 text-foreground transition-all focus:ring-1 focus:ring-primary/20">
                        <SelectValue placeholder="Select Supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {(Array.isArray(suppliers) ? suppliers : []).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-primary" />
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground tracking-wider">Legal Terms & Addenda</label>
                  </div>
                  <Textarea 
                    placeholder="Describe specific terms (Validty, SLA, Payment terms, etc.)..."
                    className="min-h-[160px] resize-none text-sm p-4 bg-muted/20 focus:bg-background transition-colors"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                  <div className="flex gap-4 pt-2">
                    <div 
                      onClick={() => navigate("/core/finance/docs")}
                      className="flex-1 p-2 rounded border border-dashed text-center text-[10px] text-muted-foreground hover:bg-muted/50 cursor-pointer transition-all"
                    >
                      + Access Document Vault
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t mt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)} className="hover:bg-muted">Cancel</Button>
                  <Button onClick={upsertContract} className="shadow-sm">
                    <Signature className="w-4 h-4 mr-2" />
                    {contracts.some(c => c.requisitionId === requisitionId) ? 'Update Packet' : 'Initialize Packet'}
                  </Button>
                </div>
                {(contractFieldErrors.requisitionId || contractFieldErrors.supplierId) && (
                  <div className="space-y-1 pt-2">
                    {contractFieldErrors.requisitionId && <p className="text-xs text-destructive">{contractFieldErrors.requisitionId}</p>}
                    {contractFieldErrors.supplierId && <p className="text-xs text-destructive">{contractFieldErrors.supplierId}</p>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

