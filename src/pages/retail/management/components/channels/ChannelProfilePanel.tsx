import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  RefreshCw,
  Trash2,
  PauseCircle,
  PlayCircle,
  Copy,
  CheckCircle2,
  Globe,
  Webhook,
  ShoppingBag,
  Save,
  Settings2,
  LayoutGrid,
  Zap,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  ecommerceHubService,
  type ChannelRecord,
} from "@/core/services/retail/ecommerceHubService";
import type { SessionContext } from "@/core/security/session";
import { MarketplaceSettingsPanel } from "./MarketplaceSettingsPanel";
import { HeadlessSettingsPanel } from "./HeadlessSettingsPanel";
import { WebhookSettingsPanel } from "./WebhookSettingsPanel";
import { WebhookBridgeSettingsPanel } from "./WebhookBridgeSettingsPanel";

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  HEADLESS: Globe,
  PRESET: ShoppingBag,
  PREMADE: Webhook,
};

const PLATFORM_BG: Record<string, string> = {
  HEADLESS: "bg-slate-700",
  PRESET: "bg-blue-700",
  PREMADE: "bg-emerald-700",
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: "bg-emerald-50 text-emerald-600" },
  inactive: { label: "Suspended", color: "bg-amber-50 text-amber-600" },
  warning: { label: "Warning", color: "bg-red-50 text-red-600" },
};

interface Props {
  channel: ChannelRecord | null;
  session: SessionContext;
  onUpdated: () => void;
  onClose: () => void;
}

export const ChannelProfilePanel: React.FC<Props> = ({
  channel,
  session,
  onUpdated,
  onClose,
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [isSaving, setIsSaving] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [syncFreq, setSyncFreq] = useState("1h");
  const [rotatedCreds, setRotatedCreds] = useState<{
    clientId: string;
    clientSecret: string;
  } | null>(null);

  useEffect(() => {
    if (channel) {
      setSyncFreq(channel.syncFrequency ?? "1h");
      setActiveTab("overview");
      setRotatedCreds(null);
    }
  }, [channel?.id]);

  if (!channel) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-16 text-slate-400">
        <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center mb-4">
          <ShoppingBag className="w-8 h-8 text-slate-300" />
        </div>
        <h3 className="font-black italic text-slate-700 text-lg">
          Select a Channel
        </h3>
        <p className="text-sm font-bold mt-2 max-w-xs">
          Click a channel card on the left to view its profile, settings, and
          webhook configuration.
        </p>
      </div>
    );
  }

  const PlatformIcon =
    PLATFORM_ICONS[channel.integrationCategory] ?? ShoppingBag;
  const platformBg = PLATFORM_BG[channel.integrationCategory] ?? "bg-slate-700";
  const statusCfg =
    STATUS_CONFIG[channel.status ?? "active"] ?? STATUS_CONFIG.active;

  const copy = (value: string, field: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSaveOverview = async () => {
    setIsSaving(true);
    try {
      await ecommerceHubService.updateChannel(session, channel.id, {
        syncFrequency: syncFreq,
      });
      toast({ title: "Channel updated" });
      onUpdated();
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRotate = async () => {
    setIsRotating(true);
    try {
      const res = await ecommerceHubService.rotateChannelCredentials(
        session,
        channel.id,
      );
      setRotatedCreds({
        clientId: res.plainClientId,
        clientSecret: res.plainClientSecret,
      });
      toast({
        title: "Credentials rotated",
        description:
          "Copy the new credentials — they'll be hidden again shortly.",
      });
    } catch {
      toast({ title: "Rotation failed", variant: "destructive" });
    } finally {
      setIsRotating(false);
    }
  };

  const handleToggleSuspend = async () => {
    const newStatus = channel.status === "active" ? "inactive" : "active";
    try {
      await ecommerceHubService.updateChannel(session, channel.id, {
        status: newStatus,
      });
      toast({
        title:
          newStatus === "inactive"
            ? "Channel suspended"
            : "Channel reactivated",
      });
      onUpdated();
    } catch {
      toast({ title: "Failed", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    try {
      await ecommerceHubService.deleteChannel(session, channel.id);
      toast({ title: "Channel deleted" });
      onUpdated();
      onClose();
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  // Determine which settings panel to show
  const renderSettingsPanel = () => {
    if (channel.integrationCategory === "PRESET") {
      return (
        <MarketplaceSettingsPanel
          channel={channel}
          session={session}
          onUpdated={onUpdated}
        />
      );
    }
    if (channel.integrationCategory === "HEADLESS") {
      return (
        <HeadlessSettingsPanel
          channel={channel}
          session={session}
          onUpdated={onUpdated}
        />
      );
    }
    // PREMADE = Webhook Bridge
    return (
      <WebhookBridgeSettingsPanel
        channel={channel}
        session={session}
        onUpdated={onUpdated}
      />
    );
  };

  // Determine which webhook panel to show
  const renderWebhookPanel = () => {
    if (channel.integrationCategory === "PREMADE") {
      return (
        <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 text-sm font-bold text-amber-700 italic">
          Webhook Bridge channels use the Bridge Settings tab for all event
          forwarding configuration.
        </div>
      );
    }
    return (
      <WebhookSettingsPanel
        channel={channel}
        session={session}
        onUpdated={onUpdated}
      />
    );
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: LayoutGrid },
    { id: "settings", label: "Settings", icon: Settings2 },
    { id: "webhooks", label: "Webhooks", icon: Zap },
    { id: "danger", label: "Danger Zone", icon: AlertTriangle },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Panel Header ── */}
      <div className={cn("p-6 text-white shrink-0", platformBg)}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
            <PlatformIcon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-black italic text-xl tracking-tight truncate text-white">
              {channel.name}
            </h2>
            <div className="text-[10px] font-black uppercase tracking-widest text-white/50 mt-0.5">
              {channel.adapterType ?? channel.integrationCategory} ·{" "}
              {channel.syncFrequency ?? "No sync"}
            </div>
          </div>
          <Badge
            className={cn(
              "font-black italic text-xs border-none shrink-0",
              statusCfg.color,
            )}
          >
            {statusCfg.label}
          </Badge>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="bg-white border-b shrink-0">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-transparent h-auto p-0 px-4 gap-6 rounded-none justify-start">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 font-black italic uppercase tracking-widest text-[9px] py-3 px-0 flex items-center gap-1.5 transition-all",
                  activeTab === tab.id
                    ? tab.id === "danger"
                      ? "border-red-500 text-red-500"
                      : "border-slate-900 text-slate-900"
                    : "border-transparent text-slate-400 hover:text-slate-600",
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* ── Tab Content ── */}
      <div className="flex-1 overflow-y-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* ── Overview Tab ── */}
          <TabsContent value="overview" className="p-6 space-y-6 mt-0">
            {/* Identity */}
            <div className="space-y-2">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Channel Identity
              </h3>
              <div className="rounded-2xl border border-slate-100 overflow-hidden divide-y divide-slate-50">
                {[
                  { label: "Channel ID", value: channel.id, copyKey: "id" },
                  {
                    label: "Type",
                    value: channel.integrationCategory,
                    copyKey: null,
                  },
                  {
                    label: "Platform",
                    value: channel.adapterType ?? "—",
                    copyKey: null,
                  },
                  {
                    label: "Created",
                    value: channel.createdAt
                      ? new Date(channel.createdAt).toLocaleDateString()
                      : "—",
                    copyKey: null,
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {row.label}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-700 flex items-center gap-1.5 truncate max-w-[60%]">
                      <span className="truncate">{row.value}</span>
                      {row.copyKey && (
                        <button onClick={() => copy(row.value, row.copyKey!)}>
                          {copiedField === row.copyKey ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 shrink-0" />
                          )}
                        </button>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sync frequency */}
            <div className="space-y-2">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Sync Configuration
              </h3>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Sync Frequency
                </Label>
                <Select value={syncFreq} onValueChange={setSyncFreq}>
                  <SelectTrigger className="h-11 rounded-xl font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      { value: "15min", label: "Every 15 minutes" },
                      { value: "30min", label: "Every 30 minutes" },
                      { value: "1h", label: "Every 1 hour" },
                      { value: "6h", label: "Every 6 hours" },
                      { value: "24h", label: "Every 24 hours" },
                    ].map((f) => (
                      <SelectItem
                        key={f.value}
                        value={f.value}
                        className="font-bold"
                      >
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleSaveOverview}
                  disabled={isSaving}
                  className="w-full h-11 rounded-xl font-black italic bg-slate-900 gap-2"
                >
                  {isSaving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {isSaving ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ── Settings Tab ── */}
          <TabsContent value="settings" className="p-6 mt-0">
            {renderSettingsPanel()}
          </TabsContent>

          {/* ── Webhooks Tab ── */}
          <TabsContent value="webhooks" className="p-6 mt-0">
            {renderWebhookPanel()}
          </TabsContent>

          {/* ── Danger Zone Tab ── */}
          <TabsContent value="danger" className="p-6 space-y-4 mt-0">
            <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-[11px] font-bold italic text-red-700 space-y-0.5">
              <div className="font-black not-italic text-red-800 text-sm">
                ⚠ Danger Zone
              </div>
              Actions in this section are irreversible or will break active
              integrations. Proceed with caution.
            </div>

            {/* Rotate credentials */}
            <div className="rounded-2xl border border-amber-100 overflow-hidden">
              <div className="px-5 py-4">
                <div className="font-black italic text-slate-800 text-sm">
                  Rotate API Credentials
                </div>
                <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                  Generates new Client ID and Secret. Old credentials are
                  immediately invalidated.
                </p>
              </div>
              <div className="px-5 pb-4">
                <Button
                  variant="outline"
                  className="w-full h-11 rounded-xl font-black italic gap-2 border-amber-200 text-amber-600 hover:bg-amber-50"
                  onClick={handleRotate}
                  disabled={isRotating}
                >
                  <RefreshCw
                    className={cn("w-4 h-4", isRotating && "animate-spin")}
                  />
                  {isRotating ? "Rotating…" : "Rotate Credentials"}
                </Button>
              </div>
              {rotatedCreds && (
                <div className="px-5 pb-4 space-y-2">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] font-bold italic text-amber-700 mb-2">
                    ⚠ Copy these now — they won't be shown again.
                  </div>
                  {[
                    {
                      label: "Client ID",
                      value: rotatedCreds.clientId,
                      key: "cid",
                    },
                    {
                      label: "Client Secret",
                      value: rotatedCreds.clientSecret,
                      key: "csec",
                    },
                  ].map((c) => (
                    <div key={c.key} className="space-y-1">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {c.label}
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          readOnly
                          value={c.value}
                          className="font-mono text-xs h-10 rounded-xl bg-slate-50"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copy(c.value, c.key)}
                          className="rounded-xl shrink-0"
                        >
                          {copiedField === c.key ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Suspend / Reactivate */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4">
                <div className="font-black italic text-slate-800 text-sm">
                  {channel.status === "active"
                    ? "Suspend Channel"
                    : "Reactivate Channel"}
                </div>
                <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                  {channel.status === "active"
                    ? "Pauses all syncs. Credentials remain valid."
                    : "Resumes syncing with existing credentials."}
                </p>
              </div>
              <div className="px-5 pb-4">
                <Button
                  variant="outline"
                  className="w-full h-11 rounded-xl font-black italic gap-2 border-slate-200 text-slate-600 hover:bg-slate-50"
                  onClick={handleToggleSuspend}
                >
                  {channel.status === "active" ? (
                    <>
                      <PauseCircle className="w-4 h-4" /> Suspend Channel
                    </>
                  ) : (
                    <>
                      <PlayCircle className="w-4 h-4" /> Reactivate Channel
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Delete */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <div className="rounded-2xl border border-red-200 overflow-hidden">
                  <div className="px-5 py-4">
                    <div className="font-black italic text-red-800 text-sm">
                      Delete Channel
                    </div>
                    <p className="text-[11px] font-bold text-red-400 mt-0.5">
                      Permanently removes this channel and revokes all
                      credentials. Cannot be undone.
                    </p>
                  </div>
                  <div className="px-5 pb-4">
                    <Button disabled title="Not available yet"
                      variant="outline"
                      className="w-full h-11 rounded-xl font-black italic gap-2 border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" /> Delete Channel
                    </Button>
                  </div>
                </div>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-black italic">
                    Delete {channel.name}?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="font-bold">
                    This will permanently revoke credentials and remove the
                    channel. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl font-black italic">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="rounded-xl font-black italic bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
