import { useEffect, useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { FilterBar } from "@/core/tools/FilterBar";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { useSession } from "@/core/security/session";
import { financeService, type FinanceInsight } from "@/core/services/finance/financeService";

export default function FinanceInsights() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [timeFrame, setTimeFrame] = useState("30");
  const [category, setCategory] = useState("ALL");

  const [insights, setInsights] = useState<FinanceInsight[]>([]);
  const [auditIntegrity, setAuditIntegrity] = useState<any>(null);
  const [budgetVariance, setBudgetVariance] = useState<any>(null);

  useEffect(() => {
    const companyId = "C1"; // Mock company for demo context
    const fiscalPeriodId = "P1";

    financeService.getFinanceInsights(session.tenant_id, session).then(setInsights).catch(console.error);
    financeService.verifyLedgerIntegrity(session, companyId).then(setAuditIntegrity).catch(console.error);
    financeService.getBudgetVariance(session, companyId, fiscalPeriodId).then(setBudgetVariance).catch(console.error);
  }, [session.tenant_id, session]);

  const filteredInsights = useMemo(
    () =>
      insights.filter(
        (item) =>
          (!search || item.title?.toLowerCase().includes(search.toLowerCase())) &&
          (category === "ALL" || item.category === category),
      ),
    [insights, search, category],
  );

  const trendCards = useMemo(
    () =>
      filteredInsights.slice(0, 3).map((item, index) => ({
        ...item,
        label: `${index + 1}. ${item.title}`,
      })),
    [filteredInsights],
  );

  const breakdown = useMemo(() => {
    const group: Record<string, number> = {};
    filteredInsights.forEach((item) => {
      group[item.category] = (group[item.category] ?? 0) + 1;
    });
    return Object.entries(group).map(([categoryName, count]) => ({
      category: categoryName,
      count,
    }));
  }, [filteredInsights]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance Insights"
        subtitle="Operational dashboards, KPIs, and predictive signals."
        primaryAction={
          <Select value={timeFrame} onValueChange={setTimeFrame}>
            <SelectTrigger>
              <SelectValue placeholder="Timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        }
        secondaryActions={
          <div className="flex gap-2 items-center">
            {auditIntegrity && (
              <Badge variant={auditIntegrity.integrityRatio === 1 ? "default" : "destructive"}>
                Ledger Integrity: {Math.round(auditIntegrity.integrityRatio * 100)}%
              </Badge>
            )}
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="PAYMENTS">Payments</SelectItem>
                <SelectItem value="CASHFLOW">Cashflow</SelectItem>
                <SelectItem value="APPROVALS">Approvals</SelectItem>
                <SelectItem value="PERIODS">Periods</SelectItem>
              </SelectContent>
            </Select>
            <FilterBar searchValue={search} onSearchChange={setSearch} />
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        <WorkspacePanel
          title="Top Insights"
          description="Signal cards surface the most critical metrics this cycle."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {trendCards.map((item) => (
              <div key={item.id} className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">{item.category}</p>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-2xl font-semibold text-foreground">{item.value}</p>
              </div>
            ))}
          </div>
        </WorkspacePanel>

        <WorkspacePanel
          title="Budget Variance (Phase 9)"
          description="Live variance tracking between Ledger Actuals and Budget Scenarios."
        >
          {budgetVariance ? (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Total Variance</span>
                <span className={budgetVariance.varianceAmount < 0 ? "text-destructive" : "text-green-600"}>
                  {budgetVariance.varianceAmount >= 0 ? "+" : ""}{budgetVariance.varianceAmount.toLocaleString()}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div 
                  className="h-full rounded-full bg-primary" 
                  style={{ width: `${Math.min(100, Math.abs(budgetVariance.variancePercentage))}%` }} 
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Current usage is {budgetVariance.variancePercentage}% relative to baseline.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Fetching live budget data...</p>
          )}
        </WorkspacePanel>
      </div>

      <WorkspacePanel
        title="Approval Workflow Insights"
        description="Monitor approval time, bottlenecks, and status."
      >
        <DataTableShell total={filteredInsights.length} page={1} pageSize={5}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Metric</th>
                <th className="p-3 text-left">Category</th>
                <th className="p-3 text-left">Value</th>
              </tr>
            </thead>
            <tbody>
              {filteredInsights.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-3 font-medium">{item.title}</td>
                  <td className="p-3 text-muted-foreground">{item.category}</td>
                  <td className="p-3">{item.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>

      <div className="grid gap-6 md:grid-cols-2">
        <WorkspacePanel
          title="Category Breakdown"
          description="Distribution of insight categories."
        >
          <div className="flex flex-wrap gap-2">
            {breakdown.map((row) => (
              <Badge key={row.category} variant="outline">
                {row.category}: {row.count}
              </Badge>
            ))}
          </div>
        </WorkspacePanel>

        <WorkspacePanel
          title="Cryptographic Ledger Integrity (Phase 10)"
          description="Real-time verification of the Merkle-chained financial ledger."
        >
          {auditIntegrity ? (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
              <div className="flex items-center gap-2 font-semibold text-primary">
                <ShieldCheck className="h-4 w-4" />
                <span>Verification Success</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Verified {auditIntegrity.totalProcessed} entries. Integrity Hash: {(auditIntegrity?.headHash || "").substring(0, 16)}...
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Verifying ledger chain...</p>
          )}
        </WorkspacePanel>
      </div>
    </div>
  );
}
