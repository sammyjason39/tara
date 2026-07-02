import { useAuth } from "@/contexts/AuthContext";
import { useFeatureFlags } from "@/contexts/FeatureFlagsContext";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { CalendarDays, Clock, ChevronRight, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileHomePage() {
  const { user } = useAuth();
  const { isEnabled } = useFeatureFlags();
  const navigate = useNavigate();

  const { data: balance } = useQuery({
    queryKey: ["my-balance"],
    queryFn: () => api.get("/leaves/my-balance"),
    placeholderData: { data: { remaining_days: 0, total_entitlement: 12 } },
  });

  const { data: notifications } = useQuery({
    queryKey: ["my-notifications"],
    queryFn: () => api.get("/notifications/my-notifications"),
    placeholderData: { data: [] },
  });

  const bal = balance?.data || { remaining_days: 0, total_entitlement: 12 };
  const notifs = notifications?.data || [];
  const unread = notifs.filter((n: any) => !n.is_read).length;

  const hour = new Date().getHours();
  const greeting = hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : hour < 18 ? "Selamat sore" : "Selamat malam";

  return (
    <div className="px-5 py-6 space-y-6 animate-fade-in">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-luxury">{greeting}</p>
          <h1 className="text-xl font-display font-semibold">{user?.full_name || "Karyawan"}</h1>
        </div>
        {isEnabled("notifications") && (
        <button onClick={() => navigate("/m/notifications")} className="relative p-2 rounded-md hover:bg-accent">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unread > 0 && <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-gold" />}
        </button>
        )}
      </div>

      {/* Clock In/Out Button */}
      {isEnabled("attendance") && (
      <button onClick={() => navigate("/m/clock")} className="w-full surface-elevated p-6 flex flex-col items-center space-y-4">
        <p className="text-luxury-label">Status Kehadiran</p>
        <div className={cn("h-24 w-24 rounded-full flex items-center justify-center",
          "bg-gradient-to-br from-gold/20 to-gold/5 border-2 border-gold/40")}>
          <Clock className="h-8 w-8 text-gold" />
        </div>
        <p className="text-sm text-muted-foreground">Ketuk untuk masuk ke halaman absen</p>
      </button>
      )}

      {/* Leave Balance Card */}
      {isEnabled("leave") && (
      <button onClick={() => navigate("/m/leave")} className="w-full text-left surface-elevated p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-luxury-label">Saldo Cuti</span>
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-semibold">{bal.remaining_days}</span>
          <span className="text-sm text-muted-foreground">/ {bal.total_entitlement} hari</span>
        </div>
        <div className="divider-luxury" />
        <div className="flex items-center justify-between text-sm text-muted-foreground pt-1">
          <span>Ajukan Cuti</span>
          <ChevronRight className="h-4 w-4" />
        </div>
      </button>
      )}

      {/* Recent Notifications */}
      {isEnabled("notifications") && (
      <div className="space-y-3">
        <h2 className="text-luxury-label">Notifikasi Terbaru</h2>
        {notifs.length === 0 ? (
          <div className="surface-inset p-4 text-sm text-muted-foreground text-center">Belum ada notifikasi</div>
        ) : (
          notifs.slice(0, 3).map((n: any) => (
            <button key={n.id} onClick={() => navigate("/m/notifications")}
              className={cn("w-full text-left surface-elevated p-3", !n.is_read && "border-l-2 border-l-gold")}>
              <p className={cn("text-sm", !n.is_read && "font-medium")}>{n.title}</p>
              <p className="text-2xs text-muted-foreground mt-0.5 line-clamp-1">{n.content}</p>
            </button>
          ))
        )}
      </div>
      )}
    </div>
  );
}
