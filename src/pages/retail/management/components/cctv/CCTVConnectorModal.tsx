import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { retailService } from "@/core/services/retail/retailService";
import { CCTVCamera, CCTVProvider } from "@/core/types/retail/retail";
import { useSession } from "@/core/security/session";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Camera, CheckCircle2, ChevronRight, Server, Wifi } from "lucide-react";

interface CCTVConnectorModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (cam: CCTVCamera) => void;
}

const PROVIDERS = [
  {
    id: "ezviz",
    name: "EZVIZ Cloud",
    req: ["name", "cloudAccountId", "verificationCode"],
  },
  {
    id: "hikvision",
    name: "Hikvision NVR/IPC",
    req: ["name", "ipAddress", "username", "password"],
  },
  {
    id: "dahua",
    name: "Dahua NVR/IPC",
    req: ["name", "ipAddress", "username", "password"],
  },
  {
    id: "reolink",
    name: "Reolink",
    req: ["name", "ipAddress", "username", "password"],
  },
  {
    id: "axis",
    name: "AXIS Camera",
    req: ["name", "ipAddress", "username", "password"],
  },
  { id: "custom", name: "Custom RTSP/HLS", req: ["name", "rtspUrl", "hlsUrl"] },
];

export default function CCTVConnectorModal({
  open,
  onClose,
  onSuccess,
}: CCTVConnectorModalProps) {
  const session = useSession();
  const { toast } = useToast();

  const [provider, setProvider] = useState<CCTVProvider>("ezviz");
  const [loading, setLoading] = useState(false);
  const [validated, setValidated] = useState(false);

  const [f, setF] = useState<Partial<CCTVCamera>>({
    name: "",
    ipAddress: "",
    username: "",
    password: "",
    verificationCode: "",
    cloudAccountId: "",
    rtspUrl: "",
    hlsUrl: "",
    location: "Main Area",
  });

  const update = (k: keyof CCTVCamera, v: string) => {
    setF((prev) => ({ ...prev, [k]: v }));
    setValidated(false); // reset validation on change
  };

  const handleTest = async () => {
    if (!session.tenant_id) return;
    setLoading(true);
    try {
      const res = await retailService.validateCCTVConnection(
        session.tenant_id,
        session,
        {
          provider,
          ...f,
        },
      );
      if (res.success) {
        setValidated(true);
        toast({
          title: "Connection Successful",
          description: "Credentials are valid.",
        });
      } else {
        toast({
          title: "Connection Failed",
          description: res.message,
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({
        title: "Test Failed",
        description: "Network error or invalid settings.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!session.tenant_id) return;
    setLoading(true);
    try {
      const saved = await retailService.registerCCTV(
        session.tenant_id,
        session,
        {
          provider,
          ...f,
          status: "live",
        },
      );
      toast({
        title: "Camera Registered",
        description: "CCTV has been added and connected.",
      });
      onSuccess(saved);
      onClose();
    } catch (e) {
      toast({
        title: "Registration Error",
        description: "Could not save camera.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const pConfig = PROVIDERS.find((p) => p.id === provider);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-border rounded-[28px]">
        <DialogHeader className="p-6 bg-secondary/5 border-b border-border">
          <DialogTitle className="text-xl font-black italic tracking-tighter text-muted-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white shadow-sm border border-border flex items-center justify-center">
              <Camera className="w-5 h-5 text-primary" />
            </div>
            Connect CCTV
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                Protocol & Provider
              </Label>
              <Select
                value={provider}
                onValueChange={(v) => {
                  setProvider(v as CCTVProvider);
                  setValidated(false);
                }}
              >
                <SelectTrigger className="rounded-xl border-border text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Array.isArray(PROVIDERS) ? PROVIDERS : []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                Camera Name
              </Label>
              <Input
                placeholder="e.g. Front Door Feed"
                value={f.name || ""}
                onChange={(e) => update("name", e.target.value)}
                className="rounded-xl border-border text-sm"
              />
            </div>

            {pConfig?.req.includes("ipAddress") && (
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                  IP Address
                </Label>
                <Input
                  placeholder="192.168.1.100"
                  value={f.ipAddress || ""}
                  onChange={(e) => update("ipAddress", e.target.value)}
                  className="rounded-xl border-border font-mono text-sm"
                />
              </div>
            )}

            {pConfig?.req.includes("username") && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                    Username
                  </Label>
                  <Input
                    placeholder="admin"
                    value={f.username || ""}
                    onChange={(e) => update("username", e.target.value)}
                    className="rounded-xl border-border text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                    Password
                  </Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={f.password || ""}
                    onChange={(e) => update("password", e.target.value)}
                    className="rounded-xl border-border text-sm"
                  />
                </div>
              </div>
            )}

            {pConfig?.req.includes("cloudAccountId") && (
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                  Cloud Account ID
                </Label>
                <Input
                  placeholder="e.g. ezviz_user_123"
                  value={f.cloudAccountId || ""}
                  onChange={(e) => update("cloudAccountId", e.target.value)}
                  className="rounded-xl border-border font-mono text-sm"
                />
              </div>
            )}

            {pConfig?.req.includes("verificationCode") && (
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                  Verification Code
                </Label>
                <Input
                  type="password"
                  placeholder="6-letter code"
                  value={f.verificationCode || ""}
                  onChange={(e) => update("verificationCode", e.target.value)}
                  className="rounded-xl border-border font-mono text-sm"
                />
                <p className="text-[10px] text-muted-foreground font-medium">
                  Found on the camera sticker
                </p>
              </div>
            )}

            {pConfig?.req.includes("rtspUrl") && (
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                  RTSP URL
                </Label>
                <Input
                  placeholder="rtsp://admin:pass@ip:554/stream1"
                  value={f.rtspUrl || ""}
                  onChange={(e) => update("rtspUrl", e.target.value)}
                  className="rounded-xl border-border font-mono text-sm"
                />
              </div>
            )}
          </div>
        </div>

        <div className="p-6 bg-secondary/5 border-t border-border flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={!f.name || loading}
            className={`rounded-xl h-10 px-5 text-xs font-bold transition-all ${validated ? "border-success bg-success text-success hover:bg-success/10 hover:text-success" : "border-border text-muted-foreground"} gap-2`}
          >
            {validated ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Wifi className="w-4 h-4" />
            )}
            {validated ? "Verified" : "Test Connection"}
          </Button>

          <Button
            onClick={handleRegister}
            disabled={!validated || loading}
            className="rounded-xl bg-primary hover:bg-primary text-foreground font-black italic uppercase text-[10px] tracking-widest h-10 px-6 gap-2"
          >
            Connect <Server className="w-3.5 h-3.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
