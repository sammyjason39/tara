import { useCallback, useEffect, useMemo, useState } from "react";
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
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { useSession } from "@/core/security/session";
import { marketingService } from "@/core/services/marketing/marketingService";
import type { CampaignExecutionRun, MarketingCampaign } from "@/core/types/marketing/marketing";

const CHANNELS: CampaignExecutionRun["channel"][] = [
  "META_ADS",
  "GOOGLE_ADS",
  "EMAIL",
  "WHATSAPP",
  "WEBINAR",
  "LANDING_PAGE",
  "EVENT",
];

export default function ExecutionDesk() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [channel, setChannel] = useState<CampaignExecutionRun["channel"]>("META_ADS");
  const [scheduledAt, setScheduledAt] = useState(
    new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString().slice(0, 16),
  );
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [executions, setExecutions] = useState<CampaignExecutionRun[]>([]);

  const refresh = useCallback(async () => {
    try {
      const [c, e] = await Promise.all([
        marketingService.listCampaigns(session.tenantId, session),
        marketingService.listExecutions(session.tenantId, session),
      ]);
      setCampaigns(c);
      setExecutions(e);
      if (c.length > 0 && !campaignId) {
        setCampaignId(c[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch execution desk data:", err);
    } finally {
      setLoading(false);
    }
  }, [session.tenantId, campaignId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(
    () =>
      executions.filter((item) =>
        search
          ? `${item.id} ${item.channel} ${item.status}`.toLowerCase().includes(search.toLowerCase())
          : true,
      ),
    [executions, search],
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Loading execution runs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaign Execution"
        subtitle="Run orchestration across channels, performance pullback, and failure alerting."
        secondaryActions={
          <Input
            className="min-w-[220px]"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search execution runs"
          />
        }
      />

      <WorkspacePanel title="Schedule Execution" description="Create channel run and queue execution pipeline.">
        <div className="grid gap-3 md:grid-cols-4">
          <Select value={campaignId} onValueChange={setCampaignId}>
            <SelectTrigger>
              <SelectValue placeholder="Campaign" />
            </SelectTrigger>
            <SelectContent>
              {campaigns.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={channel} onValueChange={(value: CampaignExecutionRun["channel"]) => setChannel(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Channel" />
            </SelectTrigger>
            <SelectContent>
              {CHANNELS.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="datetime-local"
            value={scheduledAt}
            onChange={(event) => setScheduledAt(event.target.value)}
          />
          <Button
            onClick={async () => {
              if (!campaignId) return;
              await marketingService.scheduleExecution(session.tenantId, session, {
                campaignId,
                channel,
                scheduledAt: new Date(scheduledAt).toISOString(),
              });
              refresh();
            }}
          >
            Schedule
          </Button>
        </div>
      </WorkspacePanel>

      <WorkspacePanel title="Execution Runs" description="Track scheduled/running/completed executions and failure handling.">
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <DataTableShell total={filtered.length} page={1} pageSize={12}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Execution</th>
                <th className="p-3 text-left">Channel</th>
                <th className="p-3 text-left">Scheduled</th>
                <th className="p-3 text-left">Leads</th>
                <th className="p-3 text-left">Spend</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-3 font-medium">{item.id}</td>
                  <td className="p-3 text-muted-foreground">{item.channel}</td>
                  <td className="p-3 text-muted-foreground">
                    {new Date(item.scheduledAt).toLocaleString()}
                  </td>
                  <td className="p-3 text-muted-foreground">{item.leadsGenerated}</td>
                  <td className="p-3 text-muted-foreground">{item.spend.toLocaleString()}</td>
                  <td className="p-3">
                    <Badge
                      variant={
                        item.status === "FAILED"
                          ? "destructive"
                          : item.status === "COMPLETED"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {item.status}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await marketingService.runExecution(session.tenantId, session, item.id);
                          refresh();
                        }}
                      >
                        Run
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await marketingService.runExecution(session.tenantId, session, item.id, {
                            failed: true,
                          });
                          refresh();
                        }}
                      >
                        Mark Failed
                      </Button>
                    </div>
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
