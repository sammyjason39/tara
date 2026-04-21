import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageShell } from "@/core/ui/PageShell";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { AlertTriangle, Database, KeyRound, ShieldCheck, Loader2 } from "lucide-react";
import { useSession } from "@/core/security/session";
import { adminService } from "@/core/services/adminService";
import { useToast } from "@/hooks/use-toast";
import { RequestModal } from "@/core/ui/RequestModal";

export default function CoreAdmin() {
  const session = useSession();
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const result = await adminService.getDashboardMetrics(
          session.tenant_id,
          session,
        );
        setData(result);
      } catch (err) {
        console.error("Failed to load admin dashboard", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, [session.tenant_id, session]);

  if (loading || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { metrics, systemStatus, recentActivity, moduleContributions } = data;

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8,Action,Detail,Time\n" + 
      (recentActivity || []).map((log: any) => `"${log.action || log.title}","${log.detail}","${log.time || log.createdAt}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "audit_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Report Exported", description: "Audit trail downloaded successfully." });
  };

  const handleInvite = async () => {
    const email = window.prompt("Enter admin email to invite:");
    if (!email) return;

    try {
      const response = await adminService.createInvitation(session, {
        email,
        role: "ADMIN",
        justification: "System Audit Invitation"
      });

      if (response.success) {
        toast({ 
          title: "Invitation Generated", 
          description: `Magic Link for ${email} created. Please copy it from the audit log or share manually.`,
          action: (
            <Button 
              contentEditable={false}
              variant="outline" 
              size="sm" 
              onClick={() => {
                navigator.clipboard.writeText(response.data.magic_link);
                toast({ title: "Copied", description: "Magic link copied to clipboard." });
              }}
            >
              Copy Link
            </Button>
          )
        });
      }
    } catch (err) {
      toast({ 
        title: "Invitation Failed", 
        description: "Could not generate security token.",
        variant: "destructive"
      });
    }
  };

  const handleEmergencyRequest = async (data: { title: string; reason: string }) => {
    try {
      await adminService.createRequest(session.tenant_id, session, {
        type: "EMERGENCY_ACTION",
        title: data.title,
        description: data.reason,
      });
      toast({
        title: "Emergency Request Logged",
        description: "Awaiting multi-key authorization for restricted actions.",
      });
    } catch (err) {
      toast({
        title: "Request Failed",
        description: "Unable to log emergency override.",
        variant: "destructive",
      });
    }
  };

  return (
    <PageShell
      header={
        <PageHeader
          title="Platform Administration"
          subtitle="Super-admin controls for tenants, security, and platform governance."
          primaryAction={<Button onClick={handleInvite}>Invite admin</Button>}
          secondaryActions={
            <Button variant="outline" onClick={handleExport}>Generate audit report</Button>
          }
        />
      }
    >
      <div className="space-y-6">
        {/* --- MODULE CONTRIBUTIONS --- */}
        {moduleContributions?.retail && (
          <WorkspacePanel
            title="Module Contributions: Retail Presence"
            description="High-level visibility into the active Retail branch network."
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border p-3 border-emerald-500/20 bg-emerald-500/5">
                <p className="text-xs text-muted-foreground">
                  Active Physical Stores
                </p>
                <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
                  {moduleContributions.retail.activeStores}
                </p>
              </div>
            </div>
          </WorkspacePanel>
        )}

        <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
          <WorkspacePanel
            title="System-level controls"
            description="Platform-wide security and governance settings."
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">
                    Global MFA enforcement
                  </p>
                </div>
                <Badge variant="outline">Enabled</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4" />
                  Configure advanced access policies
                </div>
                <Button size="sm" variant="outline" onClick={() => toast({ title: "Policy Configuration", description: "Opening advanced access policy editor..." })}>
                  Open
                </Button>
              </div>
            </div>
          </WorkspacePanel>

          <WorkspacePanel
            title="Platform audit & logs"
            description="Privileged actions and system activity."
          >
            <div className="space-y-4">
              {recentActivity?.map((log: any) => (
                <div
                  key={log.id || log.title}
                  className="rounded-lg border p-4"
                >
                  <p className="text-sm font-medium text-foreground">
                    {log.action || log.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {log.detail || log.detail}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {log.time || new Date(log.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => toast({ title: "Audit Trail", description: "Loading full system audit logs..." })}>
                View full audit trail
              </Button>
            </div>
          </WorkspacePanel>
        </div>

        <WorkspacePanel
          title="Dangerous actions"
          description="Restricted actions for emergency use only."
        >
          <div className="space-y-3">
            {[
              "Disable all tenant access",
              "Rotate global encryption keys",
              "Purge audit logs",
            ].map((action) => (
              <div
                key={action}
                className="flex items-center justify-between rounded-lg border border-dashed p-4"
              >
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertTriangle className="h-4 w-4" />
                  {action}
                </div>
                <Button size="sm" variant="outline" disabled>
                  Disabled
                </Button>
              </div>
            ))}
            <div className="flex items-center justify-between rounded-lg border p-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Emergency actions require elevated approval.
              </div>
              <Button size="sm" variant="outline" onClick={() => setIsModalOpen(true)}>
                Request access
              </Button>
            </div>
          </div>
        </WorkspacePanel>
      </div>

      <RequestModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleEmergencyRequest}
        title="Emergency Access Request"
        description="Request temporary authorization to perform restricted platform-level actions. Your session will be heavily audited."
        defaultTitle="Restricted Action Authorization"
        placeholder="Identify the active incident and the specific restricted action required..."
      />
    </PageShell>
  );
}
