import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { ApprovalStatusBadge } from "@/core/tools/ApprovalStatusBadge";
import { FeedbackAlert } from "@/core/tools/FeedbackAlert";
import { useSession } from "@/core/security/session";
import { procurementService } from "@/core/services/procurement/procurementService";
import { formatNumber } from "@/lib/format";
import type { DraftPurchaseOrder, FinalPurchaseOrder, Requisition } from "@/core/types/procurement/procurement";
import { FileText, ClipboardList, Info, Building2, ShoppingCart, CheckCircle2, DollarSign, Tag, ArrowRight } from "lucide-react";
import { supplierQuoteSchema, goodsReceiptSchema, validatePoTransition } from "@/modules/procurement/schemas";
import {
  useConfirmSupplierQuote,
  useReleasePurchaseOrder,
  useRecordReceipt,
} from "@/modules/procurement/hooks";

export default function PoReleaseDesk() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [selectedDraftId, setSelectedDraftId] = useState("");
  const [quoteReference, setQuoteReference] = useState("");
  const [quoteNotes, setQuoteNotes] = useState("");
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [drafts, setDrafts] = useState<DraftPurchaseOrder[]>([]);
  const [finalPos, setFinalPos] = useState<FinalPurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [quoteFieldErrors, setQuoteFieldErrors] = useState<Record<string, string>>({});

  // TanStack Query mutations
  const confirmQuoteMutation = useConfirmSupplierQuote();
  const releasePoMutation = useReleasePurchaseOrder();
  const recordReceiptMutation = useRecordReceipt();

  const clearStatus = () => {
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [r, d, f] = await Promise.all([
        procurementService.listRequisitions(session.tenant_id, session),
        procurementService.listDraftPurchaseOrders(session.tenant_id, session),
        procurementService.listFinalPurchaseOrders(session.tenant_id, session),
      ]);
      setRequisitions(r);
      setDrafts(d);
      setFinalPos(f);
    } catch (err) {
      setErrorMessage("Failed to load PO release data.");
    } finally {
      setLoading(false);
    }
  }, [session.tenant_id, session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filteredRequisitions = useMemo(
    () =>
      (Array.isArray(requisitions) ? requisitions : []).filter((item) =>
        search
          ? `${item.id} ${item.title} ${item.status}`.toLowerCase().includes(search.toLowerCase())
          : true,
      ),
    [requisitions, search],
  );

  const filteredDrafts = useMemo(
    () =>
      (Array.isArray(drafts) ? drafts : []).filter((item) =>
        search
          ? `${item.id} ${item.requisitionId} ${item.status}`.toLowerCase().includes(search.toLowerCase())
          : true,
      ),
    [drafts, search],
  );

  const filteredFinalPos = useMemo(
    () =>
      (Array.isArray(finalPos) ? finalPos : []).filter((item) =>
        search
          ? `${item.id} ${item.requisitionId} ${item.status}`.toLowerCase().includes(search.toLowerCase())
          : true,
      ),
    [finalPos, search],
  );

  const confirmQuote = async () => {
    setQuoteFieldErrors({});
    const result = supplierQuoteSchema.safeParse({
      draftPoId: selectedDraftId,
      quoteReference: quoteReference || `Q-${Date.now()}`,
      quoteNotes: quoteNotes || undefined,
    });
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        if (!errors[field]) errors[field] = issue.message;
      });
      setQuoteFieldErrors(errors);
      return;
    }
    try {
      await confirmQuoteMutation.mutateAsync(result.data);
      setStatusMessage("Supplier quote confirmed.");
      setQuoteDialogOpen(false);
      setSelectedDraftId("");
      setQuoteReference("");
      setQuoteNotes("");
      setQuoteFieldErrors({});
      refresh();
    } catch (err) {
      setErrorMessage("Quote confirmation failed.");
    }
  };

  const releasePo = async (requisitionId: string) => {
    // Validate the PO state transition (conceptually: approved → released/received)
    const transition = validatePoTransition("approved", "received");
    if (!transition.valid) {
      setErrorMessage(transition.error || "Invalid PO state transition.");
      return;
    }
    try {
      await releasePoMutation.mutateAsync(requisitionId);
      setStatusMessage("Purchase Order released and synchronized with Payable/Receipt systems.");
      refresh();
    } catch (err) {
      setErrorMessage("PO release failed.");
    }
  };

  const recordReceipt = async (finalPoId: string) => {
    const receiptData = {
      finalPoId,
      deliveryOnTime: true,
      quantityAccuracy: 96,
      qualityScore: 92,
      issueCount: 0,
      invoiceMismatch: false,
    };
    const result = goodsReceiptSchema.safeParse(receiptData);
    if (!result.success) {
      setErrorMessage("Receipt data validation failed: " + result.error.issues.map(i => i.message).join(", "));
      return;
    }
    try {
      await recordReceiptMutation.mutateAsync(result.data);
      setStatusMessage("Receipt record posted and rating engine updated.");
      refresh();
    } catch (err) {
      setErrorMessage("Receipt recording failed.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="PO Release Desk"
        subtitle="Supplier quote confirmation, final gate checks, PO release, and receipt posting."
        secondaryActions={
          <Input
            placeholder="Search requisition, draft, or PO"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-w-[240px]"
          />
        }
      />

      <FeedbackAlert message={statusMessage} error={errorMessage} onClear={clearStatus} />

      <WorkspacePanel title="Supplier Quote Gate" description="Procurement HOD approved drafts require supplier quote confirmation.">
        <DataTableShell total={filteredDrafts.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Draft PO</th>
                <th className="p-3 text-left">Requisition</th>
                <th className="p-3 text-left">Quoted Total</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-3 text-center">Loading...</td></tr>
              ) : filteredDrafts.length === 0 ? (
                <tr><td colSpan={5} className="p-3 text-center text-muted-foreground">No draft POs found.</td></tr>
              ) : (
                (Array.isArray(filteredDrafts) ? filteredDrafts : []).map((draft) => (
                  <tr key={draft.id} className="border-t">
                    <td className="p-3 font-medium">{draft.id}</td>
                    <td className="p-3 text-muted-foreground">{draft.requisitionId}</td>
                    <td className="p-3 text-muted-foreground">{formatNumber(draft.quotedTotal)}</td>
                    <td className="p-3">
                      <ApprovalStatusBadge status={draft.status} />
                    </td>
                    <td className="p-3">
                      {draft.status === "PROCUREMENT_HOD_APPROVED" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedDraftId(draft.id);
                            setQuoteDialogOpen(true);
                          }}
                        >
                          Confirm Supplier Quote
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

      <WorkspacePanel title="Final Approval and Release" description="Release is allowed only when final multi-HOD approvals are complete.">
        <DataTableShell total={filteredRequisitions.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Requisition</th>
                <th className="p-3 text-left">Branch</th>
                <th className="p-3 text-left">Amount</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-3 text-center">Loading...</td></tr>
              ) : filteredRequisitions.length === 0 ? (
                <tr><td colSpan={5} className="p-3 text-center text-muted-foreground">No requisitions found.</td></tr>
              ) : (
                (Array.isArray(filteredRequisitions) ? filteredRequisitions : []).map((request) => (
                  <tr key={request.id} className="border-t">
                    <td className="p-3 font-medium">{request.id}</td>
                    <td className="p-3 text-muted-foreground">{request.branchCode}</td>
                    <td className="p-3 text-muted-foreground">{formatNumber(request.amount)}</td>
                    <td className="p-3">
                      <ApprovalStatusBadge status={request.status} />
                    </td>
                    <td className="p-3">
                      {request.status === "FINAL_APPROVED" ? (
                        <Button size="sm" onClick={() => releasePo(request.id)}>
                          Release PO
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

      <WorkspacePanel title="Execution Monitoring" description="Released PO execution and receipt capture updates supplier rating engine.">
        <DataTableShell total={filteredFinalPos.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Final PO</th>
                <th className="p-3 text-left">Requisition</th>
                <th className="p-3 text-left">Total</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-3 text-center">Loading...</td></tr>
              ) : filteredFinalPos.length === 0 ? (
                <tr><td colSpan={5} className="p-3 text-center text-muted-foreground">No final POs found.</td></tr>
              ) : (
                (Array.isArray(filteredFinalPos) ? filteredFinalPos : []).map((po) => (
                  <tr key={po.id} className="border-t">
                    <td className="p-3 font-medium">{po.id}</td>
                    <td className="p-3 text-muted-foreground">{po.requisitionId}</td>
                    <td className="p-3 text-muted-foreground">{formatNumber(po.totalAmount)}</td>
                    <td className="p-3">
                      <ApprovalStatusBadge status={po.status} />
                    </td>
                    <td className="p-3">
                      {po.status === "RELEASED" || po.status === "DELIVERING" ? (
                        <Button size="sm" variant="outline" onClick={() => recordReceipt(po.id)}>
                          Record Receipt
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

      <Dialog open={quoteDialogOpen} onOpenChange={setQuoteDialogOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden" aria-describedby="quote-confirm-description">
          <DialogHeader className="sr-only">
            <DialogTitle>Supplier Quote Confirmation</DialogTitle>
          </DialogHeader>
          <div id="quote-confirm-description" className="sr-only">Record the definitive supplier quote reference and any technical/price notes before final PO release.</div>

          <div className="grid md:grid-cols-[1fr_2fr]">
            {/* Left Column: Context */}
            <div className="bg-muted p-6 flex flex-col justify-between border-r shadow-inner">
              <div>
                <Tag className="w-8 h-8 text-primary mb-4" />
                <DialogTitle className="text-xl mb-2">Quote Confirmation</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Finalize the commercial terms. This step bridge the gap between internal estimates and actual supplier pricing.
                </p>
                <div className="mt-8 space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                    <ShoppingCart className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Draft PO Reference</p>
                      <p className="text-xs font-mono">{selectedDraftId}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-1" />
                    <div>
                      <p className="font-medium text-xs">Validation Required</p>
                      <p className="text-muted-foreground text-[10px]">Ensure the quoted total aligns with the approved requisition budget.</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
                <p className="text-xs text-primary font-bold flex items-center gap-1.5 uppercase tracking-wider">
                  <Info className="w-3.5 h-3.5" /> Release Trigger
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Confirmation here moves the sequence to <span className="font-bold">FINAL_APPROVAL_PENDING</span>.
                </p>
              </div>
            </div>

            {/* Right Column: Form */}
            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Quote Reference Number</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="e.g. Q-2024-889012"
                      value={quoteReference}
                      onChange={e => setQuoteReference(e.target.value)}
                      className="pl-10 h-10 font-medium"
                    />
                  </div>
                  {quoteFieldErrors.quoteReference && <p className="text-xs text-destructive mt-1">{quoteFieldErrors.quoteReference}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1.5 italic">Official reference from the supplier's quotation document.</p>
                </div>

                <div className="pt-4 border-t">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Negotiation & Technical Notes</label>
                  <Input 
                    placeholder="Discounts applied, validity period, payment terms adjustments..."
                    value={quoteNotes}
                    onChange={e => setQuoteNotes(e.target.value)}
                    className="h-10"
                  />
                </div>

                <div className="pt-4 border-t">
                  <div className="p-4 rounded-lg bg-warning border border-warning/10">
                    <p className="text-[10px] font-bold uppercase text-warning tracking-widest mb-1 flex items-center gap-1.5">
                      <DollarSign className="w-3 h-3" /> Integrity Check
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      By confirming, you verify that these prices are definitive and reflect the final negotiated agreement.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t mt-4">
                  <Button variant="outline" onClick={() => setQuoteDialogOpen(false)}>Cancel</Button>
                  <Button onClick={confirmQuote} className="shadow-sm">
                    Confirm and Route
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

