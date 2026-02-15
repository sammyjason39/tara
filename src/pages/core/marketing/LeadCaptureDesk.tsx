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
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { useSession } from "@/core/security/session";
import { marketingService } from "@/core/services/marketing/marketingService";
import type { MarketingLead } from "@/core/types/marketing/marketing";

const SOURCES: MarketingLead["source"][] = [
  "LANDING_PAGE",
  "EMBEDDED_FORM",
  "CHATBOT",
  "WEBINAR",
  "META_LEAD_ADS",
  "GOOGLE_ADS",
  "PARTNER_API",
];

export default function LeadCaptureDesk() {
  const session = useSession();
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const [source, setSource] = useState<MarketingLead["source"]>("LANDING_PAGE");
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [industry, setIndustry] = useState("Retail");
  const [employeeBand, setEmployeeBand] = useState("51-200");

  const campaigns = marketingService.listCampaigns(session.tenantId);
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id ?? "");

  const leads = useMemo(
    () => marketingService.listLeads(session.tenantId),
    [refreshKey, session.tenantId],
  );

  const filtered = useMemo(
    () =>
      leads.filter((item) =>
        search
          ? `${item.companyName} ${item.contactName} ${item.source} ${item.status}`
              .toLowerCase()
              .includes(search.toLowerCase())
          : true,
      ),
    [leads, search],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lead Capture Dashboard"
        subtitle="Real-time lead ingestion, enrichment, scoring, qualification, and Sales handoff."
        secondaryActions={
          <Input
            className="min-w-[220px]"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search captured leads"
          />
        }
      />

      <WorkspacePanel title="Capture Lead" description="Ingest owned and external source leads into one normalized lead record.">
        <div className="grid gap-3 md:grid-cols-4">
          <Select value={source} onValueChange={(value: MarketingLead["source"]) => setSource(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              {SOURCES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Company name"
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
          />
          <Input
            placeholder="Contact name"
            value={contactName}
            onChange={(event) => setContactName(event.target.value)}
          />
          <Input
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Input
            placeholder="Industry"
            value={industry}
            onChange={(event) => setIndustry(event.target.value)}
          />
          <Input
            placeholder="Employee band"
            value={employeeBand}
            onChange={(event) => setEmployeeBand(event.target.value)}
          />
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
          <Button
            onClick={() => {
              if (!companyName || !contactName) return;
              marketingService.captureLead(session.tenantId, session, {
                source,
                companyName,
                contactName,
                email,
                campaignId,
                industry,
                employeeBand,
              });
              setCompanyName("");
              setContactName("");
              setEmail("");
              setRefreshKey((value) => value + 1);
            }}
          >
            Capture
          </Button>
        </div>
      </WorkspacePanel>

      <WorkspacePanel title="Lead Feed" description="Live lead queue with AI score and handoff controls.">
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <DataTableShell total={filtered.length} page={1} pageSize={15}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Company</th>
                <th className="p-3 text-left">Contact</th>
                <th className="p-3 text-left">Source</th>
                <th className="p-3 text-left">Score</th>
                <th className="p-3 text-left">Intent</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-3 font-medium">{item.companyName}</td>
                  <td className="p-3 text-muted-foreground">{item.contactName}</td>
                  <td className="p-3 text-muted-foreground">{item.source}</td>
                  <td className="p-3 text-muted-foreground">{item.score}</td>
                  <td className="p-3">
                    <Badge variant={item.intent === "HIGH" ? "secondary" : "outline"}>
                      {item.intent}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Badge variant={item.status === "HANDOFF_READY" ? "secondary" : "outline"}>
                      {item.status}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!["QUALIFIED", "SCORED"].includes(item.status)}
                        onClick={() => {
                          marketingService.markLeadHandoffReady(
                            session.tenantId,
                            session,
                            item.id,
                          );
                          setRefreshKey((value) => value + 1);
                        }}
                      >
                        Mark Ready
                      </Button>
                      <Button
                        size="sm"
                        disabled={!["QUALIFIED", "HANDOFF_READY"].includes(item.status)}
                        onClick={() => {
                          marketingService.handoffLeadToSales(
                            session.tenantId,
                            session,
                            item.id,
                          );
                          setRefreshKey((value) => value + 1);
                        }}
                      >
                        Handoff
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
