import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Bell, BellOff, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function NotificationsPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get("/notifications/my-notifications"),
    placeholderData: { data: [] },
  });

  const notifications = data?.data || [];

  const handleMarkAllRead = async () => {
    try {
      await api.put("/notifications/mark-all-read");
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["my-notifications"] });
      toast.success("Semua notifikasi ditandai sudah dibaca");
    } catch (err: any) {
      toast.error(err?.message || "Gagal menandai notifikasi");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-luxury-heading text-2xl">Notifikasi</h1>
          <p className="text-sm text-muted-foreground mt-1">Pusat notifikasi dan pengumuman</p>
        </div>
        <button
          onClick={handleMarkAllRead}
          className="flex items-center gap-2 px-3 py-2 rounded-md text-sm border border-input hover:bg-accent transition-colors"
        >
          <CheckCheck className="h-4 w-4 text-muted-foreground" />
          Tandai semua dibaca
        </button>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="surface-elevated p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 bg-muted rounded" />
                  <div className="h-3 w-full bg-muted/60 rounded" />
                </div>
              </div>
            </div>
          ))
        ) : notifications.length === 0 ? (
          <div className="surface-elevated p-12 text-center">
            <BellOff className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Tidak ada notifikasi</p>
          </div>
        ) : (
          notifications.map((n: any) => (
            <div
              key={n.id}
              onClick={() => setExpandedId(expandedId === n.id ? null : n.id)}
              className={cn(
                "surface-elevated p-4 hover:shadow-luxury-md transition-shadow cursor-pointer",
                !n.is_read && "border-l-2 border-l-gold"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                  n.visibility === "public" ? "bg-info/10" : "bg-gold/10"
                )}>
                  <Bell className={cn("h-4 w-4", n.visibility === "public" ? "text-info" : "text-gold")} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn("text-sm", !n.is_read && "font-medium")}>{n.title}</p>
                    <span className="text-2xs text-muted-foreground whitespace-nowrap">
                      {n.created_at && new Date(n.created_at).toLocaleDateString("id-ID")}
                    </span>
                  </div>
                  <p className={cn("text-xs text-muted-foreground mt-1", expandedId !== n.id && "line-clamp-2")}>{n.content}</p>

                  {expandedId === n.id && (
                    <div className="mt-3 pt-3 border-t border-border/50 animate-fade-in">
                      <div className="space-y-2 text-sm">
                        {n.content && <p>{n.content}</p>}
                        {n.metadata && (
                          <div className="text-xs text-muted-foreground">
                            <p>Tipe: {n.notification_type || n.visibility || "—"}</p>
                            {n.related_entity_type && <p>Referensi: {n.related_entity_type}</p>}
                          </div>
                        )}
                        <p className="text-2xs text-muted-foreground">
                          Dibuat: {n.created_at ? new Date(n.created_at).toLocaleString("id-ID") : "—"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
