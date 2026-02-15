export class PaymentDevice {
  id: string;
  tenantId: string;
  location: string;
  deviceCode: string;
  approved: boolean;
  status: 'online' | 'offline' | 'maintenance';
  providerId: string;
  lastUsedAt?: Date;
}

export class PaymentDevicePool {
  id: string;
  tenantId: string;
  location: string;
  primaryDeviceId: string;
  fallbackDeviceIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

