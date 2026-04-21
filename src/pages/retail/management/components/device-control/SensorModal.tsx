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

interface SensorModalProps {
  sensor: BranchSensor | null;
  onClose: () => void;
}

const SensorModal = ({ sensor, onClose }: SensorModalProps) => (
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
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${sensor.status === "normal" ? "bg-emerald-50 text-emerald-600" : sensor.status === "warning" ? "bg-amber-50 text-amber-500" : sensor.status === "critical" ? "bg-red-50 text-red-500" : "bg-slate-100 text-slate-400"}`}
              >
                <SIcon type={sensor.type} cls="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-base font-black italic tracking-tighter">
                  {sensor.name}
                </DialogTitle>
                <div className="text-[10px] text-slate-400 font-mono">
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
                className={`rounded-2xl p-5 flex items-center justify-between ${sensor.status === "warning" ? "bg-amber-50" : sensor.status === "critical" ? "bg-red-50" : "bg-emerald-50"}`}
              >
                <div>
                  <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    Current Reading
                  </div>
                  <div
                    className={`text-3xl font-black italic tracking-tighter mt-1 ${sensor.status === "warning" ? "text-amber-600" : sensor.status === "critical" ? "text-red-600" : "text-emerald-600"}`}
                  >
                    {sensor.currentValue}
                    <span className="text-sm ml-1 opacity-60">
                      {sensor.unit}
                    </span>
                  </div>
                </div>
                {(sensor.thresholdMin !== undefined ||
                  sensor.thresholdMax !== undefined) && (
                  <div className="text-right text-[11px] text-slate-500 font-semibold space-y-1">
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
                  <div key={i} className="bg-slate-50 rounded-2xl p-3">
                    <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">
                      {r.l}
                    </div>
                    <div className="font-semibold text-slate-800 font-mono">
                      {r.v}
                    </div>
                  </div>
                ))}
            </div>
            <Button disabled title="Not available yet" className="w-full h-10 rounded-xl bg-slate-900 text-white font-black italic uppercase text-[10px] tracking-widest gap-2">
              <Settings2 className="w-3.5 h-3.5" /> Configure Threshold
            </Button>
          </div>
        </>
      )}
    </DialogContent>
  </Dialog>
);

export default SensorModal;
