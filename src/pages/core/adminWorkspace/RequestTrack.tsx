import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { Progress } from "@/components/ui/progress";

const items = [
  { id: "REQ-1201", title: "Laptop replacement", percent: 40, status: "Open" },
  { id: "REQ-1199", title: "New vendor onboarding", percent: 70, status: "Assigned" },
  { id: "REQ-1194", title: "Marketing budget increase", percent: 20, status: "Escalated" },
];

export default function RequestTrack() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      (Array.isArray(items) ? items : []).filter((item) =>
        search ? item.title.toLowerCase().includes(search.toLowerCase()) : true,
      ),
    [search],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Track Requests"
        subtitle="Track status and SLA for all admin requests."
        secondaryActions={
          <Input
            placeholder="Search requests"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-[220px]"
          />
        }
      />

      <WorkspacePanel title="Status" description="Progress with audit-friendly logs.">
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <DataTableShell total={filtered.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Request</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Progress</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-3 font-medium">{item.title}</td>
                  <td className="p-3 text-muted-foreground">{item.status}</td>
                  <td className="p-3">
                    <Progress value={item.percent} className="h-2" />
                    <p className="mt-1 text-xs text-muted-foreground">{item.percent}%</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>
    </div>
  );
}
