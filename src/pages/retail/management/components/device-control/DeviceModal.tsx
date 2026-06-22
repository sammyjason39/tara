import React from "react";
import { X, Settings2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeviceIcon, ConnIcon, connLabel, dsc } from "./DeviceControlUI";
import type { ExtDevice } from "./DeviceControlTypes";
import { apiRequest } from "@/core/api/apiClient";
import { useSession } from "@/core/security/session";
import { useToast } from "@/hooks/use-toast";

interface DeviceModalProps {
  dev: ExtDevice | null;
  onClose: () => void;
}

const DeviceModal = ({ dev, onClose }: DeviceModalProps) => {
  const session = useSession();
  const { toast } = useToast();

  return (
  <Dialog
    open={!!dev}
    onOpenChange={(v) => {
      if (!v) onClose();
    }}
  >
    <DialogContent className="max-w-lg rounded-3xl border-none shadow-2xl bg-white">
      {dev && (
        <>
          <DialogHeader>
            <div className="flex items-center gap-4">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${dev.status === "online" ? "bg-success text-success" : dev.status === "maintenance" ? "bg-warning text-warning" : "bg-secondary/10 text-muted-foreground"}`}
              >
                <DeviceIcon type={dev.type} cls="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-base font-black italic tracking-tighter text-foreground">
                  {dev.name}
                </DialogTitle>
                <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                  {dev.type.replace(/_/g, " ").toUpperCase()}
                </div>
              </div>
              <Badge
                className={`ml-auto text-[9px] font-black italic uppercase tracking-widest border ${dsc(dev.status)}`}
              >
                {dev.status}
              </Badge>
            </div>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3 text-[11px]">
              {[
                { l: "Model", v: dev.model },
                { l: "Serial No.", v: dev.serialNumber },
                { l: "MAC Address", v: dev.macAddress },
                { l: "IP Address", v: dev.ipAddress },
                {
                  l: "Connection",
                  v: dev.connType ? connLabel[dev.connType] : undefined,
                  icon: <ConnIcon t={dev.connType} />,
                },
                { l: "COM Port", v: dev.comPort },
                { l: "USB Port", v: dev.usbPort },
                { l: "Usage / Role", v: dev.assignment?.role },
                { l: "Firmware", v: dev.firmwareVersion },
                { l: "Driver", v: dev.driverVersion },
                {
                  l: "Last Seen",
                  v: dev.lastSeen
                    ? new Date(dev.lastSeen).toLocaleString()
                    : undefined,
                },
              ]
                .filter((r) => r.v)
                .map((r, i) => (
                  <div key={i} className="bg-secondary/5 rounded-2xl p-3">
                    <div className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">
                      {r.l}
                    </div>
                    <div className="flex items-center gap-1.5 font-semibold text-muted-foreground font-mono">
                      {r.icon}
                      {r.v}
                    </div>
                  </div>
                ))}
            </div>
            {dev.notes && (
              <div className="bg-secondary/5 rounded-2xl p-3 text-[11px] text-muted-foreground">
                {dev.notes}
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Button 
                onClick={async () => {
                  try {
                    await apiRequest("/kernel/iot/pair", "POST", session, { mac_address: dev.macAddress, type: dev.type });
                    toast({ title: "Device Configured", description: `${dev.name} has been paired successfully.` });
                  } catch (e) {
                    toast({ title: "Configuration Failed", description: `Could not configure ${dev.name}.`, variant: "destructive" });
                  }
                }}
                className="flex-1 h-10 rounded-xl bg-secondary text-foreground font-black italic uppercase text-[10px] tracking-widest gap-2"
              >
                <Settings2 className="w-3.5 h-3.5" /> Configure
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
                className="h-10 w-10 rounded-xl border-border text-muted-foreground flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </DialogContent>
  </Dialog>
  );
};

export default DeviceModal;
