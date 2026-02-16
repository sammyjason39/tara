import React, { useState, useEffect } from "react";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { 
  Users, 
  UserPlus, 
  ShieldAlert, 
  Key, 
  ShieldCheck, 
  Clock, 
  Activity, 
  MoreHorizontal, 
  UserCheck, 
  Lock, 
  Search, 
  Filter,
  ShieldHalf,
  ExternalLink,
  Save,
  Trash2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { employeeRepo } from "@/core/repositories/hr/employeeRepo";
import { useSession } from "@/core/security/session";
import type { Employee } from "@/core/types/hr/employee";

const StaffAssignments = () => {
  const session = useSession();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [staff, setStaff] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = () => {
      try {
        const data = employeeRepo.list(session.tenantId);
        setStaff(data);
      } catch (error) {
        console.error("Failed to fetch staff", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [session.tenantId]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to revoke all access for this personnel?")) return;
    try {
      employeeRepo.delete(session.tenantId!, id);
      setStaff(prev => prev.filter(s => s.id !== id));
      toast({ title: "Access Revoked", description: "Security credentials have been purged from Zenvix Vault." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to revoke access.", variant: "destructive" });
    }
  };

  const handleProvision = () => {
    toast({ 
      title: "Provisioning Initialized", 
      description: "Redirecting to Zenvix HR Gateway for secure biometric onboarding..." 
    });
  };

  const filteredStaff = staff.filter(s => 
    s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.roleTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Staff & Role Governance" 
        subtitle={`${session.tenantId} • Unified Access Control • Permission Matrix`}
      />
      
      <WorkspacePanel>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-lg border-slate-200 hover:border-blue-200 transition-all border-l-4 border-l-blue-600">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-blue-50 p-2 rounded-xl text-blue-600">
                  <Users className="w-5 h-5" />
                </div>
                <Badge className="bg-slate-100 text-slate-600 border-none font-black italic">TOTAL</Badge>
              </div>
              <div className="text-3xl font-black italic text-slate-900 tracking-tighter">{staff.length}</div>
              <p className="text-[10px] font-bold text-slate-400 mt-2 italic flex items-center gap-1">
                <UserCheck className="w-3 h-3" /> {staff.filter(s => s.status === 'active').length} Active Personnel
              </p>
            </CardContent>
          </Card>
          
          <Card className="shadow-lg border-slate-200 hover:border-indigo-200 transition-all border-l-4 border-l-indigo-600">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <Badge className="bg-indigo-100 text-indigo-700 border-none font-black italic text-[9px]">SECURED</Badge>
              </div>
              <div className="text-3xl font-black italic text-slate-900 tracking-tighter">100%</div>
              <p className="text-[10px] font-bold text-slate-400 mt-2 italic tracking-tighter uppercase">Biometric Sync Verified</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-lg border-slate-200 hover:border-amber-200 transition-all border-l-4 border-l-amber-500">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-amber-50 p-2 rounded-xl text-amber-600">
                  <Lock className="w-5 h-5" />
                </div>
                <Badge variant="destructive" className="border-none font-black italic text-[9px]">TEMP_ACCESS</Badge>
              </div>
              <div className="text-3xl font-black italic text-slate-900 tracking-tighter">3 Active</div>
              <p className="text-[10px] font-bold text-slate-400 mt-2 italic">Supervisor Overrides Last 24h</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-lg border-slate-200 hover:border-emerald-200 transition-all border-l-4 border-l-emerald-600">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600">
                  <Activity className="w-5 h-5" />
                </div>
                <Badge className="bg-emerald-100 text-emerald-700 border-none font-black italic text-[9px]">RELIABLE</Badge>
              </div>
              <div className="text-3xl font-black italic text-slate-900 tracking-tighter">98.2%</div>
              <p className="text-[10px] font-bold text-slate-400 mt-2 italic">Avg. Roster Adherence</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-4 mb-8 bg-slate-50 p-4 rounded-3xl border border-slate-200">
           <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                className="pl-12 h-14 bg-white border-slate-200 rounded-2xl text-sm font-bold italic placeholder:text-slate-300 focus-visible:ring-blue-500 shadow-sm" 
                placeholder="Search Personnel, Role, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
           </div>
           <Button variant="outline" className="h-14 px-6 rounded-2xl gap-2 font-black italic border-slate-200 hover:bg-slate-100">
              <Filter className="w-4 h-4" /> Groups
           </Button>
            <Button 
              className="h-14 px-8 rounded-2xl gap-2 bg-slate-900 hover:bg-slate-800 font-black italic shadow-xl"
              onClick={handleProvision}
            >
               <UserPlus className="w-5 h-5" /> Provision New
            </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
             <DataTableShell 
               title="Store Personnel Registry" 
               subtitle="Global access management for this location"
             >
               <table className="w-full">
                 <thead>
                   <tr className="border-b border-slate-100">
                     <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Personnel</th>
                     <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Role & Location</th>
                     <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Security</th>
                     <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Access Scope</th>
                     <th className="px-6 py-5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Status</th>
                     <th className="px-6 py-5"></th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-20 text-center text-slate-400 font-black italic uppercase text-xs tracking-widest animate-pulse">Syncing Personnel Data...</td>
                      </tr>
                    ) : filteredStaff.map((s, i) => (
                      <tr 
                        key={i} 
                        className="group hover:bg-slate-50/50 transition-colors cursor-pointer"
                        onClick={() => toast({ title: "Personnel Profile", description: `Viewing clearance for ${s.fullName}` })}
                      >
                        <td className="px-6 py-5">
                           <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black italic text-slate-400 shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-all">
                                 {s.fullName.split(' ').map(n=>n[0]).join('')}
                              </div>
                              <div className="font-black italic text-sm text-slate-900">{s.fullName}</div>
                           </div>
                        </td>
                        <td className="px-6 py-5">
                           <div className="text-xs font-bold text-slate-600 italic leading-tight">{s.roleTitle}</div>
                           <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{s.location}</div>
                        </td>
                        <td className="px-6 py-5">
                           <Badge variant="outline" className="border-slate-300 text-slate-500 font-black italic px-3 uppercase">{s.employmentType}</Badge>
                        </td>
                        <td className="px-6 py-5">
                           <div className="flex gap-1 flex-wrap">
                              {["RETAIL_CORE", "POS_EXEC"].map((acc, index) => (
                                <Badge key={index} className="bg-blue-50 text-blue-600 border-none text-[8px] font-black italic">{acc}</Badge>
                              ))}
                           </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                           <div className="flex items-center justify-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${s.status === 'active' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-slate-300'}`} />
                              <span className="text-[10px] font-black italic uppercase text-slate-500">{s.status}</span>
                           </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                           <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                 <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900 transition-all">
                                    <MoreHorizontal className="w-4 h-4" />
                                 </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 p-2 rounded-2xl border-slate-200 shadow-2xl">
                                 <DropdownMenuItem className="rounded-xl gap-2 font-black italic text-xs py-3 cursor-pointer">
                                    <ShieldHalf className="w-4 h-4 text-blue-600" /> Modify Permissions
                                 </DropdownMenuItem>
                                 <DropdownMenuItem className="rounded-xl gap-2 font-black italic text-xs py-3 cursor-pointer">
                                    <Key className="w-4 h-4 text-amber-600" /> Reset Credentials
                                 </DropdownMenuItem>
                                 <Separator className="my-1" />
                                 <DropdownMenuItem 
                                    className="rounded-xl gap-2 font-black italic text-xs py-3 cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50"
                                    onClick={() => handleDelete(s.id)}
                                 >
                                    <Trash2 className="w-4 h-4" /> Revoke Access
                                 </DropdownMenuItem>
                              </DropdownMenuContent>
                           </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                 </tbody>
               </table>
             </DataTableShell>
          </div>

          <div className="space-y-8">
             <Card className="bg-slate-900 text-white shadow-2xl rounded-3xl overflow-hidden relative border-t-4 border-t-amber-500">
                <CardHeader className="p-8 pb-0">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500 italic flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" /> Critical Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                   <div className="space-y-4">
                      <div className="p-5 rounded-2xl bg-white/5 border border-white/10 group">
                         <div className="text-[10px] text-amber-500 font-black uppercase mb-1 flex items-center gap-2">
                            <Clock className="w-3 h-3" /> Policy Verification
                         </div>
                         <div className="text-xs font-bold leading-relaxed mb-3">3 staff members have not completed biometric onboarding for new POS hardware.</div>
                         <Button variant="ghost" size="sm" className="h-7 w-full border border-white/10 text-white font-black italic text-[9px] gap-1 hover:bg-white/10 rounded-lg transition-all">
                            Send Reminder <ExternalLink className="w-3 h-3" />
                         </Button>
                      </div>
                   </div>
                </CardContent>
             </Card>

             <Card className="shadow-lg border-slate-200 rounded-3xl overflow-hidden">
                <CardHeader className="p-6">
                   <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Audit Log Stream</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-6">
                   {[
                     { user: "SA", action: "Updated Permissions", target: "Amelia Hart", time: "10m ago" },
                     { user: "SA", action: "Login Success", target: "Back Office", time: "1h ago" },
                     { user: "VL", action: "Policy Ack", target: "Retail Terminal", time: "3h ago" },
                   ].map((log, i) => (
                      <div key={i} className="flex gap-4 relative">
                         {i !== 2 && <div className="absolute left-[15px] top-10 bottom-0 w-px bg-slate-100" />}
                         <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center font-black italic text-slate-400 text-[9px] shrink-0">
                            {log.user}
                          </div>
                         <div>
                            <div className="text-[10px] font-black italic text-slate-900">{log.action}</div>
                            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">On: {log.target} • {log.time}</div>
                         </div>
                      </div>
                   ))}
                </CardContent>
             </Card>

             <Card className="shadow-xl bg-blue-600 text-white rounded-[2.5rem] overflow-hidden group border-4 border-blue-500">
                <CardContent className="p-8 text-center space-y-4">
                   <div className="bg-white/20 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 group-hover:rotate-6 transition-transform">
                      <ShieldCheck className="w-8 h-8" />
                   </div>
                   <div className="text-xl font-black italic tracking-tighter">Zenvix Vault Sync</div>
                   <p className="text-[10px] opacity-70 leading-relaxed font-bold italic">This location is currently synchronized with the Global HR directory. All local changes will reflect in core reports.</p>
                   <Button className="w-full bg-white text-blue-600 hover:bg-slate-100 font-black italic h-12 rounded-xl shadow-xl">Manual Force Sync</Button>
                </CardContent>
             </Card>
          </div>
        </div>
      </WorkspacePanel>
    </div>
  );
};

export default StaffAssignments;
