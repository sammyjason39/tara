import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { useSession } from "@/core/security/session";
import { paymentService } from "@/core/services/payment/paymentService";
import type { PaymentDispute, PaymentTransaction, PaymentChargeback } from "@/core/types/payment/payment";

export default function DisputeCenter() {
  const session = useSession();
  const [refreshKey, setRefreshKey] = useState(0);
  const [paymentId, setPaymentId] = useState("");
  const [amount, setAmount] = useState("0");
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState("");
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [disputes, setDisputes] = useState<PaymentDispute[]>([]);
  const [chargebacks, setChargebacks] = useState<PaymentChargeback[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [transactionsData, disputesData, chargebacksData] = await Promise.all([
          paymentService.listTransactions(session.tenantId, session),
          paymentService.listDisputes(session.tenantId, session),
          paymentService.listChargebacks(session.tenantId, session),
        ]);
        setTransactions(transactionsData);
        setDisputes(disputesData);
        setChargebacks(chargebacksData);
      } catch (error) {
        console.error("Failed to fetch dispute data:", error);
      }
    };
    fetchData();
  }, [refreshKey, session]);

  const eligible = useMemo(() => transactions.filter((item) => item.status === "SETTLED"), [transactions]);

  const nextStatus = (status: PaymentDispute["status"]): PaymentDispute["status"] => {
    if (status === "OPENED") return "EVIDENCE_ATTACHED";
    if (status === "EVIDENCE_ATTACHED") return "FINANCE_REVIEW";
    if (status === "FINANCE_REVIEW") return "PROVIDER_SUBMITTED";
    return status;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Disputes and Chargebacks"
        subtitle="Evidence-first workflow: open dispute, attach proof, finance review, provider submission, and resolution."
      />

      <WorkspacePanel title="Open Dispute" description="Disputes require amount, reason, and linked payment.">
        <div className="grid gap-3 md:grid-cols-4">
          <Input placeholder="Settled payment ID" value={paymentId} onChange={(event) => setPaymentId(event.target.value)} />
          <Input placeholder="Amount" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} />
          <Input placeholder="Reason" value={reason} onChange={(event) => setReason(event.target.value)} />
          <Button
            onClick={() => {
              const selected = eligible.find((item) => item.id === paymentId);
              if (!selected || Number(amount) <= 0 || !reason) return;
              paymentService.openDispute(session.tenantId, session, {
                paymentId: selected.id,
                amount: Number(amount),
                reason,
              });
              setPaymentId("");
              setAmount("0");
              setReason("");
              setRefreshKey((value) => value + 1);
            }}
          >
            Open
          </Button>
        </div>
      </WorkspacePanel>

      <WorkspacePanel title="Dispute Workflow Queue" description="Move disputes through evidence, finance review, submission, and resolution.">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3 text-left">Dispute</th>
              <th className="p-3 text-left">Payment</th>
              <th className="p-3 text-left">Reason</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Evidence</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {disputes.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="p-3 font-medium">{item.id}</td>
                <td className="p-3 text-muted-foreground">{item.paymentId}</td>
                <td className="p-3 text-muted-foreground">{item.reason}</td>
                <td className="p-3"><Badge variant="outline">{item.status}</Badge></td>
                <td className="p-3 text-muted-foreground">{item.evidence.length}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    <Input
                      className="h-8 w-[180px]"
                      placeholder="Evidence ref"
                      value={evidence}
                      onChange={(event) => setEvidence(event.target.value)}
                    />
                    <Button size="sm" variant="outline" onClick={() => { if (!evidence) return; paymentService.attachDisputeEvidence(session.tenantId, session, item.id, evidence); setEvidence(""); setRefreshKey((value) => value + 1); }}>
                      Attach
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { const next = nextStatus(item.status); if (next === item.status) return; paymentService.progressDispute(session.tenantId, session, item.id, next); setRefreshKey((value) => value + 1); }} disabled={["PROVIDER_SUBMITTED", "RESOLVED", "REJECTED"].includes(item.status)}>
                      Next Stage
                    </Button>
                    <Button size="sm" onClick={() => { paymentService.resolveDispute(session.tenantId, session, item.id, "WON"); setRefreshKey((value) => value + 1); }} disabled={item.status !== "PROVIDER_SUBMITTED"}>
                      Resolve
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </WorkspacePanel>

      <WorkspacePanel title="Chargeback Ledger" description="Chargeback outcome records derived from dispute resolution.">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3 text-left">Chargeback</th>
              <th className="p-3 text-left">Dispute</th>
              <th className="p-3 text-left">Payment</th>
              <th className="p-3 text-left">Amount</th>
              <th className="p-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {chargebacks.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="p-3 font-medium">{item.id}</td>
                <td className="p-3 text-muted-foreground">{item.disputeId}</td>
                <td className="p-3 text-muted-foreground">{item.paymentId}</td>
                <td className="p-3 text-muted-foreground">{item.amount.toLocaleString()}</td>
                <td className="p-3"><Badge variant="outline">{item.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </WorkspacePanel>
    </div>
  );
}

