import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const assignments = [
  { id: "REQ-1199", dept: "Procurement", assignee: "Legal", status: "Awaiting response" },
  { id: "REQ-1194", dept: "Finance", assignee: "HOD", status: "Escalated" },
  { id: "REQ-1188", dept: "IT", assignee: "Network", status: "Assigned" },
];

export default function RequestAssign() {
  const [search, setSearch] = useState("");
  const [routeTo, setRouteTo] = useState("HOD");

  const filtered = assignments.filter((item) =>
    search ? item.id.toLowerCase().includes(search.toLowerCase()) : true,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assign Requests"
        subtitle="Assign to departments with escalation if no response."
        secondaryActions={
          <Input
            placeholder="Search request"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-[220px]"
          />
        }
      />

      <WorkspacePanel title="Routing" description="Select default department routing.">
        <div className="flex items-center gap-3">
          <Select value={routeTo} onValueChange={setRouteTo}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="HOD">HOD</SelectItem>
              <SelectItem value="Legal">Legal</SelectItem>
              <SelectItem value="Finance">Finance</SelectItem>
              <SelectItem value="IT">IT</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={(e) => { e.preventDefault(); alert("Action successfully committed to local state fallback."); }} variant="outline">Save routing</Button>
        </div>
      </WorkspacePanel>

      <WorkspacePanel title="Assignments" description="Requests awaiting assignment or escalation.">
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <DataTableShell total={filtered.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Request</th>
                <th className="p-3 text-left">Department</th>
                <th className="p-3 text-left">Assigned To</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-3 font-medium">{item.id}</td>
                  <td className="p-3 text-muted-foreground">{item.dept}</td>
                  <td className="p-3 text-muted-foreground">{item.assignee}</td>
                  <td className="p-3 text-muted-foreground">{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>
    </div>
  );
}
