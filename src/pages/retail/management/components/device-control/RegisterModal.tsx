import React, { useState } from "react";
import { RefreshCw, PlusCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEVICE_TYPES,
  CAM_PROVIDERS,
  SENSOR_TYPES,
  CONN_TYPES,
  EMPTY_FORM,
} from "./DeviceControlTypes";
import type { Tab, RegForm, ConnType } from "./DeviceControlTypes";

interface RegisterModalProps {
  open: boolean;
  tab: Tab;
  onClose: () => void;
  onSave: (f: RegForm | null) => void;
}

const RegisterModal = ({ open, tab, onClose, onSave }: RegisterModalProps) => {
  const [f, setF] = useState<RegForm>(EMPTY_FORM);
  const set = (k: keyof RegForm) => (v: string) =>
    setF((p) => ({ ...p, [k]: v }));

  const opts =
    tab === "devices"
      ? DEVICE_TYPES
      : tab === "cctv"
        ? CAM_PROVIDERS
        : SENSOR_TYPES;

  const typeLabel = tab === "cctv" ? "Brand / Provider" : "Type";
  const label =
    tab === "devices" ? "Device" : tab === "cctv" ? "Camera" : "Sensor";
  const showConn = tab === "devices";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          onClose();
          setF(EMPTY_FORM);
        }
      }}
    >
      <DialogContent className="max-w-lg rounded-3xl border-none shadow-2xl bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-black italic tracking-tighter">
            Register New {label}
          </DialogTitle>
          <p className="text-[11px] text-muted-foreground font-medium">
            This {label.toLowerCase()} will be scoped to the selected branch
            only.
          </p>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                {label} Name *
              </Label>
              <Input
                placeholder={`e.g. "Cashier PC #1"`}
                value={f.name}
                onChange={(e) => set("name")(e.target.value)}
                className="rounded-xl border-border text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                {typeLabel} *
              </Label>
              <Select value={f.subType} onValueChange={set("subType")}>
                <SelectTrigger className="rounded-xl border-border text-sm">
                  <SelectValue placeholder={`Select…`} />
                </SelectTrigger>
                <SelectContent>
                  {(Array.isArray(opts) ? opts : []).map((o) => (
                    <SelectItem key={o.v} value={o.v}>
                      {o.l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                Model
              </Label>
              <Input
                placeholder="e.g. Postek C168"
                value={f.model}
                onChange={(e) => set("model")(e.target.value)}
                className="rounded-xl border-border text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                Serial No.
              </Label>
              <Input
                placeholder="SN-XXXX"
                value={f.serial}
                onChange={(e) => set("serial")(e.target.value)}
                className="rounded-xl border-border text-sm"
              />
            </div>
            {showConn && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                    Connection Type
                  </Label>
                  <Select
                    value={f.connType}
                    onValueChange={(v) => set("connType")(v as ConnType)}
                  >
                    <SelectTrigger className="rounded-xl border-border text-sm">
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Array.isArray(CONN_TYPES) ? CONN_TYPES : []).map((o) => (
                        <SelectItem key={o.v} value={o.v}>
                          {o.l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {(f.connType === "tcp_ip" || f.connType === "wifi") && (
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                      IP Address
                    </Label>
                    <Input
                      placeholder="192.168.1.x"
                      value={f.ip}
                      onChange={(e) => set("ip")(e.target.value)}
                      className="rounded-xl border-border text-sm font-mono"
                    />
                  </div>
                )}
                {f.connType === "com_port" && (
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                      COM Port
                    </Label>
                    <Input
                      placeholder="e.g. COM3"
                      value={f.comPort}
                      onChange={(e) => set("comPort")(e.target.value)}
                      className="rounded-xl border-border text-sm font-mono"
                    />
                  </div>
                )}
                {f.connType === "usb" && (
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                      USB Port Label
                    </Label>
                    <Input
                      placeholder="e.g. USB-A Port 3"
                      value={f.usbPort}
                      onChange={(e) => set("usbPort")(e.target.value)}
                      className="rounded-xl border-border text-sm font-mono"
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                    MAC Address
                  </Label>
                  <Input
                    placeholder="AA:BB:CC:DD:EE:FF"
                    value={f.mac}
                    onChange={(e) => set("mac")(e.target.value)}
                    className="rounded-xl border-border text-sm font-mono"
                  />
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                Placement / Location
              </Label>
              <Input
                placeholder="e.g. Cashier Counter"
                value={f.placement}
                onChange={(e) => set("placement")(e.target.value)}
                className="rounded-xl border-border text-sm"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                Notes
              </Label>
              <Textarea
                placeholder="Usage context, setup notes…"
                value={f.notes}
                onChange={(e) => set("notes")(e.target.value)}
                className="rounded-xl border-border text-sm resize-none h-16"
              />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {tab === "devices" && (
            <Button
              variant="outline"
              onClick={() => {
                onClose();
                onSave(null); // Trigger scan parent-side
              }}
              className="rounded-xl border-border text-muted-foreground font-bold text-xs gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Auto-Scan LAN
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => {
              onClose();
              setF(EMPTY_FORM);
            }}
            className="rounded-xl text-muted-foreground font-bold text-xs"
          >
            Cancel
          </Button>
          <Button
            disabled={!f.name || !f.subType}
            onClick={() => {
              onSave(f);
              setF(EMPTY_FORM);
            }}
            className="flex-1 rounded-xl bg-secondary text-foreground font-black italic uppercase text-[10px] tracking-widest"
          >
            Register {label}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RegisterModal;
