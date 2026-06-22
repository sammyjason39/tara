import * as React from "react";
import { PageShell } from "@/core/ui/PageShell";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings2, 
  ShieldCheck, 
  ScrollText, 
  Users, 
  Lock,
  ChevronRight,
  Bell
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

interface DeptAdminProps {
  departmentId: string;
  departmentName: string;
}

export function DeptAdmin({ 
  departmentId, 
  departmentName,
  noShell = false
}: DeptAdminProps & { noShell?: boolean }) {
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Settings Saved",
      description: `Administrative policies for ${departmentId} have been synchronized.`,
    });
  };

  const content = (
    <Tabs defaultValue="settings" className="space-y-6">
      <TabsList className="bg-muted/50 p-1">
        <TabsTrigger value="settings" className="gap-2">
          <Settings2 className="h-4 w-4" /> Settings
        </TabsTrigger>
        <TabsTrigger value="policies" className="gap-2">
          <ShieldCheck className="h-4 w-4" /> Policies
        </TabsTrigger>
        <TabsTrigger value="audit" className="gap-2">
          <ScrollText className="h-4 w-4" /> Audit Log
        </TabsTrigger>
      </TabsList>

      <TabsContent value="settings" className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <WorkspacePanel title="Department Identity" description="Core identifiers for document headers and reports.">
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Department Name</Label>
                <Input defaultValue={departmentName} />
              </div>
              <div className="space-y-2">
                <Label>Internal Routing Code</Label>
                <Input defaultValue={`DEP-${(departmentId || "").toUpperCase()}-01`} />
              </div>
            </div>
          </WorkspacePanel>

          <WorkspacePanel title="Notifications" description="Manage how this department receives alerts.">
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label>Critical Alerts</Label>
                  <p className="text-[10px] text-muted-foreground">Notify on compliance violations.</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label>Workflow Digest</Label>
                  <p className="text-[10px] text-muted-foreground">Daily summary of pending approvals.</p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </WorkspacePanel>
        </div>
      </TabsContent>

      <TabsContent value="policies" className="space-y-6">
        <WorkspacePanel title="Governance Framework" description="Active enforcement rules for this department.">
          <div className="pt-4 space-y-4">
            {[
              { id: 1, name: "Multi-factor Approval", desc: "Requires two senior signatures for items > $5,000.", enabled: true },
              { id: 2, name: "Geofenced Access", desc: "Restrict sensitive data access to corporate LAN.", enabled: false },
              { id: 3, name: "Encryption-at-Rest", desc: "Force AES-256 for all departmental document storage.", enabled: true },
            ].map((policy) => (
              <div key={policy.id} className="flex items-start justify-between p-4 rounded-xl border border-border bg-muted">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-sm font-bold">{policy.name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{policy.desc}</p>
                </div>
                <Switch checked={policy.enabled} />
              </div>
            ))}
          </div>
        </WorkspacePanel>
      </TabsContent>

      <TabsContent value="audit" className="space-y-6">
        <WorkspacePanel title="Scoped Audit Trail" description="Immutable record of administrative actions within this department.">
          <div className="pt-4">
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-[10px] font-black uppercase">Action</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Identity</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Timestamp</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { action: "POLICY_UPDATE", user: "Admin", time: "2m ago", status: "Success" },
                    { action: "SETTING_CHANGE", user: "Manager", time: "1h ago", status: "Success" },
                    { action: "ACCESS_DENIED", user: "Unknown", time: "4h ago", status: "Flagged" },
                    { action: "REPORT_GEN", user: "System", time: "1d ago", status: "Success" },
                  ].map((log, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-bold text-xs">{log.action}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{log.user}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{log.time}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={log.status === "Success" ? "secondary" : "destructive"} className="text-[8px] font-black uppercase">
                          {log.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </WorkspacePanel>
      </TabsContent>
    </Tabs>
  );

  if (noShell) return content;

  return (
    <PageShell
      header={
        <PageHeader
          title={`${departmentName} Administration`}
          subtitle={`Scoped governance, policy management, and audit trails for the ${departmentId} department.`}
          primaryAction={<Button onClick={handleSave}>Save Changes</Button>}
        />
      }
    >
      {content}
    </PageShell>
  );
}
