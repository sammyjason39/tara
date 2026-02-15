import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { useSession } from "@/core/security/session";
import { salesService } from "@/core/services/sales/salesService";

export default function SalesAuditLog() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const events = useMemo(
    () => salesService.listAuditEvents(session.tenantId),
    [session.tenantId],
  );
  const filtered = useMemo(
    () =>
      events.filter((item) =>
        search
          ? `${item.action} ${item.entityType} ${item.entityId} ${item.actorId} ${item.detail}`
              .toLowerCase()
              .includes(search.toLowerCase())
          : true,
      ),
    [events, search],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Audit Log"
        subtitle="Immutable operation events for stage transitions, approvals, and customer engagement actions."
        secondaryActions={
          <Input
            className="min-w-[220px]"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search audit events"
          />
        }
      />

      <WorkspacePanel title="Audit Events" description="Compliance trail for every material sales action.">
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <DataTableShell total={filtered.length} page={1} pageSize={20}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Time</th>
                <th className="p-3 text-left">Action</th>
                <th className="p-3 text-left">Entity</th>
                <th className="p-3 text-left">Actor</th>
                <th className="p-3 text-left">Detail</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-3 text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString()}
                  </td>
                  <td className="p-3">
                    <Badge variant="outline">{item.action}</Badge>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {item.entityType} / {item.entityId}
                  </td>
                  <td className="p-3 text-muted-foreground">{item.actorId}</td>
                  <td className="p-3">{item.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>
    </div>
  );
}
