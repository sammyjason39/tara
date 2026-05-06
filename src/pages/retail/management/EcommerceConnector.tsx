import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  RefreshCw,
  Globe,
  ShoppingBag,
  Webhook,
  Activity,
  CheckCircle2,
  AlertCircle,
  PauseCircle,
  Zap,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/core/ui/PageHeader";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/core/security/session";
import {
  ecommerceHubService,
  type ChannelRecord,
} from "@/core/services/retail/ecommerceHubService";
import { CreateChannelDialog } from "./components/channels/CreateChannelDialog";
import { ChannelProfilePanel } from "./components/channels/ChannelProfilePanel";
import { cn } from "@/lib/utils";

const PLATFORM_ICON: Record<string, React.ElementType> = {
  HEADLESS: Globe,
  PRESET: ShoppingBag,
  PREMADE: Webhook,
};

const PLATFORM_COLOR: Record<string, string> = {
  HEADLESS: "bg-slate-100 text-slate-600",
  PRESET: "bg-blue-100 text-blue-600",
  PREMADE: "bg-emerald-100 text-emerald-600",
};

const PLATFORM_ACCENT: Record<string, string> = {
  HEADLESS: "border-slate-200 hover:border-slate-400",
  PRESET: "border-blue-100 hover:border-blue-400",
  PREMADE: "border-emerald-100 hover:border-emerald-400",
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-600",
  inactive: "bg-amber-50 text-amber-600",
  warning: "bg-red-50 text-red-600",
};

const STATUS_ICON: Record<string, React.ElementType> = {
  active: CheckCircle2,
  inactive: PauseCircle,
  warning: AlertCircle,
};

const EcommerceConnector = () => {
  const session = useSession();
  const sessionRef = React.useRef(session);
  sessionRef.current = session;
  const { toast } = useToast();
  const toastRef = React.useRef(toast);
  toastRef.current = toast;

  const [channels, setChannels] = useState<ChannelRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<ChannelRecord | null>(
    null,
  );

  const fetchChannels = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await ecommerceHubService.listChannels(sessionRef.current);
      setChannels(Array.isArray(data) ? data : []);
    } catch {
      toastRef.current({
        title: "Failed to load channels",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.tenant_id]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  // Keep selected channel in sync after updates
  const handleUpdated = useCallback(async () => {
    await fetchChannels();
    // Re-sync the selected channel data
    setSelectedChannel((prev) => {
      if (!prev) return null;
      return prev; // Will be refreshed via the channels state feed
    });
  }, [fetchChannels]);

  // Sync selected channel object when channels list refreshes
  useEffect(() => {
    if (selectedChannel) {
      const updated = channels.find((c) => c.id === selectedChannel.id);
      if (updated) setSelectedChannel(updated);
    }
  }, [channels]);

  const stats = useMemo(() => {
    const total = channels.length;
    const active = (Array.isArray(channels) ? channels : []).filter((c) => c.status === "active").length;
    const suspended = (Array.isArray(channels) ? channels : []).filter((c) => c.status === "inactive").length;
    return { total, active, suspended };
  }, [channels]);

  const kpis = [
    {
      label: "Total",
      value: stats.total,
      icon: Zap,
      color: "bg-slate-900 text-white",
    },
    {
      label: "Active",
      value: stats.active,
      icon: Activity,
      color: "bg-emerald-600 text-white",
    },
    {
      label: "Suspended",
      value: stats.suspended,
      icon: PauseCircle,
      color: "bg-white text-slate-700 border border-slate-100",
    },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* -- Header -- */}
      <div className="px-8 py-5 border-b bg-white shrink-0 flex items-center justify-between gap-6">
        <PageHeader
          title="Commerce Channels"
          subtitle={`${stats.active} active � ${stats.total} total channels connected`}
        />
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={fetchChannels}
            className="h-10 px-5 rounded-2xl border-slate-200 font-black italic uppercase tracking-widest text-[10px] gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button
            className="h-10 px-6 rounded-2xl bg-slate-900 text-white font-black italic uppercase tracking-widest text-[10px] gap-2 shadow-lg"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="w-4 h-4 text-emerald-400" /> Connect Channel
          </Button>
        </div>
      </div>

      {/* -- Body: Two-column layout -- */}
      <div className="flex-1 flex overflow-hidden">
        {/* -- LEFT: Channel List -- */}
        <div className="w-80 shrink-0 flex flex-col border-r bg-slate-50/60 overflow-hidden">
          {/* KPI strip */}
          <div className="grid grid-cols-3 gap-2 p-4 shrink-0">
            {(Array.isArray(kpis) ? kpis : []).map((k) => (
              <div
                key={k.label}
                className={cn(
                  "rounded-2xl px-3 py-3 flex flex-col items-center justify-center shadow-sm",
                  k.color,
                )}
              >
                <div className="text-2xl font-black italic tracking-tighter">
                  {k.value}
                </div>
                <div className="text-[9px] font-black uppercase tracking-widest opacity-60 mt-0.5">
                  {k.label}
                </div>
              </div>
            ))}
          </div>

          {/* Channel list */}
          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
            {isLoading ? (
              [1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-20 rounded-2xl bg-slate-200 animate-pulse"
                />
              ))
            ) : channels.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                  <ShoppingBag className="w-7 h-7 text-slate-300" />
                </div>
                <div className="font-black italic text-slate-500 text-sm">
                  No channels yet
                </div>
                <p className="text-xs font-bold text-slate-400 mt-1">
                  Connect a marketplace, headless storefront, or webhook bridge
                  to get started.
                </p>
              </div>
            ) : (
              (Array.isArray(channels) ? channels : []).map((ch) => {
                const Icon =
                  PLATFORM_ICON[ch.integrationCategory] ?? ShoppingBag;
                const iconColor =
                  PLATFORM_COLOR[ch.integrationCategory] ??
                  "bg-slate-100 text-slate-600";
                const accent =
                  PLATFORM_ACCENT[ch.integrationCategory] ??
                  "border-slate-200 hover:border-slate-400";
                const statusBadge =
                  STATUS_BADGE[ch.status ?? "active"] ??
                  "bg-slate-100 text-slate-600";
                const StatusIcon =
                  STATUS_ICON[ch.status ?? "active"] ?? CheckCircle2;
                const isSelected = selectedChannel?.id === ch.id;

                return (
                  <button
                    key={ch.id}
                    onClick={() => setSelectedChannel(ch)}
                    className={cn(
                      "w-full text-left rounded-2xl border-2 p-4 transition-all bg-white",
                      isSelected
                        ? "border-slate-900 shadow-lg ring-1 ring-slate-900/10"
                        : accent,
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                          iconColor,
                        )}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-black italic text-slate-900 text-sm truncate">
                          {ch.name}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 truncate">
                            {ch.adapterType ?? ch.integrationCategory}
                          </div>
                          {(ch as any).branchIds && (ch as any).branchIds.length > 0 && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-slate-200" />
                              <div className="flex items-center gap-1 text-[9px] font-black uppercase text-indigo-500 italic">
                                {(ch as any).branchIds.length} Nodes
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <Badge
                        className={cn(
                          "font-black italic text-[9px] border-none gap-1 shrink-0",
                          statusBadge,
                        )}
                      >
                        <StatusIcon className="w-3 h-3" />
                      </Badge>
                    </div>
                  </button>
                );
              })
            )}

            {/* Add new */}
            {channels.length > 0 && (
              <button
                onClick={() => setCreateOpen(true)}
                className="w-full rounded-2xl border-2 border-dashed border-slate-200 hover:border-slate-400 bg-transparent hover:bg-white transition-all p-4 flex items-center gap-3 group"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus className="w-4 h-4 text-slate-400" />
                </div>
                <span className="font-black italic text-slate-400 text-sm uppercase tracking-widest">
                  Connect Channel
                </span>
              </button>
            )}
          </div>
        </div>

        {/* -- RIGHT: Channel Profile Panel -- */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white relative">
          {selectedChannel && (
            <button
              onClick={() => setSelectedChannel(null)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/80 backdrop-blur border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors shadow-sm"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          )}
          <div className="flex-1 overflow-hidden">
            <ChannelProfilePanel
              channel={selectedChannel}
              session={session}
              onUpdated={handleUpdated}
              onClose={() => setSelectedChannel(null)}
            />
          </div>
        </div>
      </div>

      {/* -- Create Dialog -- */}
      <CreateChannelDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        session={session}
        onCreated={() => {
          setCreateOpen(false);
          fetchChannels();
        }}
      />
    </div>
  );
};

export default EcommerceConnector;
