import { useMemo, useState } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { FeedbackAlert } from "@/core/tools/FeedbackAlert";
import { useSession } from "@/core/security/session";
import { marketingService } from "@/core/services/marketing/marketingService";
import type { MarketingCampaign } from "@/core/types/marketing/marketing";

const OBJECTIVES: MarketingCampaign["objective"][] = [
  "LEAD_GENERATION",
  "AWARENESS",
  "NURTURE",
  "REMARKETING",
];

const CHANNEL_PRESETS: Record<
  MarketingCampaign["objective"],
  MarketingCampaign["channelMix"]
> = {
  LEAD_GENERATION: ["META_ADS", "GOOGLE_ADS", "LANDING_PAGE"],
  AWARENESS: ["META_ADS", "GOOGLE_ADS", "EVENT"],
  NURTURE: ["EMAIL", "WHATSAPP", "WEBINAR"],
  REMARKETING: ["META_ADS", "GOOGLE_ADS", "EMAIL"],
};

export default function CampaignDesk() {
  const session = useSession();
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [objective, setObjective] =
    useState<MarketingCampaign["objective"]>("LEAD_GENERATION");
  const [budget, setBudget] = useState("50000");
  const [startDate, setStartDate] = useState("2026-06-01");
  const [endDate, setEndDate] = useState("2026-06-30");
  const [audience, setAudience] = useState("Mid-market operations and finance leaders");
  const [selectedCampaign, setSelectedCampaign] = useState<MarketingCampaign | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clearStatus = () => {
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const campaigns = useMemo(
    () => marketingService.listCampaigns(session.tenantId),
    [refreshKey, session.tenantId],
  );

  const filtered = useMemo(
    () =>
      campaigns.filter((item) =>
        search
          ? `${item.name} ${item.objective} ${item.status} ${item.ownerName}`
              .toLowerCase()
              .includes(search.toLowerCase())
          : true,
      ),
    [campaigns, search],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaign Service"
        subtitle="Campaign creation, governance, and channel orchestration across owned and external channels."
        secondaryActions={
          <Input
            className="min-w-[220px]"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search campaigns"
          />
        }
      />

      <FeedbackAlert message={statusMessage} error={errorMessage} onClear={clearStatus} />

      <WorkspacePanel title="Create Campaign" description="Create campaign brief, objective, audience, and budget governance.">
        <div className="grid gap-3 md:grid-cols-3">
          <Input
            placeholder="Campaign name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Select value={objective} onValueChange={(value: MarketingCampaign["objective"]) => setObjective(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Objective" />
            </SelectTrigger>
            <SelectContent>
              {OBJECTIVES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Budget"
            type="number"
            value={budget}
            onChange={(event) => setBudget(event.target.value)}
          />
          <Input
            placeholder="Start date"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
          <Input
            placeholder="End date"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
          <Input
            placeholder="Audience"
            value={audience}
            onChange={(event) => setAudience(event.target.value)}
          />
        </div>
        <Button
          className="mt-3"
          onClick={() => {
            if (!name) return;
            try {
              marketingService.createCampaign(session.tenantId, session, {
                name,
                objective,
                channelMix: CHANNEL_PRESETS[objective],
                budget: Number(budget),
                startDate,
                endDate,
                audience,
              });
              setStatusMessage(`Campaign "${name}" initialized and queued for budget approval.`);
              setName("");
              setRefreshKey((value) => value + 1);
            } catch (err) {
              setErrorMessage("Failed to create campaign. Budget threshold exceeded.");
            }
          }}
        >
          Create Campaign
        </Button>
      </WorkspacePanel>

      <WorkspacePanel title="Campaign Registry" description="Campaign governance board with objective, owner, and status controls.">
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <DataTableShell total={filtered.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Campaign</th>
                <th className="p-3 text-left">Owner</th>
                <th className="p-3 text-left">Budget</th>
                <th className="p-3 text-left">Objective</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  className="cursor-pointer border-t hover:bg-muted/50"
                  onClick={() => setSelectedCampaign(item)}
                >
                  <td className="p-3 font-medium">{item.name}</td>
                  <td className="p-3 text-muted-foreground">{item.ownerName}</td>
                  <td className="p-3 text-muted-foreground">
                    {item.budget.toLocaleString()} {item.currency}
                  </td>
                  <td className="p-3">
                    <Badge variant="outline">{item.objective}</Badge>
                  </td>
                  <td className="p-3">
                    <Badge variant={item.status === "ACTIVE" ? "secondary" : "outline"}>
                      {item.status}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          try {
                            marketingService.updateCampaignStatus(
                              session.tenantId,
                              session,
                              item.id,
                              "SCHEDULED",
                            );
                            setStatusMessage("Campaign scheduled.");
                            setRefreshKey((value) => value + 1);
                          } catch (err) {
                            setErrorMessage("Failed to schedule campaign.");
                          }
                        }}
                      >
                        Schedule
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          try {
                            marketingService.updateCampaignStatus(
                              session.tenantId,
                              session,
                              item.id,
                              "ACTIVE",
                            );
                            setStatusMessage("Campaign activated.");
                            setRefreshKey((value) => value + 1);
                          } catch (err) {
                            setErrorMessage("Failed to activate campaign.");
                          }
                        }}
                      >
                        Activate
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          try {
                            marketingService.updateCampaignStatus(
                              session.tenantId,
                              session,
                              item.id,
                              "PAUSED",
                            );
                            setStatusMessage("Campaign paused.");
                            setRefreshKey((value) => value + 1);
                          } catch (err) {
                            setErrorMessage("Failed to pause campaign.");
                          }
                        }}
                      >
                        Pause
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>
      <Dialog open={!!selectedCampaign} onOpenChange={() => setSelectedCampaign(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Campaign Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 text-sm gap-y-2">
              <span className="text-muted-foreground">Campaign ID:</span>
              <span className="font-mono text-xs">{selectedCampaign?.id}</span>
              <span className="text-muted-foreground">Name:</span>
              <span className="font-semibold">{selectedCampaign?.name}</span>
              <span className="text-muted-foreground">Objective:</span>
              <span>{selectedCampaign?.objective}</span>
              <span className="text-muted-foreground">Budget:</span>
              <span className="font-bold">
                {selectedCampaign?.budget.toLocaleString()} {selectedCampaign?.currency}
              </span>
              <span className="text-muted-foreground">Status:</span>
              <span>{selectedCampaign?.status}</span>
              <span className="text-muted-foreground">Owner:</span>
              <span>{selectedCampaign?.ownerName}</span>
              <span className="text-muted-foreground">Period:</span>
              <span>{selectedCampaign?.startDate} to {selectedCampaign?.endDate}</span>
            </div>
            <div className="border-t pt-2">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Audience</p>
              <p className="text-xs text-muted-foreground">{selectedCampaign?.audience}</p>
            </div>
            <div className="border-t pt-2">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Channel Mix</p>
              <div className="flex flex-wrap gap-1">
                {selectedCampaign?.channelMix.map(channel => (
                  <Badge key={channel} variant="outline" className="text-[10px]">{channel}</Badge>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
