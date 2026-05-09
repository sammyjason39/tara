import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  ShieldCheck,
  UserCog,
  Shield,
  Activity,
  Plus
} from "lucide-react";
import { RequestModal } from "@/core/ui/RequestModal";
import { adminService } from "@/core/services/adminService";
import { useSession } from "@/core/security/session";
import { useToast } from "@/hooks/use-toast";
import { reportingService } from "@/core/services/reportingService";
import { auditService, type AuditLog, type VerificationResult } from "@/core/services/auditService";
import { itService, type SystemHealth } from "@/core/services/it/itService";
import { useEffect, useCallback } from "react";
import DepartmentWorkspaceLayout from "@/components/layouts/DepartmentWorkspaceLayout";

// Mocks for UI-only sections that don't have endpoints yet
const roleRows = [
  {
    id: "role-1",
    name: "Platform Administrator",
    description: "Full access across tenants, security policies, and billing.",
    users: 8,
    updated: "2 days ago",
  },
  {
    id: "role-2",
    name: "Operations Manager",
    description: "Workflow approvals, reporting, and escalation access.",
    users: 24,
    updated: "1 week ago",
  },
  {
    id: "role-3",
    name: "Compliance Officer",
    description: "Audit logs, policy reviews, and risk assessments.",
    users: 6,
    updated: "3 weeks ago",
  },
];

const SECTIONS = [
  {
    title: "SECURITY",
    items: [
      { id: 'overview', icon: Shield, label: "Overview", to: "/core/security" },
      { id: 'roles', icon: UserCog, label: "Roles", to: "/core/security/roles" },
      { id: 'audit', icon: Clock, label: "Audit Feed", to: "/core/security/audit" },
    ]
  }
];

export default function CoreSecurity() {
  const session = useSession();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [health, setHealth] = useState<SystemHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [integrityStatus, setIntegrityStatus] = useState<'idle' | 'scanning' | 'secure' | 'tampered'>('idle');
  const [checkResult, setCheckResult] = useState<VerificationResult | null>(null);

  const refreshData = useCallback(async () => {
    try {
      const [l, h] = await Promise.all([
        auditService.getLogs(session),
        itService.getSystemHealth(session.tenant_id, session),
      ]);
      setLogs(l.data.slice(0, 10)); // Top 10 for recent view
      setHealth(h);
    } catch (err) {
      console.error("Failed to fetch security data:", err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const handleVerifyIntegrity = async () => {
    setIntegrityStatus('scanning');
    try {
      const result = await auditService.verifyChain(session);
      setCheckResult(result);
      if (result.valid) {
        setIntegrityStatus('secure');
        toast({ title: "Integrity Verified", description: `Chain is secure. ${result.checkedRecords} records validated.` });
      } else {
        setIntegrityStatus('tampered');
        toast({ 
          title: "Critical Integrity Error", 
          description: "Unauthorized audit chain modification detected!", 
          variant: "destructive" 
        });
      }
    } catch (err) {
      setIntegrityStatus('idle');
      toast({ title: "Scan Failed", description: "Audit engine unable to complete scan.", variant: "destructive" });
    }
  };

  const handleRepairChain = async () => {
    if (!confirm("Are you sure you want to repair the audit chain? This will recompute all hashes from the point of failure. This action is audit-logged.")) return;
    
    try {
      const res = await auditService.repairChain(session);
      if (res.success) {
        toast({ title: "Chain Repaired", description: `Audit integrity restored. Repaired ${res.repairedCount} records.` });
        handleVerifyIntegrity(); // Re-verify
      }
    } catch (err) {
      toast({ title: "Repair Failed", description: "Database error during chain recovery.", variant: "destructive" });
    }
  };

  const handleManageRoles = async (data: { title: string; reason: string }) => {
    try {
      await adminService.createRequest(session.tenant_id, session, {
        type: "ROLE_MANAGEMENT",
        title: data.title,
        description: data.reason,
      });
      toast({
        title: "Role Change Requested",
        description: `${data.title} has been forwarded to compliance.`,
      });
    } catch (err) {
      toast({
        title: "Submission Failed",
        description: "Unable to process security request.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadReport = async () => {
    try {
      toast({ title: "Report Generation", description: "Preparing the latest security audit report..." });
      await reportingService.generateReport(session, { report_type: "SECURITY_AUDIT", format: "PDF" });
      toast({ title: "Processing", description: "Report is being generated in the background." });
    } catch (err) {
      toast({ title: "Generation Failed", description: "Audit engine is currently offline.", variant: "destructive" });
    }
  };

  const mainContent = (
    <div className="space-y-6 p-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <WorkspacePanel
            title="Roles & permissions"
            description="Defined access roles with scoped capabilities and assigned users."
          >
            <div className="overflow-hidden rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[30%]">Role</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Last updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(Array.isArray(roleRows) ? roleRows : []).map((role) => (
                    <TableRow key={role.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="font-medium">{role.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {role.description}
                      </TableCell>
                      <TableCell>{role.users}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {role.updated}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </WorkspacePanel>

          <WorkspacePanel
            title="Recent audit log"
            description="Real-time untamperable activity stream."
          >
            <div className="space-y-4">
              {loading && <p className="text-sm text-muted-foreground">Fetching records...</p>}
              {(Array.isArray(logs) ? logs : []).map((log) => (
                <div key={log.id} className="rounded-xl border p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{log.action}</p>
                        {log.severity === 'CRITICAL' && <Badge variant="destructive" className="scale-75 origin-left">Critical</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {log.entity_type}: {log.entity_id}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Actor: {log.user_id}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {log.hash_chain?.substring(0, 8)}...
                      </Badge>
                      <div className="mt-2 flex items-center justify-end gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </WorkspacePanel>
        </div>

        <div className="space-y-6">
          <WorkspacePanel
            title="Integrity & Risk"
            description="Compliance controls and chain verification."
          >
            <div className="space-y-4">
              <div className={`rounded-2xl border p-4 transition-all duration-500 ${
                integrityStatus === 'secure' ? 'bg-emerald-50/50 border-emerald-200' : 
                integrityStatus === 'tampered' ? 'bg-rose-50 border-rose-200 animate-pulse' : 'bg-muted/30'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {integrityStatus === 'idle' && <Clock className="h-5 w-5 text-muted-foreground" />}
                    {integrityStatus === 'scanning' && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                    {integrityStatus === 'secure' && <ShieldCheck className="h-5 w-5 text-emerald-500" />}
                    {integrityStatus === 'tampered' && <AlertTriangle className="h-5 w-5 text-rose-500" />}
                    <div>
                      <p className="text-sm font-black uppercase tracking-tighter">Audit Integrity</p>
                      <p className="text-[10px] text-muted-foreground font-medium">
                        {integrityStatus === 'idle' ? 'Chain check pending scan' : 
                         integrityStatus === 'scanning' ? 'Verifying record hashes...' :
                         integrityStatus === 'secure' ? `Secure: ${checkResult?.checkedRecords} logs verified` :
                         'CRITICAL: Chain corruption detected'}
                      </p>
                    </div>
                  </div>
                  {integrityStatus === 'tampered' && (
                    <Button size="sm" variant="destructive" onClick={handleRepairChain} className="rounded-xl font-black text-[9px] uppercase tracking-widest">
                      Repair
                    </Button>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border p-4 bg-muted/30">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                  <div>
                    <p className="text-sm font-black uppercase tracking-tighter">MFA coverage</p>
                    <p className="text-[10px] text-muted-foreground font-medium">
                      96% of privileged users enrolled
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </WorkspacePanel>

          <WorkspacePanel
            title="System Telemetry"
            description="Infrastructure health and latency."
          >
            <div className="space-y-4">
              {health.length === 0 && <p className="text-xs text-muted-foreground">No active infrastructure alerts.</p>}
              {(Array.isArray(health) ? health : []).map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-2xl border p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black uppercase tracking-tighter">
                        {alert.component}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-medium">
                        Latency: {alert.latencyMs}ms
                      </p>
                    </div>
                    <Badge variant={alert.status === 'HEALTHY' ? 'outline' : 'destructive'} className="rounded-full px-2 py-0.5 text-[8px] font-black uppercase">
                      {alert.status}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(alert.checkedAt).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </WorkspacePanel>
        </div>
      </div>

      <RequestModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleManageRoles}
        title="Manage Enterprise Roles"
        description="Describe the role adjustment needed for your tenant. Requests are logged for auditing purposes."
        defaultTitle="Role Policy Update"
      />
    </div>
  );

  return (
    <DepartmentWorkspaceLayout
      title="Security & Access"
      subtitle="Enforce policies, manage roles, and monitor audit activity."
      headerIcon={ShieldCheck}
      accentColor="slate"
      engineName="SECURITY_ENGINE"
      pulseLabel="Shield Pulse"
      pulseIcon={Activity}
      sections={SECTIONS}
      routeLabels={{}}
      basePath="/core/security"
      headerActions={
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleVerifyIntegrity} 
            disabled={integrityStatus === 'scanning'}
            className="rounded-xl h-10 px-6 font-black text-[10px] uppercase tracking-widest border-slate-200"
          >
            {integrityStatus === 'scanning' ? "Scanning..." : "Verify Integrity"}
          </Button>
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="rounded-xl h-10 px-6 font-black text-[10px] uppercase tracking-widest bg-slate-900 hover:bg-black text-white"
          >
            <UserCog className="mr-2 h-3.5 w-3.5" /> Manage Roles
          </Button>
        </div>
      }
    >
      {mainContent}
    </DepartmentWorkspaceLayout>
  );
}
