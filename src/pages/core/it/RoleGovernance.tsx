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

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-end justify-between border-b border-slate-200 dark:border-slate-800 pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-[0.3em]">
            <Lock className="h-3 w-3" /> Security Governance
          </div>
          <h1 className="text-4xl font-black tracking-tighter uppercase italic text-slate-900 dark:text-white">
            Role Orchestration
          </h1>
          <p className="text-sm text-slate-500 font-medium">Granular capability mapping and hierarchical access logic.</p>
        </div>

        <div className="flex items-center gap-3">
           <Button variant="outline" className="rounded-2xl border-slate-200 dark:border-slate-800 font-black text-[10px] uppercase tracking-widest px-6 h-12 gap-2">
             <History className="h-4 w-4" /> Policy History
           </Button>
           <Button className="rounded-2xl bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest px-6 h-12 shadow-xl shadow-indigo-500/20 gap-2">
             <Plus className="h-4 w-4" /> Create Custom Role
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-8">
        {/* Role Selection Sidebar */}
        <div className="space-y-4">
           <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-4">Inheritance Matrix</p>
           <div className="space-y-2">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRoleId(role.id)}
                  className={cn(
                    "w-full p-6 rounded-[2rem] text-left transition-all duration-500 border group",
                    selectedRoleId === role.id 
                      ? "bg-white dark:bg-slate-900 border-indigo-500 shadow-xl shadow-indigo-500/10 -translate-y-1" 
                      : "bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-slate-900/50"
                  )}
                >
                  <div className="flex justify-between items-start mb-4">
                     <div className={cn(
                       "p-3 rounded-2xl",
                       selectedRoleId === role.id ? "bg-indigo-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                     )}>
                        <Shield className="h-5 w-5" />
                     </div>
                     <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest">
                        {role.level}
                     </Badge>
                  </div>
                  <h3 className={cn(
                    "font-black text-lg tracking-tighter uppercase italic mb-1 transition-colors",
                    selectedRoleId === role.id ? "text-slate-900 dark:text-white" : "text-slate-500"
                  )}>
                    {role.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium line-clamp-2 leading-relaxed">
                    {role.description}
                  </p>
                  
                  <div className="mt-6 flex items-center justify-between">
                     <div className="flex -space-x-2">
                        {[1,2,3].map(i => (
                          <div key={i} className="h-6 w-6 rounded-full bg-slate-200 border-2 border-white dark:border-slate-900" />
                        ))}
                        <div className="h-6 w-6 rounded-full bg-indigo-50 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[8px] font-bold text-indigo-600">
                           +{role.activeUsers}
                        </div>
                     </div>
                     <ChevronRight className={cn(
                       "h-4 w-4 transition-all",
                       selectedRoleId === role.id ? "text-indigo-500 translate-x-0 opacity-100" : "text-slate-300 -translate-x-2 opacity-0"
                     )} />
                  </div>
                </button>
              ))}
           </div>

           <div className="p-6 rounded-[2rem] bg-amber-500/5 border border-amber-500/10 space-y-3">
              <div className="flex items-center gap-2 text-amber-600">
                 <ShieldAlert className="h-4 w-4" />
                 <span className="text-[10px] font-black uppercase tracking-widest">Security Advisory</span>
              </div>
              <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                Changes to the <span className="text-amber-600">System Super-Admin</span> role are audited globally and require MFA re-verification.
              </p>
           </div>
        </div>

        {/* Capability Orchestrator */}
        <WorkspacePanel 
          title="Capability Matrix" 
          description={`Fine-tuning permissions for ${selectedRole.name}.`}
          className="rounded-[2.5rem] border-slate-200 dark:border-slate-800 shadow-xl"
        >
           <div className="space-y-8 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-2">
                    <Fingerprint className="h-6 w-6 text-indigo-500" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Identity Hook</p>
                    <p className="text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase italic">Active</p>
                 </div>
                 <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-2">
                    <FileKey className="h-6 w-6 text-emerald-500" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Key Rotation</p>
                    <p className="text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase italic">30 Days</p>
                 </div>
                 <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-2">
                    <Activity className="h-6 w-6 text-rose-500" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Audit Status</p>
                    <p className="text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase italic">Immutable</p>
                 </div>
              </div>

              <div className="space-y-4">
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Granular Capabilities</p>
                 <div className="space-y-2">
                    {selectedRole.capabilities.map((cap) => (
                      <div key={cap.id} className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-between group hover:border-indigo-500/30 transition-all duration-300">
                         <div className="space-y-1">
                            <h4 className="font-black text-sm uppercase tracking-tight text-slate-900 dark:text-white">{cap.label}</h4>
                            <p className="text-xs text-slate-400 font-medium max-w-md">{cap.description}</p>
                         </div>
                         <div className="flex items-center gap-6">
                            <div className="text-right hidden md:block">
                               <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-300">Last Audit</p>
                               <p className="text-[10px] font-mono text-slate-400">2026.04.28 14:32</p>
                            </div>
                            <Switch 
                              checked={cap.enabled}
                              onCheckedChange={() => toggleCapability(selectedRole.id, cap.id)}
                              className="data-[state=checked]:bg-indigo-600"
                            />
                         </div>
                      </div>
                    ))}
                 </div>
              </div>

              <div className="pt-8 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                 <div className="flex items-center gap-4">
                    <Button variant="ghost" className="rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-500">
                       <Trash2 className="h-4 w-4 mr-2" /> Decommission Role
                    </Button>
                    <Button variant="ghost" className="rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400">
                       <Eye className="h-4 w-4 mr-2" /> View Audit Trail
                    </Button>
                 </div>
                 <Button className="rounded-2xl bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest px-8 h-14 shadow-xl shadow-indigo-500/20 gap-2">
                   <ShieldCheck className="h-4 w-4" /> Commit Security State
                 </Button>
              </div>
           </div>
        </WorkspacePanel>
      </div>
    </div>
  );
}
