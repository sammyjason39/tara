import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { salesService } from "@/core/services/sales/salesService";
import type { SalesTimelineEvent } from "@/core/types/sales/sales";

const CHANNELS: SalesTimelineEvent["channel"][] = [
  "NOTE",
  "EMAIL",
  "WHATSAPP",
  "SMS",
  "CALL",
  "MEETING",
];

export default function TimelineDesk() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const opportunities = salesService.listOpportunities(session.tenantId);
  const [opportunityId, setOpportunityId] = useState(opportunities[0]?.id ?? "");
  const [channel, setChannel] = useState<SalesTimelineEvent["channel"]>("NOTE");
  const [summary, setSummary] = useState("");
  const [detail, setDetail] = useState("");

  const timeline = useMemo(
    () => salesService.listTimelineEvents(session.tenantId),
    [refreshKey, session.tenantId],
  );
  const filtered = useMemo(
    () =>
      timeline.filter((item) =>
        search
          ? `${item.summary} ${item.channel} ${item.direction} ${item.createdBy}`
              .toLowerCase()
              .includes(search.toLowerCase())
          : true,
      ),
    [search, timeline],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Communication Timeline"
        subtitle="Unified CRM timeline for WhatsApp, Email, SMS, calls, meetings, and internal notes."
        secondaryActions={
          <Input
            className="min-w-[220px]"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search timeline"
          />
        }
      />

      <WorkspacePanel title="Log Interaction" description="Record customer communication as auditable timeline events.">
        <div className="grid gap-3 md:grid-cols-4">
          <Input
            value={opportunityId}
            onChange={(event) => setOpportunityId(event.target.value)}
            placeholder="Opportunity ID"
          />
          <Select value={channel} onValueChange={(value: SalesTimelineEvent["channel"]) => setChannel(value)}>
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
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            placeholder="Summary"
          />
          <Button
            onClick={() => {
              if (!opportunityId || !summary) return;
              salesService.addTimelineEvent(session.tenantId, session, {
                opportunityId,
                channel,
                direction: "OUTBOUND",
                summary,
                detail,
              });
              setSummary("");
              setDetail("");
              setRefreshKey((value) => value + 1);
            }}
          >
            Log Event
          </Button>
        </div>
        <Textarea
          className="mt-3"
          value={detail}
          onChange={(event) => setDetail(event.target.value)}
          placeholder="Detail"
        />
      </WorkspacePanel>

      <WorkspacePanel title="Timeline Feed" description="Chronological communication history across all opportunities.">
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <DataTableShell total={filtered.length} page={1} pageSize={15}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Time</th>
                <th className="p-3 text-left">Opportunity</th>
                <th className="p-3 text-left">Channel</th>
                <th className="p-3 text-left">Summary</th>
                <th className="p-3 text-left">By</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-3 text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString()}
                  </td>
                  <td className="p-3 font-medium">{item.opportunityId || "-"}</td>
                  <td className="p-3">
                    <Badge variant="outline">{item.channel}</Badge>
                  </td>
                  <td className="p-3">
                    <p className="font-medium">{item.summary}</p>
                    {item.detail ? (
                      <p className="text-xs text-muted-foreground">{item.detail}</p>
                    ) : null}
                  </td>
                  <td className="p-3 text-muted-foreground">{item.createdBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>
    </div>
  );
}
