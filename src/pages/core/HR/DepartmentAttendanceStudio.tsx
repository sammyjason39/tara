import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { PageShell } from "@/core/ui/PageShell";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  Search, 
  Filter, 
  Calendar,
  UserCheck,
  UserX,
  AlertCircle,
  FileSpreadsheet
} from "lucide-react";
import { useSession } from "@/core/security/session";
import { useToast } from "@/hooks/use-toast";

import { useDepartmentalGovernance } from "@/core/hooks/useDepartmentalGovernance";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

interface AttendanceStudioProps {
  workspaceDeptId: string;
  title: string;
}

/**
 * DepartmentAttendanceStudio
 * Unified interface for managing departmental attendance records.
 * Supports HOD adjustments and HR global visibility.
 */
export default function DepartmentAttendanceStudio({ 
  workspaceDeptId, 
  title,
  noShell = false
}: { workspaceDeptId: string; title: string; noShell?: boolean }) {
  const session = useSession();
  const { toast } = useToast();
  const { canManagePersonnel, userDepartmentId } = useDepartmentalGovernance();
  const [selectedDeptId, setSelectedDeptId] = useState(workspaceDeptId);
  const [searchQuery, setSearchQuery] = useState("");

  // Mock data - In a real app, this would come from an API filtered by department
  const [records, setRecords] = useState([
    { id: "1", name: "John Doe", role: "Specialist", checkIn: "08:00 AM", checkOut: "05:00 PM", status: "Present", hours: 9 },
    { id: "2", name: "Jane Smith", role: "Lead", checkIn: "08:15 AM", checkOut: "---", status: "On Duty", hours: 0 },
    { id: "3", name: "Bob Wilson", role: "Junior", checkIn: "---", checkOut: "---", status: "Absent", hours: 0 },
    { id: "4", name: "Alice Brown", role: "Manager", checkIn: "09:00 AM", checkOut: "06:00 PM", status: "Late", hours: 9 },
  ]);

  const filteredRecords = useMemo(() => {
    return records.filter(r => 
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.role.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [records, searchQuery]);

  const handleAdjust = (id: string) => {
    toast({
      title: "Adjustment Logged",
      description: `Manual attendance adjustment for ${records.find(r => r.id === id)?.name} has been recorded and queued for audit.`,
    });
  };

  const content = (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={UserCheck} label="Present" value="12" color="emerald" />
        <StatCard icon={Clock} label="Late" value="2" color="amber" />
        <StatCard icon={UserX} label="Absent" value="1" color="rose" />
        <StatCard icon={AlertCircle} label="Anomalies" value="0" color="slate" />
      </div>

      <WorkspacePanel title="Personnel Attendance Matrix">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search staff by name or role..." 
                className="pl-9 bg-white/[0.03] border-white/5 text-foreground placeholder:text-muted-foreground/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="ghost" size="icon" className="rounded-full text-foreground hover:bg-white/10">
              <Filter className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full text-foreground hover:bg-white/10">
              <Calendar className="h-4 w-4" />
            </Button>
          </div>

          <div className="rounded-2xl border border-white/5 overflow-hidden bg-slate-950/40 backdrop-blur-md">
            <Table>
              <TableHeader>
                <TableRow className="bg-white/[0.02] border-b border-white/5 hover:bg-white/[0.02]">
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Personnel</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Check-In</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Check-Out</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-right text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id} className="hover:bg-white/[0.02] border-b border-white/5 transition-colors">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm tracking-tight text-foreground">{record.name}</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{record.role}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-foreground">{record.checkIn}</TableCell>
                    <TableCell className="font-mono text-xs text-foreground">{record.checkOut}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 border-none",
                          record.status === "Present" && "bg-emerald-500/10 text-emerald-400",
                          record.status === "On Duty" && "bg-sky-500/10 text-sky-400",
                          record.status === "Absent" && "bg-rose-500/10 text-rose-400",
                          record.status === "Late" && "bg-amber-500/10 text-amber-400"
                        )}
                      >
                        {record.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-[10px] font-black uppercase tracking-widest text-foreground hover:bg-white/10 rounded-lg px-3"
                        onClick={() => handleAdjust(record.id)}
                      >
                        Adjust
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </WorkspacePanel>
    </div>
  );

  if (noShell) return content;

  return (
    <PageShell
      header={
        <PageHeader
          title={`${title} Attendance`}
          subtitle={`Governance, verification, and audit of personnel presence for the ${workspaceDeptId} department.`}
          primaryAction={
            <div className="flex items-center gap-2">
              {canManagePersonnel && (
                <Select value={selectedDeptId} onValueChange={setSelectedDeptId}>
                  <SelectTrigger className="w-[180px] bg-slate-900/60 border-white/5 text-foreground shadow-sm hover:bg-slate-900/80">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950 border-white/5">
                    <SelectItem value="FINANCE">Finance</SelectItem>
                    <SelectItem value="HR">Human Resources</SelectItem>
                    <SelectItem value="IT">IT Support</SelectItem>
                    <SelectItem value="PROCUREMENT">Procurement</SelectItem>
                    <SelectItem value="LOGISTICS">Logistics</SelectItem>
                    <SelectItem value="INVENTORY">Inventory</SelectItem>
                    <SelectItem value="SALES">Sales</SelectItem>
                    <SelectItem value="MARKETING">Marketing</SelectItem>
                    <SelectItem value="RETAIL">Retail</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <Button variant="outline" className="gap-2 border-white/5 hover:bg-white/10 text-foreground">
                <FileSpreadsheet className="h-4 w-4" /> Export Report
              </Button>
            </div>
          }
        />
      }
    >
      {content}
    </PageShell>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType, label: string, value: string, color: string }) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    rose: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    slate: "text-slate-400 bg-slate-500/10 border-slate-500/20",
  };

  return (
    <div className="bg-white/[0.03] border border-white/5 p-4 rounded-3xl shadow-2xl backdrop-blur-md flex items-center gap-4">
      <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center border", colorMap[color])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-none mb-1">{label}</span>
        <span className="text-xl font-black italic tracking-tighter leading-none text-foreground">{value}</span>
      </div>
    </div>
  );
}


