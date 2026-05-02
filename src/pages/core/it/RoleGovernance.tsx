import { useState } from "react";
import { 
  ShieldAlert, 
  ShieldCheck, 
  Users, 
  Lock, 
  Eye, 
  Edit3, 
  Trash2, 
  Plus, 
  ChevronRight,
  Fingerprint,
  FileKey,
  Shield,
  Activity,
  History
} from "lucide-react";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { useSession } from "@/core/security/session";

interface RoleCapability {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

interface GovernanceRole {
  id: string;
  name: string;
  description: string;
  level: 'SYSTEM' | 'TENANT' | 'BRANCH';
  activeUsers: number;
  capabilities: RoleCapability[];
}

const INITIAL_ROLES: GovernanceRole[] = [
  {
    id: "superadmin",
    name: "System Super-Admin",
    description: "Total cross-tenant orchestration and kernel-level access.",
    level: "SYSTEM",
    activeUsers: 3,
    capabilities: [
      { id: "bypass_tenant", label: "Tenant Bypass", description: "Access any data across all organizations.", enabled: true },
      { id: "audit_wipe", label: "Audit Erasure", description: "Ability to prune historical audit logs.", enabled: false },
      { id: "provision_root", label: "Root Provisioning", description: "Create new tenants and global keys.", enabled: true },
    ]
  },
  {
    id: "owner",
    name: "Organization Owner",
    description: "Full administrative control within the primary tenant scope.",
    level: "TENANT",
    activeUsers: 12,
    capabilities: [
      { id: "manage_billing", label: "Billing & Sub", description: "Manage financial commitment and tiers.", enabled: true },
      { id: "tenant_provision", label: "Staff Provisioning", description: "Onboard/offboard organization-wide users.", enabled: true },
      { id: "security_policy", label: "Security Policies", description: "Enforce MDM and MFA across the org.", enabled: true },
    ]
  },
  {
    id: "branch_it",
    name: "Branch IT Lead",
    description: "Scoped infrastructure management for a specific branch node.",
    level: "BRANCH",
    activeUsers: 84,
    capabilities: [
      { id: "local_devices", label: "Local Device Control", description: "Register and wipe devices in assigned branch.", enabled: true },
      { id: "branch_inventory", label: "Branch Inventory", description: "Track local physical assets.", enabled: true },
      { id: "troubleshoot", label: "Remote Support", description: "Access local terminal for troubleshooting.", enabled: true },
    ]
  }
];

export default function RoleGovernance() {
  console.log("[RoleGovernance] Rendering");
  const session = useSession();
  const [roles, setRoles] = useState<GovernanceRole[]>(INITIAL_ROLES);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("superadmin");

  const selectedRole = roles.find(r => r.id === selectedRoleId) || roles[0];

  const toggleCapability = (roleId: string, capId: string) => {
    setRoles(prev => prev.map(r => {
      if (r.id === roleId) {
        return {
          ...r,
          capabilities: r.capabilities.map(c => 
            c.id === capId ? { ...c, enabled: !c.enabled } : c
          )
        };
      }
      return r;
    }));
  };

  console.log("[RoleGovernance] Rendering - Active State:", activeTab);

  return (
    <div id="role-governance-root" className="p-8 space-y-10 animate-in fade-in duration-1000 min-h-0">
      <PageHeader
        title="Role Orchestration"
        subtitle="Granular capability mapping and hierarchical access logic."
        primaryAction={
          <Button className="bg-indigo-600 text-white rounded-xl font-black italic tracking-widest uppercase gap-3 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all">
            <Plus className="w-4 h-4" /> Create Role
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Roles Matrix</p>
          <div className="space-y-2">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => setSelectedRoleId(role.id)}
                className={cn(
                  "w-full p-4 rounded-2xl text-left border transition-all",
                  selectedRoleId === role.id 
                    ? "bg-white dark:bg-slate-900 border-indigo-500 shadow-lg" 
                    : "bg-transparent border-transparent hover:bg-slate-100 dark:hover:bg-slate-900/50"
                )}
              >
                <h3 className="font-bold text-sm uppercase tracking-tight">{role.name}</h3>
                <p className="text-[10px] text-slate-400 mt-1">{role.description}</p>
              </button>
            ))}
          </div>
        </div>

        <WorkspacePanel 
          title="Capability Orchestrator" 
          description={`Mapping permissions for ${selectedRole.name}`}
          className="lg:col-span-2"
        >
          <div className="space-y-6">
            {selectedRole.capabilities.map((cap) => (
              <div key={cap.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between group">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-tight">{cap.label}</h4>
                  <p className="text-[10px] text-slate-400">{cap.description}</p>
                </div>
                <Switch 
                  checked={cap.enabled}
                  onCheckedChange={() => toggleCapability(selectedRole.id, cap.id)}
                />
              </div>
            ))}
          </div>
        </WorkspacePanel>
      </div>
    </div>
  );
}
