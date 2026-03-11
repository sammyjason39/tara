import { useEffect, useMemo, useState } from "react";
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
import { CreditCard, Info, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { FeedbackAlert } from "@/core/tools/FeedbackAlert";
import { useSession } from "@/core/security/session";
import { paymentService } from "@/core/services/payment/paymentService";
import type { PaymentTransaction, PaymentProvider } from "@/core/types/payment/payment";

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
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);

  const clearStatus = () => {
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const [providerId, setProviderId] = useState(providers[0]?.id ?? "BANK_BCA");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [providersData, transactionsData] = await Promise.all([
          paymentService.listProviders(session.tenantId, session),
          paymentService.listTransactions(session.tenantId, session),
        ]);
        setProviders(providersData);
        setTransactions(transactionsData);
        if (providersData.length > 0 && !providerId) {
          setProviderId(providersData[0].id);
        }
      } catch (error) {
        console.error("Failed to fetch payment execution data:", error);
      }
    };
    fetchData();
  }, [refreshKey, providerId, session]);

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
        <DialogContent className="max-w-3xl p-0 overflow-hidden" aria-describedby="payment-detail-description">
          <DialogHeader className="sr-only">
            <DialogTitle>Execution Request Detail</DialogTitle>
          </DialogHeader>
          <div id="payment-detail-description" className="sr-only">View details of a payment transaction.</div>
          <div className="grid md:grid-cols-[1fr_2fr]">
            <div className="bg-muted p-6 flex flex-col justify-between">
              <div>
                <CreditCard className="w-8 h-8 text-primary mb-4" />
                <DialogTitle className="text-xl mb-2">Transaction Detail</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  View full execution context, idempotency details, and routing status.
                </p>
              </div>
              <div className="bg-primary/5 p-4 rounded-lg mt-8 border border-primary/10">
                <p className="text-xs text-primary font-medium flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Idempotent Record
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Guaranteed safe against double execution.
                </p>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 text-sm gap-y-3">
                  <span className="text-muted-foreground">Internal ID:</span>
                  <span className="font-mono text-xs truncate max-w-[150px]">{selectedTransaction?.id}</span>
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
                <div className="border-t pt-4 mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kernel Metadata</p>
                  <div className="space-y-2 text-xs text-muted-foreground bg-muted p-3 rounded-md font-mono">
                    <p>Created: {selectedTransaction?.createdAt.slice(0, 10)}</p>
                    <p>Idempotency Key: <span className="truncate max-w-[200px] inline-block align-bottom">{selectedTransaction?.id}</span></p>
                    <p>Source Entity: {selectedTransaction?.source}</p>
                  </div>
                </div>
                <div className="flex justify-end pt-4 mt-6 border-t">
                  <Button variant="outline" onClick={() => setSelectedTransaction(null)}>Close</Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

