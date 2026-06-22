import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { FeedbackAlert } from "@/core/tools/FeedbackAlert";
import { useSession } from "@/core/security/session";
import { procurementService } from "@/core/services/procurement/procurementService";
import { formatDateTime } from "@/lib/format";
import type { SupplierPortalMessage, SupplierMaster, SupplierBranch } from "@/core/types/procurement/procurement";
import { MessageSquare, Send, Paperclip, Building2, Info, ArrowUpRight, ArrowDownLeft, ShieldCheck, Mail } from "lucide-react";
import { portalMessageSchema } from "@/modules/procurement/schemas";
import { useCreatePortalMessage } from "@/modules/procurement/hooks";

export default function SupplierPortalDesk() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [supplierBranchId, setSupplierBranchId] = useState("");
  const [type, setType] = useState<SupplierPortalMessage["type"]>("GENERAL");
  const [direction, setDirection] = useState<SupplierPortalMessage["direction"]>("OUTBOUND");
  const [content, setContent] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [messages, setMessages] = useState<SupplierPortalMessage[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierMaster[]>([]);
  const [branches, setBranches] = useState<SupplierBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [portalFieldErrors, setPortalFieldErrors] = useState<Record<string, string>>({});

  // TanStack Query mutation
  const createPortalMessageMutation = useCreatePortalMessage();

  const clearStatus = () => {
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [msg, sup, br] = await Promise.all([
        procurementService.listPortalMessages(session.tenant_id, session),
        procurementService.listSupplierMasters(session.tenant_id, session),
        procurementService.listSupplierBranches(session.tenant_id, session),
      ]);
      setMessages(msg);
      setSuppliers(sup);
      setBranches(br);
    } catch (err) {
      setErrorMessage("Failed to load portal data.");
    } finally {
      setLoading(false);
    }
  }, [session.tenant_id, session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(
    () =>
      (Array.isArray(messages) ? messages : []).filter((item) =>
        search
          ? `${item.type} ${item.content} ${item.supplierId}`.toLowerCase().includes(search.toLowerCase())
          : true,
      ),
    [messages, search],
  );

  const createMessage = async () => {
    setPortalFieldErrors({});
    const result = portalMessageSchema.safeParse({
      supplierId,
      supplierBranchId,
      direction,
      type,
      content,
      attachmentName: attachmentName || undefined,
    });
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        if (!errors[field]) errors[field] = issue.message;
      });
      setPortalFieldErrors(errors);
      return;
    }
    try {
      await createPortalMessageMutation.mutateAsync(result.data);
      setStatusMessage("Portal message sent to supplier.");
      setDialogOpen(false);
      setContent("");
      setAttachmentName("");
      setPortalFieldErrors({});
      refresh();
    } catch (err) {
      setErrorMessage("Failed to send portal message.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplier Portal"
        subtitle="Bi-directional supplier communication for quote, invoice, proof, and dispute exchange."
        primaryAction={<Button onClick={() => setDialogOpen(true)}>Create Portal Message</Button>}
        secondaryActions={
          <Input
            placeholder="Search portal messages"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-w-[220px]"
          />
        }
      />

      <FeedbackAlert message={statusMessage} error={errorMessage} onClear={clearStatus} />

      <WorkspacePanel title="Portal Inbox" description="Auditable supplier interaction timeline.">
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <DataTableShell total={filtered.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Timestamp</th>
                <th className="p-3 text-left">Supplier</th>
                <th className="p-3 text-left">Branch</th>
                <th className="p-3 text-left">Direction</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Content</th>
                <th className="p-3 text-left">Attachment</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-3 text-center italic">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="p-3 text-center text-muted-foreground">No portal messages found.</td></tr>
              ) : (
                (Array.isArray(filtered) ? filtered : []).map((message) => (
                  <tr key={message.id} className="border-t">
                    <td className="p-3 text-muted-foreground">{formatDateTime(message.createdAt)}</td>
                    <td className="p-3 text-muted-foreground">{message.supplierId}</td>
                    <td className="p-3 text-muted-foreground">{message.supplierBranchId}</td>
                    <td className="p-3 text-muted-foreground">{message.direction}</td>
                    <td className="p-3 text-muted-foreground">{message.type}</td>
                    <td className="p-3">{message.content}</td>
                    <td className="p-3 text-muted-foreground">{message.attachmentName ?? "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden" aria-describedby="portal-msg-description">
          <DialogHeader className="sr-only">
            <DialogTitle>Create Supplier Portal Message</DialogTitle>
          </DialogHeader>
          <div id="portal-msg-description" className="sr-only">Exchange documentation or general messages with a supplier branch. All interactions are logged for audit.</div>

          <div className="grid md:grid-cols-[1fr_2fr]">
            {/* Left Column: Context */}
            <div className="bg-muted p-6 flex flex-col justify-between border-r shadow-inner">
              <div>
                <MessageSquare className="w-8 h-8 text-primary mb-4" />
                <DialogTitle className="text-xl mb-2">Portal Message</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Secure communication line for document exchange and general collaboration. Every interaction is time-stamped and auditable.
                </p>
                <div className="mt-8 space-y-4">
                  <div className="flex items-start gap-3 text-sm">
                    <ShieldCheck className="w-4 h-4 text-primary mt-1" />
                    <div>
                      <p className="font-medium">Governance Logging</p>
                      <p className="text-muted-foreground text-[10px]">Messages cannot be deleted or modified once sent to ensure audit integrity.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 text-sm">
                    <Paperclip className="w-4 h-4 text-primary mt-1" />
                    <div>
                      <p className="font-medium">Evidence Capture</p>
                      <p className="text-muted-foreground text-[10px]">Upload proof of delivery or invoice scans directly to the portal.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
                <p className="text-xs text-primary font-bold flex items-center gap-1.5 uppercase tracking-wider">
                  <Info className="w-3.5 h-3.5" /> Portal Status
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Outbound messages are immediately visible to the supplier representative.
                </p>
              </div>
            </div>

            {/* Right Column: Message Form */}
            <div className="p-6">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Target Supplier</label>
                    <Select value={supplierId} onValueChange={setSupplierId}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select Master" />
                      </SelectTrigger>
                      <SelectContent>
                        {(Array.isArray(suppliers) ? suppliers : []).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Branch/Contact</label>
                    <Select value={supplierBranchId} onValueChange={setSupplierBranchId}>
                      <SelectTrigger className="h-10">
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

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Direction</label>
                    <Select value={direction} onValueChange={v => setDirection(v as any)}>
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OUTBOUND"><div className="flex items-center gap-2"><ArrowUpRight className="w-3 h-3 text-primary" />Office → Supplier</div></SelectItem>
                        <SelectItem value="INBOUND"><div className="flex items-center gap-2"><ArrowDownLeft className="w-3 h-3 text-warning" />Supplier → Office</div></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Communication Category</label>
                    <Select value={type} onValueChange={v => setType(v as any)}>
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="QUOTE">Quote Exchange</SelectItem>
                        <SelectItem value="INVOICE">Invoice Submission</SelectItem>
                        <SelectItem value="DELIVERY_PROOF">Proof of Delivery</SelectItem>
                        <SelectItem value="DISPUTE">Governance Dispute</SelectItem>
                        <SelectItem value="GENERAL">General Inquiry</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Message Content</label>
                  <Textarea 
                    placeholder="Enter message body or interaction summary..."
                    className="min-h-[120px] resize-none"
                    value={content}
                    onChange={e => setContent(e.target.value)}
                  />
                </div>

                <div className="pt-4 border-t">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Attachment Metadata</label>
                  <div className="relative">
                    <Paperclip className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="e.g. quote-v1.pdf, signed-invoice.png"
                      className="pl-10"
                      value={attachmentName}
                      onChange={e => setAttachmentName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t mt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={createMessage}>
                    <Send className="w-4 h-4 mr-2" />
                    Dispatch Message
                  </Button>
                </div>
                {Object.keys(portalFieldErrors).length > 0 && (
                  <div className="space-y-1 pt-2">
                    {Object.entries(portalFieldErrors).map(([field, msg]) => (
                      <p key={field} className="text-xs text-destructive">{msg}</p>
                    ))}
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
