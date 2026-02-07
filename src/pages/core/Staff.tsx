import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageShell } from "@/core/ui/PageShell";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import FilterBar from "@/core/tools/FilterBar";
import DataTableShell from "@/core/tools/DataTableShell";
import { UserPlus } from "lucide-react";

type StaffRow = {
  id: string;
  name: string;
  role: string;
  location: string;
  status: "Active" | "Inactive" | "On Leave";
};

const staffRows: StaffRow[] = [
  {
    id: "1",
    name: "Amelia Hart",
    role: "Regional Manager",
    location: "West Operations",
    status: "Active",
  },
  {
    id: "2",
    name: "Victor Lim",
    role: "Finance Controller",
    location: "HQ Finance",
    status: "Active",
  },
  {
    id: "3",
    name: "Sofia Ramirez",
    role: "Compliance Lead",
    location: "Risk & Governance",
    status: "On Leave",
  },
  {
    id: "4",
    name: "Jonas Keller",
    role: "Operations Analyst",
    location: "Central Ops",
    status: "Inactive",
  },
];

const statusTone = (status: StaffRow["status"]) => {
  switch (status) {
    case "Active":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "On Leave":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "Inactive":
    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
};

export default function CoreStaff() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = staffRows.filter((row) => {
    const matchesSearch =
      row.name.toLowerCase().includes(search.toLowerCase()) ||
      row.role.toLowerCase().includes(search.toLowerCase()) ||
      row.location.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || row.role === roleFilter;
    const matchesStatus = statusFilter === "all" || row.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <PageShell
      header={
        <PageHeader
          title="Staff Directory"
          subtitle="Manage roles, assignments, and access for every team member."
          primaryAction={
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Staff
            </Button>
          }
        />
      }
      right={
        <div className="p-4">
          <WorkspacePanel
            title="Staff profile"
            description="Select a team member to view details, assignments, and access."
          >
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              No staff selected
            </div>
          </WorkspacePanel>
        </div>
      }
    >
      <div className="space-y-6">
        <WorkspacePanel
          title="Directory"
          description="Search across people, roles, and operating units."
        >
          <FilterBar
            searchPlaceholder="Search by name, role, or location"
            onSearchChange={setSearch}
            actions={
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All roles</SelectItem>
                    <SelectItem value="Regional Manager">Regional Manager</SelectItem>
                    <SelectItem value="Finance Controller">Finance Controller</SelectItem>
                    <SelectItem value="Compliance Lead">Compliance Lead</SelectItem>
                    <SelectItem value="Operations Analyst">Operations Analyst</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="On Leave">On Leave</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            }
          />

          {filtered.length === 0 ? (
            <div className="mt-6 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
              <p className="font-medium text-foreground">No staff members found</p>
              <p>Try adjusting filters or add a new team member.</p>
              <Button variant="outline" className="mt-2">
                Add Staff
              </Button>
            </div>
          ) : (
            <div className="mt-6">
              <DataTableShell>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[32%]">Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((row) => (
                      <TableRow key={row.id} className="hover:bg-muted/40">
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell className="text-muted-foreground">{row.role}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.location}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={statusTone(row.status)}
                          >
                            {row.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </DataTableShell>
            </div>
          )}
        </WorkspacePanel>
      </div>
    </PageShell>
  );
}
