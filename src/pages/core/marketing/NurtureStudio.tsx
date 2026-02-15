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
import { useSession } from "@/core/security/session";
import { marketingService } from "@/core/services/marketing/marketingService";
import type { NurtureWorkflow } from "@/core/types/marketing/marketing";

const TRIGGERS: NurtureWorkflow["trigger"][] = [
  "NEW_LEAD",
  "SCORE_BELOW_THRESHOLD",
  "REENGAGEMENT",
];

export default function NurtureStudio() {
  const session = useSession();
  const [refreshKey, setRefreshKey] = useState(0);
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState<NurtureWorkflow["trigger"]>("NEW_LEAD");
  const [templateA, setTemplateA] = useState("welcome-sequence-1");
  const [templateB, setTemplateB] = useState("retargeting-reminder-1");

  const workflows = useMemo(
    () => marketingService.listWorkflows(session.tenantId),
    [refreshKey, session.tenantId],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nurturing Workflow Studio"
        subtitle="Multi-touch automation sequences with AI recommendations and qualification thresholds."
      />

      <WorkspacePanel title="Create Workflow" description="Build a campaign nurturing sequence with ordered channel steps.">
        <div className="grid gap-3 md:grid-cols-4">
          <Input
            placeholder="Workflow name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Select value={trigger} onValueChange={(value: NurtureWorkflow["trigger"]) => setTrigger(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Trigger" />
            </SelectTrigger>
            <SelectContent>
              {TRIGGERS.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Email template"
            value={templateA}
            onChange={(event) => setTemplateA(event.target.value)}
          />
          <Input
            placeholder="WhatsApp template"
            value={templateB}
            onChange={(event) => setTemplateB(event.target.value)}
          />
        </div>
        <Button
          className="mt-3"
          onClick={() => {
            if (!name) return;
            marketingService.createWorkflow(session.tenantId, session, {
              name,
              trigger,
              steps: [
                {
                  id: `step-${Date.now()}-1`,
                  order: 1,
                  channel: "EMAIL",
                  waitHours: 0,
                  messageTemplate: templateA,
                },
                {
                  id: `step-${Date.now()}-2`,
                  order: 2,
                  channel: "WHATSAPP",
                  waitHours: 12,
                  messageTemplate: templateB,
                },
              ],
            });
            setName("");
            setRefreshKey((value) => value + 1);
          }}
        >
          Create Workflow
        </Button>
      </WorkspacePanel>

      <WorkspacePanel title="Workflow Builder" description="Drag/drop-style sequence represented in ordered flow rows.">
        <DataTableShell total={workflows.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Workflow</th>
                <th className="p-3 text-left">Trigger</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Steps</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {workflows.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-3 font-medium">{item.name}</td>
                  <td className="p-3 text-muted-foreground">{item.trigger}</td>
                  <td className="p-3">
                    <Badge variant={item.status === "ACTIVE" ? "secondary" : "outline"}>
                      {item.status}
                    </Badge>
                  </td>
                  <td className="p-3 text-muted-foreground">{item.steps.length}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={item.status === "ACTIVE"}
                        onClick={() => {
                          marketingService.updateWorkflowStatus(
                            session.tenantId,
                            session,
                            item.id,
                            "ACTIVE",
                          );
                          setRefreshKey((value) => value + 1);
                        }}
                      >
                        Activate
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={item.status === "PAUSED"}
                        onClick={() => {
                          marketingService.updateWorkflowStatus(
                            session.tenantId,
                            session,
                            item.id,
                            "PAUSED",
                          );
                          setRefreshKey((value) => value + 1);
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

      <WorkspacePanel title="AI Suggestions" description="AI-recommended optimizations for nurturing logic.">
        <div className="space-y-2">
          {workflows.map((item) => (
            <div key={`${item.id}-ai`} className="rounded-lg border p-3">
              <p className="text-sm font-medium">{item.name}</p>
              <Textarea readOnly value={item.aiSuggestion ?? "No suggestion yet."} />
            </div>
          ))}
        </div>
      </WorkspacePanel>
    </div>
  );
}
