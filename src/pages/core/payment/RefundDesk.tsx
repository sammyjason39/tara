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
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { useSession } from "@/core/security/session";
import { paymentService } from "@/core/services/payment/paymentService";
import type { PaymentRefund, PaymentTransaction } from "@/core/types/payment/payment";

const REFUND_TYPES: PaymentRefund["type"][] = ["FULL", "PARTIAL", "SCHEDULED"];

export default function RefundDesk() {
  const session = useSession();
  const [refreshKey, setRefreshKey] = useState(0);
  const [paymentId, setPaymentId] = useState("");
  const [amount, setAmount] = useState("0");
  const [reason, setReason] = useState("");
  const [type, setType] = useState<PaymentRefund["type"]>("PARTIAL");
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [refunds, setRefunds] = useState<PaymentRefund[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [transactionsData, refundsData] = await Promise.all([
          paymentService.listTransactions(session.tenantId, session),
          paymentService.listRefunds(session.tenantId, session),
        ]);
        setTransactions(transactionsData);
        setRefunds(refundsData);
      } catch (error) {
        console.error("Failed to fetch refund data:", error);
      }
    };
    fetchData();
  }, [refreshKey, session]);

  const settledPayments = useMemo(() => transactions.filter((item) => item.status === "SETTLED"), [transactions]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Refund Engine"
        subtitle="Governed full, partial, and scheduled refunds with approval and settlement traceability."
      />

      <WorkspacePanel title="Create Refund Request" description="Refunds are financial control events requiring approval before execution.">
        <div className="grid gap-3 md:grid-cols-5">
          <Select value={paymentId} onValueChange={setPaymentId}>
            <SelectTrigger><SelectValue placeholder="Settled payment" /></SelectTrigger>
            <SelectContent>
              {settledPayments.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.id} - {item.destination}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={(value: PaymentRefund["type"]) => setType(value)}>
            <SelectTrigger><SelectValue placeholder="Refund type" /></SelectTrigger>
            <SelectContent>{REFUND_TYPES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
          </Select>
          <Input placeholder="Amount" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} />
          <Input placeholder="Reason" value={reason} onChange={(event) => setReason(event.target.value)} />
          <Button
            onClick={() => {
              if (!paymentId || !reason || Number(amount) <= 0) return;
              paymentService.createRefund(session.tenantId, session, {
                paymentId,
                type,
                amount: Number(amount),
                reason,
              });
              setPaymentId("");
              setReason("");
              setAmount("0");
              setRefreshKey((value) => value + 1);
            }}
          >
            Request Refund
          </Button>
        </div>
      </WorkspacePanel>

      <WorkspacePanel title="Refund Queue" description="Refund lifecycle from request to settlement.">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3 text-left">Refund</th>
              <th className="p-3 text-left">Payment</th>
              <th className="p-3 text-left">Type</th>
              <th className="p-3 text-left">Amount</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {refunds.map((refund) => (
              <tr key={refund.id} className="border-t">
                <td className="p-3 font-medium">{refund.id}</td>
                <td className="p-3 text-muted-foreground">{refund.paymentId}</td>
                <td className="p-3 text-muted-foreground">{refund.type}</td>
                <td className="p-3 text-muted-foreground">{refund.amount.toLocaleString()}</td>
                <td className="p-3"><Badge variant="outline">{refund.status}</Badge></td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => { paymentService.approveRefund(session.tenantId, session, refund.id); setRefreshKey((value) => value + 1); }} disabled={refund.status !== "REQUESTED"}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { paymentService.executeRefund(session.tenantId, session, refund.id); setRefreshKey((value) => value + 1); }} disabled={refund.status !== "APPROVED"}>
                      Execute
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </WorkspacePanel>
    </div>
  );
}

