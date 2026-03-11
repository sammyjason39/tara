import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { ApprovalStatusBadge } from "@/core/tools/ApprovalStatusBadge";
import { FeedbackAlert } from "@/core/tools/FeedbackAlert";
import { useSession } from "@/core/security/session";
import { procurementService } from "@/core/services/procurement/procurementService";
import type {
  GoodsReceiptSyncRecord,
  LegalContractHandoff,
  ProcurementAuditEvent,
  RiskSignal,
  SupplierAccessProvisioning,
} from "@/core/types/procurement/procurement";

const hoursSince = (timestamp: string) =>
  Math.max(0, (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60));

const formatAge = (hours: number) => {
  if (hours < 1) return "<1h";
  if (hours < 24) return `${Math.floor(hours)}h`;
  return `${Math.floor(hours / 24)}d`;
};

const isLegalSlaBreached = (handoff: LegalContractHandoff) =>
  handoff.status !== "CONTRACT_ACCEPTED" && hoursSince(handoff.createdAt) > 8;

const isInventorySlaBreached = (sync: GoodsReceiptSyncRecord) =>
  sync.status === "PENDING_RECEIPT" && hoursSince(sync.createdAt) > 24;

const isProvisioningSlaBreached = (request: SupplierAccessProvisioning) =>
  request.status === "REQUESTED" && hoursSince(request.createdAt) > 4;

export default function ProcurementRiskCenter() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [signals, setSignals] = useState<RiskSignal[]>([]);
  const [auditEvents, setAuditEvents] = useState<ProcurementAuditEvent[]>([]);
  const [legalHandoffs, setLegalHandoffs] = useState<LegalContractHandoff[]>([]);
  const [goodsReceiptSyncs, setGoodsReceiptSyncs] = useState<GoodsReceiptSyncRecord[]>([]);
  const [supplierAccess, setSupplierAccess] = useState<SupplierAccessProvisioning[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clearStatus = () => {
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [sig, aud, leg, goods, sup] = await Promise.all([
        procurementService.listRiskSignals(session.tenantId, session),
        procurementService.listAuditEvents(session.tenantId, session),
        procurementService.listLegalHandoffs(session.tenantId, session),
        procurementService.listGoodsReceiptSyncs(session.tenantId, session),
        procurementService.listSupplierAccessProvisioning(session.tenantId, session),
      ]);
      setSignals(sig);
      setAuditEvents(aud);
      setLegalHandoffs(leg);
      setGoodsReceiptSyncs(goods);
      setSupplierAccess(sup);
    } catch (err) {
      setErrorMessage("Failed to load risk and compliance data.");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(
    () =>
      signals.filter((item) =>
        search
          ? `${item.code} ${item.detail} ${item.entityId}`
              .toLowerCase()
              .includes(search.toLowerCase())
          : true,
      ),
    [signals, search],
  );

  const handoffRows = useMemo(() => {
    const legalRows = legalHandoffs
      .filter((item) => item.status !== "CONTRACT_ACCEPTED")
      .map((item) => {
        const ageHours = hoursSince(item.createdAt);
        return {
          id: item.id,
          workspace: "LEGAL",
          reference: item.contractId,
          status: item.status,
          ageLabel: formatAge(ageHours),
          slaBreached: isLegalSlaBreached(item),
          ageHours,
        };
      });
    const inventoryRows = goodsReceiptSyncs
      .filter((item) => item.status === "PENDING_RECEIPT")
      .map((item) => {
        const ageHours = hoursSince(item.createdAt);
        return {
          id: item.id,
          workspace: "INVENTORY",
          reference: item.finalPoId,
          status: item.status,
          ageLabel: formatAge(ageHours),
          slaBreached: isInventorySlaBreached(item),
          ageHours,
        };
      });
    const provisioningRows = supplierAccess
      .filter((item) => item.status === "REQUESTED")
      .map((item) => {
        const ageHours = hoursSince(item.createdAt);
        return {
          id: item.id,
          workspace: "IT",
          reference: `${item.supplierId}/${item.supplierBranchId}`,
          status: item.status,
          ageLabel: formatAge(ageHours),
          slaBreached: isProvisioningSlaBreached(item),
          ageHours,
        };
      });
    return [...legalRows, ...inventoryRows, ...provisioningRows].sort(
      (a, b) => b.ageHours - a.ageHours,
    );
  }, [goodsReceiptSyncs, legalHandoffs, supplierAccess]);

  const handoffSummary = useMemo(() => {
    const legalPending = legalHandoffs.filter((item) => item.status !== "CONTRACT_ACCEPTED").length;
    const inventoryPending = goodsReceiptSyncs.filter((item) => item.status === "PENDING_RECEIPT").length;
    const itPending = supplierAccess.filter((item) => item.status === "REQUESTED").length;
    const breached = handoffRows.filter((item) => item.slaBreached).length;
    return { legalPending, inventoryPending, itPending, breached };
  }, [goodsReceiptSyncs, handoffRows, legalHandoffs, supplierAccess]);

  const runScan = async () => {
    try {
      await procurementService.runRiskScan(session.tenantId, session);
      setStatusMessage("Anti-fraud risk scan completed.");
      refresh();
    } catch (err) {
      setErrorMessage("Risk scan failed.");
    }
  };

  const setStatus = async (riskSignalId: string, status: RiskSignal["status"]) => {
    try {
      await procurementService.setRiskSignalStatus(session.tenantId, session, riskSignalId, status);
      setStatusMessage(`Risk signal status updated to ${status}.`);
      refresh();
    } catch (err) {
      setErrorMessage("Failed to update risk signal status.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Risk and Compliance"
        subtitle="Anti-fraud risk monitoring for price anomalies, approval bypass, and supplier risk degradation."
        primaryAction={<Button onClick={runScan}>Run Risk Scan</Button>}
        secondaryActions={
          <Input
            placeholder="Search risk signals"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-w-[220px]"
          />
        }
      />

      <FeedbackAlert message={statusMessage} error={errorMessage} onClear={clearStatus} />

      <WorkspacePanel title="Risk Signals" description="Open and historical procurement risk alerts.">
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <DataTableShell total={filtered.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Signal</th>
                <th className="p-3 text-left">Severity</th>
                <th className="p-3 text-left">Entity</th>
                <th className="p-3 text-left">Detail</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-3 text-center">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-3 text-center text-muted-foreground">No risk signals found.</td></tr>
              ) : (
                filtered.map((signal) => (
                  <tr key={signal.id} className="border-t">
                    <td className="p-3 font-medium">{signal.code}</td>
                    <td className="p-3 text-muted-foreground">{signal.severity}</td>
                    <td className="p-3 text-muted-foreground">{signal.entityId}</td>
                    <td className="p-3">{signal.detail}</td>
                    <td className="p-3">
                      <ApprovalStatusBadge status={signal.status} />
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        {signal.status === "OPEN" ? (
                          <Button size="sm" variant="outline" onClick={() => setStatus(signal.id, "ACKNOWLEDGED")}>
                            Acknowledge
                          </Button>
                        ) : null}
                        {signal.status !== "RESOLVED" ? (
                          <Button size="sm" onClick={() => setStatus(signal.id, "RESOLVED")}>
                            Resolve
                          </Button>
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

      <WorkspacePanel title="Cross-Workspace Handoff SLA" description="Legal, Inventory, and IT queue SLA monitoring.">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Legal pending</p>
            <p className="text-2xl font-semibold">{handoffSummary.legalPending}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Inventory pending receipt</p>
            <p className="text-2xl font-semibold">{handoffSummary.inventoryPending}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">IT provisioning pending</p>
            <p className="text-2xl font-semibold">{handoffSummary.itPending}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">SLA breached handoffs</p>
            <p className="text-2xl font-semibold">{handoffSummary.breached}</p>
          </div>
        </div>
        <DataTableShell total={handoffRows.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Workspace</th>
                <th className="p-3 text-left">Reference</th>
                <th className="p-3 text-left">Queue Status</th>
                <th className="p-3 text-left">Age</th>
                <th className="p-3 text-left">SLA</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-3 text-center">Loading...</td></tr>
              ) : handoffRows.length === 0 ? (
                <tr>
                  <td className="p-3 text-muted-foreground" colSpan={5}>
                    No cross-workspace handoff backlog.
                  </td>
                </tr>
              ) : (
                handoffRows.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="p-3 font-medium">{row.workspace}</td>
                    <td className="p-3 text-muted-foreground">{row.reference}</td>
                    <td className="p-3">{row.status}</td>
                    <td className="p-3">{row.ageLabel}</td>
                    <td className="p-3">
                      <Badge variant={row.slaBreached ? "destructive" : "outline"}>
                        {row.slaBreached ? "BREACHED" : "WITHIN_SLA"}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>

      <WorkspacePanel title="Audit Trail" description="Immutable event history for procurement operations and controls.">
        <DataTableShell total={auditEvents.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Timestamp</th>
                <th className="p-3 text-left">Action</th>
                <th className="p-3 text-left">Entity</th>
                <th className="p-3 text-left">Detail</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="p-3 text-center">Loading...</td></tr>
              ) : auditEvents.length === 0 ? (
                <tr><td colSpan={4} className="p-3 text-center text-muted-foreground">No audit events found.</td></tr>
              ) : (
                auditEvents.map((event) => (
                  <tr key={event.id} className="border-t">
                    <td className="p-3 text-muted-foreground">{event.createdAt.slice(0, 16).replace("T", " ")}</td>
                    <td className="p-3 font-medium">{event.action}</td>
                    <td className="p-3 text-muted-foreground">
                      {event.entityType} / {event.entityId}
                    </td>
                    <td className="p-3">{event.detail}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>
    </div>
  );
}
