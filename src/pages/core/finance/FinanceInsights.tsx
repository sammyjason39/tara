// src/pages/core/finance/FinanceInsights.tsx
import { useMemo, useState } from "react";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { FilterBar } from "@/core/tools/FilterBar";
import { DataTableShell } from "@/core/tools/DataTableShell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/core/security/session";
import { financeService } from "@/core/services/finance/financeService";

export default function FinanceInsights() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [timeFrame, setTimeFrame] = useState("30"); // last 30 days
  const [category, setCategory] = useState("ALL");

  // Mock fetch
  const insights = useMemo(
    () => financeService.getFinanceInsights(session.tenantId),
    [session],
  );

  const filteredInsights = insights.filter(
    (i) =>
      (!search || i.title.toLowerCase().includes(search.toLowerCase())) &&
      (category === "ALL" || i.category === category),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance Insights"
        subtitle="Operational dashboards, KPIs, and financial analytics for better decision making."
        primaryAction={
          <Select value={timeFrame} onValueChange={setTimeFrame}>
            <SelectTrigger>
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last 365 days</SelectItem>
            </SelectContent>
          </Select>
        }
        secondaryActions={
          <div className="flex gap-2">
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

      <div className="grid gap-6 lg:grid-cols-2">
        <WorkspacePanel
          title="Cashflow Summary"
          description="Track inflow and outflow over selected timeframe."
        >
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            {/* Placeholder for chart integration */}
            Chart placeholder: cash inflow vs outflow
          </div>
        </WorkspacePanel>

        <WorkspacePanel
          title="Payment Status Overview"
          description="Track pending, approved, and rejected payments."
        >
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            {/* Placeholder for chart or table */}
            Pending: 10, Approved: 25, Rejected: 2
          </div>
        </WorkspacePanel>

        <WorkspacePanel
          title="Approvals Workflow Insights"
          description="Monitor approval times and bottlenecks."
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
                {filteredInsights.map((i) => (
                  <tr key={i.id} className="border-t">
                    <td className="p-3 font-medium">{i.title}</td>
                    <td className="p-3 text-muted-foreground">{i.category}</td>
                    <td className="p-3">{i.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTableShell>
        </WorkspacePanel>

        <WorkspacePanel
          title="Period Closing Insights"
          description="Track period closing status and performance."
        >
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Last period closed on 31-Jan-2026. Average closing duration: 3.2
            days.
          </div>
        </WorkspacePanel>
      </div>
    </div>
  );
}
