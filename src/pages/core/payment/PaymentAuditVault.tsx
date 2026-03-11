import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { useSession } from "@/core/security/session";
import { paymentService } from "@/core/services/payment/paymentService";
import type { PaymentAuditEvent, EvidencePack } from "@/core/types/payment/payment";

export default function PaymentAuditVault() {
  const session = useSession();
  const [events, setEvents] = useState<PaymentAuditEvent[]>([]);
  const [evidence, setEvidence] = useState<EvidencePack[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventsData, evidenceData] = await Promise.all([
          paymentService.listAuditEvents(session.tenantId, session),
          paymentService.listEvidencePacks(session.tenantId, session),
        ]);
        setEvents(eventsData);
        setEvidence(evidenceData);
      } catch (error) {
        console.error("Failed to fetch audit vault data:", error);
      }
    };
    fetchData();
  }, [session]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment Audit Vault"
        subtitle="Immutable execution events and regulator-safe evidence packs for every settled payment."
      />

      <WorkspacePanel title="Evidence Packs" description="Provider proof, approval signatures, payload snapshot, and checksum.">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3 text-left">Evidence ID</th>
              <th className="p-3 text-left">Payment</th>
              <th className="p-3 text-left">Provider Proof</th>
              <th className="p-3 text-left">Checksum</th>
              <th className="p-3 text-left">Signatures</th>
            </tr>
          </thead>
          <tbody>
            {evidence.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="p-3 font-medium">{item.id}</td>
                <td className="p-3 text-muted-foreground">{item.paymentId}</td>
                <td className="p-3 text-muted-foreground">{item.providerProof}</td>
                <td className="p-3 text-muted-foreground">{item.checksum}</td>
                <td className="p-3 text-muted-foreground">{item.approvalSignatures.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </WorkspacePanel>

      <WorkspacePanel title="Append-Only Audit Trail" description="Execution boundary events from request creation to settlement and dispute outcomes.">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3 text-left">Time</th>
              <th className="p-3 text-left">Action</th>
              <th className="p-3 text-left">Entity</th>
              <th className="p-3 text-left">Actor</th>
              <th className="p-3 text-left">Detail</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id} className="border-t">
                <td className="p-3 text-muted-foreground">{new Date(event.createdAt).toLocaleString()}</td>
                <td className="p-3"><Badge variant="outline">{event.action}</Badge></td>
                <td className="p-3 text-muted-foreground">{event.entityType}/{event.entityId}</td>
                <td className="p-3 text-muted-foreground">{event.actorId}</td>
                <td className="p-3 text-muted-foreground">{event.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </WorkspacePanel>
    </div>
  );
}

