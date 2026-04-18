/**
 * Device Entity
 * Represents hardware devices registered in the system
 */
export class Device {
  id: string;
  tenant_id: string;
  location_id: string;
  deviceType: "pos" | "biometric" | "printer" | "scanner" | "terminal";
  deviceName: string;
  ip_address?: string;
  macAddress?: string;
  status: "online" | "offline" | "maintenance";
  lastSeen: Date;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}
