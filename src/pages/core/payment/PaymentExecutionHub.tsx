import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { FeedbackAlert } from "@/core/tools/FeedbackAlert";
import { useSession } from "@/core/security/session";
import { paymentService } from "@/core/services/payment/paymentService";
import type { PaymentTransaction } from "@/core/types/payment/payment";

const TYPES: PaymentTransaction["type"][] = [
  "VENDOR_PAYOUT",
  "CUSTOMER_COLLECTION",
  "TREASURY_TRANSFER",
  "POS_PAYMENT",
  "PAYROLL_PAYOUT",
  "REFUND_PAYOUT",
];

const CHANNELS: PaymentTransaction["channel"][] = [
  "BANK_TRANSFER",
  "CARD_ONLINE",
  "CARD_POS",
  "WALLET",
  "QR",
];

export default function PaymentExecutionHub() {
  const session = useSession();
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<PaymentTransaction["type"]>("VENDOR_PAYOUT");
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("0");
  const [channel, setChannel] = useState<PaymentTransaction["channel"]>("BANK_TRANSFER");
  const [selectedTransaction, setSelectedTransaction] = useState<PaymentTransaction | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clearStatus = () => {
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const providers = paymentService.listProviders(session.tenantId);
  const [providerId, setProviderId] = useState(providers[0]?.id ?? "BANK_BCA");

  const transactions = useMemo(
    () => paymentService.listTransactions(session.tenantId),
    [refreshKey, session.tenantId],
  );
  const filtered = useMemo(
    () =>
      transactions.filter((item) =>
        search
          ? `${item.id} ${item.destination} ${item.type} ${item.status}`.toLowerCase().includes(search.toLowerCase())
          : true,
      ),
    [transactions, search],
  );

  const refresh = () => setRefreshKey((value) => value + 1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment Execution Hub"
        subtitle="Request, approve, route, execute, and settle all money movement with idempotent controls."
        secondaryActions={
          <Input
            className="min-w-[220px]"
            placeholder="Search execution queue"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        }
      />

      <FeedbackAlert message={statusMessage} error={errorMessage} onClear={clearStatus} />

      <WorkspacePanel title="Create Execution Request" description="All payment execution enters through this kernel boundary.">
        <div className="grid gap-3 md:grid-cols-5">
          <Select value={type} onValueChange={(value: PaymentTransaction["type"]) => setType(value)}>
            <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>{TYPES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
          </Select>
          <Input placeholder="Destination" value={destination} onChange={(event) => setDestination(event.target.value)} />
          <Input placeholder="Amount" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} />
          <Select value={channel} onValueChange={(value: PaymentTransaction["channel"]) => setChannel(value)}>
            <SelectTrigger><SelectValue placeholder="Channel" /></SelectTrigger>
            <SelectContent>{CHANNELS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
          </Select>
          <Button
            onClick={() => {
              if (!destination || Number(amount) <= 0) return;
              try {
                paymentService.createExecutionRequest(session.tenantId, session, {
                  type,
                  destination,
                  amount: Number(amount),
                  channel,
                  source: "Finance",
                });
                setStatusMessage(`Payment request to "${destination}" created.`);
                setDestination("");
                setAmount("0");
                refresh();
              } catch (err) {
                setErrorMessage("Failed to create execution request.");
              }
            }}
          >
            Create Request
          </Button>
        </div>
      </WorkspacePanel>

      <WorkspacePanel title="Execution Queue" description="Manual operator controls for approval, routing, execution, and settlement confirmation.">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3 text-left">ID</th>
              <th className="p-3 text-left">Type</th>
              <th className="p-3 text-left">Destination</th>
              <th className="p-3 text-left">Amount</th>
              <th className="p-3 text-left">Provider</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr
                key={item.id}
                className="cursor-pointer border-t hover:bg-muted/50"
                onClick={() => setSelectedTransaction(item)}
              >
                <td className="p-3 font-medium">{item.id}</td>
                <td className="p-3 text-muted-foreground">{item.type}</td>
                <td className="p-3 text-muted-foreground">{item.destination}</td>
                <td className="p-3 text-muted-foreground">{item.amount.toLocaleString()}</td>
                <td className="p-3">
                  {item.providerId ?? (
                    <Select value={providerId} onValueChange={(value) => setProviderId(value as typeof providerId)}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="Provider" /></SelectTrigger>
                      <SelectContent>
                        {providers.map((provider) => (
                          <SelectItem key={provider.id} value={provider.id}>
                            {provider.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </td>
                <td className="p-3"><Badge variant="outline">{item.status}</Badge></td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        try {
                          paymentService.approveRequest(session.tenantId, session, item.id);
                          setStatusMessage("Payment approved.");
                          refresh();
                        } catch (err) {
                          setErrorMessage("Approval failed.");
                        }
                      }}
                      disabled={item.status !== "APPROVAL_PENDING"}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        try {
                          paymentService.selectProvider(session.tenantId, session, item.id, providerId);
                          setStatusMessage(`Provider ${providerId} selected.`);
                          refresh();
                        } catch (err) {
                          setErrorMessage("Routing failed.");
                        }
                      }}
                      disabled={!["APPROVED", "PROVIDER_SELECTED"].includes(item.status)}
                    >
                      Route
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        try {
                          paymentService.executePayment(session.tenantId, session, item.id);
                          setStatusMessage("Execution batch submitted to gateway.");
                          refresh();
                        } catch (err) {
                          setErrorMessage("Execution failed.");
                        }
                      }}
                      disabled={!["APPROVED", "PROVIDER_SELECTED"].includes(item.status)}
                    >
                      Execute
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        try {
                          paymentService.confirmSettlement(session.tenantId, session, item.id);
                          setStatusMessage("Settlement confirmed and reconciled.");
                          refresh();
                        } catch (err) {
                          setErrorMessage("Settlement failed.");
                        }
                      }}
                      disabled={item.status !== "SETTLEMENT_PENDING"}
                    >
                      Settle
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        try {
                          paymentService.rejectRequest(session.tenantId, session, item.id, "Rejected from execution queue.");
                          setStatusMessage("Payment request rejected.");
                          refresh();
                        } catch (err) {
                          setErrorMessage("Rejection failed.");
                        }
                      }}
                      disabled={["SETTLED", "REJECTED"].includes(item.status)}
                    >
                      Reject
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </WorkspacePanel>
      <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Execution Request Detail</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 text-sm gap-y-2">
              <span className="text-muted-foreground">Internal ID:</span>
              <span className="font-mono text-xs">{selectedTransaction?.id}</span>
              <span className="text-muted-foreground">Type:</span>
              <span>{selectedTransaction?.type}</span>
              <span className="text-muted-foreground">Destination:</span>
              <span className="font-semibold">{selectedTransaction?.destination}</span>
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-bold">{selectedTransaction?.amount.toLocaleString()} {selectedTransaction?.currency}</span>
              <span className="text-muted-foreground">Channel:</span>
              <span>{selectedTransaction?.channel}</span>
              <span className="text-muted-foreground">Status:</span>
              <span><Badge variant="outline">{selectedTransaction?.status}</Badge></span>
              <span className="text-muted-foreground">Provider:</span>
              <span>{selectedTransaction?.providerId || "Not assigned"}</span>
            </div>
            <div className="border-t pt-2">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kernel Metadata</p>
              <div className="space-y-1 text-[10px] text-muted-foreground">
                <p>• Created on {selectedTransaction?.createdAt.slice(0, 10)}</p>
                <p>• Idempotency Key: {selectedTransaction?.id}</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

