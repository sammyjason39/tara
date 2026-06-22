import React from "react";
import {
  Monitor,
  Tablet,
  Scan,
  Printer,
  Cpu,
  PlusCircle,
  Wifi,
  WifiOff,
  RefreshCw,
  Eye,
  EyeOff,
  Camera,
  Thermometer,
  FlameKindling,
  Wind,
  RadioTower,
  DoorOpen,
  Zap,
  Network,
  Usb,
  Bluetooth,
  Server,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  BranchDevice,
  BranchDeviceType,
  CCTVCamera,
  BranchSensor,
  SensorType,
} from "@/core/types/retail/retail";
import type { ConnType } from "./DeviceControlTypes";

// ── Icon helpers ─────────────────────────────────────────────────
export const DeviceIcon = ({
  type,
  cls = "w-5 h-5",
}: {
  type: BranchDeviceType;
  cls?: string;
}) => {
  const m: Record<BranchDeviceType, React.ReactNode> = {
    pc: <Monitor className={cls} />,
    tablet: <Tablet className={cls} />,
    scanner: <Scan className={cls} />,
    thermal_printer: <Printer className={cls} />,
    dot_matrix_printer: <Printer className={cls} />,
    kiosk: <Monitor className={cls} />,
    pos_terminal: <Cpu className={cls} />,
    mobile: <Tablet className={cls} />,
    other: <Cpu className={cls} />,
  };
  return <>{m[type] ?? <Cpu className={cls} />}</>;
};

export const SIcon = ({
  type,
  cls = "w-5 h-5",
}: {
  type: SensorType;
  cls?: string;
}) => {
  const m: Record<SensorType, React.ReactNode> = {
    temperature: <Thermometer className={cls} />,
    humidity: <Wind className={cls} />,
    fire_alarm: <FlameKindling className={cls} />,
    smoke: <Wind className={cls} />,
    motion: <RadioTower className={cls} />,
    door_contact: <DoorOpen className={cls} />,
    vibration: <Zap className={cls} />,
    co2: <Wind className={cls} />,
    other: <RadioTower className={cls} />,
  };
  return <>{m[type] ?? <RadioTower className={cls} />}</>;
};

export const ConnIcon = ({ t }: { t?: ConnType }) => {
  const m: Record<ConnType, React.ReactNode> = {
    tcp_ip: <Network className="w-3.5 h-3.5" />,
    usb: <Usb className="w-3.5 h-3.5" />,
    bluetooth: <Bluetooth className="w-3.5 h-3.5" />,
    com_port: <Server className="w-3.5 h-3.5" />,
    wifi: <Wifi className="w-3.5 h-3.5" />,
    other: <Cpu className="w-3.5 h-3.5" />,
  };
  return <>{t ? m[t] : null}</>;
};

export const connLabel: Record<ConnType, string> = {
  tcp_ip: "TCP/IP",
  usb: "USB",
  bluetooth: "Bluetooth",
  com_port: "COM Port",
  wifi: "Wi-Fi",
  other: "Other",
};

// ── Color Helpers ─────────────────────────────────────────────────
export const dsc = (s: BranchDevice["status"]) =>
  ({
    online: "bg-success text-success border-success",
    offline: "bg-destructive text-destructive border-destructive",
    maintenance: "bg-warning text-warning border-warning",
    unknown: "bg-secondary/10 text-muted-foreground border-border",
  })[s];

export const csc = (s: CCTVCamera["status"]) =>
  ({
    live: "bg-success text-success border-success",
    recording: "bg-primary/5 text-primary border-primary",
    offline: "bg-destructive text-destructive border-destructive",
    error: "bg-destructive text-destructive border-destructive",
    maintenance: "bg-warning text-warning border-warning",
  })[s];

export const ssc = (s: BranchSensor["status"]) =>
  ({
    normal: "bg-success text-success border-success",
    warning: "bg-warning text-warning border-warning",
    critical: "bg-destructive text-destructive border-destructive",
    offline: "bg-secondary/10 text-muted-foreground border-border",
    unknown: "bg-secondary/10 text-muted-foreground border-border",
  })[s];

// ── Empty State ──────────────────────────────────────────────────
export const Empty = ({
  label,
  onAdd,
  onScan,
}: {
  label: string;
  onAdd: () => void;
  onScan?: () => void;
}) => (
  <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
    <div className="w-16 h-16 rounded-3xl bg-secondary/10 flex items-center justify-center">
      <Monitor className="w-7 h-7 opacity-30" />
    </div>
    <div className="text-sm font-bold">{label}</div>
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        onClick={onAdd}
        className="rounded-xl border-border font-black italic uppercase text-[10px] tracking-widest gap-2"
      >
        <PlusCircle className="w-4 h-4" /> Register
      </Button>
      {onScan && (
        <Button
          variant="outline"
          onClick={onScan}
          className="rounded-xl border-border font-black italic uppercase text-[10px] tracking-widest gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Scan Network
        </Button>
      )}
    </div>
  </div>
);
