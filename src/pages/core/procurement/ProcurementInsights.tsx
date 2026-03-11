import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { FeedbackAlert } from "@/core/tools/FeedbackAlert";
import { useSession } from "@/core/security/session";
import { procurementService } from "@/core/services/procurement/procurementService";
import type {
  GoodsReceiptSyncRecord,
  LegalContractHandoff,
  ProcurementSpendInsight,
  SupplierAccessProvisioning,
} from "@/core/types/procurement/procurement";

const hoursSince = (timestamp: string) =>
  Math.max(0, (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60));

const isLegalSlaBreached = (handoff: LegalContractHandoff) =>
  handoff.status !== "CONTRACT_ACCEPTED" && hoursSince(handoff.createdAt) > 8;

const isInventorySlaBreached = (sync: GoodsReceiptSyncRecord) =>
  sync.status === "PENDING_RECEIPT" && hoursSince(sync.createdAt) > 24;

const isProvisioningSlaBreached = (request: SupplierAccessProvisioning) =>
  request.status === "REQUESTED" && hoursSince(request.createdAt) > 4;

export default function ProcurementInsights() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [insights, setInsights] = useState<ProcurementSpendInsight[]>([]);
  const [legalHandoffs, setLegalHandoffs] = useState<LegalContractHandoff[]>([]);
  const [goodsReceiptSyncs, setGoodsReceiptSyncs] = useState<GoodsReceiptSyncRecord[]>([]);
  const [supplierAccess, setSupplierAccess] = useState<SupplierAccessProvisioning[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [ins, leg, goods, sup] = await Promise.all([
        procurementService.getSpendInsights(session.tenantId, session),
        procurementService.listLegalHandoffs(session.tenantId, session),
        procurementService.listGoodsReceiptSyncs(session.tenantId, session),
        procurementService.listSupplierAccessProvisioning(session.tenantId, session),
      ]);
      setInsights(ins);
      setLegalHandoffs(leg);
      setGoodsReceiptSyncs(goods);
      setSupplierAccess(sup);
    } catch (err) {
      setErrorMessage("Failed to load spend insights.");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const integrationMetrics = useMemo(() => {
    const legalPending = legalHandoffs.filter((item) => item.status !== "CONTRACT_ACCEPTED").length;
    const inventoryPending = goodsReceiptSyncs.filter((item) => item.status === "PENDING_RECEIPT").length;
    const itPending = supplierAccess.filter((item) => item.status === "REQUESTED").length;
    const slaBreached =
      legalHandoffs.filter(isLegalSlaBreached).length +
      goodsReceiptSyncs.filter(isInventorySlaBreached).length +
      supplierAccess.filter(isProvisioningSlaBreached).length;
    return [
      {
        id: `${session.tenantId}-proc-int-1`,
        label: "Legal handoffs pending",
        category: "APPROVAL" as const,
        value: String(legalPending),
      },
      {
        id: `${session.tenantId}-proc-int-2`,
        label: "Goods receipt sync pending",
        category: "APPROVAL" as const,
        value: String(inventoryPending),
      },
      {
        id: `${session.tenantId}-proc-int-3`,
        label: "IT provisioning pending",
        category: "APPROVAL" as const,
        value: String(itPending),
      },
      {
        id: `${session.tenantId}-proc-int-4`,
        label: "Cross-workspace SLA breached",
        category: "RISK" as const,
        value: String(slaBreached),
      },
    ];
  }, [goodsReceiptSyncs, legalHandoffs, session.tenantId, supplierAccess]);

  const mergedInsights = useMemo(() => [...insights, ...integrationMetrics], [insights, integrationMetrics]);

  const filtered = useMemo(
    () =>
      mergedInsights.filter((item) =>
        search ? `${item.label} ${item.category}`.toLowerCase().includes(search.toLowerCase()) : true,
      ),
    [mergedInsights, search],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Spend Intelligence"
        subtitle="Spend analytics, approval throughput, supplier performance, and risk concentration."
        secondaryActions={
          <Input
            placeholder="Search insight metrics"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-w-[220px]"
          />
        }
      />

      <FeedbackAlert message={null} error={errorMessage} onClear={() => setErrorMessage(null)} />

      <WorkspacePanel title="Top Insights" description="Core procurement KPIs and health metrics.">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          {loading ? (
            <div className="col-span-full py-6 text-center text-muted-foreground text-sm italic">Loading insights dashboard...</div>
          ) : (
            mergedInsights.map((item) => (
              <div key={item.id} className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-2xl font-semibold">{item.value}</p>
                <Badge variant="outline">{item.category}</Badge>
              </div>
            ))
          )}
        </div>
      </WorkspacePanel>

      <WorkspacePanel title="Cross-workspace handoff dashboard" description="SLA visibility for Legal, Inventory, and IT integrations.">
        <div className="grid gap-3 md:grid-cols-4">
          {loading ? (
            <div className="col-span-full py-6 text-center text-muted-foreground text-sm italic">Loading integration metrics...</div>
          ) : (
            integrationMetrics.map((item) => (
              <div key={item.id} className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-2xl font-semibold">{item.value}</p>
                <Badge variant="outline">{item.category}</Badge>
              </div>
            ))
          )}
        </div>
      </WorkspacePanel>

      <WorkspacePanel title="Insight Table" description="Filterable metric listing for reporting and dashboard handoff.">
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <DataTableShell total={filtered.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Metric</th>
                <th className="p-3 text-left">Category</th>
                <th className="p-3 text-left">Value</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} className="p-3 text-center italic">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={3} className="p-3 text-center text-muted-foreground">No metrics found.</td></tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="p-3 font-medium">{item.label}</td>
                    <td className="p-3 text-muted-foreground">{item.category}</td>
                    <td className="p-3">{item.value}</td>
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
