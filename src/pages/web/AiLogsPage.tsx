import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Bot, MessageSquare, Zap, Activity, ChevronLeft, ChevronRight,
} from "lucide-react";
import { formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

export function AiLogsPage() {
  const [page, setPage] = useState(1);
  const { data: stats } = useQuery({
    queryKey: ["ai-log-stats"],
    queryFn: () => api.get("/admin/ai/logs/stats?days=30"),
  });
  const { data, isLoading } = useQuery({
    queryKey: ["ai-logs", page],
    queryFn: () => api.get(`/admin/ai/logs?page=${page}&limit=30`),
  });

  const logs = data?.data?.items || [];
  const pages = data?.data?.pages || 1;
  const s = stats?.data || {};

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-luxury-heading text-2xl">Log AI Agent</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Riwayat percakapan WhatsApp AI — retensi 90 hari
          </p>
        </div>
        <Link
          to="/web/settings"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← Pengaturan AI Agent
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total (30 hari)", value: s.total_conversations ?? 0, icon: Activity },
          { label: "Sukses", value: s.success_count ?? 0, icon: Bot },
          { label: "Error", value: s.error_count ?? 0, icon: MessageSquare },
          { label: "Avg Latency", value: `${s.avg_latency_ms ?? 0}ms`, icon: Zap },
        ].map((item) => (
          <div key={item.label} className="surface-elevated p-4">
            <item.icon className="h-4 w-4 text-gold mb-2" />
            <p className="text-lg font-semibold">{item.value}</p>
            <p className="text-2xs text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="surface-elevated overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 text-left text-2xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Waktu</th>
                <th className="px-4 py-3 font-medium">Karyawan</th>
                <th className="px-4 py-3 font-medium">Pesan User</th>
                <th className="px-4 py-3 font-medium">Balasan AI</th>
                <th className="px-4 py-3 font-medium">Tools</th>
                <th className="px-4 py-3 font-medium">Tokens</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Memuat...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Belum ada log AI</td></tr>
              ) : logs.map((log: any) => (
                <tr key={log.id} className="border-b border-border/30 hover:bg-accent/30">
                  <td className="px-4 py-3 text-2xs whitespace-nowrap">
                    {formatDateTime(log.created_at)}
                  </td>
                  <td className="px-4 py-3">{log.employee?.full_name || "—"}</td>
                  <td className="px-4 py-3 max-w-[180px] truncate text-2xs">{log.user_message}</td>
                  <td className="px-4 py-3 max-w-[180px] truncate text-2xs">{log.assistant_message}</td>
                  <td className="px-4 py-3 text-2xs font-mono">
                    {(log.tools_called as string[])?.join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-2xs">
                    {(log.input_tokens || 0) + (log.output_tokens || 0)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "text-2xs px-2 py-0.5 rounded-full",
                      log.status === "success" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
                    )}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}
              className="flex items-center gap-1 text-xs disabled:opacity-40">
              <ChevronLeft className="h-3 w-3" /> Sebelumnya
            </button>
            <span className="text-2xs text-muted-foreground">{page} / {pages}</span>
            <button disabled={page >= pages} onClick={() => setPage(page + 1)}
              className="flex items-center gap-1 text-xs disabled:opacity-40">
              Selanjutnya <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export { AiAgentSettingsSection as AiAssistantSection } from "./AiAgentSettingsSection";
