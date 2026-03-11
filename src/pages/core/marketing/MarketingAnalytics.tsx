import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { useSession } from "@/core/security/session";
import { marketingService } from "@/core/services/marketing/marketingService";
import type { MarketingCampaign, ChannelPerformance, AttributionRecord } from "@/core/types/marketing/marketing";

export default function MarketingAnalytics() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [channelPerformance, setChannelPerformance] = useState<ChannelPerformance[]>([]);
  const [attribution, setAttribution] = useState<AttributionRecord[]>([]);

  const refresh = useCallback(async () => {
    try {
      const [c, ch, a] = await Promise.all([
        marketingService.listCampaigns(session.tenantId, session),
        marketingService.getChannelPerformance(session.tenantId, session),
        marketingService.listAttribution(session.tenantId, session),
      ]);
      setCampaigns(c);
      setChannelPerformance(ch);
      setAttribution(a);
    } catch (err) {
      console.error("Failed to fetch marketing analytics data:", err);
    } finally {
      setLoading(false);
    }
  }, [session.tenantId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(
    () =>
      campaigns.filter((item) =>
        search
          ? `${item.name} ${item.objective} ${item.status}`
              .toLowerCase()
              .includes(search.toLowerCase())
          : true,
      ),
    [campaigns, search],
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics and ROI Engine"
        subtitle="Attribution and spend vs revenue visibility across campaign and channel layers."
        secondaryActions={
          <Input
            className="min-w-[220px]"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search campaign analytics"
          />
        }
      />

      <WorkspacePanel title="Channel Breakdown" description="Performance pullback from channels with CPL and lead output.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {channelPerformance.map((item) => (
            <div key={item.channel} className="rounded-lg border p-3">
              <p className="text-sm font-medium">{item.channel}</p>
              <p className="text-xs text-muted-foreground">
                Leads: {item.leads} | Spend: {item.spend.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">CPL: {item.cpl.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </WorkspacePanel>

      <WorkspacePanel title="Campaign Performance" description="Campaign-level objective and lifecycle overview.">
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <DataTableShell total={filtered.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Campaign</th>
                <th className="p-3 text-left">Objective</th>
                <th className="p-3 text-left">Budget</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">AI Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-3 font-medium">{item.name}</td>
                  <td className="p-3 text-muted-foreground">{item.objective}</td>
                  <td className="p-3 text-muted-foreground">
                    {item.budget.toLocaleString()} {item.currency}
                  </td>
                  <td className="p-3">
                    <Badge variant={item.status === "ACTIVE" ? "secondary" : "outline"}>
                      {item.status}
                    </Badge>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {item.aiRecommendation ?? "No recommendation"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>

      <WorkspacePanel title="Attribution Ledger" description="Campaign to lead to Sales handoff attribution records.">
        <DataTableShell total={attribution.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Campaign</th>
                <th className="p-3 text-left">Lead</th>
                <th className="p-3 text-left">Revenue</th>
                <th className="p-3 text-left">Spend</th>
                <th className="p-3 text-left">ROI</th>
              </tr>
            </thead>
            <tbody>
              {attribution.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-3 text-muted-foreground">{item.campaignId}</td>
                  <td className="p-3 text-muted-foreground">{item.leadId}</td>
                  <td className="p-3 text-muted-foreground">
                    {item.revenueAttributed.toLocaleString()}
                  </td>
                  <td className="p-3 text-muted-foreground">{item.spend.toLocaleString()}</td>
                  <td className="p-3">
                    <Progress value={Math.min(Math.max(item.roiPercent / 20, 0), 100)} className="h-2" />
                    <p className="mt-1 text-xs text-muted-foreground">{item.roiPercent}%</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>
    </div>
  );
}
