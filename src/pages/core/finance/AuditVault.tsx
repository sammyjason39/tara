// src/pages/core/finance/AuditVault.tsx
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { useSession } from "@/core/security/session";
import { logService } from "@/core/services/finance/logService";

export default function AuditVault() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Fetch audit logs
  const logs = useMemo(() => logService.listLogs(session.tenantId), [session]);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = search
      ? log.action.toLowerCase().includes(search.toLowerCase()) ||
        log.userId.toLowerCase().includes(search.toLowerCase())
      : true;

    const matchesFrom = dateFrom
      ? new Date(log.timestamp) >= new Date(dateFrom)
      : true;
    const matchesTo = dateTo
      ? new Date(log.timestamp) <= new Date(dateTo)
      : true;

    return matchesSearch && matchesFrom && matchesTo;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Vault"
        subtitle="Complete audit trail of finance operations, approvals, payments, and policy changes."
      />

      <WorkspacePanel
        title="Filters"
        description="Search and filter audit logs by user, action, or date range."
      >
        <div className="flex flex-wrap gap-3 items-center">
          <Input
            placeholder="Search by user or action"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-[220px]"
          />
          <Input
            type="date"
            placeholder="From"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <Input
            type="date"
            placeholder="To"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
          <Button
            onClick={() => {
              setSearch("");
              setDateFrom("");
              setDateTo("");
            }}
          >
            Clear Filters
          </Button>
        </div>
      </WorkspacePanel>

      <WorkspacePanel
        title="Audit Logs"
        description="All actions logged in the finance system, fully auditable and traceable."
      >
        <DataTableShell total={filteredLogs.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Timestamp</th>
                <th className="p-3 text-left">User</th>
                <th className="p-3 text-left">Action</th>
                <th className="p-3 text-left">Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} className="border-t">
                  <td className="p-3">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="p-3 font-medium">{log.userId}</td>
                  <td className="p-3 text-muted-foreground">{log.action}</td>
                  <td className="p-3">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>
    </div>
  );
}
