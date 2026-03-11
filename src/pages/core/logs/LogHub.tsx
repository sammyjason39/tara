import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { useSession } from "@/core/security/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Search, Info, Loader2 } from "lucide-react";

export default function LogHub() {
  const session = useSession();
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);

  const [filters, setFilters] = useState({
    module: "",
    level: "ALL",
    event: "",
    userId: "",
    startDate: "",
    endDate: "",
  });

  const [selectedLog, setSelectedLog] = useState<any>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(filters.module && { module: filters.module }),
        ...(filters.level !== "ALL" && { level: filters.level }),
        ...(filters.event && { event: filters.event }),
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      });

      const response = await fetch(`/api/logs?${queryParams}`, {
        headers: {
          Authorization: `Bearer ${session.token}`,
          "x-tenant-id": session.tenantId,
        },
      });
      const result = await response.json();
      setLogs(result.data || []);
      setTotal(result.total || 0);
    } catch (error) {
      console.error("Failed to fetch system logs:", error);
    } finally {
      setLoading(false);
    }
  }, [session, page, limit, filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case "ERROR":
      case "FATAL":
        return <Badge variant="destructive">{level}</Badge>;
      case "WARN":
        return <Badge className="bg-amber-500 hover:bg-amber-600">WARN</Badge>;
      case "DEBUG":
        return <Badge variant="outline">DEBUG</Badge>;
      default:
        return <Badge variant="secondary">INFO</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Logs"
        subtitle="Centralized diagnostics for API requests, background jobs, and application errors."
      />

      <WorkspacePanel title="System Diagnostics">
        <form onSubmit={handleSearch} className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6 items-end">
          <div className="space-y-2">
            <label className="text-xs font-medium">Module</label>
            <Input 
              placeholder="Module" 
              value={filters.module} 
              onChange={(e) => setFilters({ ...filters, module: e.target.value })} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium">Level</label>
            <Select 
              value={filters.level} 
              onValueChange={(v) => setFilters({ ...filters, level: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">ALL</SelectItem>
                <SelectItem value="DEBUG">DEBUG</SelectItem>
                <SelectItem value="INFO">INFO</SelectItem>
                <SelectItem value="WARN">WARN</SelectItem>
                <SelectItem value="ERROR">ERROR</SelectItem>
                <SelectItem value="FATAL">FATAL</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium">Event</label>
            <Input 
              placeholder="Event name" 
              value={filters.event} 
              onChange={(e) => setFilters({ ...filters, event: e.target.value })} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium">User ID</label>
            <Input 
              placeholder="UUID" 
              value={filters.userId} 
              onChange={(e) => setFilters({ ...filters, userId: e.target.value })} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium">Start Date</label>
            <Input 
              type="date" 
              value={filters.startDate} 
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium">End Date</label>
            <Input 
              type="date" 
              value={filters.endDate} 
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} 
            />
          </div>
          <Button type="submit">
            <Search className="h-4 w-4 mr-2" /> Search
          </Button>
        </form>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Date/Time</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead className="text-right">Dur (ms)</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      No system logs found matching your criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow 
                      key={log.id} 
                      className="cursor-pointer hover:bg-muted/30"
                      onClick={() => setSelectedLog(log)}
                    >
                      <TableCell className="font-mono text-[10px] whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>{getLevelBadge(log.level)}</TableCell>
                      <TableCell className="capitalize text-xs font-medium">{log.module}</TableCell>
                      <TableCell className="text-xs truncate max-w-[120px]">{log.event}</TableCell>
                      <TableCell className="text-xs truncate max-w-[200px]">{log.message}</TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {log.durationMs || "-"}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon">
                          <Info className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Total results: {total}
          </div>
          <div className="flex gap-2 items-center">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={page === 1} 
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span className="text-sm font-medium">
              Page {page} of {Math.ceil(total / limit) || 1}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={page >= Math.ceil(total / limit)} 
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </WorkspacePanel>

      <Sheet open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>System Log Detail</SheetTitle>
          </SheetHeader>
          {selectedLog && (
            <div className="space-y-6 mt-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-xs text-muted-foreground block">Level</label>
                  {getLevelBadge(selectedLog.level)}
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block">Module</label>
                  <span className="font-medium capitalize">{selectedLog.module}</span>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block">Event</label>
                  <code className="bg-muted px-1 rounded text-xs">{selectedLog.event}</code>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block">Duration</label>
                  <span className="text-xs">{selectedLog.durationMs ? `${selectedLog.durationMs}ms` : "N/A"}</span>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground block">Message</label>
                  <span className="text-sm">{selectedLog.message}</span>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block">Request ID</label>
                  <span className="font-mono text-xs">{selectedLog.requestId || "N/A"}</span>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block">User ID</label>
                  <span className="font-mono text-xs">{selectedLog.userId || "N/A"}</span>
                </div>
              </div>

              {selectedLog.payload && (
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground block">Payload</label>
                  <div className="bg-slate-950 text-slate-50 p-3 rounded-md text-xs font-mono overflow-x-auto">
                    <pre>{JSON.stringify(selectedLog.payload, null, 2)}</pre>
                  </div>
                </div>
              )}

              {selectedLog.errorStack && (
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground block">Error Stack</label>
                  <div className="bg-red-950/20 border border-red-500/20 text-red-100 p-3 rounded-md text-[10px] font-mono whitespace-pre overflow-x-auto leading-tight">
                    {selectedLog.errorStack}
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
