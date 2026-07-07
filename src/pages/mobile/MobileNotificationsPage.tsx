import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Bell, BellOff, Megaphone, Lock } from "lucide-react";
import { formatDateTime } from "@/lib/dates";
import { cn, truncatePreview } from "@/lib/utils";

export function MobileNotificationsPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["my-notifications"],
    queryFn: () => api.get("/notifications/my-notifications"),
    placeholderData: { data: [] },
  });

  const notifications = data?.data || [];
  const unread = notifications.filter((n: any) => !n.is_read).length;

  const markAllRead = async () => {
    try {
      await api.put("/notifications/mark-all-read");
      await queryClient.invalidateQueries({ queryKey: ["my-notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Semua notifikasi ditandai sudah dibaca");
    } catch (err: any) {
      toast.error(err?.message || "Gagal menandai notifikasi");
    }
  };

  return (
    <div className="px-5 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-display font-semibold">Notifikasi</h1>
        {unread > 0 && (
          <button onClick={markAllRead} className="text-xs text-gold hover:text-gold/80">
            Tandai semua dibaca
          </button>
        )}
      </div>

      {isLoading ? (
        Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="surface-elevated p-4 animate-pulse overflow-hidden">
            <div className="flex gap-3">
              <div className="h-9 w-9 rounded-full bg-muted shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-32 bg-muted rounded" />
                <div className="h-3 w-full bg-muted/50 rounded" />
              </div>
            </div>
          </div>
        ))
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <BellOff className="h-12 w-12 text-muted-foreground/20 mb-3" />
          <p className="text-sm text-muted-foreground">Belum ada notifikasi</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n: any) => {
            const isExpanded = expandedId === n.id;
            const preview = truncatePreview(n.content || "", 120);
            const showExpandHint = (n.content || "").trim().length > preview.length;

            return (
              <button
                key={n.id}
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : n.id)}
                className={cn(
                  "w-full text-left surface-elevated p-4 overflow-hidden isolate",
                  !n.is_read && "border-l-2 border-l-gold",
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "h-9 w-9 rounded-full flex items-center justify-center shrink-0",
                      n.visibility === "public" ? "bg-info/10" : "bg-gold/10",
                    )}
                  >
                    {n.visibility === "public" ? (
                      <Megaphone className="h-4 w-4 text-info" />
                    ) : n.notification_type?.includes("warning") ? (
                      <Lock className="h-4 w-4 text-destructive" />
                    ) : (
                      <Bell className="h-4 w-4 text-gold" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm leading-snug break-words", !n.is_read && "font-medium")}>
                      {n.title}
                    </p>
                    <p className="text-2xs text-muted-foreground mt-1 break-words whitespace-pre-wrap">
                      {isExpanded ? n.content : preview}
                    </p>
                    <p className="text-2xs text-muted-foreground/60 mt-1.5">
                      {formatDateTime(n.created_at)}
                    </p>
                    {isExpanded && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <p className="text-2xs text-muted-foreground">
                          Tipe: {n.notification_type || "—"}
                        </p>
                      </div>
                    )}
                    {!isExpanded && showExpandHint && (
                      <p className="text-2xs text-gold/80 mt-1">Tap untuk lihat selengkapnya</p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
