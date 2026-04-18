export class PaymentDevice {
  id: string;
  tenant_id: string;
  location: string;
  deviceCode: string;
  approved: boolean;
  status: "online" | "offline" | "maintenance";
  providerId: string;
  lastUsedAt?: Date;
}

export class PaymentDevicePool {
  id: string;
  tenant_id: string;
  location: string;
  primaryDeviceId: string;
  fallbackDeviceIds: string[];
  created_at: Date;
  updated_at: Date;
}
