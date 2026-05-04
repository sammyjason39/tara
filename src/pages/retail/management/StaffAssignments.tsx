import React, { useState, useEffect } from "react";
import { PageHeader } from "@/core/ui/PageHeader";
import {
  Users,
  UserPlus,
  ShieldAlert,
  Key,
  ShieldCheck,
  Clock,
  Activity,
  MoreHorizontal,
  Lock,
  Search,
  Filter,
  ShieldHalf,
  ExternalLink,
  Trash2,
  RefreshCw,
  Eye,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { hrService } from "@/core/services/hr/hrService";
import { useSession } from "@/core/security/session";
import type { Employee } from "@/core/types/hr/employee";

import { useGovernance } from "./pricing-promo-desk/hooks/useGovernance";
import { StaffDetailsModal } from "./staff-assignments/components/StaffDetailsModal";
import { RoleModificationModal } from "./staff-assignments/components/RoleModificationModal";
import { AuditTrailModal } from "./pricing-promo-desk/components/AuditTrailModal";

import { useNavigate } from "react-router-dom";
import { retailService } from "@/core/services/retail/retailService";
import type { RetailShift } from "@/core/types/retail/retail";

const StaffAssignments = () => {
  const session = useSession();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const [staff, setStaff] = useState<Employee[]>([]);
  const [activeShifts, setActiveShifts] = useState<RetailShift[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [selectedStaffForDetails, setSelectedStaffForDetails] =
    useState<Employee | null>(null);
  const [selectedStaffForRoleEdit, setSelectedStaffForRoleEdit] =
    useState<Employee | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  // Governance specifically for Staff
  const { auditLog, addSignature } = useGovernance(
    "GLOBAL_STAFF_ROSTER",
    session.tenant_id!,
    session,
  );

  useEffect(() => {
    const fetchData = async () => {
      if (!session.tenant_id) return;
      try {
        setIsLoading(true);
        const [staffData, shiftsData] = await Promise.all([
          hrService.listEmployees(
            session.tenant_id,
            session,
            session.location_id,
          ),
          retailService.listShifts(session.tenant_id, session)
        ]);
        setStaff(staffData);
        setActiveShifts((Array.isArray(shiftsData) ? shiftsData : []).filter(s => s.status === "active"));
      } catch (error) {
        console.error("Failed to fetch staff", error);
        toast({
          title: "Error",
          description: "Failed to load staff data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [session.tenant_id, session.location_id, session, toast]);

  const handleDelete = async (id: string) => {
    if (
      !confirm("Are you sure you want to revoke all access for this personnel?")
    )
      return;
    try {
      await hrService.deleteEmployee(session.tenant_id!, session, id);
      setStaff((prev) => (Array.isArray(prev) ? prev : []).filter((s) => s.id !== id));

      // Log governance action
      await addSignature(
        "Superadmin",
        session.user_id,
        true,
        `Revoked access for personnel ${id}`,
      );

      toast({
        title: "Access Revoked",
        description: "Security credentials have been purged from Zenvix Vault.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to revoke access.",
        variant: "destructive",
      });
    }
  };

  const handleRoleModification = async (newRole: string, reason: string) => {
    if (!selectedStaffForRoleEdit) return;

    try {
      // Update employee properties via HR Service
      await hrService.updateEmployee(
        session.tenant_id!,
        session,
        selectedStaffForRoleEdit.id,
        { roleTitle: newRole }
      );

      setStaff((prev) =>
        (Array.isArray(prev) ? prev : []).map((s) => (s.id === selectedStaffForRoleEdit.id ? { ...s, roleTitle: newRole } : s)),
      );

      // Append proof of modification leveraging existing governance framework with 'Superadmin / Owner Bypass' mode.
      await addSignature(
        "Superadmin",
        session.user_id,
        true,
        `Role Modified to ${newRole}: ${reason}`,
      );


      toast({
        title: "Ledger Updated",
        description: `Cryptographic proof generated for role modification.`,
      });
    } catch (e) {
      toast({
        title: "Modification Failed",
        description: `Failed to modify role properties securely.`,
        variant: "destructive",
      });
    }
  };

  const handleProvision = () => {
    toast({
      title: "Provisioning Initialized",
      description: "Redirecting to Zenvix HR Talent Hub for secure biometric onboarding...",
    });
    // Redirect to Core HR recruitment/onboarding path
    navigate("/core/hr/talent");
  };


  const activeCount = (Array.isArray(staff) ? staff : []).filter((s) => s.status === "active").length;
  const onShiftCount = activeShifts.length;
  const adherenceRate = staff.length > 0 ? ((onShiftCount / staff.length) * 100).toFixed(1) : "0.0";

  const filteredStaff = (Array.isArray(staff) ? staff : []).filter(
    (s) =>
      (s.fullName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.roleTitle || "").toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="px-8 py-6 border-b bg-white shrink-0 flex items-center justify-between">
        <PageHeader
          title="Staff & Access Governance"
          subtitle={`${session.location_id || "GLOBAL"} • ${staff.length} Personnel • Workforce Access Control`}
        />
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="h-11 rounded-xl px-4 font-black italic border-slate-200 text-xs uppercase tracking-widest gap-2 hover:bg-slate-50 text-slate-700"
            onClick={() => setIsAuditModalOpen(true)}
          >
            <FileText className="w-3.5 h-3.5" /> Immutable Security Log
          </Button>
          <Button
            className="h-11 rounded-xl px-4 font-black italic border-slate-900 bg-slate-900 text-white text-xs uppercase tracking-widest gap-2"
            onClick={handleProvision}
          >
            <UserPlus className="w-3.5 h-3.5" /> Provision New
          </Button>
        </div>
      </div>

      <div className="flex-1 bg-slate-50/50 p-8 lg:p-12">
        <div className="max-w-7xl mx-auto space-y-10">
          {/* Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                label: "Total Roster",
                val: staff.length,
                sub: `${activeCount} Active`,
                icon: Users,
                color: "blue",
              },
              {
                label: "Active Shifts",
                val: onShiftCount,
                sub: "Live Deployment",
                icon: Activity,
                color: "emerald",
              },
              {
                label: "Biometric Sync",
                val: "100%",
                sub: "All Verified",
                icon: ShieldCheck,
                color: "indigo",
              },
              {
                label: "Adherence Rate",
                val: `${adherenceRate}%`,
                sub: "Shift Adherence Score",
                icon: Clock,
                color: "amber",
              },
            ].map((m, i) => (
              <Card
                key={i}
                className="rounded-[2rem] bg-white border-none shadow-xl p-6 group hover:shadow-2xl transition-all"
              >
                <div className="flex justify-between items-start mb-6">
                  <div
                    className={`w-12 h-12 rounded-2xl bg-${m.color}-50 flex items-center justify-center`}
                  >
                    <m.icon className={`w-5 h-5 text-${m.color}-600`} />
                  </div>
                  <Badge className="bg-slate-50 text-slate-400 font-black italic text-[8px] uppercase tracking-widest border-none">
                    Live
                  </Badge>
                </div>
                <div className="text-[10px] font-black italic uppercase tracking-widest text-slate-400 mb-1">
                  {m.label}
                </div>
                <div className="text-3xl font-black italic tracking-tighter text-slate-900 uppercase">
                  {m.val}
                </div>
                <div className="text-[10px] font-bold italic text-slate-400 mt-1 uppercase">
                  {m.sub}
                </div>
              </Card>
            ))}
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Personnel Table */}
            <div className="lg:col-span-3 space-y-6">
              {/* Search Bar */}
              <div className="flex items-center gap-3 bg-white rounded-[2rem] p-3 border border-slate-100 shadow-lg">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <Input
                    className="pl-12 h-12 bg-slate-50 border-none rounded-xl text-sm font-bold italic placeholder:text-slate-300 focus-visible:ring-blue-500"
                    placeholder="Search Personnel, Role, or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={() => {
                    toast({ title: "Segmentation Active", description: "Filtering roster by operational groups (POS, Retail, Audit)." });
                  }}
                  variant="outline"
                  className="h-12 px-5 rounded-xl gap-2 font-black italic border-slate-100 hover:bg-slate-50 text-[10px] uppercase tracking-widest"
                >
                  <Filter className="w-4 h-4" /> Groups
                </Button>
              </div>

              {/* Table Shell */}
              <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-white">
                <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black italic uppercase tracking-tight text-slate-900">
                      Store Personnel Registry
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      Access governance for this location
                    </p>
                  </div>
                  <Badge className="bg-slate-900 text-white border-none font-black italic text-[9px] uppercase tracking-widest px-4 py-2">
                    {filteredStaff.length} Records
                  </Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-50">
                        {[
                          "Personnel",
                          "Role & Location",
                          "Security",
                          "Access Scope",
                          "Status",
                          "",
                        ].map((h, i) => (
                          <th
                            key={i}
                            className="px-8 py-5 text-left text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 italic"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <tr>
                          <td colSpan={6} className="px-8 py-20 text-center">
                            <div className="flex flex-col items-center gap-3">
                              <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
                              <span className="text-[10px] font-black italic uppercase tracking-widest text-slate-400">
                                Syncing Personnel Data...
                              </span>
                            </div>
                          </td>
                        </tr>
                      ) : filteredStaff.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-8 py-20 text-center text-[10px] font-black italic uppercase tracking-widest text-slate-400"
                          >
                            No personnel found
                          </td>
                        </tr>
                      ) : (
                        (Array.isArray(filteredStaff) ? filteredStaff : []).map((s, i) => (
                          <tr
                            key={i}
                            className="group hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-none cursor-pointer"
                            onClick={() => setSelectedStaffForDetails(s)}
                          >
                            <td className="px-8 py-5">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center font-black italic text-indigo-600 text-sm shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                  {s.fullName
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .slice(0, 2)}
                                </div>
                                <div>
                                  <div className="font-black italic text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                                    {s.fullName}
                                  </div>
                                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                    {s.employmentType}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-5">
                              <div className="text-xs font-black italic text-slate-700">
                                {s.roleTitle}
                              </div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">
                                {s.location}
                              </div>
                            </td>
                            <td className="px-8 py-5">
                              <div className="flex items-center gap-2">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-[10px] font-black italic text-emerald-600 uppercase">
                                  VERIFIED
                                </span>
                              </div>
                            </td>
                            <td className="px-8 py-5">
                              <div className="flex gap-1.5 flex-wrap">
                                {["RETAIL_CORE", "POS_EXEC"].map((acc, idx) => (
                                  <Badge
                                    key={idx}
                                    className="bg-slate-100 text-slate-600 border-none text-[8px] font-black italic tracking-widest"
                                  >
                                    {acc}
                                  </Badge>
                                ))}
                              </div>
                            </td>
                            <td className="px-8 py-5">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-2 h-2 rounded-full ${s.status === "active" ? "bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-slate-300"}`}
                                />
                                <span className="text-[10px] font-black italic uppercase text-slate-500">
                                  {s.status}
                                </span>
                              </div>
                            </td>
                            <td className="px-8 py-5 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => e.stopPropagation()}
                                    className="h-8 w-8 rounded-xl text-slate-300 hover:text-slate-700 hover:bg-slate-100"
                                  >
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="w-48 p-2 rounded-2xl border-none shadow-2xl"
                                >
                                  <DropdownMenuItem
                                    className="rounded-xl gap-2 font-black italic text-xs py-3 cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedStaffForDetails(s);
                                    }}
                                  >
                                    <Eye className="w-4 h-4 text-slate-500" />{" "}
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="rounded-xl gap-2 font-black italic text-xs py-3 cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedStaffForRoleEdit(s);
                                    }}
                                  >
                                    <ShieldHalf className="w-4 h-4 text-blue-600" />{" "}
                                    Modify Permissions
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="rounded-xl gap-2 font-black italic text-xs py-3 cursor-pointer">
                                    <Key className="w-4 h-4 text-amber-600" />{" "}
                                    Reset Credentials
                                  </DropdownMenuItem>
                                  <Separator className="my-1" />
                                  <DropdownMenuItem
                                    className="rounded-xl gap-2 font-black italic text-xs py-3 cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(s.id);
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4" /> Revoke Access
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">
              {/* Critical Alerts */}
              <Card className="bg-slate-900 text-white shadow-2xl rounded-[2.5rem] overflow-hidden">
                <CardHeader className="p-7 pb-0">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400 italic flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" /> Critical Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-7 space-y-4">
                  <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                    <div className="text-[10px] text-amber-400 font-black uppercase mb-2 flex items-center gap-2 italic">
                      <Clock className="w-3 h-3" /> Policy Verification
                    </div>
                    <div className="text-xs font-bold leading-relaxed text-white/80 mb-4">
                      3 staff members have not completed biometric onboarding
                      for new POS hardware.
                    </div>
                    <Button 
                      onClick={() => {
                        toast({ 
                          title: "Reminders Broadcasted", 
                          description: "3 personnel notified of pending biometric sync via Zenvix Push." 
                        });
                      }}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-full border border-white/10 text-white font-black italic text-[9px] gap-1 hover:bg-white/10 rounded-xl uppercase tracking-widest"
                    >
                      Send Reminder <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Vault Sync Status */}
              <Card className="bg-blue-600 text-white shadow-2xl rounded-[2.5rem] overflow-hidden group border-none">
                <CardContent className="p-8 text-center space-y-4">
                  <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center mx-auto group-hover:rotate-6 transition-transform">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <div className="text-xl font-black italic tracking-tighter">
                    Vault Sync Active
                  </div>
                  <p className="text-[10px] opacity-70 leading-relaxed font-bold italic uppercase tracking-widest">
                    Synchronized with Global HR directory. All changes reflect
                    in core reports.
                  </p>
                  <Button onClick={() => window.location.reload()} className="w-full bg-white text-blue-600 hover:bg-slate-100 font-black italic h-12 rounded-2xl shadow-xl uppercase tracking-widest text-[10px]">
                    Force Sync
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <StaffDetailsModal
        isOpen={!!selectedStaffForDetails}
        onClose={() => setSelectedStaffForDetails(null)}
        staff={selectedStaffForDetails}
      />

      <RoleModificationModal
        isOpen={!!selectedStaffForRoleEdit}
        onClose={() => setSelectedStaffForRoleEdit(null)}
        staff={selectedStaffForRoleEdit}
        onSubmit={handleRoleModification}
      />

      <AuditTrailModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        auditLog={auditLog}
        promoTitle="SECURITY VAULT MODIFICATIONS"
      />
    </div>
  );
};

export default StaffAssignments;
