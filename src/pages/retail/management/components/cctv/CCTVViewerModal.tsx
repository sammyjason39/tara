import React, { useState } from "react";
import {
  Camera,
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  RefreshCw,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Wifi,
  WifiOff,
  Settings2,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Key,
  Eye,
  EyeOff,
  Info,
  Video,
  History,
  RotateCcw,
  SkipBack,
  SkipForward,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import type { CCTVCamera, CCTVProvider } from "@/core/types/retail/retail";
import { useSession } from "@/core/security/session";
import { Roles } from "@/core/security/roles";
import { retailService } from "@/core/services/retail/retailService";

// ── Provider metadata ────────────────────────────────────────────
interface ProviderInfo {
  label: string;
  color: string;
  docUrl: string;
  authMethod: string;
  streamProtocol: string;
  fields: {
    key: string;
    label: string;
    placeholder: string;
    secret?: boolean;
  }[];
  notes: string;
}

const PROVIDERS: Record<CCTVProvider, ProviderInfo> = {
  ezviz: {
    label: "EZVIZ",
    color: "bg-orange-500",
    docUrl: "https://open.ezviz.com",
    authMethod: "EZVIZ Cloud – Account ID + Verification Code",
    streamProtocol: "EZOPEN / HLS (cloud relay)",
    fields: [
      {
        key: "cloudAccountId",
        label: "Cloud Account ID",
        placeholder: "e.g. your_email@example.com",
      },
      {
        key: "verificationCode",
        label: "Verification Code",
        placeholder: "6-letter code (on camera sticker)",
        secret: true,
      },
    ],
    notes:
      "Enter your EZVIZ cloud account and the 6-digit verification code found on the device's sticker. Zenvix Branch Agent will fetch the stream relay automatically.",
  },
  dahua: {
    label: "Dahua",
    color: "bg-blue-600",
    docUrl: "https://partner.dahuasecurity.com",
    authMethod: "Digest Auth – Local IP + Credentials",
    streamProtocol: "RTSP / HLS (LAN)",
    fields: [
      {
        key: "ipAddress",
        label: "Camera IP Address",
        placeholder: "192.168.1.x",
      },
      { key: "username", label: "Username", placeholder: "admin" },
      {
        key: "password",
        label: "Password",
        placeholder: "Camera password",
        secret: true,
      },
    ],
    notes:
      "Dahua camera or NVR on the local network. Zenvix Branch Agent will proxy the RTSP stream to HLS for browser viewing.",
  },
  hikvision: {
    label: "HikVision",
    color: "bg-red-600",
    docUrl: "https://open.hikvision.com",
    authMethod: "ISAPI – Local IP + Credentials",
    streamProtocol: "RTSP / HLS (LAN)",
    fields: [
      {
        key: "ipAddress",
        label: "Device IP Address",
        placeholder: "192.168.1.x",
      },
      { key: "username", label: "Username", placeholder: "admin" },
      {
        key: "password",
        label: "Password",
        placeholder: "Camera password",
        secret: true,
      },
    ],
    notes:
      "Use this for HikVision NVRs or IP cameras on the local network. The Branch Agent handles protocol conversion from RTSP to HLS.",
  },
  reolink: {
    label: "Reolink",
    color: "bg-blue-500",
    docUrl: "https://reolink.com/software-and-api/",
    authMethod: "Local IP + Credentials",
    streamProtocol: "RTSP (LAN)",
    fields: [
      {
        key: "ipAddress",
        label: "Camera IP Address",
        placeholder: "192.168.1.x",
      },
      { key: "username", label: "Username", placeholder: "admin" },
      {
        key: "password",
        label: "Password",
        placeholder: "Camera password",
        secret: true,
      },
    ],
    notes:
      "Reolink local API integration. Camera must be on the same LAN as the Zenvix Branch Agent for streaming.",
  },
  axis: {
    label: "Axis",
    color: "bg-slate-600",
    docUrl: "https://www.axis.com/vapix-library",
    authMethod: "Basic Auth – VAPIX API",
    streamProtocol: "MJPEG / RTSP (LAN)",
    fields: [
      {
        key: "ipAddress",
        label: "Camera IP / Host",
        placeholder: "192.168.1.x",
      },
      { key: "username", label: "VAPIX Username", placeholder: "root" },
      {
        key: "password",
        label: "VAPIX Password",
        placeholder: "Camera password",
        secret: true,
      },
    ],
    notes:
      "Axis VAPIX local API. Requires Zenvix Branch Agent on the same network to proxy streams via RTSP/HLS.",
  },
  custom: {
    label: "Custom",
    color: "bg-slate-500",
    docUrl: "",
    authMethod: "Direct stream URL",
    streamProtocol: "RTSP or HLS",
    fields: [
      {
        key: "hlsUrl",
        label: "HLS Stream URL",
        placeholder: "https://…/live/stream.m3u8",
      },
      {
        key: "rtspUrl",
        label: "RTSP Stream URL (optional)",
        placeholder: "rtsp://user:pass@192.168.1.x:554/stream",
      },
    ],
    notes:
      "Enter a direct HLS URL for browser playback, or an RTSP URL which the Branch Agent will proxy to HLS.",
  },
  other: {
    label: "Other",
    color: "bg-slate-500",
    docUrl: "",
    authMethod: "Direct stream URL",
    streamProtocol: "RTSP or HLS",
    fields: [
      {
        key: "hlsUrl",
        label: "HLS Stream URL",
        placeholder: "https://…/live/stream.m3u8",
      },
      {
        key: "rtspUrl",
        label: "RTSP Stream URL (optional)",
        placeholder: "rtsp://user:pass@192.168.1.x:554/stream",
      },
    ],
    notes:
      "Enter the stream URL directly. Contact your camera vendor for RTSP or HLS access details.",
  },
};

// ── Status helpers ────────────────────────────────────────────────
const cctvStatusColor = (s: CCTVCamera["status"]) =>
  ({
    live: "bg-emerald-50 text-emerald-700 border-emerald-100",
    recording: "bg-blue-50 text-blue-700 border-blue-100",
    offline: "bg-red-50 text-red-600 border-red-100",
    error: "bg-red-50 text-red-700 border-red-100",
    maintenance: "bg-amber-50 text-amber-700 border-amber-100",
  })[s];

const integStatusIcon = (s?: CCTVCamera["integrationStatus"]) => {
  if (s === "connected")
    return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
  if (s === "error")
    return <AlertTriangle className="w-3.5 h-3.5 text-red-500" />;
  if (s === "pending")
    return <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin" />;
  return <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />;
};

// ── Mock timeline events ──────────────────────────────────────────
const MOCK_EVENTS = [
  { time: "09:14", label: "Motion detected", type: "motion" },
  { time: "09:22", label: "Person entered frame", type: "person" },
  { time: "11:05", label: "Motion detected", type: "motion" },
  { time: "13:47", label: "Camera disconnected", type: "alert" },
  { time: "13:52", label: "Camera reconnected", type: "ok" },
  { time: "16:30", label: "Motion detected", type: "motion" },
];

// ── Integration Setup Panel ─────────────────────────────────────
const IntegrationSetup: React.FC<{
  cam: CCTVCamera;
  onConnect: (data: Record<string, string>) => void;
}> = ({ cam, onConnect }) => {
  const info = PROVIDERS[cam.provider];
  const [form, setForm] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const session = useSession();
  const handleConnect = async () => {
    if (!session.tenant_id) return;
    setSaving(true);
    try {
      const resp = await retailService.validateCCTVConnection(
        session.tenant_id,
        session,
        {
          provider: cam.provider,
          ...form,
        },
      );

      if (resp.success) {
        toast({
          title: "Connection Successful",
          description: `${info.label} credentials are valid.`,
        });
        onConnect(form);
      } else {
        toast({
          title: "Connection Failed",
          description:
            resp.message || "Invalid credentials or unreachable device.",
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({
        title: "Error",
        description: "An unexpected error occurred during validation.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };
  const allFilled = info.fields
    .filter(
      (f) =>
        !f.label.includes("optional") && !f.placeholder.includes("optional"),
    )
    .every((f) => form[f.key]);

  return (
    <div className="space-y-5">
      {/* Provider header */}
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-xl ${info.color} flex items-center justify-center text-white font-black text-xs`}
        >
          {info.label.slice(0, 3)}
        </div>
        <div>
          <div className="font-black text-sm text-slate-900">
            {info.label} Integration
          </div>
          <div className="text-[10px] text-slate-400 font-medium">
            {info.authMethod}
          </div>
        </div>
        {info.docUrl && (
          <a
            href={info.docUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-1 font-semibold"
          >
            Open Docs <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 text-[11px] text-blue-700 font-medium flex gap-2">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        {info.notes}
      </div>

      <div className="space-y-3">
        {info.fields.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
              {field.label}
            </Label>
            <div className="relative">
              <Input
                type={
                  field.secret && !showSecrets[field.key] ? "password" : "text"
                }
                placeholder={field.placeholder}
                value={form[field.key] ?? ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, [field.key]: e.target.value }))
                }
                className="rounded-xl border-slate-200 text-sm font-mono pr-10"
              />
              {field.secret && (
                <button
                  onClick={() =>
                    setShowSecrets((p) => ({
                      ...p,
                      [field.key]: !p[field.key],
                    }))
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  {showSecrets[field.key] ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="text-[10px] text-slate-400 font-medium">
        Stream protocol:{" "}
        <span className="font-black text-slate-600">{info.streamProtocol}</span>
      </div>

      <Button
        disabled={!allFilled || saving}
        onClick={handleConnect}
        className="w-full h-11 rounded-xl bg-slate-900 text-white font-black italic uppercase text-[10px] tracking-widest gap-2"
      >
        {saving ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : (
          <Key className="w-4 h-4" />
        )}
        {saving ? "Connecting…" : `Connect ${info.label}`}
      </Button>
    </div>
  );
};

// ── Video Area ─────────────────────────────────────────────────
const VideoArea: React.FC<{
  cam: CCTVCamera;
  isLive: boolean;
  isPlaying: boolean;
  togglePlay: () => void;
}> = ({ cam, isLive, isPlaying, togglePlay }) => {
  const isActive = cam.status === "live" || cam.status === "recording";

  if (!isActive) {
    return (
      <div className="w-full aspect-video bg-slate-900 rounded-3xl flex flex-col items-center justify-center gap-3">
        <WifiOff className="w-10 h-10 text-slate-600" />
        <div className="text-sm font-black italic tracking-tighter text-slate-500">
          Feed Unavailable
        </div>
        <div className="text-[10px] text-slate-600 font-medium">
          Camera is {cam.status}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full aspect-video bg-slate-900 rounded-3xl overflow-hidden relative group">
      {/* Simulated feed background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950" />
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            "radial-gradient(circle at 2px 2px,rgba(255,255,255,0.15) 1px,transparent 0)",
          backgroundSize: "20px 20px",
        }}
      />

      {/* Status badge */}
      <div
        className={`absolute top-4 left-4 flex items-center gap-1.5 rounded-full px-3 py-1.5 ${isLive ? "bg-emerald-500" : "bg-blue-500"}`}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        <span className="text-[9px] font-black text-white uppercase">
          {isLive ? "Live" : "Playback"}
        </span>
      </div>

      {/* Camera label */}
      <div className="absolute top-4 right-4 bg-black/50 rounded-xl px-3 py-1.5">
        <span className="text-[10px] font-black text-white italic">
          {cam.name}
        </span>
      </div>

      {/* Center play indicator */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-slate-700 text-center">
          <Camera className="w-16 h-16 mx-auto opacity-10" />
          <div className="text-[11px] font-bold text-slate-600 mt-2 opacity-40">
            {cam.hlsUrl ? "HLS Stream Active" : "Stream via Branch Agent"}
          </div>
        </div>
      </div>

      {/* Controls overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 translate-y-full group-hover:translate-y-0 transition-transform">
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="text-white hover:text-emerald-400 transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5" />
            )}
          </button>
          {!isLive && (
            <>
              <button className="text-white/70 hover:text-white">
                <SkipBack className="w-4 h-4" />
              </button>
              <div className="flex-1 bg-white/20 rounded-full h-1">
                <div className="bg-white rounded-full h-1 w-1/3" />
              </div>
              <button className="text-white/70 hover:text-white">
                <SkipForward className="w-4 h-4" />
              </button>
            </>
          )}
          <button className="text-white/70 hover:text-white ml-auto">
            <Volume2 className="w-4 h-4" />
          </button>
          {cam.hasPtz && (
            <button className="text-white/70 hover:text-white">
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          <button className="text-white/70 hover:text-white">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Timestamp */}
      <div className="absolute bottom-4 right-4 bg-black/50 rounded-lg px-2 py-1">
        <span className="text-[10px] font-mono text-white">
          {new Date().toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
};

// ── Main Modal ─────────────────────────────────────────────────
type ViewTab = "live" | "history" | "setup";

interface Props {
  camera: CCTVCamera | null;
  onClose: () => void;
  onIntegrationSave?: (camId: string, data: Record<string, string>) => void;
}

const CCTVViewerModal: React.FC<Props> = ({
  camera,
  onClose,
  onIntegrationSave,
}) => {
  const session = useSession();
  const canManage = [
    Roles.SUPERADMIN,
    Roles.OWNER,
    Roles.COMPANY_ADMIN,
  ].includes(session.role?.toUpperCase() as any);

  const [viewTab, setViewTab] = useState<ViewTab>("live");
  const [isPlaying, setIsPlaying] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );

  if (!camera) return null;

  const isNotConfigured =
    !camera.integrationStatus || camera.integrationStatus === "not_configured";
  const info = PROVIDERS[camera.provider];

  const TABS: { id: ViewTab; icon: React.ReactNode; label: string }[] = [
    {
      id: "live",
      icon: <Video className="w-3.5 h-3.5" />,
      label: "Live Stream",
    },
    {
      id: "history",
      icon: <History className="w-3.5 h-3.5" />,
      label: "History",
    },
    ...(canManage
      ? [
          {
            id: "setup" as ViewTab,
            icon: <Settings2 className="w-3.5 h-3.5" />,
            label: "Integration",
          },
        ]
      : []),
  ];

  return (
    <Dialog
      open={!!camera}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-4xl w-full rounded-3xl border-none shadow-2xl bg-white p-0 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-4">
            <div
              className={`w-10 h-10 rounded-2xl ${info.color} flex items-center justify-center text-white font-black text-xs shrink-0`}
            >
              {info.label.slice(0, 3)}
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base font-black italic tracking-tighter text-slate-900 truncate">
                {camera.name}
              </DialogTitle>
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                <Badge
                  className={`text-[9px] font-black italic uppercase border ${cctvStatusColor(camera.status)}`}
                >
                  {camera.status === "live" || camera.status === "recording" ? (
                    <>
                      <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse mr-1 inline-block" />
                      {camera.status}
                    </>
                  ) : (
                    camera.status
                  )}
                </Badge>
                <span className="text-[10px] text-slate-400 font-medium">
                  {info.label} · {camera.model ?? camera.provider}
                </span>
                {camera.location && (
                  <span className="text-[10px] text-slate-400">
                    {camera.location}
                  </span>
                )}
                <div className="flex items-center gap-1 ml-auto text-[10px] font-semibold">
                  {integStatusIcon(camera.integrationStatus)}
                  <span className="text-slate-500">
                    {camera.integrationStatus === "connected"
                      ? "Connected"
                      : "Not configured"}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-300 hover:text-slate-700 transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </DialogHeader>

        {/* Tab bar */}
        <div className="flex items-center gap-1 px-6 py-3 border-b border-slate-50 shrink-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setViewTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-black italic uppercase tracking-widest transition-all ${viewTab === t.id ? "bg-slate-900 text-white shadow-md" : "text-slate-400 hover:text-slate-800 hover:bg-slate-50"}`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
          {isNotConfigured && viewTab !== "setup" && (
            <div className="ml-auto flex items-center gap-1.5 text-[10px] text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-1.5 font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" />
              {canManage
                ? "Integration not set up — click Integration tab"
                : "Not connected to stream provider"}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1">
          <div className="p-6">
            {/* ── LIVE TAB ── */}
            {viewTab === "live" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <VideoArea
                    cam={camera}
                    isLive={true}
                    isPlaying={isPlaying}
                    togglePlay={() => setIsPlaying((p) => !p)}
                  />
                  {isNotConfigured && (
                    <div className="mt-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-[11px] text-amber-700 font-medium flex gap-2 items-start">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      Stream not connected.{" "}
                      {canManage
                        ? "Go to the Integration tab to enter credentials."
                        : "Ask your IT admin to set up the integration."}
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <div className="bg-slate-50 rounded-2xl p-4 space-y-3 text-[11px]">
                    <div className="font-black uppercase text-slate-400 tracking-widest text-[9px]">
                      Camera Info
                    </div>
                    {[
                      { l: "Provider", v: info.label },
                      { l: "Model", v: camera.model },
                      {
                        l: "Resolution",
                        v: camera.resolutionMp
                          ? `${camera.resolutionMp}MP`
                          : undefined,
                      },
                      { l: "Placement", v: camera.location },
                      {
                        l: "Night Vision",
                        v: camera.hasNightVision ? "Yes" : "No",
                      },
                      { l: "PTZ", v: camera.hasPtz ? "Supported" : "Fixed" },
                      {
                        l: "Last Ping",
                        v: camera.lastPing
                          ? new Date(camera.lastPing).toLocaleTimeString()
                          : "N/A",
                      },
                    ]
                      .filter((r) => r.v !== undefined)
                      .map((r, i) => (
                        <div key={i} className="flex justify-between">
                          <span className="text-slate-400 font-bold">
                            {r.l}
                          </span>
                          <span className="font-black text-slate-800">
                            {r.v}
                          </span>
                        </div>
                      ))}
                  </div>

                  {camera.hasPtz && (
                    <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
                      <div className="font-black uppercase text-slate-400 tracking-widest text-[9px] mb-3">
                        PTZ Control
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 w-fit mx-auto">
                        {["↖", "↑", "↗", "←", "·", "→", "↙", "↓", "↘"].map(
                          (d, i) => (
                            <button
                              key={i}
                              className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-sm font-bold hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center"
                            >
                              {d}
                            </button>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                  {canManage && (
                    <Button
                      variant="outline"
                      onClick={() => setViewTab("setup")}
                      className="w-full h-9 rounded-xl border-slate-200 font-black italic uppercase text-[9px] tracking-widest gap-1.5"
                    >
                      <Settings2 className="w-3.5 h-3.5" />{" "}
                      {isNotConfigured
                        ? "Setup Integration"
                        : "Integration Settings"}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* ── HISTORY TAB ── */}
            {viewTab === "history" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  {/* Date + time range */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2">
                      <Calendar className="w-4 h-4 text-slate-500" />
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="bg-transparent text-sm font-black text-slate-800 focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2">
                        <Clock className="w-4 h-4 text-slate-500" />
                        <input
                          type="time"
                          defaultValue="08:00"
                          className="bg-transparent text-sm font-black text-slate-800 focus:outline-none"
                        />
                      </div>
                      <span className="text-slate-400 font-bold text-sm">
                        →
                      </span>
                      <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2">
                        <input
                          type="time"
                          defaultValue="18:00"
                          className="bg-transparent text-sm font-black text-slate-800 focus:outline-none"
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={() => {
                        toast({ title: "Footage Loading", description: "Requesting archive stream from Branch NVR..." });
                      }}
                      size="sm"
                      className="h-10 rounded-xl bg-slate-900 text-white font-black italic uppercase text-[10px] tracking-widest gap-2"
                    >
                      <Play className="w-3.5 h-3.5" /> Load Footage
                    </Button>
                  </div>
                  <VideoArea
                    cam={camera}
                    isLive={false}
                    isPlaying={isPlaying}
                    togglePlay={() => setIsPlaying((p) => !p)}
                  />
                </div>

                {/* Event timeline */}
                <div className="space-y-3">
                  <div className="font-black uppercase text-slate-400 tracking-widest text-[9px] px-1">
                    Event Timeline — {selectedDate}
                  </div>
                  <div className="space-y-2">
                    {MOCK_EVENTS.map((ev, i) => (
                      <button
                        key={i}
                        className="w-full text-left bg-slate-50 hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-sm rounded-2xl px-4 py-3 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-2 h-2 rounded-full shrink-0 ${ev.type === "alert" ? "bg-red-500" : ev.type === "ok" ? "bg-emerald-500" : "bg-amber-400"}`}
                          />
                          <div>
                            <div className="text-[11px] font-black text-slate-800">
                              {ev.label}
                            </div>
                            <div className="text-[9px] text-slate-400 font-mono">
                              {ev.time}
                            </div>
                          </div>
                          <Play className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 ml-auto transition-colors" />
                        </div>
                      </button>
                    ))}
                  </div>
                  <Separator />
                  <div className="flex gap-1.5">
                    <Button disabled title="Not available yet"
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 rounded-xl border-slate-200 font-black italic text-[9px] uppercase tracking-widest gap-1"
                    >
                      <ChevronLeft className="w-3 h-3" /> Prev Day
                    </Button>
                    <Button disabled title="Not available yet"
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 rounded-xl border-slate-200 font-black italic text-[9px] uppercase tracking-widest gap-1"
                    >
                      Next Day <ChevronRight className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ── INTEGRATION TAB ── */}
            {viewTab === "setup" && canManage && (
              <div className="max-w-lg mx-auto space-y-6">
                {/* How it works */}
                <div className="bg-slate-900 text-white rounded-3xl p-6 space-y-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    How Integration Works
                  </div>
                  <div className="space-y-3 text-[11px] text-slate-300">
                    {[
                      {
                        n: "1",
                        t: "Get API credentials from your camera vendor's developer portal.",
                      },
                      {
                        n: "2",
                        t: "Enter them below. Credentials are stored encrypted per-branch.",
                      },
                      {
                        n: "3",
                        t: "Zenvix Branch Agent (local) authenticates and fetches the stream URL.",
                      },
                      {
                        n: "4",
                        t: "Stream is proxied to HLS for browser playback. Credentials never exposed to clients.",
                      },
                    ].map((s) => (
                      <div key={s.n} className="flex gap-3">
                        <div className="w-5 h-5 rounded-full bg-white/10 text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                          {s.n}
                        </div>
                        <span className="font-medium">{s.t}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <IntegrationSetup
                  cam={camera}
                  onConnect={(data) => {
                    onIntegrationSave?.(camera.id, data);
                    setViewTab("live");
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CCTVViewerModal;
