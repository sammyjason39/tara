import React from "react";
import { AlertTriangle, Settings2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SIcon, ssc } from "./DeviceControlUI";
import type { BranchSensor } from "@/core/types/retail/retail";
import { apiRequest } from "@/core/api/apiClient";
import { useSession } from "@/core/security/session";
import { useToast } from "@/hooks/use-toast";

interface SensorModalProps {
  sensor: BranchSensor | null;
  onClose: () => void;
}

const SensorModal = ({ sensor, onClose }: SensorModalProps) => {
  const session = useSession();
  const { toast } = useToast();

  return (
  <Dialog
    open={!!sensor}
    onOpenChange={(v) => {
      if (!v) onClose();
    }}
  >
    <DialogContent className="max-w-md rounded-3xl border-none shadow-2xl bg-white">
      {sensor && (
        <>
          <DialogHeader>
            <div className="flex items-center gap-4">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${sensor.status === "normal" ? "bg-success text-success" : sensor.status === "warning" ? "bg-warning text-warning" : sensor.status === "critical" ? "bg-destructive text-destructive" : "bg-secondary/10 text-muted-foreground"}`}
              >
                <SIcon type={sensor.type} cls="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-base font-black italic tracking-tighter">
                  {sensor.name}
                </DialogTitle>
                <div className="text-[10px] text-muted-foreground font-mono">
                  {sensor.type.replace(/_/g, " ").toUpperCase()}
                </div>
              </div>
              <Badge
                className={`ml-auto text-[9px] font-black italic uppercase border ${ssc(sensor.status)}`}
              >
                {sensor.status}
              </Badge>
            </div>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {sensor.currentValue !== undefined && (
              <div
                className={`rounded-2xl p-5 flex items-center justify-between ${sensor.status === "warning" ? "bg-warning" : sensor.status === "critical" ? "bg-destructive" : "bg-success"}`}
              >
                <div>
                  <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                    Current Reading
                  </div>
                  <div
                    className={`text-3xl font-black italic tracking-tighter mt-1 ${sensor.status === "warning" ? "text-warning" : sensor.status === "critical" ? "text-destructive" : "text-success"}`}
                  >
                    {sensor.currentValue}
                    <span className="text-sm ml-1 opacity-60">
                      {sensor.unit}
                    </span>
                  </div>
                </div>
                {(sensor.thresholdMin !== undefined ||
                  sensor.thresholdMax !== undefined) && (
                  <div className="text-right text-[11px] text-muted-foreground font-semibold space-y-1">
                    {sensor.thresholdMin !== undefined && (
                      <div>
                        Min: {sensor.thresholdMin}
                        {sensor.unit}
                      </div>
                    )}
                    {sensor.thresholdMax !== undefined && (
                      <div>
                        Max: {sensor.thresholdMax}
                        {sensor.unit}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 text-[11px]">
              {[
                { l: "Model", v: sensor.model },
                { l: "Serial No.", v: sensor.serialNumber },
                { l: "Placement", v: sensor.placement },
                {
                  l: "Last Reading",
                  v: sensor.lastReading
                    ? new Date(sensor.lastReading).toLocaleString()
                    : undefined,
                },
              ]
                .filter((r) => r.v)
                .map((r, i) => (
                  <div key={i} className="bg-secondary/5 rounded-2xl p-3">
                    <div className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">
                      {r.l}
                    </div>
                    <div className="font-semibold text-muted-foreground font-mono">
                      {r.v}
                    </div>
                  </div>
                ))}
            </div>
            <Button 
              onClick={async () => {
                try {
                  const thresholds = { min: 0, max: 100 };
                  await apiRequest("/kernel/iot/telemetry", "POST", session, { sensor_id: sensor.id, thresholds });
                  toast({ title: "Threshold Configured", description: `Thresholds updated for ${sensor.name}.` });
                } catch (e) {
                  toast({ title: "Configuration Failed", description: "Could not update sensor thresholds.", variant: "destructive" });
                }
              }}
              className="w-full h-10 rounded-xl bg-secondary text-foreground font-black italic uppercase text-[10px] tracking-widest gap-2"
            >
              <Settings2 className="w-3.5 h-3.5" /> Configure Threshold
            </Button>
          </div>
        </>
      )}
    </DialogContent>
  </Dialog>
  );
};

export default SensorModal;
