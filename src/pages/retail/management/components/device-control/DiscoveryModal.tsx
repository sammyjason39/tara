import React from "react";
import { Wifi, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DeviceIcon } from "./DeviceControlUI";
import type { DiscoveredDevice } from "./DeviceControlTypes";

interface DiscoveryModalProps {
  open: boolean;
  loading: boolean;
  results: DiscoveredDevice[];
  onClose: () => void;
  onCommit: (id: string) => void;
}

const DiscoveryModal = ({
  open,
  loading,
  results,
  onClose,
  onCommit,
}: DiscoveryModalProps) => (
  <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
    <DialogContent className="max-w-xl rounded-3xl border-none shadow-2xl bg-white max-h-[80vh] overflow-hidden flex flex-col font-sans">
      <DialogHeader>
        <DialogTitle className="text-base font-black italic tracking-tighter flex items-center gap-2">
          <Wifi className={`w-4 h-4 ${loading ? "animate-pulse" : ""}`} />
          Network Discovery Results
        </DialogTitle>
        <p className="text-[11px] text-muted-foreground font-medium">
          Found hardware using mDNS, SNMP, and ONVIF on your local branch LAN.
        </p>
      </DialogHeader>

      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <RefreshCw className="w-10 h-10 text-muted-foreground animate-spin" />
            <div className="text-[10px] font-black italic uppercase tracking-widest text-muted-foreground">
              Scanning Branch LAN…
            </div>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <div className="text-xs font-bold">No new hardware found.</div>
            <div className="text-[10px] mt-1">
              Ensure the Branch Agent is online and devices are discoverable.
            </div>
          </div>
        ) : (
          (Array.isArray(results) ? results : []).map((r, i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-secondary/5 hover:bg-white hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                <DeviceIcon type={r.type} cls="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-black text-foreground truncate">
                  {r.name}
                </div>
                <div className="text-[9px] text-muted-foreground font-mono mt-0.5 truncate uppercase">
                  {r.model} · {r.ipAddress}
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => onCommit(r.discoveryId)}
                className="rounded-xl h-8 bg-secondary text-foreground font-black italic uppercase text-[9px] tracking-widest px-4 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Onboard
              </Button>
            </div>
          ))
        )}
      </div>

      <div className="pt-2">
        <Button
          variant="outline"
          onClick={onClose}
          className="w-full rounded-xl border-border text-muted-foreground font-black italic uppercase text-[10px] tracking-widest h-10"
        >
          Close
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);

export default DiscoveryModal;
